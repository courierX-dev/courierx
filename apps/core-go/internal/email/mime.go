// Package email provides a MIME message builder used by the SMTP and SES (raw) providers.
package email

import (
	"bytes"
	"encoding/base64"
	"fmt"
	"mime/multipart"
	"mime/quotedprintable"
	"net/textproto"
	"strings"

	"github.com/courierx/core-go/internal/types"
)

// BuildMIME constructs a MIME email message ready for transmission.
// The returned []byte includes all headers and the MIME body but NOT the
// SMTP envelope (MAIL FROM / RCPT TO).
func BuildMIME(req *types.SendRequest) ([]byte, error) {
	var buf bytes.Buffer

	// Top-level headers
	writeHeader(&buf, "MIME-Version", "1.0")
	writeHeader(&buf, "From", req.From)

	toList := buildAddressList(req.To, req.CC, req.BCC)
	writeHeader(&buf, "To", req.To)
	if len(req.CC) > 0 {
		writeHeader(&buf, "Cc", strings.Join(req.CC, ", "))
	}
	_ = toList // used by SMTP caller via req fields

	writeHeader(&buf, "Subject", encodeHeader(req.Subject))
	if req.ReplyTo != "" {
		writeHeader(&buf, "Reply-To", req.ReplyTo)
	}

	hasAttachments := len(req.Attachments) > 0

	if hasAttachments {
		// multipart/mixed  (text/html + text/plain body  +  attachments)
		mw := multipart.NewWriter(&buf)
		writeHeader(&buf, "Content-Type", fmt.Sprintf(`multipart/mixed; boundary="%s"`, mw.Boundary()))
		buf.WriteString("\r\n")

		if err := writeAlternativePart(mw, req); err != nil {
			return nil, err
		}
		for _, att := range req.Attachments {
			if err := writeAttachmentPart(mw, att); err != nil {
				return nil, err
			}
		}
		if err := mw.Close(); err != nil {
			return nil, err
		}
	} else {
		// multipart/alternative  (text/plain + text/html)
		mw := multipart.NewWriter(&buf)
		writeHeader(&buf, "Content-Type", fmt.Sprintf(`multipart/alternative; boundary="%s"`, mw.Boundary()))
		buf.WriteString("\r\n")

		if err := writeTextAndHTML(mw, req.Text, req.HTML); err != nil {
			return nil, err
		}
		if err := mw.Close(); err != nil {
			return nil, err
		}
	}

	return buf.Bytes(), nil
}

// — helpers —

func writeHeader(buf *bytes.Buffer, key, value string) {
	buf.WriteString(key)
	buf.WriteString(": ")
	buf.WriteString(value)
	buf.WriteString("\r\n")
}

// encodeHeader encodes a non-ASCII header value as RFC 2047 UTF-8 base64.
func encodeHeader(s string) string {
	for _, r := range s {
		if r > 127 {
			return "=?UTF-8?B?" + base64.StdEncoding.EncodeToString([]byte(s)) + "?="
		}
	}
	return s
}

func buildAddressList(to string, cc, bcc []string) []string {
	all := []string{to}
	all = append(all, cc...)
	all = append(all, bcc...)
	return all
}

// writeAlternativePart writes a multipart/alternative part inside a multipart/mixed writer.
func writeAlternativePart(outer *multipart.Writer, req *types.SendRequest) error {
	altWriter := multipart.NewWriter(&bytes.Buffer{})

	altHeader := make(textproto.MIMEHeader)
	altHeader.Set("Content-Type", fmt.Sprintf(`multipart/alternative; boundary="%s"`, altWriter.Boundary()))

	part, err := outer.CreatePart(altHeader)
	if err != nil {
		return err
	}

	innerBuf := &bytes.Buffer{}
	innerBuf.WriteString(fmt.Sprintf("Content-Type: multipart/alternative; boundary=%q\r\n\r\n", altWriter.Boundary()))

	if req.Text != "" {
		if err := writeQPPart(innerBuf, "text/plain", req.Text); err != nil {
			return err
		}
	}
	if req.HTML != "" {
		if err := writeQPPart(innerBuf, "text/html", req.HTML); err != nil {
			return err
		}
	}

	_, err = part.Write(innerBuf.Bytes())
	return err
}

// writeTextAndHTML writes text/plain and text/html parts into a multipart/alternative writer.
func writeTextAndHTML(mw *multipart.Writer, text, html string) error {
	if text != "" {
		if err := writeQPPart2(mw, "text/plain", text); err != nil {
			return err
		}
	}
	if html != "" {
		if err := writeQPPart2(mw, "text/html", html); err != nil {
			return err
		}
	}
	return nil
}

func writeQPPart(buf *bytes.Buffer, contentType, body string) error {
	boundary := "inner" + contentType
	_ = boundary

	buf.WriteString(fmt.Sprintf("Content-Type: %s; charset=\"UTF-8\"\r\n", contentType))
	buf.WriteString("Content-Transfer-Encoding: quoted-printable\r\n\r\n")

	qpw := quotedprintable.NewWriter(buf)
	if _, err := qpw.Write([]byte(body)); err != nil {
		return err
	}
	return qpw.Close()
}

func writeQPPart2(mw *multipart.Writer, contentType, body string) error {
	h := make(textproto.MIMEHeader)
	h.Set("Content-Type", contentType+`; charset="UTF-8"`)
	h.Set("Content-Transfer-Encoding", "quoted-printable")

	part, err := mw.CreatePart(h)
	if err != nil {
		return err
	}

	qpw := quotedprintable.NewWriter(part)
	if _, err := qpw.Write([]byte(body)); err != nil {
		return err
	}
	return qpw.Close()
}

func writeAttachmentPart(mw *multipart.Writer, att types.Attachment) error {
	h := make(textproto.MIMEHeader)
	ct := att.ContentType
	if ct == "" {
		ct = "application/octet-stream"
	}
	h.Set("Content-Type", fmt.Sprintf(`%s; name="%s"`, ct, att.Filename))
	h.Set("Content-Transfer-Encoding", "base64")
	h.Set("Content-Disposition", fmt.Sprintf(`attachment; filename="%s"`, att.Filename))

	part, err := mw.CreatePart(h)
	if err != nil {
		return err
	}

	// Content is already base64-encoded by the caller
	_, err = part.Write([]byte(att.Content))
	return err
}
