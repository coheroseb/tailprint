package tailprint

import (
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)

func TestRenderPDFAndTemplate(t *testing.T) {
	var capturedAuth string
	var capturedBody map[string]any

	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		capturedAuth = r.Header.Get("Authorization")
		if r.URL.Path == "/v1/render/pdf" && r.Method == http.MethodPost {
			_ = json.NewDecoder(r.Body).Decode(&capturedBody)
			w.Header().Set("Content-Type", "application/pdf")
			_, _ = w.Write([]byte("%PDF-1.7-go-test"))
			return
		}
		http.NotFound(w, r)
	}))
	defer srv.Close()

	client := NewClient("sec_live_go_test", WithBaseURL(srv.URL), WithTimeout(5*time.Second))
	pdf, err := client.RenderTemplate(context.Background(), "invoice-modern", map[string]any{
		"invoice_number": "INV-2026-99",
		"issue_date":     "2026-11-13",
		"seller":         map[string]any{"name": "Tailprint ApS"},
		"buyer":          map[string]any{"name": "Gopher Corp"},
		"items": []map[string]any{
			{"description": "Go SDK", "quantity": 1, "unit_price": 49},
		},
	}, &RenderOptions{Format: "A4", SmartPagination: Bool(true)})

	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if string(pdf) != "%PDF-1.7-go-test" {
		t.Fatalf("unexpected pdf bytes: %q", string(pdf))
	}
	if capturedAuth != "Bearer sec_live_go_test" {
		t.Fatalf("unexpected auth header: %q", capturedAuth)
	}
	if capturedBody["template_id"] != "invoice-modern" {
		t.Fatalf("expected template_id=invoice-modern, got %v", capturedBody["template_id"])
	}
}

func TestListAndGetTemplates(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		if r.URL.Path == "/v1/templates" {
			_, _ = w.Write([]byte(`{"success":true,"count":1,"templates":[{"id":"invoice-modern","name":"Modern Invoice","category":"Finance"}]}`))
			return
		}
		if r.URL.Path == "/v1/templates/invoice-modern" {
			_, _ = w.Write([]byte(`{"success":true,"template":{"id":"invoice-modern","name":"Modern Invoice","example_data":{"invoice_number":"INV-1"}}}`))
			return
		}
		http.NotFound(w, r)
	}))
	defer srv.Close()

	client := NewClient("sec_live_go_test", WithBaseURL(srv.URL))
	list, err := client.ListTemplates(context.Background())
	if err != nil {
		t.Fatalf("ListTemplates failed: %v", err)
	}
	if len(list) != 1 || list[0].ID != "invoice-modern" {
		t.Fatalf("unexpected templates list: %+v", list)
	}

	detail, err := client.GetTemplate(context.Background(), "invoice-modern")
	if err != nil {
		t.Fatalf("GetTemplate failed: %v", err)
	}
	if detail.Template.ID != "invoice-modern" {
		t.Fatalf("unexpected template detail: %+v", detail)
	}
}

func TestAPIErrorUnmarshaling(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		_, _ = w.Write([]byte(`{
			"error": "Bad Request",
			"message": "Invalid data for template 'invoice-modern': seller.name: Required",
			"template_id": "invoice-modern",
			"issues": [{"field": "seller.name", "message": "Required"}]
		}`))
	}))
	defer srv.Close()

	client := NewClient("sec_live_go_test", WithBaseURL(srv.URL))
	_, err := client.RenderTemplate(context.Background(), "invoice-modern", map[string]any{}, nil)
	if err == nil {
		t.Fatal("expected error, got nil")
	}

	var apiErr *APIError
	if !errors.As(err, &apiErr) {
		t.Fatalf("expected *APIError, got %T", err)
	}
	if apiErr.StatusCode != 400 || len(apiErr.Issues) != 1 || apiErr.Issues[0].Field != "seller.name" {
		t.Fatalf("unexpected APIError contents: %+v", apiErr)
	}
}

func TestVerifyWebhookSignature(t *testing.T) {
	payload := []byte(`{"job_id":"job_99","status":"completed"}`)
	secret := "whsec_go_secret"

	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write(payload)
	sig := "sha256=" + hex.EncodeToString(mac.Sum(nil))

	if !VerifyWebhookSignature(payload, sig, secret) {
		t.Fatal("expected valid webhook signature")
	}
	if VerifyWebhookSignature(payload, "sha256=invalid", secret) {
		t.Fatal("expected invalid webhook signature to fail")
	}
}
