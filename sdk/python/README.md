# Tailprint Python SDK

[![PyPI version](https://img.shields.io/pypi/v/tailprint.svg)](https://pypi.org/project/tailprint/)
[![Python versions](https://img.shields.io/pypi/pyversions/tailprint.svg)](https://pypi.org/project/tailprint/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

Official Python client for **Tailprint** ([tailprint.com](https://tailprint.com)) — the developer-first programmable PDF and document engine.

Turns Tailwind CSS HTML, dynamic data, and AI prompts into pixel-perfect vector **PDFs**, European **Factur-X / ZUGFeRD e-invoices**, and provides full PDF manipulation operations (merge, split, fill forms, stamp, compress, validate).

- **Zero dependencies:** Built entirely with standard library modules (`urllib`, `json`, `base64`, `hmac`). Installs in < 1 second with 0 dependency conflicts.
- **Async & Batch:** Native support for asynchronous background rendering and concurrent multi-document batch runs.
- **Enterprise-Ready:** Cryptographic webhook signature verification and zero-retention GDPR mode.

---

## 📦 Installation

```bash
pip install tailprint
```

---

## 🚀 Quickstart

```python
import os
from tailprint import Tailprint

# Initialize with your API key (or set TAILPRINT_API_KEY environment variable)
tp = Tailprint(api_key=os.environ.get("TAILPRINT_API_KEY", "sec_live_..."))

# 1. Render Tailwind HTML to Vector PDF
pdf_bytes = tp.render_pdf(
    html="""
    <div class="p-12 bg-slate-900 text-white font-sans">
        <h1 class="text-3xl font-bold text-indigo-400">Quarterly Invoice</h1>
        <p class="text-slate-400 mt-2">Styled dynamically with Tailwind CSS.</p>
    </div>
    """,
    format="A4",
    smart_pagination=True,
)

with open("invoice.pdf", "wb") as f:
    f.write(pdf_bytes)
```

---

## ⚡ Asynchronous Rendering & Webhooks

For heavy 100+ page reports or async pipelines:

```python
# Submit rendering job in background
job = tp.render_pdf_async(
    html="<h1>Heavy 200-page Annual Financial Report</h1>",
    webhook_url="https://your-api.com/webhooks/pdf",
    webhook_headers={"X-Secret": "your_webhook_secret"},
)

print("Job queued:", job["job_id"])

# Optionally poll until finished:
completed_job = tp.wait_for_job(job["job_id"], poll_interval=1.0, timeout=60.0)
print("Download URL:", completed_job["results"][0]["download_url"])
```

---

## 📦 Concurrent Batch Rendering with Auto-Merge

Render up to 100 documents concurrently and optionally merge them into a single multi-page PDF:

```python
batch = tp.render_batch(
    items=[
        {"html": "<h1>Invoice #101</h1>", "filename": "inv-101.pdf"},
        {"html": "<h1>Invoice #102</h1>", "filename": "inv-102.pdf"},
        {"html": "<h1>Invoice #103</h1>", "filename": "inv-103.pdf"},
    ],
    merge_output=True,
    merged_filename="all-invoices.pdf",
    webhook_url="https://your-api.com/webhooks/pdf",
)

completed = tp.wait_for_job(batch["job_id"])
print("Merged PDF link:", completed["merged_output"]["download_url"])
```

---

## 🇪🇺 European Factur-X / ZUGFeRD E-Invoicing

### Generate Compliant Hybrid PDF/A-3
```python
invoice_pdf = tp.generate_einvoice(
    invoice_number="INV-2026-0042",
    currency="EUR",
    seller={"name": "Acme Nordic ApS", "country": "DK", "vat_id": "DK12345678"},
    buyer={"name": "Global Logistics GmbH", "country": "DE", "vat_id": "DE987654321"},
    line_items=[
        {"name": "Consulting Services", "quantity": 10, "unit_price": 150.0, "vat_rate": 25.0}
    ],
    payment_iban="DK001234567890",
)
```

### Validate E-Invoice Compliance (EN 16931)
```python
report = tp.validate_einvoice(pdf=invoice_pdf)
print("Compliant:", report["is_valid"])
print("Profile:", report["profile"])
print("Totals:", report["invoice_details"]["totals"])
```

---

## 🛠 Complete PDF Operations

```python
# 1. Merge multiple PDFs
merged_pdf = tp.merge_pdfs([doc1_bytes, doc2_bytes])

# 2. Extract pages (e.g. pages 1 to 3, and page 5)
split_pdf = tp.split_pdf(doc_bytes, pages="1-3, 5")

# 3. Fill interactive AcroForms
filled_pdf = tp.fill_pdf_form(doc_bytes, fields={"customer_name": "Alice", "opt_in": True})

# 4. Stamp watermark or compliance mark
stamped_pdf = tp.stamp_pdf(doc_bytes, watermark_text="CONFIDENTIAL", opacity=0.2)

# 5. Compress PDF file size
compressed_pdf = tp.compress_pdf(doc_bytes)
```

---

## 🔐 Webhook Signature Verification

Verify HMAC-SHA256 signatures in FastAPI, Flask, or Django:

```python
from fastapi import FastAPI, Request, HTTPException

app = FastAPI()

@app.post("/webhooks/pdf")
async def handle_webhook(request: Request):
    payload = await request.body()
    sig_header = request.headers.get("x-tailprint-signature", "")
    
    if not tp.verify_webhook_signature(payload, sig_header):
        raise HTTPException(status_code=401, detail="Invalid signature")
        
    data = await request.json()
    print("PDF rendered:", data["data"]["download_url"])
    return {"status": "ok"}
```

---

## 📄 License

MIT © [Tailprint](https://tailprint.com)
