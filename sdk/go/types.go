package tailprint

import "fmt"

// Version is the current Tailprint Go SDK version.
const Version = "1.4.0"

// Margin specifies CSS page margins (e.g. "20mm", "0.5in").
type Margin struct {
	Top    string `json:"top,omitempty"`
	Right  string `json:"right,omitempty"`
	Bottom string `json:"bottom,omitempty"`
	Left   string `json:"left,omitempty"`
}

// RenderOptions configures a synchronous or stored PDF render request.
// Provide exactly one of HTML, URL, or TemplateID (+ Data).
type RenderOptions struct {
	HTML                string            `json:"html,omitempty"`
	URL                 string            `json:"url,omitempty"`
	TemplateID          string            `json:"template_id,omitempty"`
	Data                map[string]any    `json:"data,omitempty"`
	Format              string            `json:"format,omitempty"` // "A4", "Letter", "Legal"
	Landscape           bool              `json:"landscape,omitempty"`
	PrintBackground     *bool             `json:"print_background,omitempty"`
	Margin              *Margin           `json:"margin,omitempty"`
	DisplayHeaderFooter bool              `json:"display_header_footer,omitempty"`
	HeaderHTML          string            `json:"header_html,omitempty"`
	FooterHTML          string            `json:"footer_html,omitempty"`
	Password            string            `json:"password,omitempty"`
	OwnerPassword       string            `json:"owner_password,omitempty"`
	WaitFor             string            `json:"wait_for,omitempty"`
	DelayMs             int               `json:"delay_ms,omitempty"`
	BlockPopups         *bool             `json:"block_popups,omitempty"`
	SmartPagination     *bool             `json:"smart_pagination,omitempty"`
	NoStore             bool              `json:"no_store,omitempty"`
	Store               bool              `json:"store,omitempty"`
	ExpiresIn           string            `json:"expires_in,omitempty"` // "1h", "24h", "7d"
	Async               bool              `json:"async,omitempty"`
	WebhookURL          string            `json:"webhook_url,omitempty"`
	WebhookHeaders      map[string]string `json:"webhook_headers,omitempty"`
	AIReady             *bool             `json:"ai_ready,omitempty"`
	EmbedData           map[string]any    `json:"embed_data,omitempty"`
	Sign                bool              `json:"sign,omitempty"`
	VerifySeal          bool              `json:"verify_seal,omitempty"`
	IdempotencyKey      string            `json:"-"`
}

// StoredFileResponse is returned when Store: true is set on a render operation.
type StoredFileResponse struct {
	Success     bool   `json:"success"`
	FileID      string `json:"file_id"`
	DownloadURL string `json:"download_url"`
	ExpiresAt   string `json:"expires_at"`
	ExpiresIn   string `json:"expires_in"`
	SizeBytes   int    `json:"size_bytes"`
	RenderTime  int    `json:"render_time_ms,omitempty"`
}

// TemplateSummary describes a hosted template returned by ListTemplates.
type TemplateSummary struct {
	ID             string   `json:"id"`
	Name           string   `json:"name"`
	Category       string   `json:"category"`
	Description    string   `json:"description"`
	RequiredFields []string `json:"required_fields"`
	OptionalFields []string `json:"optional_fields"`
}

// TemplateDetailRecord contains full metadata and example payloads for a hosted template.
type TemplateDetailRecord struct {
	TemplateSummary
	ExampleData    map[string]any `json:"example_data"`
	ExampleRequest map[string]any `json:"example_request"`
}

// CustomTemplateRequest configures creating or updating a custom hosted template (Starter+ plan required).
type CustomTemplateRequest struct {
	ID              string         `json:"id"`
	Title           string         `json:"title"`
	HTML            string         `json:"html"`
	Category        string         `json:"category,omitempty"`
	Description     string         `json:"description,omitempty"`
	RequiredFields  []string       `json:"required_fields,omitempty"`
	DefaultData     map[string]any `json:"default_data,omitempty"`
	ExampleData     map[string]any `json:"example_data,omitempty"`
	Format          string         `json:"format,omitempty"`
	Landscape       bool           `json:"landscape,omitempty"`
	SmartPagination *bool          `json:"smart_pagination,omitempty"`
}

// TemplateDetails is the response envelope from GetTemplate.
type TemplateDetails struct {
	Success  bool                 `json:"success"`
	Template TemplateDetailRecord `json:"template"`
}

// BatchItem represents a single document in a concurrent batch render request.
type BatchItem struct {
	HTML            string         `json:"html,omitempty"`
	URL             string         `json:"url,omitempty"`
	TemplateID      string         `json:"template_id,omitempty"`
	Data            map[string]any `json:"data,omitempty"`
	Filename        string         `json:"filename,omitempty"`
	Format          string         `json:"format,omitempty"`
	Landscape       bool           `json:"landscape,omitempty"`
	Margin          *Margin        `json:"margin,omitempty"`
	HeaderHTML      string         `json:"header_html,omitempty"`
	FooterHTML      string         `json:"footer_html,omitempty"`
	SmartPagination *bool          `json:"smart_pagination,omitempty"`
	DelayMs         int            `json:"delay_ms,omitempty"`
}

