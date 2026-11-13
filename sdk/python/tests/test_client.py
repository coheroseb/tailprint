import json
import unittest
import base64
import hashlib
import hmac
from unittest.mock import MagicMock, patch
from tailprint import (
    Tailprint,
    TailprintError,
    AuthenticationError,
    RateLimitError,
    ValidationError,
)


class TestTailprintClient(unittest.TestCase):
    def setUp(self):
        self.client = Tailprint(api_key="test_key_123", base_url="http://localhost:3000")

    def test_to_base64_data_uri(self):
        raw_bytes = b"%PDF-1.4 dummy"
        uri = self.client._to_base64_data_uri(raw_bytes)
        self.assertTrue(uri.startswith("data:application/pdf;base64,"))

        http_url = "https://example.com/doc.pdf"
        self.assertEqual(self.client._to_base64_data_uri(http_url), http_url)

    def test_verify_webhook_signature(self):
        payload = b'{"event":"render.completed","status":"completed"}'
        key = "secret_key"
        expected = hmac.new(key.encode("utf-8"), payload, hashlib.sha256).hexdigest()

        # Test valid signature with prefix
        valid = self.client.verify_webhook_signature(payload, f"sha256={expected}", secret=key)
        self.assertTrue(valid)

        # Test invalid signature
        invalid = self.client.verify_webhook_signature(payload, "sha256=invalidhash", secret=key)
        self.assertFalse(invalid)

    @patch("urllib.request.urlopen")
    def test_render_pdf_success(self, mock_urlopen):
        mock_response = MagicMock()
        mock_response.headers = {"Content-Type": "application/pdf"}
        mock_response.read.return_value = b"%PDF-1.4 mock content"
        mock_response.__enter__.return_value = mock_response
        mock_urlopen.return_value = mock_response

        pdf_bytes = self.client.render_pdf(html="<h1>Hello Test</h1>")
        self.assertEqual(pdf_bytes, b"%PDF-1.4 mock content")

    @patch("urllib.request.urlopen")
    def test_render_pdf_with_template_sends_template_id_and_data(self, mock_urlopen):
        mock_response = MagicMock()
        mock_response.headers = {"Content-Type": "application/pdf"}
        mock_response.read.return_value = b"%PDF-1.4 mock content"
        mock_response.__enter__.return_value = mock_response
        mock_urlopen.return_value = mock_response

        self.client.render_pdf(template_id="invoice-modern", data={"invoice_number": "INV-1"})

        request = mock_urlopen.call_args[0][0]
        payload = json.loads(request.data.decode("utf-8"))
        self.assertEqual(payload["template_id"], "invoice-modern")
        self.assertEqual(payload["data"], {"invoice_number": "INV-1"})
        self.assertNotIn("html", payload)

    @patch("urllib.request.urlopen")
    def test_list_and_get_templates(self, mock_urlopen):
        mock_response = MagicMock()
        mock_response.headers = {"Content-Type": "application/json"}
        mock_response.__enter__.return_value = mock_response
        mock_urlopen.return_value = mock_response

        mock_response.read.return_value = b'{"templates":[{"id":"invoice-modern"}]}'
        templates = self.client.list_templates()
        self.assertEqual(templates[0]["id"], "invoice-modern")
        self.assertTrue(mock_urlopen.call_args[0][0].full_url.endswith("/v1/templates"))

        mock_response.read.return_value = b'{"id":"invoice-modern","example_data":{}}'
        detail = self.client.get_template("invoice-modern")
        self.assertEqual(detail["id"], "invoice-modern")
        self.assertTrue(mock_urlopen.call_args[0][0].full_url.endswith("/v1/templates/invoice-modern"))

    @patch("urllib.request.urlopen")
    def test_get_job_success(self, mock_urlopen):
        mock_response = MagicMock()
        mock_response.headers = {"Content-Type": "application/json"}
        mock_response.read.return_value = b'{"job_id":"job_123","status":"completed"}'
        mock_response.__enter__.return_value = mock_response
        mock_urlopen.return_value = mock_response

        job = self.client.get_job("job_123")
        self.assertEqual(job["status"], "completed")
        self.assertEqual(job["job_id"], "job_123")


if __name__ == "__main__":
    unittest.main()
