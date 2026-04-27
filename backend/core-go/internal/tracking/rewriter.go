package tracking

import (
	"bytes"
	"net/url"
	"strings"

	"golang.org/x/net/html"
)

// Rewriter is a thread-safe HTML transformer that injects an open-tracking
// pixel and rewrites <a href> targets through a click-tracking redirector.
// A nil or disabled Rewriter is a no-op (safe to call Rewrite on).
type Rewriter struct {
	signer  *Signer
	baseURL string // e.g. https://track.courierx.example (no trailing slash)
}

// NewRewriter constructs a Rewriter. Returns a no-op Rewriter when either
// the signer is unconfigured or baseURL is empty — callers don't have to
// branch on configuration state.
func NewRewriter(signer *Signer, baseURL string) *Rewriter {
	return &Rewriter{
		signer:  signer,
		baseURL: strings.TrimRight(baseURL, "/"),
	}
}

// Enabled reports whether the rewriter is fully configured.
func (r *Rewriter) Enabled() bool {
	return r != nil && r.signer.Enabled() && r.baseURL != ""
}

// Rewrite returns a transformed copy of htmlBody with tracking applied. emailID
// must be set when either flag is true. When the rewriter is disabled, both
// flags are false, or htmlBody is empty, the input is returned unchanged.
func (r *Rewriter) Rewrite(htmlBody, emailID, tenantID string, openTracking, clickTracking bool) (string, error) {
	if !r.Enabled() || emailID == "" || htmlBody == "" || (!openTracking && !clickTracking) {
		return htmlBody, nil
	}

	doc, err := html.Parse(strings.NewReader(htmlBody))
	if err != nil {
		// HTML parsing in golang.org/x/net/html is forgiving — a parse error
		// means truly malformed input. Skip tracking rather than corrupting
		// the message body.
		return htmlBody, err
	}

	if clickTracking {
		r.rewriteLinks(doc, emailID, tenantID)
	}
	if openTracking {
		r.injectPixel(doc, emailID, tenantID)
	}

	var buf bytes.Buffer
	if err := html.Render(&buf, doc); err != nil {
		return htmlBody, err
	}
	return buf.String(), nil
}

// rewriteLinks walks the parse tree and replaces qualifying <a href> targets
// with click-tracking URLs. Anchors, mailto:, tel:, and unsubscribe-shaped
// links are left alone — rewriting them would either break the link or
// undermine list-unsubscribe compliance.
func (r *Rewriter) rewriteLinks(n *html.Node, emailID, tenantID string) {
	if n.Type == html.ElementNode && n.Data == "a" {
		for i, attr := range n.Attr {
			if attr.Key != "href" {
				continue
			}
			if !shouldRewriteHref(attr.Val) {
				break
			}
			rewritten, ok := r.clickURL(attr.Val, emailID, tenantID)
			if ok {
				n.Attr[i].Val = rewritten
			}
			break
		}
	}
	for c := n.FirstChild; c != nil; c = c.NextSibling {
		r.rewriteLinks(c, emailID, tenantID)
	}
}

// injectPixel appends a 1x1 transparent <img> just before </body>. If no
// <body> exists it appends to the document root — most clients render a
// trailing <img> regardless, but well-formed HTML is preferred.
func (r *Rewriter) injectPixel(doc *html.Node, emailID, tenantID string) {
	token, err := r.signer.Sign(EventOpen, emailID, tenantID)
	if err != nil {
		return
	}
	pixelSrc := r.baseURL + "/t/o/" + token

	img := &html.Node{
		Type: html.ElementNode,
		Data: "img",
		Attr: []html.Attribute{
			{Key: "src", Val: pixelSrc},
			{Key: "width", Val: "1"},
			{Key: "height", Val: "1"},
			{Key: "alt", Val: ""},
			{Key: "style", Val: "display:none;border:0;outline:none;"},
		},
	}

	if body := findElement(doc, "body"); body != nil {
		body.AppendChild(img)
		return
	}
	doc.AppendChild(img)
}

// clickURL builds the redirector URL for an outbound link. Returns ok=false
// when signing fails — callers should leave the original href in place.
func (r *Rewriter) clickURL(target, emailID, tenantID string) (string, bool) {
	token, err := r.signer.Sign(EventClick, emailID, tenantID)
	if err != nil {
		return "", false
	}
	q := url.Values{}
	q.Set("u", target)
	return r.baseURL + "/t/c/" + token + "?" + q.Encode(), true
}

// shouldRewriteHref filters out targets where rewriting would break the link
// (mailto:, tel:, in-page anchors) or interfere with delivery-critical flows
// (unsubscribe pages, which must remain auditable by mailbox providers).
func shouldRewriteHref(href string) bool {
	href = strings.TrimSpace(href)
	if href == "" {
		return false
	}
	lower := strings.ToLower(href)
	switch {
	case strings.HasPrefix(lower, "http://"), strings.HasPrefix(lower, "https://"):
		// pass through
	default:
		return false
	}
	if strings.Contains(lower, "unsubscribe") {
		return false
	}
	return true
}

func findElement(n *html.Node, tag string) *html.Node {
	if n.Type == html.ElementNode && n.Data == tag {
		return n
	}
	for c := n.FirstChild; c != nil; c = c.NextSibling {
		if found := findElement(c, tag); found != nil {
			return found
		}
	}
	return nil
}
