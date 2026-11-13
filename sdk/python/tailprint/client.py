"""Official Tailprint Python Client SDK.

High-performance Tailwind HTML to Vector PDF, EU Factur-X / ZUGFeRD E-Invoicing,
PDF Operations (Merge, Split, Stamp, Compress, Fill Forms) & Asynchronous Batch Engine.

Documentation: https://tailprint.com/docs
"""

import base64
import hashlib
import hmac
import json
import os
import time
import urllib.error
import urllib.parse
import urllib.request
from typing import Any, Dict, List, Optional, Union

from .errors import (
    AuthenticationError,
    RateLimitError,
    TailprintError,
    TimeoutError,
    ValidationError,
)

PDFInput = Union[bytes, bytearray, str]


class Tailprint:
    """Tailprint API Client."""

    def __init__(
        self,
        api_key: Optional[str] = None,
        base_url: Optional[str] = None,
        timeout: float = 30.0,
    ) -> None:
        """Initialize Tailprint client.

        Args:
            api_key: Tailprint API Key (e.g. 'sec_live_...'). Defaults to TAILPRINT_API_KEY env var.
            base_url: Base API URL. Defaults to 'https://tailprint.com'.
            timeout: Request timeout in seconds. Defaults to 30.0.
        """
        self.api_key = api_key or os.environ.get("TAILPRINT_API_KEY", "")
        self.base_url = (base_url or os.environ.get("TAILPRINT_BASE_URL", "https://tailprint.com")).rstrip("/")
        self.timeout = timeout

    def _to_base64_data_uri(self, input_val: PDFInput) -> str:
        """Helper to convert bytes or string to data URI / URL string."""
        if isinstance(input_val, (bytes, bytearray)):
            b64 = base64.b64encode(input_val).decode("utf-8")
            return f"data:application/pdf;base64,{b64}"
        if isinstance(input_val, str):
            if input_val.startswith("http://") or input_val.startswith("https://") or input_val.startswith("data:"):
                return input_val
            # Assume raw base64 string
            return f"data:application/pdf;base64,{input_val}"
        raise ValueError("Invalid PDF input: must be bytes or string URL/Base64")

    def _request(
        self,
        endpoint: str,
        method: str = "POST",
        payload: Optional[Dict[str, Any]] = None,
        expect_binary: bool = False,
    ) -> Union[bytes, Dict[str, Any]]:
        """Executes an HTTP request to the Tailprint API."""
        url = f"{self.base_url}{endpoint}"
        headers = {
            "User-Agent": "Tailprint-Python-SDK/1.4.0",
        }

        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"

        data: Optional[bytes] = None
        if payload is not None:
            headers["Content-Type"] = "application/json"
            data = json.dumps(payload).encode("utf-8")

        req = urllib.request.Request(url, data=data, headers=headers, method=method)

        try:
            with urllib.request.urlopen(req, timeout=self.timeout) as response:
                content_type = response.headers.get("Content-Type", "")
                body = response.read()

                if expect_binary or "application/pdf" in content_type:
                    return body

                if body:
                    try:
                        return json.loads(body.decode("utf-8"))
                    except Exception:
                        return body
                return {}

        except urllib.error.HTTPError as err:
            err_body = err.read().decode("utf-8") if err.fp else ""
            msg = err.reason
            details = None

            try:
                parsed = json.loads(err_body)
                msg = parsed.get("message", msg)
                details = parsed.get("details")
            except Exception:
                if err_body:
                    msg = err_body

            if err.code == 401:
                raise AuthenticationError(msg, err.code, details) from err
            elif err.code == 429:
                raise RateLimitError(msg, err.code, details) from err
            elif err.code == 400:
                raise ValidationError(msg, err.code, details) from err
            elif err.code in (408, 504):
                raise TimeoutError(msg, err.code, details) from err
            else:
                raise TailprintError(msg, err.code, details) from err

        except urllib.error.URLError as err:
            raise TailprintError(f"Connection failed: {err.reason}", 503) from err

    # =========================================================================
    # CORE PDF RENDERING
    # =========================================================================

    def render_pdf(
        self,
        html: Optional[str] = None,
        url: Optional[str] = None,
        template_id: Optional[str] = None,
        data: Optional[Dict[str, Any]] = None,
        format: str = "A4",
        landscape: bool = False,
        print_background: bool = True,
        margin: Optional[Dict[str, str]] = None,
        display_header_footer: Optional[bool] = None,
        header_html: Optional[str] = None,
        footer_html: Optional[str] = None,
        smart_pagination: bool = True,
        password: Optional[str] = None,
        owner_password: Optional[str] = None,
        wait_for: Optional[str] = None,
        delay_ms: Optional[int] = None,
        block_popups: bool = False,
        no_store: bool = False,
        store: bool = False,
        expires_in: str = "24h",
    ) -> Union[bytes, Dict[str, Any]]:
        """Renders HTML (with Tailwind CSS classes) or a public URL to vector PDF.

        Args:
            html: HTML string with Tailwind CSS utility classes.
            url: Direct web URL to capture as vector PDF.
            template_id: Hosted template id (e.g. 'invoice-modern'); use with ``data`` instead of html/url.
            data: JSON data for ``template_id``. See ``list_templates()`` / ``get_template()``.
            format: Paper size ('A4', 'Letter', 'Legal').
            landscape: Landscape orientation if True.
            margin: Dict with 'top', 'bottom', 'left', 'right' (e.g. {'top': '10mm'}).
            store: If True, stores PDF on Tailprint CDN and returns a hosted link dict.

        Returns:
            bytes (PDF binary stream) or dict (if store=True).
        """
        payload: Dict[str, Any] = {
            "format": format,
            "landscape": landscape,
            "print_background": print_background,
            "smart_pagination": smart_pagination,
            "no_store": no_store,
            "store": store,
            "expires_in": expires_in,
        }
        if html is not None:
            payload["html"] = html
        if url is not None:
            payload["url"] = url
        if template_id is not None:
            payload["template_id"] = template_id
        if data is not None:
            payload["data"] = data
        if margin is not None:
            payload["margin"] = margin
        if header_html is not None:
            payload["header_html"] = header_html
        if footer_html is not None:
            payload["footer_html"] = footer_html
        if display_header_footer is not None:
            payload["display_header_footer"] = display_header_footer
        if password is not None:
            payload["password"] = password
        if owner_password is not None:
            payload["owner_password"] = owner_password
        if wait_for is not None:
            payload["wait_for"] = wait_for
        if delay_ms is not None:
            payload["delay_ms"] = delay_ms
        if block_popups:
            payload["block_popups"] = True

        return self._request("/v1/render/pdf", payload=payload, expect_binary=not store)

    # =========================================================================
    # HOSTED TEMPLATES
    # =========================================================================

    def list_templates(self) -> List[Dict[str, Any]]:
        """Lists hosted document templates usable with ``render_pdf(template_id=..., data=...)``."""
        res = self._request("/v1/templates", method="GET", expect_binary=False)
        templates = res.get("templates", []) if isinstance(res, dict) else []
        return templates if isinstance(templates, list) else []

    def get_template(self, template_id: str) -> Dict[str, Any]:
        """Returns a hosted template with complete ``example_data`` and a ready-to-send ``example_request``."""
        res = self._request(f"/v1/templates/{urllib.parse.quote(template_id, safe='')}", method="GET", expect_binary=False)
        return res if isinstance(res, dict) else {}

    # =========================================================================
    # ASYNCHRONOUS & BATCH RENDERING
    # =========================================================================

    def render_pdf_async(
        self,
        html: Optional[str] = None,
        url: Optional[str] = None,
        template_id: Optional[str] = None,
        data: Optional[Dict[str, Any]] = None,
        webhook_url: Optional[str] = None,
        webhook_headers: Optional[Dict[str, str]] = None,
        format: str = "A4",
        landscape: bool = False,
        margin: Optional[Dict[str, str]] = None,
        header_html: Optional[str] = None,
        footer_html: Optional[str] = None,
        smart_pagination: bool = True,
        delay_ms: Optional[int] = None,
        expires_in: str = "24h",
    ) -> Dict[str, Any]:
        """Submits a PDF rendering job asynchronously in background.

        Returns immediately with a job_id and status_url.
        """
        payload: Dict[str, Any] = {
            "format": format,
            "landscape": landscape,
            "smart_pagination": smart_pagination,
            "async": True,
            "expires_in": expires_in,
        }
        if html is not None:
            payload["html"] = html
        if url is not None:
            payload["url"] = url
        if template_id is not None:
            payload["template_id"] = template_id
        if data is not None:
            payload["data"] = data
        if webhook_url is not None:
            payload["webhook_url"] = webhook_url
        if webhook_headers is not None:
            payload["webhook_headers"] = webhook_headers
        if margin is not None:
            payload["margin"] = margin
        if header_html is not None:
            payload["header_html"] = header_html
        if footer_html is not None:
            payload["footer_html"] = footer_html
        if delay_ms is not None:
            payload["delay_ms"] = delay_ms

        res = self._request("/v1/render/pdf", payload=payload, expect_binary=False)
        return res if isinstance(res, dict) else {}

    def render_batch(
        self,
        items: List[Dict[str, Any]],
        merge_output: bool = False,
        merged_filename: str = "merged-batch.pdf",
        webhook_url: Optional[str] = None,
        webhook_headers: Optional[Dict[str, str]] = None,
        expires_in: str = "24h",
    ) -> Dict[str, Any]:
        """Submits up to 100 documents for concurrent batch rendering with optional merging."""
        payload: Dict[str, Any] = {
            "items": items,
            "merge_output": merge_output,
            "merged_filename": merged_filename,
            "expires_in": expires_in,
        }
        if webhook_url is not None:
            payload["webhook_url"] = webhook_url
        if webhook_headers is not None:
            payload["webhook_headers"] = webhook_headers

        res = self._request("/v1/render/batch", payload=payload, expect_binary=False)
        return res if isinstance(res, dict) else {}

    def get_job(self, job_id: str) -> Dict[str, Any]:
        """Retrieves the live processing status, progress, and download links of a job."""
        res = self._request(f"/v1/jobs/{job_id}", method="GET", expect_binary=False)
        return res if isinstance(res, dict) else {}

    def wait_for_job(
        self,
        job_id: str,
        poll_interval: float = 1.0,
        timeout: float = 60.0,
    ) -> Dict[str, Any]:
        """Polls a job until it reaches 'completed' or 'failed', or until timeout expires."""
        start_time = time.time()
        while time.time() - start_time < timeout:
            job = self.get_job(job_id)
            if job.get("status") in ("completed", "failed"):
                return job
            time.sleep(poll_interval)

        raise TimeoutError(f"Job {job_id} did not finish within {timeout}s", 408)

    # =========================================================================
    # EUROPEAN E-INVOICING (Factur-X / ZUGFeRD / EN 16931)
    # =========================================================================

    def generate_einvoice(
        self,
        invoice_number: str,
        seller: Dict[str, Any],
        buyer: Dict[str, Any],
        line_items: List[Dict[str, Any]],
        currency: str = "EUR",
        issue_date: Optional[str] = None,
        due_date: Optional[str] = None,
        payment_iban: Optional[str] = None,
        payment_bic: Optional[str] = None,
        notes: Optional[str] = None,
        profile: str = "BASIC",
        store: bool = False,
        expires_in: str = "24h",
    ) -> Union[bytes, Dict[str, Any]]:
        """Generates a legally compliant European Factur-X / ZUGFeRD hybrid PDF/A-3 invoice with embedded XML."""
        payload: Dict[str, Any] = {
            "invoiceNumber": invoice_number,
            "currency": currency,
            "seller": seller,
            "buyer": buyer,
            "lineItems": line_items,
            "profile": profile,
            "store": store,
            "expires_in": expires_in,
        }
        if issue_date:
            payload["issueDate"] = issue_date
        if due_date:
            payload["dueDate"] = due_date
        if payment_iban:
            payload["paymentIban"] = payment_iban
        if payment_bic:
            payload["paymentBic"] = payment_bic
        if notes:
            payload["notes"] = notes

        return self._request("/v1/render/einvoice", payload=payload, expect_binary=not store)

    def validate_einvoice(
        self,
        pdf: Optional[PDFInput] = None,
        xml: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Inspects a PDF or XML invoice to verify compliance with European standard EN 16931."""
        payload: Dict[str, Any] = {}
        if pdf is not None:
            payload["pdf"] = self._to_base64_data_uri(pdf)
        if xml is not None:
            payload["xml"] = xml

        res = self._request("/v1/pdf/validate-einvoice", payload=payload, expect_binary=False)
        return res if isinstance(res, dict) else {}

    # =========================================================================
    # PDF OPERATIONS (Merge, Split, Fill, Compress, Stamp)
    # =========================================================================

    def merge_pdfs(
        self,
        pdfs: List[PDFInput],
        output_filename: str = "merged.pdf",
        store: bool = False,
        expires_in: str = "24h",
    ) -> Union[bytes, Dict[str, Any]]:
        """Merges two or more PDFs into a single unified vector PDF."""
        payload = {
            "pdfs": [self._to_base64_data_uri(p) for p in pdfs],
            "output_filename": output_filename,
            "store": store,
            "expires_in": expires_in,
        }
        return self._request("/v1/pdf/merge", payload=payload, expect_binary=not store)

    def split_pdf(
        self,
        pdf: PDFInput,
        pages: str,
        output_filename: str = "extracted.pdf",
        store: bool = False,
        expires_in: str = "24h",
    ) -> Union[bytes, Dict[str, Any]]:
        """Extracts specific pages or page ranges from a PDF (e.g. '1-3, 5, 8-10')."""
        payload = {
            "pdf": self._to_base64_data_uri(pdf),
            "pages": pages,
            "output_filename": output_filename,
            "store": store,
            "expires_in": expires_in,
        }
        return self._request("/v1/pdf/split", payload=payload, expect_binary=not store)

    def fill_pdf_form(
        self,
        pdf: PDFInput,
        fields: Dict[str, Any],
        flatten: bool = True,
        output_filename: str = "completed-form.pdf",
        store: bool = False,
        expires_in: str = "24h",
    ) -> Union[bytes, Dict[str, Any]]:
        """Fills interactive AcroForms with text, checkboxes, and radios."""
        payload = {
            "pdf": self._to_base64_data_uri(pdf),
            "fields": fields,
            "flatten": flatten,
            "output_filename": output_filename,
            "store": store,
            "expires_in": expires_in,
        }
        return self._request("/v1/pdf/fill-form", payload=payload, expect_binary=not store)

    def compress_pdf(
        self,
        pdf: PDFInput,
        output_filename: str = "compressed.pdf",
        store: bool = False,
        expires_in: str = "24h",
    ) -> Union[bytes, Dict[str, Any]]:
        """Shrinks PDF file size via object stream compression."""
        payload = {
            "pdf": self._to_base64_data_uri(pdf),
            "output_filename": output_filename,
            "store": store,
            "expires_in": expires_in,
        }
        return self._request("/v1/pdf/compress", payload=payload, expect_binary=not store)

    def stamp_pdf(
        self,
        pdf: PDFInput,
        watermark_text: str,
        color: str = "red",
        opacity: float = 0.15,
        font_size: int = 54,
        output_filename: Optional[str] = None,
        store: bool = False,
        expires_in: str = "24h",
    ) -> Union[bytes, Dict[str, Any]]:
        """Stamps a diagonal watermark or compliance stamp across all pages of a PDF."""
        payload: Dict[str, Any] = {
            "pdf": self._to_base64_data_uri(pdf),
            "watermark_text": watermark_text,
            "color": color,
            "opacity": opacity,
            "font_size": font_size,
            "store": store,
            "expires_in": expires_in,
        }
        if output_filename:
            payload["output_filename"] = output_filename
        return self._request("/v1/pdf/stamp", payload=payload, expect_binary=not store)

    # =========================================================================
    # UTILITIES & USAGE
    # =========================================================================

    def get_usage(self) -> Dict[str, Any]:
        """Returns real-time monthly quota usage and limits."""
        res = self._request("/v1/usage", method="GET", expect_binary=False)
        return res if isinstance(res, dict) else {}

    def verify_webhook_signature(
        self,
        payload_bytes: bytes,
        signature_header: str,
        secret: Optional[str] = None,
    ) -> bool:
        """Verifies the HMAC-SHA256 signature on an incoming webhook request."""
        signing_key = (secret or self.api_key).encode("utf-8")
        expected_sig = hmac.new(signing_key, payload_bytes, hashlib.sha256).hexdigest()

        header_val = signature_header.strip()
        if header_val.startswith("sha256="):
            header_val = header_val[7:]

        return hmac.compare_digest(expected_sig, header_val)
