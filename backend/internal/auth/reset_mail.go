package auth

import (
	"context"
	"crypto/tls"
	"fmt"
	"net"
	"net/mail"
	"net/smtp"
	"net/url"
	"strings"
	"time"
)

// SMTPResetSender requires STARTTLS (typically port 587). The public origin is
// configured by the operator, never taken from an untrusted request Host header.
func SMTPResetSender(addr, username, password, from, origin string) (ResetSender, error) {
	host, _, err := net.SplitHostPort(addr)
	if err != nil {
		return nil, fmt.Errorf("SMTP_ADDR must be host:port")
	}
	sender, err := mail.ParseAddress(from)
	if err != nil || strings.ContainsAny(from, "\r\n") {
		return nil, fmt.Errorf("SMTP_FROM must be a valid email address")
	}
	base, err := url.Parse(origin)
	if err != nil || base.Scheme != "https" || base.Host == "" || base.User != nil || base.RawQuery != "" || base.Fragment != "" || (base.Path != "" && base.Path != "/") {
		return nil, fmt.Errorf("PUBLIC_ORIGIN must be an HTTPS origin")
	}
	if username == "" || password == "" {
		return nil, fmt.Errorf("SMTP_USERNAME and SMTP_PASSWORD are required")
	}
	return func(ctx context.Context, to, token string) error {
		recipient, err := mail.ParseAddress(to)
		if err != nil || strings.ContainsAny(to, "\r\n") {
			return fmt.Errorf("invalid recipient")
		}
		link := *base
		link.Path = "/reset-password"
		// Fragments keep tokens out of server access logs and referrer headers.
		link.Fragment = "token=" + token
		conn, err := (&net.Dialer{Timeout: 10 * time.Second}).DialContext(ctx, "tcp", addr)
		if err != nil {
			return err
		}
		defer conn.Close()
		deadline := time.Now().Add(10 * time.Second)
		if d, ok := ctx.Deadline(); ok && d.Before(deadline) {
			deadline = d
		}
		if err = conn.SetDeadline(deadline); err != nil {
			return err
		}
		client, err := smtp.NewClient(conn, host)
		if err != nil {
			return err
		}
		defer client.Close()
		if err = client.StartTLS(&tls.Config{ServerName: host, MinVersion: tls.VersionTLS12}); err != nil {
			return err
		}
		if err = client.Auth(smtp.PlainAuth("", username, password, host)); err != nil {
			return err
		}
		if err = client.Mail(sender.Address); err != nil {
			return err
		}
		if err = client.Rcpt(recipient.Address); err != nil {
			return err
		}
		out, err := client.Data()
		if err != nil {
			return err
		}
		_, err = fmt.Fprintf(out, "From: %s\r\nTo: %s\r\nSubject: Reset your rock em password\r\nMIME-Version: 1.0\r\nContent-Type: text/plain; charset=UTF-8\r\n\r\nReset your password using this link:\r\n%s\r\n\r\nThis link expires in 30 minutes and can be used once. If you did not request this, you can ignore this email.\r\n", sender.String(), recipient.String(), link.String())
		if err != nil {
			return err
		}
		if err = out.Close(); err != nil {
			return err
		}
		return client.Quit()
	}, nil
}
