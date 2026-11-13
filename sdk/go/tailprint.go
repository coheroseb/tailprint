// Package tailprint provides the official Go client SDK for Tailprint (https://tailprint.com) —
// the developer-first Tailwind CSS HTML-to-PDF, Hosted Templates, and EU Factur-X E-Invoicing engine.
package tailprint

import (
	"bytes"
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"strings"
	"time"
)

const defaultBaseURL = "https://tailprint.com"

// Client is a thread-safe client for the Tailprint API.
type Client struct {
	apiKey     string
	baseURL    string
	httpClient *http.Client
}

// ClientOption configures a Client instance.
type ClientOption func(*Client)

// WithBaseURL overrides the default Tailprint API base URL ("https://tailprint.com").
func WithBaseURL(baseURL string) ClientOption {
	return func(c *Client) {
		c.baseURL = strings.TrimRight(baseURL, "/")
	}
}

// WithTimeout configures the HTTP client timeout (default 30s).
func WithTimeout(timeout time.Duration) ClientOption {
	return func(c *Client) {
		c.httpClient.Timeout = timeout
	}
}

// WithHTTPClient provides a custom *http.Client.
func WithHTTPClient(httpClient *http.Client) ClientOption {
	return func(c *Client) {
		if httpClient != nil {
			c.httpClient = httpClient
		}
	}
}

// NewClient initializes a new Tailprint API Client.
// If apiKey is empty, it falls back to the TAILPRINT_API_KEY environment variable.
func NewClient(apiKey string, opts ...ClientOption) *Client {
	if apiKey == "" {
		apiKey = os.Getenv("TAILPRINT_API_KEY")
	}
	baseURL := os.Getenv("TAILPRINT_BASE_URL")
	if baseURL == "" {
		baseURL = defaultBaseURL
	}

	c := &Client{
		apiKey:  apiKey,
		baseURL: strings.TrimRight(baseURL, "/"),
		httpClient: &http.Client{
			Timeout: 30 * time.Second,
		},
	}
	for _, opt := range opts {
		opt(c)
	}
	return c
}

// Bool returns a pointer to a bool value (helper for optional boolean fields like SmartPagination).
func Bool(v bool) *bool {
	return &v
}

// PDFBytesToDataURI converts raw PDF bytes into a base64 data URI suitable for MergePDFs, SplitPDF, StampPDF, etc.
func PDFBytesToDataURI(pdfBytes []byte) string {
	return "data:application/pdf;base64," + base64.StdEncoding.EncodeToString(pdfBytes)
}

// RenderPDF compiles Tailwind CSS HTML, a public URL, or a hosted template (TemplateID + Data) into raw PDF bytes.
func (c *Client) RenderPDF(ctx context.Context, opts RenderOptions) ([]byte, error) {
	opts.Store = false
	opts.Async = false
	return c.doBinaryWithHeaders(ctx, http.MethodPost, "/v1/render/pdf", opts, opts.IdempotencyKey)
}

// RenderPDFStored compiles a PDF and stores it on Tailprint's CDN, returning a signed download URL.
func (c *Client) RenderPDFStored(ctx context.Context, opts RenderOptions) (*StoredFileResponse, error) {
	opts.Store = true
	opts.Async = false
	var res StoredFileResponse
	if err := c.doJSONWithHeaders(ctx, http.MethodPost, "/v1/render/pdf", opts, &res, opts.IdempotencyKey); err != nil {
		return nil, err
	}
	return &res, nil
}

// RenderTemplate renders a hosted template (e.g. "invoice-modern", "receipt-minimal",
// "certificate-classic", "report-executive") with structured data into raw PDF bytes.
func (c *Client) RenderTemplate(ctx context.Context, templateID string, data map[string]any, opts *RenderOptions) ([]byte, error) {
	var req RenderOptions
	if opts != nil {
		req = *opts
	}
	req.TemplateID = templateID
	req.Data = data
	return c.RenderPDF(ctx, req)
}

// ListTemplates returns all available hosted document templates.
func (c *Client) ListTemplates(ctx context.Context) ([]TemplateSummary, error) {
	var envelope struct {
		Success   bool              `json:"success"`
		Templates []TemplateSummary `json:"templates"`
	}
	if err := c.doJSON(ctx, http.MethodGet, "/v1/templates", nil, &envelope); err != nil {
		return nil, err
	}
	return envelope.Templates, nil
}

