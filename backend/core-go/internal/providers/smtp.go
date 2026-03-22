package providers

import (
	"context"
	"crypto/tls"
	"fmt"
	"net"
	"net/smtp"
	"strconv"
	"time"

	"github.com/courierx/core-go/internal/email"
	"github.com/courierx/core-go/internal/types"
	"github.com/google/uuid"
)

// SMTPProvider sends email via any SMTP server.
// Supports STARTTLS (port 587, default) and implicit TLS (port 465).
type SMTPProvider struct {
	host   string
	port   int
	user   string
	pass   string
	useTLS bool // true = implicit TLS on connect; false = STARTTLS after EHLO
}

// NewSMTPProvider validates config and returns a ready provider.
func NewSMTPProvider(config map[string]interface{}) (*SMTPProvider, error) {
	host, _ := config["host"].(string)
	if host == "" {
		return nil, fmt.Errorf("smtp: host is required")
	}

	port := 587
	switch v := config["port"].(type) {
	case float64:
		port = int(v)
	case int:
		port = v
	}

	user, _ := config["user"].(string)
	pass, _ := config["pass"].(string)
	useTLS, _ := config["useTLS"].(bool)

	return &SMTPProvider{
		host:   host,
		port:   port,
		user:   user,
		pass:   pass,
		useTLS: useTLS,
	}, nil
}

func (p *SMTPProvider) Send(ctx context.Context, req *types.SendRequest) (*types.SendResponse, error) {
	msgBytes, err := email.BuildMIME(req)
	if err != nil {
		return nil, fmt.Errorf("smtp: build MIME: %w", err)
	}

	// Collect all recipients (To + CC + BCC)
	recipients := []string{req.To}
	recipients = append(recipients, req.CC...)
	recipients = append(recipients, req.BCC...)

	addr := net.JoinHostPort(p.host, strconv.Itoa(p.port))

	var c *smtp.Client
	if p.useTLS {
		// Implicit TLS (SMTPS) — connect directly with TLS
		tlsCfg := &tls.Config{ServerName: p.host, MinVersion: tls.VersionTLS12}
		conn, err := tls.DialWithDialer(&net.Dialer{Timeout: 30 * time.Second}, "tcp", addr, tlsCfg)
		if err != nil {
			return nil, fmt.Errorf("smtp: TLS dial: %w", err)
		}
		c, err = smtp.NewClient(conn, p.host)
		if err != nil {
			return nil, fmt.Errorf("smtp: new client: %w", err)
		}
	} else {
		// Plain connect then STARTTLS
		c, err = smtp.Dial(addr)
		if err != nil {
			return nil, fmt.Errorf("smtp: dial: %w", err)
		}
		tlsCfg := &tls.Config{ServerName: p.host, MinVersion: tls.VersionTLS12}
		if err = c.StartTLS(tlsCfg); err != nil {
			// Some servers don't support STARTTLS — continue without
			_ = err
		}
	}
	defer c.Close()

	// Auth (PLAIN)
	if p.user != "" && p.pass != "" {
		auth := smtp.PlainAuth("", p.user, p.pass, p.host)
		if err := c.Auth(auth); err != nil {
			return nil, fmt.Errorf("smtp: auth: %w", err)
		}
	}

	// MAIL FROM
	if err := c.Mail(extractAddress(req.From)); err != nil {
		return nil, fmt.Errorf("smtp: MAIL FROM: %w", err)
	}

	// RCPT TO (one per recipient — BCC handled here, not in headers)
	for _, rcpt := range recipients {
		if err := c.Rcpt(rcpt); err != nil {
			return nil, fmt.Errorf("smtp: RCPT TO %s: %w", rcpt, err)
		}
	}

	// DATA
	wc, err := c.Data()
	if err != nil {
		return nil, fmt.Errorf("smtp: DATA: %w", err)
	}
	if _, err = wc.Write(msgBytes); err != nil {
		return nil, fmt.Errorf("smtp: write data: %w", err)
	}
	if err = wc.Close(); err != nil {
		return nil, fmt.Errorf("smtp: close data: %w", err)
	}
	if err = c.Quit(); err != nil {
		return nil, fmt.Errorf("smtp: QUIT: %w", err)
	}

	return &types.SendResponse{
		Success:   true,
		MessageID: "smtp-" + uuid.New().String(),
		Provider:  "smtp",
	}, nil
}

func (p *SMTPProvider) Name() string { return "smtp" }

func (p *SMTPProvider) ValidateConfig() error {
	if p.host == "" {
		return fmt.Errorf("smtp: host is required")
	}
	return nil
}