// BatchRequest configures a concurrent batch PDF rendering job (up to 100 items).
type BatchRequest struct {
	Items          []BatchItem       `json:"items"`
	MergeOutput    bool              `json:"merge_output,omitempty"`
	MergedFilename string            `json:"merged_filename,omitempty"`
	WebhookURL     string            `json:"webhook_url,omitempty"`
	WebhookHeaders map[string]string `json:"webhook_headers,omitempty"`
	ExpiresIn      string            `json:"expires_in,omitempty"`
}

// AsyncJobAccepted is returned when an async or batch rendering job is enqueued.
type AsyncJobAccepted struct {
	Success    bool   `json:"success"`
	JobID      string `json:"job_id"`
	Status     string `json:"status"`
	Message    string `json:"message"`
	StatusURL  string `json:"status_url"`
	WebhookURL string `json:"webhook_url,omitempty"`
	CreatedAt  string `json:"created_at"`
}

// JobResultItem represents one document's outcome in a batch/async job.
type JobResultItem struct {
	Index        int    `json:"index"`
	Filename     string `json:"filename"`
	FileID       string `json:"file_id,omitempty"`
	DownloadURL  string `json:"download_url,omitempty"`
	SizeBytes    int    `json:"size_bytes,omitempty"`
	Pages        int    `json:"pages,omitempty"`
	Status       string `json:"status"`
	Error        string `json:"error,omitempty"`
	RenderTimeMs int    `json:"render_time_ms,omitempty"`
}

// JobStatus represents the current state and outputs of an async or batch job.
type JobStatus struct {
	JobID    string `json:"job_id"`
	Type     string `json:"type"`
	Status   string `json:"status"` // "pending", "processing", "completed", "failed"
	Progress struct {
		Total     int `json:"total"`
		Completed int `json:"completed"`
		Failed    int `json:"failed"`
	} `json:"progress"`
	Results      []JobResultItem `json:"results"`
	MergedOutput *struct {
		FileID      string `json:"file_id"`
		DownloadURL string `json:"download_url"`
		Filename    string `json:"filename"`
		SizeBytes   int    `json:"size_bytes,omitempty"`
		Pages       int    `json:"pages,omitempty"`
	} `json:"merged_output,omitempty"`
	Error       string `json:"error,omitempty"`
	CreatedAt   string `json:"created_at"`
	CompletedAt string `json:"completed_at,omitempty"`
}

// EInvoiceParty represents the seller or buyer in a Factur-X / ZUGFeRD invoice.
type EInvoiceParty struct {
	Name        string `json:"name"`
	VATNumber   string `json:"vat_number,omitempty"`
	Street      string `json:"street,omitempty"`
	City        string `json:"city,omitempty"`
	PostalCode  string `json:"postal_code,omitempty"`
	CountryCode string `json:"country_code"` // 2-letter ISO code, e.g. "DE", "FR", "DK"
	Email       string `json:"email,omitempty"`
}

// EInvoiceLineItem represents a single line item in an EN 16931 electronic invoice.
type EInvoiceLineItem struct {
	ID         string  `json:"id,omitempty"`
	Name       string  `json:"name"`
	Quantity   float64 `json:"quantity"`
	UnitCode   string  `json:"unit_code,omitempty"`
	UnitPrice  float64 `json:"unit_price"`
	TaxRate    float64 `json:"tax_rate"`
	TaxCatCode string  `json:"tax_category_code,omitempty"`
}

// EInvoiceData holds structured EN 16931 invoice fields.
type EInvoiceData struct {
	InvoiceNumber   string             `json:"invoice_number"`
	IssueDate       string             `json:"issue_date"`
	DueDate         string             `json:"due_date,omitempty"`
	Currency        string             `json:"currency,omitempty"`
	Profile         string             `json:"profile,omitempty"`
	BuyerReference  string             `json:"buyer_reference,omitempty"`
	Notes           string             `json:"notes,omitempty"`
	Seller          EInvoiceParty      `json:"seller"`
	Buyer           EInvoiceParty      `json:"buyer"`
	PaymentMeansIBAN string            `json:"payment_means_iban,omitempty"`
	PaymentMeansBIC  string            `json:"payment_means_bic,omitempty"`
	PaymentTerms    string             `json:"payment_terms,omitempty"`
	LineItems       []EInvoiceLineItem `json:"line_items"`
}

// EInvoiceRequest configures a Factur-X / ZUGFeRD 2.2 PDF/A-3 invoice generation.
type EInvoiceRequest struct {
	Invoice   EInvoiceData `json:"invoice"`
	HTML      string       `json:"html,omitempty"`
	Format    string       `json:"format,omitempty"`
	Store     bool         `json:"store,omitempty"`
	ExpiresIn string       `json:"expires_in,omitempty"`
}

