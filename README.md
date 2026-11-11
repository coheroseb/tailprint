# Tailprint (tailprint.com) - Tailwind-Native Render & PDF Engine + AI Web Scraper

A production-ready, type-safe, and high-performance microservice (EaaS) built with Node.js, TypeScript, and Fastify. The service accepts raw HTML styled with standard Tailwind CSS utility classes and returns print-ready PDF documents or optimized Open Graph images.

---

## ⚡ Highlights

- **Tailwind-Native:** Injects the Tailwind CSS engine on the fly—no client-side build steps required for arbitrary utility classes.
- **High Performance & Concurrency:** Global Playwright Chromium singleton with isolated per-request contexts (`browser.newContext()` and `context.newPage()`), guarded by a `p-limit(5)` pool to prevent memory/CPU exhaustion.
- **OpenAPI 3.1 & Interactive Docs:** Automatically generated OpenAPI 3.1 schema rendered with the modern `@scalar/fastify-api-reference` interface on `/docs` (Dark mode default).
## 💰 Pricing & Tier Architecture

Designed to undercut competitors while protecting margins and driving instant self-service conversion:

| Tier | Price | Monthly Limit | Target Audience & Unique Selling Point |
| :--- | :--- | :--- | :--- |
| **Starter** | **$14 / mo** | **2,500 renders** | Solo developers, side projects, small e-commerce. Removes all purchase friction. |
| **Pro (Most Popular)** | **$39 / mo** | **20,000 renders** | Growing SaaS, agencies with multiple client projects. Higher priority in the Chromium pool. |
| **Business / Scale** | **$99 / mo** | **75,000 renders** | Fast-scaling platforms needing high throughput without enterprise sales friction. |
| **Enterprise** | **$199+ / mo** | **100,000+ renders** | Large enterprise volume, uptime SLA agreement, dedicated Playwright workers. |
- **SHA-256 Deduplication Caching:** Intelligent image caching for identical requests with a 7-day TTL (`X-Cache: HIT / MISS`).
- **SSRF & Network Sandboxing:** Hardened against server-side request forgery by intercepting and blocking private and link-local ranges (`127.0.0.1`, `10.0.0.0/8`, `169.254.169.254`, etc.).
- **Stripe Webhook Lifecycle:** Automated key generation (`sec_live_...`), monthly quota reset on billing cycle renewal, and instant deactivation upon cancellation.
- **Fail-Safe Development Mode:** Built-in in-memory fallback with a pre-seeded developer key when Upstash credentials are not configured.

---

## 📂 Project Structure

```text
├── src/
│   ├── config/
│   │   ├── env.ts          # Zod schema for environment variables
│   │   ├── plans.ts        # Plan definitions (Starter: 3,000, Pro: 25,000, Enterprise: 100,000)
│   │   └── templates.ts    # Pre-built Tailwind templates (Invoice, Certificate, Executive Report)
│   ├── schemas/
│   │   └── render.ts       # Zod schemas for request validation & OpenAPI types
│   ├── services/
│   │   ├── browser.ts      # Chromium lifecycle, SSRF filter, concurrency pool & render methods
│   │   ├── redis.ts        # Upstash Redis & in-memory fallback, key hashing & cache layer
│   │   └── stripe.ts       # Webhook verification, checkout session creation & provisioning
│   ├── routes/
│   │   ├── render.ts       # /v1/render/pdf and /v1/render/image endpoints
│   │   ├── templates.ts    # Showcase landing page (/) and /templates download routes
│   │   └── webhooks.ts     # /v1/webhooks/stripe endpoint
│   └── server.ts           # Fastify setup, Swagger, Scalar UI, plugins & error handling
├── tests/
│   └── server.test.ts      # Integration test suite (Vitest)
├── Dockerfile              # Multi-stage production image with Chromium & fonts
├── docker-compose.yml      # Docker Compose setup with resource limits
├── render.yaml             # Render.com deployment blueprint
├── railway.json            # Railway.app configuration
├── package.json
└── tsconfig.json
```

---

## 🚀 Getting Started

### 1. Clone & Install
```bash
npm install
npx playwright install chromium
```

### 2. Environment Variables
Copy the template and adjust values as needed:
```bash
cp .env.example .env
```