// GetTemplate returns full details, example_data, and example_request for a hosted template.
func (c *Client) GetTemplate(ctx context.Context, templateID string) (*TemplateDetails, error) {
	var res TemplateDetails
	endpoint := "/v1/templates/" + url.PathEscape(templateID)
	if err := c.doJSON(ctx, http.MethodGet, endpoint, nil, &res); err != nil {
		return nil, err
	}
	return &res, nil
}

// CreateTemplate creates or overwrites a custom hosted template on your account (Starter+ plan required).
func (c *Client) CreateTemplate(ctx context.Context, req CustomTemplateRequest) (map[string]any, error) {
	var res map[string]any
	if err := c.doJSON(ctx, http.MethodPost, "/v1/templates", req, &res); err != nil {
		return nil, err
	}
	return res, nil
}

// DeleteTemplate deletes a custom hosted template from your account (Starter+ plan required).
func (c *Client) DeleteTemplate(ctx context.Context, templateID string) error {
	endpoint := "/v1/templates/" + url.PathEscape(templateID)
	return c.doJSON(ctx, http.MethodDelete, endpoint, nil, nil)
}

// RenderPDFAsync enqueues an asynchronous PDF rendering job and immediately returns job tracking info.
func (c *Client) RenderPDFAsync(ctx context.Context, opts RenderOptions) (*AsyncJobAccepted, error) {
	opts.Async = true
	var res AsyncJobAccepted
	if err := c.doJSON(ctx, http.MethodPost, "/v1/render/pdf", opts, &res); err != nil {
		return nil, err
	}
	return &res, nil
}

// RenderBatch submits up to 100 documents for concurrent batch rendering with optional auto-merge.
func (c *Client) RenderBatch(ctx context.Context, req BatchRequest) (*AsyncJobAccepted, error) {
	var res AsyncJobAccepted
	if err := c.doJSON(ctx, http.MethodPost, "/v1/render/batch", req, &res); err != nil {
		return nil, err
	}
	return &res, nil
}

// GetJob retrieves the current status and output URLs of an async or batch rendering job.
func (c *Client) GetJob(ctx context.Context, jobID string) (*JobStatus, error) {
	var res JobStatus
	endpoint := "/v1/jobs/" + url.PathEscape(jobID)
	if err := c.doJSON(ctx, http.MethodGet, endpoint, nil, &res); err != nil {
		return nil, err
	}
	return &res, nil
}

// WaitForJob polls a job until its status is "completed" or "failed", or until the context is canceled.
func (c *Client) WaitForJob(ctx context.Context, jobID string, pollInterval time.Duration) (*JobStatus, error) {
	if pollInterval <= 0 {
		pollInterval = time.Second
	}
	ticker := time.NewTicker(pollInterval)
	defer ticker.Stop()

	for {
		status, err := c.GetJob(ctx, jobID)
		if err != nil {
			return nil, err
		}
		switch status.Status {
		case "completed":
			return status, nil
		case "failed":
			msg := status.Error
			if msg == "" {
				msg = fmt.Sprintf("job %s failed", jobID)
			}
			return status, errors.New(msg)
		}

		select {
		case <-ctx.Done():
			return nil, ctx.Err()
		case <-ticker.C:
		}
	}
}

// GenerateEInvoice generates a European hybrid electronic invoice (Factur-X / ZUGFeRD 2.2 / EN 16931 PDF/A-3).
func (c *Client) GenerateEInvoice(ctx context.Context, req EInvoiceRequest) ([]byte, error) {
	req.Store = false
	return c.doBinary(ctx, http.MethodPost, "/v1/einvoice/generate", req)
}

// ValidateEInvoice inspects a PDF (data URI or URL) for Factur-X / ZUGFeRD / EN 16931 compliance.
func (c *Client) ValidateEInvoice(ctx context.Context, pdf string) (*EInvoiceValidationResult, error) {
	var res EInvoiceValidationResult
	payload := map[string]string{"pdf": pdf}
	if err := c.doJSON(ctx, http.MethodPost, "/v1/einvoice/validate", payload, &res); err != nil {
		return nil, err
	}
	return &res, nil
}

// MergePDFs combines 2 to 20 PDFs (URLs or base64 data URIs) into a single PDF document.
func (c *Client) MergePDFs(ctx context.Context, req MergeRequest) ([]byte, error) {
	return c.doBinary(ctx, http.MethodPost, "/v1/pdf/merge", req)
}

