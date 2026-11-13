# Tailprint Go SDK

[![Go Reference](https://pkg.go.dev/badge/github.com/coheroseb/tailprint/sdk/go.svg)](https://pkg.go.dev/github.com/coheroseb/tailprint/sdk/go)
[![Go Version](https://img.shields.io/badge/Go-%3E%3D%201.21-00ADD8.svg)](https://go.dev/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

Official Go client for **Tailprint** ([tailprint.com](https://tailprint.com)) — the developer-first Tailwind CSS HTML-to-PDF, Hosted Templates, and EU Factur-X / ZUGFeRD E-Invoicing engine.

- **Zero external dependencies:** Built purely on the Go standard library (`net/http`, `context`, `encoding/json`, `crypto/hmac`).
- **Context-aware & concurrent-safe:** Every API call accepts `context.Context` for deadlines, cancellation, and tracing.
- **Hosted Templates (`TemplateID` + `Data`):** Pass structured data and receive server-calculated invoices, receipts, certificates, and executive reports.
- **Full API coverage:** Tailwind HTML/URL rendering, Hosted Templates, Factur-X / ZUGFeRD 2.2 e-invoicing, concurrent batch jobs, PDF merge/split/stamp/compress/forms, and webhook HMAC verification.

---

## 📦 Installation

```bash
go get github.com/coheroseb/tailprint/sdk/go@latest
```

---

## 🚀 Quickstart

### 1. Hosted Templates (JSON in, PDF out)

```go
package main

import (
	"context"
	"log"
	"os"

	"github.com/coheroseb/tailprint/sdk/go"
)

func main() {
	client := tailprint.NewClient(os.Getenv("TAILPRINT_API_KEY"))
	ctx := context.Background()

	pdfBytes, err := client.RenderTemplate(ctx, "invoice-modern", map[string]any{
		"invoice_number": "INV-2026-1042",
		"issue_date":     "2026-11-13",
		"due_date":       "2026-11-27",
		"currency":       "EUR",
		"seller": map[string]any{
			"name":       "Tailprint ApS",
			"vat_number": "DK44198271",
			"email":      "billing@tailprint.com",
		},
		"buyer": map[string]any{
			"name":  "Acme GmbH",
			"email": "ap@acme.de",
		},
		"items": []map[string]any{
			{"description": "Tailprint Pro Plan", "quantity": 1, "unit_price": 49.0},
		},
		"tax_rate": 25,
	}, nil)
	if err != nil {
		log.Fatal(err)
	}

	if err := os.WriteFile("invoice.pdf", pdfBytes, 0644); err != nil {
		log.Fatal(err)
	}
}
```

### 2. Render Tailwind CSS HTML to Vector PDF

```go
pdfBytes, err := client.RenderPDF(ctx, tailprint.RenderOptions{
	HTML: `
		<div class="p-12 bg-slate-900 text-white font-sans">
			<h1 class="text-3xl font-bold text-indigo-400">Quarterly Report</h1>
			<p class="text-slate-400 mt-2">Rendered from Go with zero dependencies.</p>
		</div>
	`,
	Format:          "A4",
	SmartPagination: tailprint.Bool(true),
})
```

### 3. European Factur-X / ZUGFeRD 2.2 E-Invoicing

```go
einvoicePDF, err := client.GenerateEInvoice(ctx, tailprint.EInvoiceRequest{
	Invoice: tailprint.EInvoiceData{
		InvoiceNumber: "FX-2026-0091",
		IssueDate:     "2026-11-13",
		Currency:      "EUR",
		Seller: tailprint.EInvoiceParty{
			Name:        "Tailprint ApS",
			VATNumber:   "DK12345678",
			CountryCode: "DK",
		},
		Buyer: tailprint.EInvoiceParty{
			Name:        "Siemens AG",
			VATNumber:   "DE987654321",
			CountryCode: "DE",
		},
		LineItems: []tailprint.EInvoiceLineItem{
			{
				Name:      "Enterprise PDF Engine License",
				Quantity:  1,
				UnitPrice: 499.00,
				TaxRate:   19.0,
			},
		},
	},
})
```

### 4. Concurrent Batch Rendering & Job Polling

```go
job, err := client.RenderBatch(ctx, tailprint.BatchRequest{
	Items: []tailprint.BatchItem{
		{HTML: "<h1>Invoice #1</h1>", Filename: "inv-1.pdf"},
		{HTML: "<h1>Invoice #2</h1>", Filename: "inv-2.pdf"},
	},
	MergeOutput:    true,
	MergedFilename: "all-invoices.pdf",
})
if err != nil {
	log.Fatal(err)
}

completed, err := client.WaitForJob(ctx, job.JobID, time.Second)
if err != nil {
	log.Fatal(err)
}
log.Println("Merged PDF URL:", completed.MergedOutput.DownloadURL)
```

---

## 📄 License

MIT License — see [https://tailprint.com](https://tailprint.com).