| Variable | Description | Default |
| :--- | :--- | :--- |
| `PORT` | HTTP server port | `3000` |
| `HOST` | Binding address | `0.0.0.0` |
| `UPSTASH_REDIS_REST_URL` | Upstash Redis REST URL | *(Optional in dev)* |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis REST Token | *(Optional in dev)* |
| `STRIPE_SECRET_KEY` | Stripe Secret API Key | `sk_test_...` |
| `STRIPE_WEBHOOK_SECRET` | Stripe Webhook Signing Secret | `whsec_...` |
| `STRIPE_PRICE_STARTER` | Stripe Price ID for Starter tier | `price_...` |
| `STRIPE_PRICE_PRO` | Stripe Price ID for Pro tier | `price_...` |
| `CONCURRENCY_LIMIT` | Max concurrent Playwright renders | `5` |
| `RENDER_TIMEOUT_MS` | Hard rendering timeout | `8000` (8s) |
| `CACHE_TTL_SECONDS` | Image cache TTL in seconds | `604800` (7 days) |
| `DEV_DEFAULT_API_KEY` | Development API Key | `sec_live_dev_test_key_12345` |

### 3. Run Locally
```bash
# Development with hot-reload
npm run dev

# Production build & run
npm run build
npm start
```

### 4. Run Tests
```bash
npm test
```

---

## 📖 API Endpoints & Usage

Interactive documentation is available at **`http://localhost:3000/docs`**.

### 1. `POST /v1/render/pdf`
**Headers:**
```http
Authorization: Bearer sec_live_dev_test_key_12345
Content-Type: application/json
```

**Body:**
```json
{
  "html": "<div class='p-10 bg-slate-900 text-white font-sans'><h1 class='text-3xl text-emerald-400 font-bold'>Invoice #1001</h1><p class='mt-2 text-slate-300'>Styled with Tailwind CSS</p></div>",
  "format": "A4",
  "landscape": false,
  "print_background": true,
  "margin": {
    "top": "15mm",
    "bottom": "15mm",
    "left": "10mm",
    "right": "10mm"
  }
}
```
**Response:** Binary PDF stream (`Content-Type: application/pdf`).

---

### 2. `POST /v1/render/image`
**Headers:**
```http
Authorization: Bearer sec_live_dev_test_key_12345
Content-Type: application/json
```

**Body:**
```json
{
  "html": "<div class='w-full h-full flex items-center justify-center bg-gradient-to-r from-purple-600 to-indigo-600 text-white'><h1 class='text-5xl font-extrabold'>Tailprint</h1></div>",
  "width": 1200,
  "height": 630,
  "type": "png"
}
```
**Response:** Binary image with `X-Cache: HIT` or `X-Cache: MISS`.

---

### 3. `POST /v1/scrape/markdown` *(NEW: LLM-Ready Scraper)*
Fetches any dynamic webpage using headless Chromium, evaluates JavaScript, strips 95%+ noise/boilerplate via Mozilla Readability, and converts the clean article to structured GFM Markdown for LLMs and RAG.

**Headers:**
```http
Authorization: Bearer sec_live_dev_test_key_12345
Content-Type: application/json
```

**Body:**
```json
{
  "url": "https://techcrunch.com/2026/10/12/startup-funding",
  "strip_images": true,
  "wait_for": "article"
}
```

**Response (JSON):**
```json
{
  "url": "https://techcrunch.com/2026/10/12/startup-funding",
  "title": "AI Startup Raises $15M for Autonomous Agents",
  "byline": "Morten Jensen",
  "published_at": "2026-10-12T14:30:00Z",
  "description": "A new venture round led by Nordic investors to build European sovereign AI infrastructure.",
  "markdown": "# AI Startup Raises $15M for Autonomous Agents\n\nThe company announced today a fresh financing round...",
  "word_count": 640,
  "estimated_tokens": 820,
  "raw_content_bytes": 142000,
  "markdown_bytes": 4100,
  "token_savings_percent": "97.1%",
  "cached": false
}
```

---

### 4. `POST /v1/webhooks/stripe`
Handles Stripe subscription lifecycle:
- `checkout.session.completed` ➔ Provisions a new `sec_live_<hex>` key in Redis with the associated plan limit.
- `invoice.payment_succeeded` ➔ Resets the customer's monthly quota.
- `customer.subscription.deleted` ➔ Sets key status to `inactive`.

---

## 🐳 Docker Deployment

Build and run using the optimized multi-stage Dockerfile:

```bash
docker build -t eaas-render-engine .
docker run -p 3000:3000 --env-file .env eaas-render-engine
```

Or deploy with Docker Compose:
```bash
docker compose up -d --build
```