// SplitPDF splits a PDF into multiple parts by page ranges (e.g. "1-3, 4, 5-7").
func (c *Client) SplitPDF(ctx context.Context, req SplitRequest) (*SplitResponse, error) {
	var res SplitResponse
	if err := c.doJSON(ctx, http.MethodPost, "/v1/pdf/split", req, &res); err != nil {
		return nil, err
	}
	return &res, nil
}

// StampPDF overlays diagonal watermarks, page numbers, headers/footers, or images onto a PDF.
func (c *Client) StampPDF(ctx context.Context, req StampRequest) ([]byte, error) {
	return c.doBinary(ctx, http.MethodPost, "/v1/pdf/stamp", req)
}

// CompressPDF optimizes and linearizes a PDF document.
func (c *Client) CompressPDF(ctx context.Context, req CompressRequest) ([]byte, error) {
	return c.doBinary(ctx, http.MethodPost, "/v1/pdf/compress", req)
}

// FillPDFForm populates interactive AcroForm fields in a PDF and optionally flattens them.
func (c *Client) FillPDFForm(ctx context.Context, req FillFormRequest) ([]byte, error) {
	return c.doBinary(ctx, http.MethodPost, "/v1/pdf/fill-form", req)
}

// VerifyWebhookSignature verifies the X-Tailprint-Signature HMAC-SHA256 header on webhook requests.
func VerifyWebhookSignature(payload []byte, signatureHeader, secret string) bool {
	if len(signatureHeader) == 0 || len(secret) == 0 {
		return false
	}
	cleanSig := strings.TrimPrefix(signatureHeader, "sha256=")
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write(payload)
	expected := hex.EncodeToString(mac.Sum(nil))
	return hmac.Equal([]byte(expected), []byte(cleanSig))
}

func (c *Client) doBinary(ctx context.Context, method, endpoint string, body any) ([]byte, error) {
	return c.doBinaryWithHeaders(ctx, method, endpoint, body, "")
}

func (c *Client) doBinaryWithHeaders(ctx context.Context, method, endpoint string, body any, idempotencyKey string) ([]byte, error) {
	respBody, _, err := c.doRequest(ctx, method, endpoint, body, idempotencyKey)
	if err != nil {
		return nil, err
	}
	return respBody, nil
}

func (c *Client) doJSON(ctx context.Context, method, endpoint string, body any, out any) error {
	return c.doJSONWithHeaders(ctx, method, endpoint, body, out, "")
}

func (c *Client) doJSONWithHeaders(ctx context.Context, method, endpoint string, body any, out any, idempotencyKey string) error {
	respBody, _, err := c.doRequest(ctx, method, endpoint, body, idempotencyKey)
	if err != nil {
		return err
	}
	if out == nil || len(respBody) == 0 {
		return nil
	}
	return json.Unmarshal(respBody, out)
}

func (c *Client) doRequest(ctx context.Context, method, endpoint string, body any, idempotencyKey string) ([]byte, http.Header, error) {
	fullURL := c.baseURL + "/" + strings.TrimLeft(endpoint, "/")

	var reqReader io.Reader
	if body != nil {
		encoded, err := json.Marshal(body)
		if err != nil {
			return nil, nil, fmt.Errorf("tailprint: marshal request body: %w", err)
		}
		reqReader = bytes.NewReader(encoded)
	}

	req, err := http.NewRequestWithContext(ctx, method, fullURL, reqReader)
	if err != nil {
		return nil, nil, fmt.Errorf("tailprint: create request: %w", err)
	}

	req.Header.Set("User-Agent", "Tailprint-Go-SDK/"+Version)
	if c.apiKey != "" {
		req.Header.Set("Authorization", "Bearer "+c.apiKey)
	}
	if idempotencyKey != "" {
		req.Header.Set("Idempotency-Key", idempotencyKey)
	}
	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, nil, fmt.Errorf("tailprint: execute request: %w", err)
	}
	defer resp.Body.Close()

	respBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, nil, fmt.Errorf("tailprint: read response body: %w", err)
	}

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		apiErr := &APIError{
			StatusCode: resp.StatusCode,
			Message:    strings.TrimSpace(string(respBytes)),
		}
		_ = json.Unmarshal(respBytes, apiErr)
		return nil, resp.Header, apiErr
	}

	return respBytes, resp.Header, nil
}