// EInvoiceValidationResult contains compliance results from ValidateEInvoice.
type EInvoiceValidationResult struct {
	Valid             bool           `json:"valid"`
	Standard          string         `json:"standard"`
	Profile           string         `json:"profile,omitempty"`
	AttachmentFilename string        `json:"attachment_filename,omitempty"`
	IsPDFA3Hint       bool           `json:"is_pdfa3_hint"`
	ExtractedInvoice  map[string]any `json:"extracted_invoice,omitempty"`
	Errors            []string       `json:"errors"`
	Warnings          []string       `json:"warnings"`
}

// MergeRequest configures merging 2 to 20 PDF documents.
type MergeRequest struct {
	PDFs     []string          `json:"pdfs"`
	Metadata map[string]string `json:"metadata,omitempty"`
}

// SplitRequest configures splitting a PDF by page ranges (e.g. "1-3, 4, 5-7").
type SplitRequest struct {
	PDF       string `json:"pdf"`
	Ranges    string `json:"ranges"`
	Store     *bool  `json:"store,omitempty"`
	ExpiresIn string `json:"expires_in,omitempty"`
}

// SplitPart represents one output part of a split PDF.
type SplitPart struct {
	PartIndex   int    `json:"part_index"`
	Range       string `json:"range"`
	PageCount   int    `json:"page_count"`
	SizeBytes   int    `json:"size_bytes"`
	FileID      string `json:"file_id,omitempty"`
	DownloadURL string `json:"download_url,omitempty"`
	DataURI     string `json:"data_uri,omitempty"`
}

// SplitResponse is the response returned by SplitPDF.
type SplitResponse struct {
	Success    bool        `json:"success"`
	TotalParts int         `json:"total_parts"`
	Parts      []SplitPart `json:"parts"`
}

// StampRequest configures stamping a PDF with watermarks, page numbers, headers/footers, or images.
type StampRequest struct {
	PDF                string  `json:"pdf"`
	WatermarkText      string  `json:"watermark_text,omitempty"`
	WatermarkOpacity   float64 `json:"watermark_opacity,omitempty"`
	WatermarkColor     string  `json:"watermark_color,omitempty"`
	WatermarkRotation  float64 `json:"watermark_rotation,omitempty"`
	WatermarkFontSize  float64 `json:"watermark_font_size,omitempty"`
	PageNumbers        bool    `json:"page_numbers,omitempty"`
	PageNumbersPosition string `json:"page_numbers_position,omitempty"`
	PageNumbersFormat  string  `json:"page_numbers_format,omitempty"`
	HeaderText         string  `json:"header_text,omitempty"`
	FooterText         string  `json:"footer_text,omitempty"`
	StampImage         string  `json:"stamp_image,omitempty"`
	StampImagePosition string  `json:"stamp_image_position,omitempty"`
}

// CompressRequest configures optimizing and linearizing a PDF.
type CompressRequest struct {
	PDF           string            `json:"pdf"`
	StripMetadata *bool             `json:"strip_metadata,omitempty"`
	Metadata      map[string]string `json:"metadata,omitempty"`
}

// FillFormRequest configures filling AcroForm fields in a PDF.
type FillFormRequest struct {
	PDF     string         `json:"pdf"`
	Fields  map[string]any `json:"fields"`
	Flatten *bool          `json:"flatten,omitempty"`
}

// SmartPDFVerificationReport contains the cryptographic proof-of-origin and zero-OCR extracted Dual-Brain JSON data.
type SmartPDFVerificationReport struct {
	Valid              bool           `json:"valid"`
	Signed             bool           `json:"signed"`
	Tampered           bool           `json:"tampered"`
	AIReady            bool           `json:"ai_ready"`
	DocID              string         `json:"doc_id"`
	IssuedAt           string         `json:"issued_at"`
	Issuer             string         `json:"issuer"`
	TemplateID         string         `json:"template_id"`
	PageCount          int            `json:"page_count"`
	FileSHA256         string         `json:"file_sha256"`
	ContentFingerprint string         `json:"content_fingerprint"`
	SignatureValid     bool           `json:"signature_valid"`
	ContentIntact      bool           `json:"content_intact"`
	LedgerVerified     bool           `json:"ledger_verified"`
	VerificationURL    string         `json:"verification_url"`
	DataHash           string         `json:"data_hash"`
	Data               map[string]any `json:"data"`
	Reasons            []string       `json:"reasons"`
}

// ValidationIssue describes a single field validation error on a hosted template or request.
type ValidationIssue struct {
	Field   string `json:"field"`
	Message string `json:"message"`
}

// APIError is returned whenever the Tailprint API responds with a non-2xx HTTP status.
type APIError struct {
	StatusCode int               `json:"status_code"`
	ErrorType  string            `json:"error,omitempty"`
	Message    string            `json:"message"`
	TemplateID string            `json:"template_id,omitempty"`
	Issues     []ValidationIssue `json:"issues,omitempty"`
}

func (e *APIError) Error() string {
	if e.Message != "" {
		return fmt.Sprintf("tailprint: HTTP %d: %s", e.StatusCode, e.Message)
	}
	return fmt.Sprintf("tailprint: HTTP %d", e.StatusCode)
}
