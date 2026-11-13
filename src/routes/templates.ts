import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import fs from 'node:fs';
import path from 'node:path';
import { TEMPLATES } from '../config/templates.js';
import { PLANS } from '../config/plans.js';
import { browserService } from '../services/browser.js';
import { stripeService } from '../services/stripe.js';
import { env } from '../config/env.js';
import { renderGlobalNavbar } from '../components/navbar.js';
import { GUIDE_ARTICLES } from './guides.js';

export const templateRoutes: FastifyPluginAsyncZod = async (fastify) => {
  // GET /templates - Return JSON catalog of templates
  fastify.get(
    '/templates',
    {
      schema: {
        tags: ['Templates'],
        summary: 'List Ready-to-Use Tailwind Document Templates',
        description: 'Returns pre-designed Tailwind CSS PDF document templates for Invoices, EU Factur-X E-Invoices, Certificates, Executive Reports, Resumes, Quotes, NDAs, Statements, Presentations, Contracts, and Shipping Labels.',
      },
    },
    async () => {
      return {
        templates: TEMPLATES.filter((t) => t.id !== 'og-card').map((t) => ({
          id: t.id,
          title: t.title,
          category: t.category,
          description: t.description,
          format: t.format,
          landscape: t.landscape,
        })),
      };
    }
  );

  // GET /templates/:id/download - Live render and download PDF
  fastify.get(
    '/templates/:id/download',
    {
      schema: {
        tags: ['Templates'],
        summary: 'Download Rendered PDF for Template',
        params: z.object({
          id: z.string(),
        }),
      },
    },
    async (request, reply) => {
      const { id } = request.params;
      const template = TEMPLATES.find((t) => t.id === id);
      if (!template) {
        return reply.code(404).send({
          statusCode: 404,
          error: 'Not Found',
          message: `Template '${id}' not found. Available: ${TEMPLATES.map((t) => t.id).join(', ')}`,
        });
      }

      if (template.id === 'og-card') {
        // Special case: OG card renders as high-res PNG image
        const imgBuffer = await browserService.renderImage({
          html: template.html,
          width: 1200,
          height: 630,
          type: 'png',
        });

        return reply
          .code(200)
          .header('Content-Type', 'image/png')
          .header('Content-Disposition', `attachment; filename="${template.id}-preview.png"`)
          .header('Content-Length', String(imgBuffer.length))
          .send(imgBuffer);
      }

      const pdfBuffer = await browserService.renderPdf({
        html: template.html,
        format: template.format,
        landscape: template.landscape,
        print_background: true,
      });

      return reply
        .code(200)
        .header('Content-Type', 'application/pdf')
        .header('Content-Disposition', `attachment; filename="${template.id}-preview.pdf"`)
        .header('Content-Length', String(pdfBuffer.length))
        .send(pdfBuffer);
    }
  );

  // Internal checkout endpoints for frontend landing page pricing buttons
  fastify.post('/v1/billing/checkout', { schema: { hide: true } }, async (request, reply) => {
    const { planId, customerEmail } = request.body as any;
    const session = await stripeService.createCheckoutSession({
      planId,
      customerEmail,
    });

    return reply.code(200).send({
      success: true,
      sessionId: session.sessionId,
      checkoutUrl: session.url,
      isMock: session.isMock,
    });
  });

  fastify.post('/billing/create-checkout-session', { schema: { hide: true } }, async (request, reply) => {
    const { planId, customerEmail } = request.body as any;
    const session = await stripeService.createCheckoutSession({
      planId,
      customerEmail,
    });

    return reply.code(200).send({
      success: true,
      sessionId: session.sessionId,
      checkoutUrl: session.url,
      isMock: session.isMock,
    });
  });

  // GET /og-image.png - Open Graph preview image
  fastify.get('/og-image.png', { schema: { hide: true } }, async (_request, reply) => {
    const ogPath = path.join(process.cwd(), 'assets', 'og-image.png');
    if (fs.existsSync(ogPath)) {
      const buffer = fs.readFileSync(ogPath);
      return reply
        .header('Content-Type', 'image/png')
        .header('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800')
        .send(buffer);
    }
    return reply.code(404).send({ error: 'OG image not found' });
  });

  // GET /logo.svg & /tailprint-logo.svg - Official Vector Brand Wordmark
  const serveLogoSvg = async (_request: any, reply: any) => {
    const logoPath = path.join(process.cwd(), 'assets', 'logo.svg');
    if (fs.existsSync(logoPath)) {
      const svg = fs.readFileSync(logoPath, 'utf8');
      return reply
        .header('Content-Type', 'image/svg+xml; charset=utf-8')
        .header('Cache-Control', 'public, max-age=3600, stale-while-revalidate=86400')
        .send(svg);
    }
    return reply.code(404).send({ error: 'Logo SVG not found' });
  };
  fastify.get('/logo.svg', { schema: { hide: true } }, serveLogoSvg);
  fastify.get('/tailprint-logo.svg', { schema: { hide: true } }, serveLogoSvg);

  // GET /favicon.ico & /tailprint-favicon.svg - Official Vector Favicon
  const serveFavicon = async (_request: any, reply: any) => {
    const favPath = path.join(process.cwd(), 'assets', 'tailprint-favicon.svg');
    if (fs.existsSync(favPath)) {
      const svg = fs.readFileSync(favPath, 'utf8');
      return reply
        .header('Content-Type', 'image/svg+xml; charset=utf-8')
        .header('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800')
        .send(svg);
    }
    return reply.code(204).send();
  };
  fastify.get('/favicon.ico', { schema: { hide: true } }, serveFavicon);
  fastify.get('/tailprint-favicon.svg', { schema: { hide: true } }, serveFavicon);

  // GET /robots.txt - Search & AI Crawler Directives (SEO & GEO)
  fastify.get('/robots.txt', { schema: { hide: true } }, async (_request, reply) => {
    const robots = [
      'User-agent: *',
      'Allow: /',
      'Disallow: /v1/billing/portal',
      '',
      '# AI Crawlers & Answer Engines (GEO - Generative Engine Optimization)',
      'User-agent: GPTBot',
      'Allow: /',
      '',
      'User-agent: ChatGPT-User',
      'Allow: /',
      '',
      'User-agent: PerplexityBot',
      'Allow: /',
      '',
      'User-agent: ClaudeBot',
      'Allow: /',
      '',
      'User-agent: Anthropic-ai',
      'Allow: /',
      '',
      'User-agent: Google-Extended',
      'Allow: /',
      '',
      'User-agent: Cohere-ai',
      'Allow: /',
      '',
      'Sitemap: https://tailprint.com/sitemap.xml',
      ''
    ].join('\n');

    return reply
      .header('Content-Type', 'text/plain; charset=utf-8')
      .header('Cache-Control', 'public, max-age=3600')
      .send(robots);
  });

  // GET /sitemap.xml - XML Sitemap for Search Engines
  fastify.get('/sitemap.xml', { schema: { hide: true } }, async (_request, reply) => {
    const today = new Date().toISOString().split('T')[0];
    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://tailprint.com/</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://tailprint.com/docs</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>https://tailprint.com/studio</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>https://tailprint.com/tools/factur-x</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>https://tailprint.com/showcase</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.85</priority>
  </url>
  <url>
    <loc>https://tailprint.com/guides</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.85</priority>
  </url>
  <url>
    <loc>https://tailprint.com/guides/tailwind-html-to-pdf-nextjs</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.85</priority>
  </url>
  <url>
    <loc>https://tailprint.com/guides/factur-x-zugferd-pdf-api</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.85</priority>
  </url>
  <url>
    <loc>https://tailprint.com/guides/puppeteer-serverless-pdf-alternatives</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.85</priority>
  </url>
  <url>
    <loc>https://tailprint.com/guides/best-mcp-servers-claude-cursor</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.85</priority>
  </url>
  <url>
    <loc>https://tailprint.com/tools</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://tailprint.com/dashboard</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>https://tailprint.com/llms.txt</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>
</urlset>`;

    return reply
      .header('Content-Type', 'application/xml; charset=utf-8')
      .header('Cache-Control', 'public, max-age=3600')
      .send(sitemap);
  });

  // GET /rss.xml & /feed.xml - RSS 2.0 Feed for Automations (Make.com, Zapier, Feedly)
  const serveRssFeed = async (_request: any, reply: any) => {
    const coreSlugs = new Set([
      'tailwind-html-to-pdf-nextjs',
      'factur-x-zugferd-pdf-api',
      'puppeteer-serverless-pdf-alternatives',
      'best-mcp-servers-claude-cursor',
    ]);
    const articles = Object.values(GUIDE_ARTICLES)
      .filter((a) => coreSlugs.has(a.slug))
      .sort((a, b) => new Date(b.datePublished).getTime() - new Date(a.datePublished).getTime());

    const escapeXml = (unsafe: string) =>
      unsafe.replace(/[<>&'"]/g, (c) => {
        switch (c) {
          case '<': return '&lt;';
          case '>': return '&gt;';
          case '&': return '&amp;';
          case '\'': return '&apos;';
          case '"': return '&quot;';
          default: return c;
        }
      });

    const itemsXml = articles
      .map(
        (article) => `    <item>
      <title>${escapeXml(article.title)}</title>
      <link>https://tailprint.com/guides/${article.slug}</link>
      <guid isPermaLink="true">https://tailprint.com/guides/${article.slug}</guid>
      <pubDate>${new Date(article.datePublished).toUTCString()}</pubDate>
      <description><![CDATA[${article.description}]]></description>
      <category>${escapeXml(article.category)}</category>
    </item>`
      )
      .join('\n');

    const rssXml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Tailprint Technical Guides &amp; PDF Architecture</title>
    <link>https://tailprint.com/guides</link>
    <description>In-depth technical guides on converting Tailwind HTML to vector PDF, EU Factur-X e-invoicing (EN 16931), and Model Context Protocol (MCP) document automation.</description>
    <language>en</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="https://tailprint.com/rss.xml" rel="self" type="application/rss+xml"/>
${itemsXml}
  </channel>
</rss>`;

    return reply
      .header('Content-Type', 'application/rss+xml; charset=utf-8')
      .header('Cache-Control', 'public, max-age=1800, stale-while-revalidate=86400')
      .send(rssXml);
  };

  fastify.get('/rss.xml', { schema: { hide: true } }, serveRssFeed);
  fastify.get('/feed.xml', { schema: { hide: true } }, serveRssFeed);
  fastify.get('/guides/rss.xml', { schema: { hide: true } }, serveRssFeed);

  // GET /llms.txt - Generative Engine Optimization standard for AI (llmstxt.org)
  fastify.get('/llms.txt', { schema: { hide: true } }, async (_request, reply) => {
    const llms = `# Tailprint — Tailwind-Native HTML to PDF & European Factur-X E-Invoicing API

> High-performance developer API and Model Context Protocol (MCP) server for converting Tailwind CSS HTML into vector PDFs and legally compliant EU Factur-X / ZUGFeRD (EN 16931) hybrid e-invoices in under 500ms.

## Core Capabilities
- **Tailwind-Native PDF Engine**: Submits raw HTML styled with arbitrary Tailwind CSS classes (including JIT syntax like \`w-[350px]\` and dynamic grids) and generates vector-sharp, print-ready PDF documents without build steps or headless browser maintenance.
- **Smart Pagination Shield**: Automatically repeats \`<thead>\` table headers across multi-page splits, locks \`<tr>\` rows against mid-row cuts (\`break-inside: avoid\`), prevents orphaned headings, and injects running page counters.
- **European E-Invoicing (Factur-X / ZUGFeRD 2.2 / EN 16931)**: Generates legally compliant hybrid PDF/A-3 invoices with embedded CrossIndustryInvoice XML (\`/EmbeddedFiles\`) for automated ERP ingestion (DATEV, SAP, Dinero, Billy, Chorus Pro).
- **Zero-Retention Privacy Mode (\`no_store: true\`)**: Renders confidential contracts, medical records, and financial statements purely in transient RAM without disk persistence or cache storage.
- **Model Context Protocol (MCP)**: Native Remote SSE and stdio CLI integration for Claude Desktop, Cursor, Windsurf, and autonomous AI agents exposing 11 specialized PDF & Document tools.

## Quick API Reference
- Base URL: https://tailprint.com
- Interactive OpenAPI Docs: https://tailprint.com/docs
- Live Tailwind PDF Studio: https://tailprint.com/studio
- EU Factur-X Inspector & Builder: https://tailprint.com/tools/factur-x
- MCP Remote SSE Endpoint: https://tailprint.com/v1/mcp/sse
- Developer Free Tier: 100 free monthly PDF renders with zero credit card required

### Key Endpoints
- POST /v1/render/pdf : Compiles raw HTML + Tailwind CSS or URL to vector PDF with Smart Pagination Shield
- POST /v1/render/einvoice : Generates EU-compliant Factur-X (EN 16931) hybrid PDF/A-3 invoice with embedded XML
- GET /templates : Lists all 13 pre-designed Tailwind CSS document templates
- GET /templates/:id/download : Live-renders and downloads any PDF template
- POST /v1/tools/factur-x : Interactive Factur-X hybrid PDF + XML generator
- GET /v1/mcp/tools : Lists all 11 MCP PDF & Document tools and JSON schemas
- POST /v1/auth/claim-free-key : Claim instant free developer API key (100 PDFs/mo)
- GET /v1/usage : Real-time quota and monthly billing cycle check

## Model Context Protocol (MCP) Setup (11 Document & PDF Tools)
Tailprint includes 11 native PDF & Document tools: \`render_pdf\`, \`generate_einvoice\`, \`render_template\`, \`list_templates\`, \`get_template_source\`, \`stamp_pdf\`, \`merge_pdfs\`, \`split_pdf\`, \`fill_pdf_form\`, \`compress_pdf\`, \`render_presentation\`.

Claude Desktop (\`claude_desktop_config.json\`):
\`\`\`json
{
  "mcpServers": {
    "tailprint": {
      "command": "npx",
      "args": ["-y", "tailprint"],
      "env": {
        "TAILPRINT_API_KEY": "YOUR_API_KEY"
      }
    }
  }
}
\`\`\`

Cursor IDE & Windsurf:
- Type: sse
- URL: https://tailprint.com/v1/mcp/sse?api_key=YOUR_API_KEY

## Technical Guides & Architecture
- PDF Document Showcase: https://tailprint.com/showcase
- Next.js Tailwind to PDF: https://tailprint.com/guides/tailwind-html-to-pdf-nextjs
- European Factur-X & ZUGFeRD E-Invoicing API: https://tailprint.com/guides/factur-x-zugferd-pdf-api
- Why Puppeteer in Serverless Fails (And Alternatives): https://tailprint.com/guides/puppeteer-serverless-pdf-alternatives
- Best MCP Servers for Claude & Cursor (2026): https://tailprint.com/guides/best-mcp-servers-claude-cursor
- Guides Knowledge Hub: https://tailprint.com/guides
`;

    return reply
      .header('Content-Type', 'text/markdown; charset=utf-8')
      .header('Cache-Control', 'public, max-age=3600')
      .send(llms);
  });

  // GET / - Showcase Landing Page & Template Gallery
  fastify.get(
    '/',
    {
      schema: {
        hide: true,
      },
    },
    async (_request, reply) => {
      const html = `<!DOCTYPE html>
<html lang="en" class="dark scroll-smooth">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Tailprint — Tailwind HTML to PDF &amp; EU E-Invoicing API for Developers</title>
  <link rel="canonical" href="https://tailprint.com" />
  <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32' fill='none'%3E%3Crect width='32' height='32' rx='8' fill='%23090d16'/%3E%3Cpath d='M11 9L6 16l5 7' stroke='%23818cf8' stroke-width='2.75' stroke-linecap='round' stroke-linejoin='round'/%3E%3Cpath d='M21 9l5 7-5 7' stroke='%23f472b6' stroke-width='2.75' stroke-linecap='round' stroke-linejoin='round'/%3E%3Cline x1='18' y1='8' x2='14' y2='24' stroke='%2338bdf8' stroke-width='2.5' stroke-linecap='round'/%3E%3Ccircle cx='16' cy='16' r='1.5' fill='%23f43f5e'/%3E%3C/svg%3E" />
  
  <!-- Primary Meta Tags (SEO) -->
  <meta name="description" content="Developer-first HTML-to-PDF and European e-invoicing API. Generate pixel-perfect vector PDFs with Smart Pagination Shield and compliant Factur-X (EN 16931) hybrid invoices in under 500ms." />
  <meta name="keywords" content="Tailwind HTML to PDF, Factur-X API, ZUGFeRD invoice generator, EN 16931, Tailwind CSS PDF API, PDF generation API, Model Context Protocol PDF, MCP server, vector PDF engine" />
  <meta name="author" content="Tailprint" />
  <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1" />
  <meta name="theme-color" content="#090d16" />

  <!-- Open Graph / Facebook / LinkedIn / Discord -->
  <meta property="og:type" content="website" />
  <meta property="og:url" content="https://tailprint.com" />
  <meta property="og:site_name" content="Tailprint" />
  <meta property="og:locale" content="en_US" />
  <meta property="og:title" content="Tailprint — Tailwind HTML to PDF &amp; EU E-Invoicing API for Developers" />
  <meta property="og:description" content="Compile Tailwind CSS into vector PDFs and legally compliant European Factur-X e-invoices in under 500ms with Smart Pagination Shield." />
  <meta property="og:image" content="https://tailprint.com/og-image.png" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:image:alt" content="Tailprint — Tailwind HTML to PDF &amp; E-Invoicing API" />

  <!-- Twitter / X -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:url" content="https://tailprint.com" />
  <meta name="twitter:site" content="@tailprint" />
  <meta name="twitter:creator" content="@tailprint" />
  <meta name="twitter:title" content="Tailprint — Tailwind HTML to PDF &amp; EU E-Invoicing API" />
  <meta name="twitter:description" content="Turn Tailwind CSS and AI prompts into vector PDFs and compliant EU Factur-X e-invoices in under 500ms." />
  <meta name="twitter:image" content="https://tailprint.com/og-image.png" />
  <meta name="twitter:image:alt" content="Tailprint — Tailwind HTML to PDF &amp; E-Invoicing API" />

  <!-- Schema.org JSON-LD Structured Data for Search & Generative Engines (SEO & GEO) -->
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebApplication",
        "@id": "https://tailprint.com/#webapp",
        "name": "Tailprint",
        "url": "https://tailprint.com",
        "applicationCategory": "DeveloperApplication",
        "operatingSystem": "All (Cloud API & MCP Server)",
        "description": "High-performance Tailwind-Native PDF & EU Factur-X E-Invoicing Engine. Compiles raw Tailwind CSS HTML into vector PDFs and EN 16931 hybrid invoices in under 500ms.",
        "offers": [
          {
            "@type": "Offer",
            "price": "0",
            "priceCurrency": "USD",
            "name": "Developer Free Tier",
            "description": "100 free monthly renders, zero credit card required"
          },
          {
            "@type": "Offer",
            "price": "14",
            "priceCurrency": "USD",
            "name": "Starter Plan",
            "description": "2,500 monthly renders"
          },
          {
            "@type": "Offer",
            "price": "39",
            "priceCurrency": "USD",
            "name": "Pro Plan",
            "description": "20,000 monthly renders with prioritized Chromium pool"
          }
        ],
        "featureList": [
          "Tailwind CSS JIT Rendering without build steps",
          "Sub-500ms Vector PDF Generation",
          "Open Graph Social Preview Cards (PNG/JPEG)",
          "Model Context Protocol (MCP) Server for Claude Desktop & Cursor",
          "LLM-Ready Web Scraper returning structured Markdown with 90%+ token savings",
          "SHA-256 Deduplication Image Caching",
          "Automated SSRF Sandboxing and Private IP Blocking"
        ]
      },
      {
        "@type": "Organization",
        "@id": "https://tailprint.com/#organization",
        "name": "Tailprint",
        "url": "https://tailprint.com",
        "logo": "https://tailprint.com/assets/tailprint-logo.svg",
        "contactPoint": {
          "@type": "ContactPoint",
          "email": "support@tailprint.com",
          "contactType": "customer support"
        }
      },
      {
        "@type": "FAQPage",
        "@id": "https://tailprint.com/#faq",
        "mainEntity": [
          {
            "@type": "Question",
            "name": "How does Tailprint convert Tailwind CSS HTML to vector PDF?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Tailprint uses isolated, pre-warmed Chromium instances with native Tailwind CSS JIT compilation. You send raw HTML containing arbitrary utility classes (e.g. w-[350px], grid-cols-12, custom gradients), and Tailprint compiles print-ready vector PDFs in under 500ms with zero build steps or PostCSS configurations."
            }
          },
          {
            "@type": "Question",
            "name": "How do I connect Tailprint to Claude Desktop, Cursor, or AI coding agents via MCP?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Tailprint implements the official Model Context Protocol (MCP) specification. You can connect it via Remote SSE at https://tailprint.com/v1/mcp/sse by adding Authorization: Bearer YOUR_API_KEY to your claude_desktop_config.json or Cursor MCP settings, or run it locally via stdio using npx @tailprint/mcp."
            }
          },
          {
            "@type": "Question",
            "name": "What are the latency benchmarks and caching mechanisms?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Fresh PDF renders execute in 350-500ms on pre-warmed Chromium instances. For images and social cards, Tailprint calculates a SHA-256 hash of the input markup, returning instant cache hits in under 50ms with X-Cache: HIT."
            }
          },
          {
            "@type": "Question",
            "name": "What security and SSRF protections does Tailprint enforce?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Tailprint features an enterprise-grade network security sandbox that automatically blocks all local, internal, and private IP ranges including 127.0.0.1, 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16, and cloud metadata services like 169.254.169.254 to prevent Server-Side Request Forgery (SSRF)."
            }
          },
          {
            "@type": "Question",
            "name": "Does Tailprint offer a free tier?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Yes, Tailprint provides a Developer Free Sandbox offering 100 free monthly renders with zero credit card required. It includes full access to the Tailwind rendering engine, PDF generator, and MCP server."
            }
          }
        ]
      }
    ]
  }
  </script>
  <script>
    (function() {
      var _w = console.warn;
      console.warn = function() {
        for (var i = 0; i < arguments.length; i++) {
          var s = String(arguments[i] || '');
          if (s.indexOf('tailwindcss.com') !== -1 || s.indexOf('should not be used in production') !== -1) return;
        }
        return _w.apply(console, arguments);
      };
    })();
  </script>
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      darkMode: 'class',
      theme: {
        extend: {
          colors: {
            brand: {
              50: '#eef2ff',
              500: '#6366f1',
              600: '#4f46e5',
              700: '#4338ca',
            }
          }
        }
      }
    }
  </script>
  <style>
    pre code { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
    @keyframes avatarFloat {
      0%, 100% { transform: translateY(0px) rotate(0deg); }
      50% { transform: translateY(-8px) rotate(1deg); }
    }
    @keyframes cardFloatLeft {
      0%, 100% { transform: translateY(0px) rotate(-2deg); }
      50% { transform: translateY(-6px) rotate(-1deg); }
    }
    @keyframes cardFloatRight {
      0%, 100% { transform: translateY(0px) rotate(2deg); }
      50% { transform: translateY(-7px) rotate(3deg); }
    }
    @keyframes eyeBlink {
      0%, 90%, 100% { transform: scaleY(1); }
      95% { transform: scaleY(0.1); }
    }
    .animate-avatar {
      animation: avatarFloat 4.2s ease-in-out infinite;
    }
    .animate-float-left {
      animation: cardFloatLeft 5s ease-in-out infinite;
    }
    .animate-float-right {
      animation: cardFloatRight 5.5s ease-in-out infinite 0.5s;
    }
    .avatar-eye-left, .avatar-eye-right {
      transform-origin: center;
      animation: eyeBlink 3.6s ease-in-out infinite;
    }
  </style>
</head>
<body class="bg-slate-950 text-slate-100 min-h-screen selection:bg-indigo-500 selection:text-white">

  ${renderGlobalNavbar({ templatesCount: TEMPLATES.length })}

  <!-- Hero Section -->
  <section class="relative pt-12 pb-20 overflow-hidden">
    <!-- Ambient Gradient Backdrops -->
    <div class="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-gradient-to-tr from-indigo-600/20 via-purple-600/15 to-cyan-500/15 rounded-full blur-[110px] pointer-events-none"></div>
    <div class="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] opacity-25"></div>

    <div class="max-w-6xl mx-auto px-6 relative z-10 text-center">
      
      <!-- Top Banner Pill -->
      <div class="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-indigo-950/70 border border-indigo-800/60 text-indigo-300 text-xs font-semibold mb-6 backdrop-blur-md shadow-lg shadow-indigo-950/50">
        <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
        <span>Developer &amp; AI Output Infrastructure • Sub-500ms Chromium Engine • Tailwind v3 &amp; v4 JIT</span>
      </div>

      <!-- Avatar & Floating Interactive Mascot Unit -->
      <div class="relative max-w-xl mx-auto mb-8 flex items-center justify-center">
        
        <!-- Left Floating Card (PDF Result) -->
        <div class="hidden sm:flex items-center space-x-3 px-3.5 py-2.5 rounded-2xl bg-slate-900/90 border border-slate-700/70 backdrop-blur-xl shadow-xl shadow-black/40 animate-float-left absolute -left-8 lg:-left-16 top-4 z-20">
          <div class="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-sm border border-indigo-500/30">
            📄
          </div>
          <div class="text-left">
            <div class="text-xs font-bold text-white flex items-center space-x-1.5">
              <span>invoice.pdf</span>
              <span class="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-mono leading-none">382ms</span>
            </div>
            <div class="text-[10px] text-slate-400">100% Vector • Tailwind styled</div>
          </div>
        </div>

        <!-- Center: Interactive Avatar Character -->
        <div class="relative flex flex-col items-center cursor-pointer group" onclick="cycleAvatarTip()">
          <!-- Speech Bubble on hover / dynamic tips -->
          <div id="speech-bubble" class="mb-3 px-3.5 py-1.5 rounded-xl bg-slate-900/90 border border-indigo-500/40 text-xs font-medium text-indigo-200 shadow-xl backdrop-blur-md flex items-center space-x-2 transition-all duration-300 group-hover:border-indigo-400 group-hover:scale-105">
            <span class="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
            <span id="speech-text" class="transition-opacity duration-150">Hey dev! Click me for quick tips ⚡</span>
          </div>

          <!-- Avatar Illustration -->
          <div class="animate-avatar relative">
            <div class="absolute -inset-3 bg-gradient-to-r from-indigo-500/30 to-cyan-500/30 rounded-full blur-xl pointer-events-none group-hover:opacity-100 opacity-60 transition duration-300"></div>
            <svg class="w-28 h-28 sm:w-32 sm:h-32 filter drop-shadow-[0_10px_25px_rgba(99,102,241,0.35)] cursor-pointer select-none transition-transform duration-300 group-hover:scale-105" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" id="hero-avatar">
              <defs>
                <linearGradient id="botBody" x1="20" y1="20" x2="100" y2="100" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stop-color="#1e1b4b"/>
                  <stop offset="50%" stop-color="#0f172a"/>
                  <stop offset="100%" stop-color="#020617"/>
                </linearGradient>
                <linearGradient id="antennaBeam" x1="60" y1="12" x2="60" y2="28" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stop-color="#38bdf8"/>
                  <stop offset="100%" stop-color="#6366f1"/>
                </linearGradient>
                <filter id="glowEyes" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="0" stdDeviation="3" flood-color="#38bdf8" flood-opacity="0.9"/>
                </filter>
              </defs>

              <!-- Antenna with pinging radar -->
              <line x1="60" y1="14" x2="60" y2="28" stroke="url(#antennaBeam)" stroke-width="3" stroke-linecap="round"/>
              <circle cx="60" cy="12" r="5" fill="#38bdf8" class="animate-ping origin-center" opacity="0.75"/>
              <circle cx="60" cy="12" r="4.5" fill="#38bdf8"/>
              <circle cx="60" cy="12" r="2" fill="#ffffff"/>

              <!-- Head Base with Metallic Bevel -->
              <rect x="22" y="26" width="76" height="66" rx="24" fill="url(#botBody)" stroke="#334155" stroke-width="2"/>
              <rect x="23" y="27" width="74" height="64" rx="23" stroke="#6366f1" stroke-width="1.2" stroke-opacity="0.4"/>

              <!-- Cute Audio Ports / Ears -->
              <rect x="14" y="46" width="8" height="26" rx="4" fill="#334155" stroke="#475569" stroke-width="1.5"/>
              <circle cx="18" cy="59" r="2" fill="#38bdf8"/>
              <rect x="98" y="46" width="8" height="26" rx="4" fill="#334155" stroke="#475569" stroke-width="1.5"/>
              <circle cx="102" cy="59" r="2" fill="#c084fc"/>

              <!-- Visor Screen -->
              <rect x="28" y="38" width="64" height="42" rx="15" fill="#030712" stroke="#1e293b" stroke-width="1.5"/>
              <path d="M30 46 C45 42, 75 42, 90 46" stroke="rgba(255,255,255,0.15)" stroke-width="1.5" stroke-linecap="round"/>

              <!-- Glowing Cyan Eyes (Blinks with CSS animation) -->
              <g filter="url(#glowEyes)">
                <ellipse cx="46" cy="58" rx="6" ry="8" fill="#38bdf8" class="avatar-eye-left"/>
                <circle cx="48" cy="56" r="2.2" fill="#ffffff"/>
                <ellipse cx="74" cy="58" rx="6" ry="8" fill="#38bdf8" class="avatar-eye-right"/>
                <circle cx="76" cy="56" r="2.2" fill="#ffffff"/>
              </g>

              <!-- Friendly Smile -->
              <path d="M52 70 Q60 74 68 70" stroke="#818cf8" stroke-width="2" stroke-linecap="round"/>

              <!-- Cheeks Blush -->
              <circle cx="36" cy="65" r="3" fill="#f43f5e" opacity="0.4"/>
              <circle cx="84" cy="65" r="3" fill="#f43f5e" opacity="0.4"/>

              <!-- Floating Paper / PDF sheet being held/printed -->
              <rect x="42" y="86" width="36" height="24" rx="4" fill="#1e293b" stroke="#38bdf8" stroke-width="1.5"/>
              <line x1="48" y1="92" x2="72" y2="92" stroke="#94a3b8" stroke-width="1.5" stroke-linecap="round"/>
              <line x1="48" y1="97" x2="68" y2="97" stroke="#94a3b8" stroke-width="1.5" stroke-linecap="round"/>
              <line x1="48" y1="102" x2="62" y2="102" stroke="#38bdf8" stroke-width="1.5" stroke-linecap="round"/>
              <circle cx="71" cy="102" r="1.5" fill="#f43f5e"/>
            </svg>
          </div>
        </div>

        <!-- Right Floating Card (MCP & AI Agent) -->
        <div class="hidden sm:flex items-center space-x-3 px-3.5 py-2.5 rounded-2xl bg-slate-900/90 border border-slate-700/70 backdrop-blur-xl shadow-xl shadow-black/40 animate-float-right absolute -right-8 lg:-right-16 top-6 z-20">
          <div class="w-8 h-8 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center font-bold text-sm border border-purple-500/30">
            🤖
          </div>
          <div class="text-left">
            <div class="text-xs font-bold text-white flex items-center space-x-1.5">
              <span>MCP Protocol</span>
              <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            </div>
            <div class="text-[10px] text-slate-400">Claude Desktop & Cursor</div>
          </div>
        </div>

      </div>

      <h1 class="text-5xl sm:text-6xl lg:text-7xl font-black tracking-tight text-white leading-tight">
        Send <span class="bg-gradient-to-r from-indigo-400 via-sky-400 to-cyan-300 bg-clip-text text-transparent">Tailwind HTML or Prompts</span>.<br>
        Receive Production <span class="bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">Vector PDFs &amp; E-Invoices</span>.
      </h1>

      <p class="mt-6 text-lg sm:text-xl text-slate-300 max-w-3xl mx-auto leading-relaxed">
        The developer-first HTML-to-PDF and European e-invoicing API. Compile arbitrary Tailwind CSS into crisp vector PDFs with <strong>Smart Pagination Shield</strong>, legally compliant European Factur-X (EN 16931) hybrid invoices, and automated document workflows in under 500ms.
      </p>

      <div class="mt-8 flex flex-col sm:flex-row justify-center items-center gap-3.5">
        <button onclick="startCheckout('free')" class="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition shadow-lg shadow-emerald-600/25 flex items-center justify-center space-x-2.5 group">
          <span>⚡ Claim 100 Free Renders</span>
          <span class="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950/60 border border-emerald-400/30 text-emerald-200 font-bold uppercase tracking-wider">No CC</span>
        </button>
        <a href="/studio" class="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold transition flex items-center justify-center space-x-2 shadow-lg shadow-indigo-600/20">
          <span>⚡ Open PDF Studio</span>
          <span class="text-[10px] px-2 py-0.5 rounded-full bg-white/20 font-mono">/studio</span>
        </a>
        <a href="#einvoice" class="w-full sm:w-auto px-5 py-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700/80 hover:border-slate-600 text-slate-200 font-semibold transition flex items-center justify-center space-x-2">
          <span>🇪🇺 EU Factur-X API</span>
        </a>
      </div>
      <p class="mt-3 text-xs text-slate-500">Instant API key • Zero configuration • Native MCP server for Claude &amp; Cursor</p>

      <!-- System Stats -->
      <div class="mt-12 grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-4xl mx-auto text-left">
        <div class="p-4 rounded-xl bg-slate-900/60 border border-slate-800 backdrop-blur-sm">
          <p class="text-xs text-slate-400">PDF Render Latency</p>
          <p class="text-2xl font-black text-emerald-400 mt-1">&lt; 500 ms</p>
          <p class="text-[10px] text-slate-500 mt-0.5">Pre-warmed Chromium</p>
        </div>
        <div class="p-4 rounded-xl bg-slate-900/60 border border-slate-800 backdrop-blur-sm">
          <p class="text-xs text-slate-400">EU E-Invoicing</p>
          <p class="text-2xl font-black text-amber-400 mt-1">EN 16931</p>
          <p class="text-[10px] text-slate-500 mt-0.5">Factur-X &amp; ZUGFeRD XML</p>
        </div>
        <div class="p-4 rounded-xl bg-slate-900/60 border border-slate-800 backdrop-blur-sm">
          <p class="text-xs text-slate-400">Smart Pagination</p>
          <p class="text-2xl font-black text-indigo-400 mt-1">Shield Active</p>
          <p class="text-[10px] text-slate-500 mt-0.5">Repeating thead, no row cuts</p>
        </div>
        <div class="p-4 rounded-xl bg-slate-900/60 border border-slate-800 backdrop-blur-sm">
          <p class="text-xs text-slate-400">Compliance &amp; GDPR</p>
          <p class="text-2xl font-black text-cyan-400 mt-1">Zero-Retention</p>
          <p class="text-[10px] text-slate-500 mt-0.5">Transient memory only</p>
        </div>
      </div>

      <!-- The 3 Core Document & PDF Pillars -->
      <div class="mt-16 text-left" id="documents">
        <div class="text-center max-w-2xl mx-auto mb-10">
          <span class="text-xs font-bold uppercase tracking-wider text-indigo-400 bg-indigo-950/70 border border-indigo-800/50 px-3.5 py-1.5 rounded-full">Focused Document Infrastructure</span>
          <h2 class="text-2xl sm:text-3xl font-extrabold text-white mt-3">Built Strictly for Production Documents &amp; PDFs.</h2>
          <p class="text-slate-400 text-sm mt-1.5">Replace fragile headless Chrome containers with a dedicated, high-throughput PDF &amp; e-invoicing API.</p>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          <!-- Pillar 1: Tailwind HTML-to-PDF Engine -->
          <div class="p-6 rounded-2xl bg-gradient-to-b from-slate-900/90 to-slate-950/90 border border-indigo-500/30 hover:border-indigo-400/60 transition shadow-xl relative overflow-hidden flex flex-col justify-between group">
            <div class="absolute -right-12 -top-12 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none"></div>
            <div>
              <div class="flex items-center justify-between mb-4">
                <div class="w-11 h-11 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 flex items-center justify-center text-2xl group-hover:scale-110 transition duration-200">
                  📄
                </div>
                <span class="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">Core Engine</span>
              </div>
              <h3 class="text-lg font-black text-white group-hover:text-indigo-300 transition">Tailwind HTML-to-PDF Engine</h3>
              <p class="text-xs text-slate-400 mt-2 leading-relaxed">
                Send raw HTML with Tailwind CSS utility classes and receive print-ready vector PDFs in under 500ms — zero build steps or PostCSS required.
              </p>

              <ul class="mt-4 space-y-2 text-xs text-slate-300">
                <li class="flex items-start space-x-2">
                  <span class="text-indigo-400 font-bold">✓</span>
                  <span><strong>Tailwind v3 &amp; v4 JIT:</strong> Arbitrary classes, grids &amp; custom fonts out of the box.</span>
                </li>
                <li class="flex items-start space-x-2">
                  <span class="text-indigo-400 font-bold">✓</span>
                  <span><strong>Smart Pagination Shield:</strong> Automatic repeating thead &amp; zero row slicing.</span>
                </li>
                <li class="flex items-start space-x-2">
                  <span class="text-indigo-400 font-bold">✓</span>
                  <span><strong>Dynamic Page Numbers:</strong> Custom running headers, footers &amp; margins.</span>
                </li>
                <li class="flex items-start space-x-2">
                  <span class="text-indigo-400 font-bold">✓</span>
                  <span><strong>Zero-Retention Mode:</strong> Volatile RAM rendering for strict GDPR/HIPAA privacy.</span>
                </li>
              </ul>
            </div>

            <div class="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs">
              <a href="/studio" class="text-indigo-400 hover:text-indigo-300 font-semibold flex items-center space-x-1">
                <span>Test in PDF Studio</span>
                <span>→</span>
              </a>
              <span class="font-mono text-[11px] text-slate-500">POST /v1/render/pdf</span>
            </div>
          </div>

          <!-- Pillar 2: EU Factur-X & ZUGFeRD Compliance -->
          <div class="p-6 rounded-2xl bg-gradient-to-b from-slate-900/90 to-slate-950/90 border border-emerald-500/30 hover:border-emerald-400/60 transition shadow-xl relative overflow-hidden flex flex-col justify-between group" id="visuals">
            <div class="absolute -right-12 -top-12 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none"></div>
            <div>
              <div class="flex items-center justify-between mb-4">
                <div class="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center text-2xl group-hover:scale-110 transition duration-200">
                  🇪🇺
                </div>
                <span class="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">EN 16931 Standard</span>
              </div>
              <h3 class="text-lg font-black text-white group-hover:text-emerald-300 transition">EU Factur-X &amp; ZUGFeRD E-Invoicing</h3>
              <p class="text-xs text-slate-400 mt-2 leading-relaxed">
                Meet mandatory European B2B e-invoicing laws with a single JSON request. Generates human-readable vector PDFs with embedded ERP XML.
              </p>

              <ul class="mt-4 space-y-2 text-xs text-slate-300">
                <li class="flex items-start space-x-2">
                  <span class="text-emerald-400 font-bold">✓</span>
                  <span><strong>Hybrid PDF/A-3 + XML:</strong> Visual A4 invoice + embedded <code class="text-emerald-300">factur-x.xml</code>.</span>
                </li>
                <li class="flex items-start space-x-2">
                  <span class="text-emerald-400 font-bold">✓</span>
                  <span><strong>EN 16931 Validated:</strong> CrossIndustryInvoice standard for EU B2B mandates.</span>
                </li>
                <li class="flex items-start space-x-2">
                  <span class="text-emerald-400 font-bold">✓</span>
                  <span><strong>Direct ERP Ingestion:</strong> Ready for SAP, DATEV, Dinero, Billy &amp; Chorus Pro.</span>
                </li>
                <li class="flex items-start space-x-2">
                  <span class="text-emerald-400 font-bold">✓</span>
                  <span><strong>Automated Tax Math:</strong> Line-item VAT breakdowns, IBAN &amp; reverse charge.</span>
                </li>
              </ul>
            </div>

            <div class="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs">
              <a href="/tools/factur-x" class="text-emerald-400 hover:text-emerald-300 font-semibold flex items-center space-x-1">
                <span>Open Factur-X Generator</span>
                <span>→</span>
              </a>
              <span class="font-mono text-[11px] text-slate-500">POST /v1/render/einvoice</span>
            </div>
          </div>

          <!-- Pillar 3: PDF Toolkit & MCP Server -->
          <div class="p-6 rounded-2xl bg-gradient-to-b from-slate-900/90 to-slate-950/90 border border-purple-500/30 hover:border-purple-400/60 transition shadow-xl relative overflow-hidden flex flex-col justify-between group" id="ai-agent">
            <div class="absolute -right-12 -top-12 w-32 h-32 bg-purple-500/10 rounded-full blur-2xl pointer-events-none"></div>
            <div>
              <div class="flex items-center justify-between mb-4">
                <div class="w-11 h-11 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-400 flex items-center justify-center text-2xl group-hover:scale-110 transition duration-200">
                  📑
                </div>
                <span class="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">PDF Ops &amp; MCP</span>
              </div>
              <h3 class="text-lg font-black text-white group-hover:text-purple-300 transition">PDF Toolkit &amp; AI MCP Server</h3>
              <p class="text-xs text-slate-400 mt-2 leading-relaxed">
                Complete programmatic manipulation of PDF files plus native Model Context Protocol support for Claude Desktop, Cursor, and AI agents.
              </p>

              <ul class="mt-4 space-y-2 text-xs text-slate-300">
                <li class="flex items-start space-x-2">
                  <span class="text-purple-400 font-bold">✓</span>
                  <span><strong>Merge &amp; Split PDFs:</strong> Combine multiple PDFs or extract specific page ranges.</span>
                </li>
                <li class="flex items-start space-x-2">
                  <span class="text-purple-400 font-bold">✓</span>
                  <span><strong>AcroForm Fill &amp; Flatten:</strong> Populate interactive PDF contract fields via JSON.</span>
                </li>
                <li class="flex items-start space-x-2">
                  <span class="text-purple-400 font-bold">✓</span>
                  <span><strong>Watermark &amp; Compress:</strong> Stamp confidential overlays &amp; compact PDF streams.</span>
                </li>
                <li class="flex items-start space-x-2">
                  <span class="text-purple-400 font-bold">✓</span>
                  <span><strong>Native MCP Server:</strong> Generate invoices, contracts &amp; reports directly from chat.</span>
                </li>
              </ul>
            </div>

            <div class="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs">
              <a href="#mcp" class="text-purple-400 hover:text-purple-300 font-semibold flex items-center space-x-1">
                <span>Connect MCP Server</span>
                <span>→</span>
              </a>
              <span class="font-mono text-[11px] text-slate-500">npx tailprint</span>
            </div>
          </div>

        </div>
      </div>
    </div>
  </section>

  <!-- Live Interactive Template Studio Spotlight Section -->
  <section id="studio-showcase" class="py-20 border-t border-slate-800/80 bg-gradient-to-b from-slate-950 via-slate-900/60 to-slate-950 relative overflow-hidden">
    <!-- Ambient glow -->
    <div class="absolute -top-32 right-1/4 w-96 h-96 bg-purple-600/15 rounded-full blur-3xl pointer-events-none"></div>

    <div class="max-w-7xl mx-auto px-6 relative z-10">
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        
        <!-- Left: Copy & Key Features (6 cols) -->
        <div class="lg:col-span-6 space-y-6">
          <div class="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-purple-950/70 border border-purple-800/60 text-purple-300 text-xs font-semibold backdrop-blur-md">
            <span class="w-2 h-2 rounded-full bg-purple-400 animate-pulse"></span>
            <span>Live Interactive PDF Editor • Free Developer Tool</span>
          </div>

          <h2 class="text-3xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
            Design &amp; Debug Multi-Page PDFs Directly in Your Browser with <span class="bg-gradient-to-r from-purple-400 via-indigo-300 to-cyan-300 bg-clip-text text-transparent">PDF Studio</span>
          </h2>

          <p class="text-slate-300 text-base leading-relaxed">
            Stop guessing how your Tailwind classes will look when printed to A4 or US Letter PDF. Template Studio gives you an interactive split-screen IDE with real-time Tailwind JIT compiling, true-to-scale paper canvases, and dynamic JSON variables.
          </p>

          <div class="space-y-3.5 pt-2">
            <div class="flex items-start space-x-3">
              <div class="w-7 h-7 rounded-lg bg-indigo-500/15 text-indigo-400 flex items-center justify-center shrink-0 mt-0.5 border border-indigo-500/30 text-xs">⚡</div>
              <div>
                <h4 class="text-sm font-bold text-white">Instant Tailwind JIT Split Preview</h4>
                <p class="text-xs text-slate-400 mt-0.5">Write arbitrary Tailwind utility classes on the left and see vector rendering update on the right in real time.</p>
              </div>
            </div>

            <div class="flex items-start space-x-3">
              <div class="w-7 h-7 rounded-lg bg-purple-500/15 text-purple-400 flex items-center justify-center shrink-0 mt-0.5 border border-purple-500/30 text-xs">📐</div>
              <div>
                <h4 class="text-sm font-bold text-white">Multi-Format Paper Canvas &amp; Visual Break Guides</h4>
                <p class="text-xs text-slate-400 mt-0.5">Toggle between A4 Portrait, A4 Landscape, US Letter, and 16:9 Presentation Decks with exact visual page break lines.</p>
              </div>
            </div>

            <div class="flex items-start space-x-3">
              <div class="w-7 h-7 rounded-lg bg-emerald-500/15 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5 border border-emerald-500/30 text-xs">🛡️</div>
              <div>
                <h4 class="text-sm font-bold text-white">Live Smart Pagination Shield Verification</h4>
                <p class="text-xs text-slate-400 mt-0.5">Test multi-page documents and inspect how table headers automatically repeat and rows are prevented from splitting.</p>
              </div>
            </div>

            <div class="flex items-start space-x-3">
              <div class="w-7 h-7 rounded-lg bg-cyan-500/15 text-cyan-400 flex items-center justify-center shrink-0 mt-0.5 border border-cyan-500/30 text-xs">💻</div>
              <div>
                <h4 class="text-sm font-bold text-white">Instant cURL, Node.js &amp; Python Code Generation</h4>
                <p class="text-xs text-slate-400 mt-0.5">Once satisfied with your template, copy ready-to-run API snippets or download the vector PDF directly.</p>
              </div>
            </div>
          </div>

          <div class="pt-4 flex flex-col sm:flex-row items-center gap-3.5">
            <a href="/studio" class="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-indigo-700 hover:from-purple-500 hover:to-indigo-500 text-white font-bold transition shadow-lg shadow-purple-600/25 flex items-center justify-center space-x-2">
              <span>⚡ Open Live PDF Studio</span>
              <span class="text-purple-200">→</span>
            </a>
            <span class="text-xs text-slate-400">Available at <code class="text-indigo-300 font-mono">/studio</code> or <code class="text-indigo-300 font-mono">/editor</code></span>
          </div>
        </div>

        <!-- Right: Studio Visual Showcase Card (6 cols) -->
        <div class="lg:col-span-6">
          <div class="rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl p-4 relative overflow-hidden group hover:border-purple-500/40 transition duration-300">
            <!-- Studio Header Bar Mockup -->
            <div class="flex items-center justify-between border-b border-slate-800 pb-3 mb-3">
              <div class="flex items-center space-x-2">
                <div class="flex space-x-1.5">
                  <div class="w-2.5 h-2.5 rounded-full bg-rose-500/80"></div>
                  <div class="w-2.5 h-2.5 rounded-full bg-amber-500/80"></div>
                  <div class="w-2.5 h-2.5 rounded-full bg-emerald-500/80"></div>
                </div>
                <span class="text-[11px] font-mono font-semibold text-slate-300 ml-2">tailprint.com/studio</span>
              </div>
              <div class="flex items-center space-x-2">
                <span class="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-semibold font-mono">Shield Active</span>
                <span class="text-[10px] px-2 py-0.5 rounded bg-indigo-600 text-white font-bold">A4 Portrait</span>
              </div>
            </div>

            <!-- Studio UI Split Representation -->
            <div class="grid grid-cols-2 gap-3 min-h-[300px]">
              <!-- Left side: Code View -->
              <div class="bg-slate-950 rounded-xl p-3 border border-slate-800/80 font-mono text-[10px] text-slate-300 space-y-1.5 overflow-hidden">
                <div class="text-slate-500 pb-1 border-b border-slate-800 flex justify-between">
                  <span>HTML + Tailwind</span>
                  <span class="text-indigo-400 font-bold">Live JIT</span>
                </div>
                <p><span class="text-purple-400">&lt;div</span> <span class="text-indigo-400">class=</span><span class="text-emerald-300">"p-8 bg-white"</span><span class="text-purple-400">&gt;</span></p>
                <p class="pl-2"><span class="text-purple-400">&lt;table</span> <span class="text-indigo-400">class=</span><span class="text-emerald-300">"w-full text-sm"</span><span class="text-purple-400">&gt;</span></p>
                <p class="pl-4 text-emerald-400">&lt;!-- Repeats across pages --&gt;</p>
                <p class="pl-4"><span class="text-purple-400">&lt;thead</span> <span class="text-indigo-400">class=</span><span class="text-emerald-300">"bg-slate-900"</span><span class="text-purple-400">&gt;</span></p>
                <p class="pl-6"><span class="text-purple-400">&lt;tr&gt;</span></p>
                <p class="pl-8"><span class="text-purple-400">&lt;th&gt;</span>Description<span class="text-purple-400">&lt;/th&gt;</span></p>
                <p class="pl-8"><span class="text-purple-400">&lt;th&gt;</span>Amount<span class="text-purple-400">&lt;/th&gt;</span></p>
                <p class="pl-6"><span class="text-purple-400">&lt;/tr&gt;</span></p>
                <p class="pl-4"><span class="text-purple-400">&lt;/thead&gt;</span></p>
                <p class="pl-4"><span class="text-purple-400">&lt;tbody&gt;</span></p>
                <p class="pl-6 text-slate-500">&#123;&#123;line_items&#125;&#125;</p>
                <p class="pl-4"><span class="text-purple-400">&lt;/tbody&gt;</span></p>
                <p class="pl-2"><span class="text-purple-400">&lt;/table&gt;</span></p>
                <p><span class="text-purple-400">&lt;/div&gt;</span></p>
              </div>

              <!-- Right side: Vector Paper Canvas Mockup -->
              <div class="bg-slate-950 rounded-xl p-3 border border-slate-800/80 flex flex-col justify-between items-center relative overflow-hidden">
                <div class="w-full text-slate-500 pb-1 border-b border-slate-800 flex justify-between text-[10px] font-mono">
                  <span>Paper Canvas</span>
                  <span class="text-emerald-400 font-bold">794 × 1123px</span>
                </div>
                
                <div class="w-full my-auto p-4 rounded-lg bg-white text-slate-900 shadow-xl border border-slate-200 text-left scale-95 origin-center">
                  <div class="flex items-center justify-between border-b border-slate-200 pb-2 mb-2">
                    <span class="font-bold text-xs text-indigo-900">INVOICE #2026-042</span>
                    <span class="text-[9px] font-mono text-emerald-600 font-bold">$1,450.00</span>
                  </div>
                  <div class="space-y-1 text-[8px] text-slate-600">
                    <div class="flex justify-between py-0.5 border-b border-slate-100">
                      <span>API Infrastructure Engineering</span>
                      <span class="font-mono font-bold">$1,200.00</span>
                    </div>
                    <div class="flex justify-between py-0.5 border-b border-slate-100">
                      <span>Chromium Concurrency Setup</span>
                      <span class="font-mono font-bold">$250.00</span>
                    </div>
                  </div>
                  <div class="mt-3 pt-1 border-t border-dashed border-slate-300 flex justify-between text-[8px] text-slate-800 font-bold">
                    <span>Total Due</span>
                    <span class="font-mono text-indigo-700">$1,450.00</span>
                  </div>
                </div>

                <div class="w-full flex items-center justify-between text-[10px] text-slate-400 pt-2 border-t border-slate-800">
                  <span>Zoom: 100%</span>
                  <a href="/studio" class="text-indigo-400 font-bold hover:underline">Open Full Studio ↗</a>
                </div>
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  </section>

  <!-- Smart Pagination Shield & Zero-Retention Deep Dive Section -->
  <section id="pagination-shield" class="py-20 border-t border-slate-800/80 bg-slate-900/40">
    <div class="max-w-7xl mx-auto px-6">
      
      <div class="text-center max-w-3xl mx-auto mb-14">
        <div class="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-950/60 border border-emerald-800/50 text-emerald-400 text-xs font-semibold mb-3">
          <span>🛡️ The Classic PDF Page Break Nightmare Solved</span>
        </div>
        <h2 class="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
          Smart Pagination Shield &amp; Zero-Retention Privacy
        </h2>
        <p class="text-slate-300 mt-3 text-sm sm:text-base leading-relaxed">
          Anyone who has ever generated multi-page PDFs with Puppeteer or wkhtmltopdf knows the frustration of table headers disappearing after page 1, rows cut horizontally across margins, and orphan headings. Tailprint eliminates this entirely with automated DOM heuristics.
        </p>
      </div>

      <!-- Before vs After Comparison Cards -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
        
        <!-- The Problem: Standard Puppeteer / Chromium -->
        <div class="p-8 rounded-2xl bg-rose-950/20 border border-rose-900/40 shadow-xl flex flex-col justify-between">
          <div class="space-y-4">
            <div class="flex items-center space-x-3">
              <div class="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center font-bold text-lg border border-rose-500/30">✕</div>
              <div>
                <h3 class="text-base font-bold text-white">Standard Headless Chrome &amp; Puppeteer</h3>
                <p class="text-xs text-rose-300">What happens with raw tools without Tailprint</p>
              </div>
            </div>

            <ul class="space-y-3 text-xs text-slate-300 pt-3">
              <li class="flex items-start space-x-2.5">
                <span class="text-rose-400 font-bold shrink-0">✕</span>
                <span><strong>Disappearing Headers:</strong> Table headers (<code class="text-rose-300">&lt;thead&gt;</code>) vanish on pages 2, 3, and 4, leaving pages unreadable without context.</span>
              </li>
              <li class="flex items-start space-x-2.5">
                <span class="text-rose-400 font-bold shrink-0">✕</span>
                <span><strong>Horizontally Sliced Rows:</strong> Table rows (<code class="text-rose-300">&lt;tr&gt;</code>) get sliced mid-sentence across page breaks, splitting text in two.</span>
              </li>
              <li class="flex items-start space-x-2.5">
                <span class="text-rose-400 font-bold shrink-0">✕</span>
                <span><strong>Orphan Headings:</strong> Section headers (<code class="text-rose-300">&lt;h2&gt;</code>) sit isolated at the very bottom of a page while content starts on the next.</span>
              </li>
              <li class="flex items-start space-x-2.5">
                <span class="text-rose-400 font-bold shrink-0">✕</span>
                <span><strong>Privacy Risk:</strong> Generated customer PDFs often persist indefinitely on disk, violating GDPR / HIPAA compliance.</span>
              </li>
            </ul>
          </div>

          <div class="mt-6 pt-4 border-t border-rose-900/30 text-[11px] text-rose-300 font-mono">
            Outcome: Broken customer invoices &amp; hours wasted on manual CSS hacks.
          </div>
        </div>

        <!-- The Solution: Tailprint Smart Shield -->
        <div class="p-8 rounded-2xl bg-emerald-950/20 border border-emerald-900/40 shadow-xl flex flex-col justify-between">
          <div class="space-y-4">
            <div class="flex items-center space-x-3">
              <div class="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-lg border border-emerald-500/30">✓</div>
              <div>
                <h3 class="text-base font-bold text-white">Tailprint Smart Pagination Shield</h3>
                <p class="text-xs text-emerald-300">Enabled automatically on every render request</p>
              </div>
            </div>

            <ul class="space-y-3 text-xs text-slate-300 pt-3">
              <li class="flex items-start space-x-2.5">
                <span class="text-emerald-400 font-bold shrink-0">✓</span>
                <span><strong>Repeating Table Headers:</strong> Automatically injects <code class="text-emerald-300">display: table-header-group;</code> so <code class="text-emerald-300">&lt;thead&gt;</code> repeats cleanly on every single printed page.</span>
              </li>
              <li class="flex items-start space-x-2.5">
                <span class="text-emerald-400 font-bold shrink-0">✓</span>
                <span><strong>Row Split Shield:</strong> Injects <code class="text-emerald-300">break-inside: avoid;</code> across all table rows, keeping cells and numbers 100% intact.</span>
              </li>
              <li class="flex items-start space-x-2.5">
                <span class="text-emerald-400 font-bold shrink-0">✓</span>
                <span><strong>Headless Table Auto-Detection:</strong> Tables without a semantic <code class="text-emerald-300">&lt;thead&gt;</code> are detected on-the-fly and auto-wrapped in headers.</span>
              </li>
              <li class="flex items-start space-x-2.5">
                <span class="text-emerald-400 font-bold shrink-0">✓</span>
                <span><strong>Zero-Retention Mode (<code class="text-emerald-300">no_store: true</code>):</strong> Transient memory rendering only. Bypasses disk storage &amp; caching for complete GDPR and HIPAA peace of mind.</span>
              </li>
            </ul>
          </div>

          <div class="mt-6 pt-4 border-t border-emerald-900/30 text-[11px] text-emerald-300 font-mono flex items-center justify-between">
            <span>Enabled by default in API &amp; MCP</span>
            <span class="font-bold">X-Tailprint-Zero-Retention: active</span>
          </div>
        </div>

      </div>

    </div>
  </section>

  <!-- European E-Invoicing & Compliance Section (Enterprise B2B Anchor) -->
  <section id="einvoice" class="py-24 border-t border-slate-800/80 bg-gradient-to-b from-slate-950 via-amber-950/15 to-slate-950 relative overflow-hidden">
    <div class="absolute -top-32 right-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>
    <div class="max-w-6xl mx-auto px-6 relative z-10">
      
      <div class="text-center max-w-3xl mx-auto mb-14">
        <div class="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-amber-950/70 border border-amber-800/60 text-amber-300 text-xs font-semibold mb-4 backdrop-blur-md shadow-lg shadow-amber-950/50">
          <span>🇪🇺 Mandatory EU B2B Compliance • EN 16931 • Factur-X • ZUGFeRD 2.2</span>
        </div>
        <h2 class="text-3xl sm:text-4xl font-black text-white tracking-tight">
          Hybrid PDF/A-3 Electronic Invoicing for Modern SaaS &amp; ERPs
        </h2>
        <p class="text-slate-400 mt-3 text-base leading-relaxed">
          European B2B mandates require businesses in Germany, France, Poland, Italy, and across the EU to issue structured e-invoices. Tailprint compiles legal hybrid PDF/A-3 documents with embedded CrossIndustryInvoice XML in under 800ms.
        </p>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        
        <!-- Left: Compliance Specs & Features (7 cols) -->
        <div class="lg:col-span-7 space-y-5">
          <div class="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-4">
            <h3 class="text-lg font-bold text-white flex items-center space-x-2">
              <span class="text-amber-400">📄 + 🤖</span>
              <span>The Hybrid Dual-Format Standard</span>
            </h3>
            <p class="text-xs text-slate-300 leading-relaxed">
              Every invoice generated by <code class="text-amber-400 bg-amber-950/50 px-1.5 py-0.5 rounded border border-amber-800/50">POST /v1/render/einvoice</code> contains two synchronized layers:
            </p>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
              <div class="p-4 rounded-xl bg-slate-950/80 border border-slate-800">
                <div class="text-xs font-bold text-amber-300 flex items-center space-x-1.5">
                  <span>1. Visual Vector PDF</span>
                </div>
                <p class="text-[11px] text-slate-400 mt-1 leading-snug">
                  Crisp, branded Tailwind CSS A4 layout for human accounting and print review.
                </p>
              </div>

              <div class="p-4 rounded-xl bg-slate-950/80 border border-slate-800">
                <div class="text-xs font-bold text-emerald-300 flex items-center space-x-1.5">
                  <span>2. Embedded factur-x.xml</span>
                </div>
                <p class="text-[11px] text-slate-400 mt-1 leading-snug">
                  Standardized CII XML embedded in the PDF catalog for automatic ERP robot ingestion.
                </p>
              </div>
            </div>

            <div class="pt-3 border-t border-slate-800/80 flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
              <span class="text-slate-500 font-semibold uppercase text-[10px]">ERP Ready:</span>
              <span class="px-2 py-0.5 rounded bg-slate-800/80 border border-slate-700/60 text-slate-300">SAP</span>
              <span class="px-2 py-0.5 rounded bg-slate-800/80 border border-slate-700/60 text-slate-300">DATEV</span>
              <span class="px-2 py-0.5 rounded bg-slate-800/80 border border-slate-700/60 text-slate-300">Dynamics 365</span>
              <span class="px-2 py-0.5 rounded bg-slate-800/80 border border-slate-700/60 text-slate-300">Chorus Pro</span>
              <span class="px-2 py-0.5 rounded bg-slate-800/80 border border-slate-700/60 text-slate-300">PEPPOL</span>
              <span class="px-2 py-0.5 rounded bg-slate-800/80 border border-slate-700/60 text-slate-300">Dinero / Billy</span>
            </div>
          </div>

          <div class="flex flex-col sm:flex-row gap-3">
            <a href="/tools/factur-x" class="px-5 py-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs transition shadow-lg shadow-amber-600/25 flex items-center justify-center space-x-2">
              <span>⚡ Try Live Factur-X Generator</span>
              <span class="text-[10px] px-1.5 py-0.2 rounded bg-amber-950/50 text-amber-200">Free Tool</span>
            </a>
            <a href="/docs#section/einvoice-guide" class="px-5 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 font-semibold text-xs transition flex items-center justify-center space-x-2">
              <span>📖 Read E-Invoicing API Documentation</span>
            </a>
          </div>
        </div>

        <!-- Right: cURL / JSON Payload Snippet (5 cols) -->
        <div class="lg:col-span-5 bg-slate-950 border border-slate-800 rounded-2xl p-5 shadow-2xl relative font-mono text-xs">
          <div class="flex items-center justify-between pb-3 mb-3 border-b border-slate-800 text-[11px] text-slate-400">
            <span class="text-amber-400 font-bold">POST /v1/render/einvoice</span>
            <span class="text-slate-500">profile: BASIC | EN16931</span>
          </div>

          <pre class="text-slate-300 text-[11px] leading-relaxed overflow-x-auto"><code>{
  <span class="text-purple-400">"invoiceNumber"</span>: <span class="text-emerald-300">"INV-2026-0042"</span>,
  <span class="text-purple-400">"currency"</span>: <span class="text-emerald-300">"EUR"</span>,
  <span class="text-purple-400">"profile"</span>: <span class="text-emerald-300">"BASIC"</span>,
  <span class="text-purple-400">"seller"</span>: {
    <span class="text-purple-400">"name"</span>: <span class="text-emerald-300">"Acme Nordic ApS"</span>,
    <span class="text-purple-400">"vatId"</span>: <span class="text-emerald-300">"DK12345678"</span>,
    <span class="text-purple-400">"country"</span>: <span class="text-emerald-300">"DK"</span>
  },
  <span class="text-purple-400">"buyer"</span>: {
    <span class="text-purple-400">"name"</span>: <span class="text-emerald-300">"Global Logistics GmbH"</span>,
    <span class="text-purple-400">"vatId"</span>: <span class="text-emerald-300">"DE987654321"</span>,
    <span class="text-purple-400">"country"</span>: <span class="text-emerald-300">"DE"</span>
  },
  <span class="text-purple-400">"lineItems"</span>: [{
    <span class="text-purple-400">"name"</span>: <span class="text-emerald-300">"Cloud SaaS Subscription"</span>,
    <span class="text-purple-400">"quantity"</span>: <span class="text-sky-300">1</span>,
    <span class="text-purple-400">"unitPrice"</span>: <span class="text-sky-300">99.00</span>,
    <span class="text-purple-400">"vatRate"</span>: <span class="text-sky-300">25.0</span>
  }]
}</code></pre>

          <div class="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-500">
            <span>Returns: PDF/A-3 with embedded XML</span>
            <span class="text-emerald-400 font-bold">&lt; 800ms</span>
          </div>
        </div>

      </div>

    </div>
  </section>

  <!-- Templates Section -->
  <section id="templates" class="py-20 bg-slate-900/40 border-t border-b border-slate-800/80">
    <div class="max-w-7xl mx-auto px-6">
      <div class="text-center max-w-2xl mx-auto mb-10">
        <div class="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-950/60 border border-indigo-800/50 text-indigo-400 text-xs font-semibold mb-3">
          <span>Ready to Copy &amp; Render to PDF</span>
        </div>
        <h2 class="text-3xl font-extrabold text-white">${TEMPLATES.filter((t) => t.id !== 'og-card').length} Production PDF &amp; Document Templates</h2>
        <p class="text-slate-400 mt-2">One-click copy for clean Tailwind HTML or cURL terminal commands. Test immediate PDF rendering on any document template.</p>
      </div>

      <!-- Tab Buttons Grid -->
      <div class="flex flex-wrap justify-center mb-8 gap-2.5 max-w-5xl mx-auto">
        ${TEMPLATES.filter((t) => t.id !== 'og-card')
          .map(
            (t, index) => `
          <button onclick="switchTab('${t.id}')" id="btn-${t.id}" class="px-4 py-2 rounded-xl font-bold text-xs ${
            index === 0
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
              : 'bg-slate-900/90 border border-slate-800 text-slate-400 hover:text-white'
          } transition flex items-center space-x-2">
            <span>${
              t.id === 'invoice'
                ? '🧾'
                : t.id === 'quote'
                ? '💼'
                : t.id === 'statement'
                ? '🏛️'
                : t.id === 'nda'
                ? '🔒'
                : t.id === 'einvoice'
                ? '🇪🇺'
                : t.id === 'presentation'
                ? '🖥️'
                : t.id === 'contract'
                ? '📝'
                : t.id === 'certificate'
                ? '🎓'
                : t.id === 'report'
                ? '📊'
                : t.id === 'resume'
                ? '👤'
                : t.id === 'ticket'
                ? '🎟️'
                : t.id === 'receipt'
                ? '🏷️'
                : '📦'
            }</span>
            <span>${t.title}</span>
          </button>
        `
          )
          .join('')}
      </div>

      <!-- Template Panels -->
      ${TEMPLATES.filter((t) => t.id !== 'og-card')
        .map(
          (t, index) => `
        <div id="tab-${t.id}" class="template-panel ${index === 0 ? '' : 'hidden'} grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div class="lg:col-span-7 bg-white text-slate-900 rounded-2xl p-6 shadow-2xl border border-slate-700/50 max-h-[640px] overflow-y-auto">
            ${t.html}
          </div>
          <div class="lg:col-span-5 space-y-4">
            <div class="p-6 rounded-2xl bg-slate-900 border border-slate-800">
              <div class="flex justify-between items-start">
                <span class="text-[10px] font-bold uppercase tracking-wider text-indigo-400 bg-indigo-950/80 px-2.5 py-1 rounded-md border border-indigo-800/40">${t.category}</span>
                <span class="text-xs text-slate-400 font-mono">${t.format} ${t.landscape ? 'Landscape' : 'Portrait'}</span>
              </div>
              <h3 class="text-xl font-bold text-white mt-3">${t.title}</h3>
              <p class="text-slate-400 text-xs mt-1.5 leading-relaxed">${t.description}</p>
              
              <div class="mt-6 flex flex-wrap gap-2.5">
                <a href="/studio?template=${t.id}" class="px-3.5 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold text-xs transition flex items-center space-x-1.5 shadow-md shadow-purple-600/30">
                  <span>⚡ Open in Studio</span>
                </a>
                <button onclick="copyHtml('${t.id}')" class="px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition flex items-center space-x-1.5 shadow-md shadow-indigo-600/30">
                  <span>📋 Copy HTML</span>
                </button>
                <button onclick="copyCurl('${t.id}')" class="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs transition flex items-center space-x-1.5">
                  <span>💻 Copy cURL</span>
                </button>
                <a href="/templates/${t.id}/download" class="px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition flex items-center space-x-1.5 shadow-md shadow-emerald-600/30">
                  <span>⬇️ Download PDF</span>
                </a>
              </div>
            </div>

            <div class="p-4 rounded-xl bg-slate-900/80 border border-slate-800/80 text-[11px]">
              <p class="font-bold text-slate-300 uppercase tracking-wider mb-1.5">cURL API Request</p>
              <pre class="bg-slate-950 p-3 rounded-lg text-slate-300 overflow-x-auto leading-relaxed border border-slate-800 font-mono text-[10px]">curl -X POST ${env.APP_URL}/v1/render/pdf \\
  -H "Authorization: Bearer sec_live_..." \\
  -H "Content-Type: application/json" \\
  -d '{"html":"..."}' \\
  --output ${t.id}.pdf</pre>
            </div>
          </div>
        </div>
      `
        )
        .join('')}

    </div>
  </section>

  <!-- Model Context Protocol (MCP) Section -->
  <section id="mcp" class="py-24 border-b border-slate-800/80 bg-gradient-to-b from-slate-950 via-indigo-950/20 to-slate-950">
    <div class="max-w-7xl mx-auto px-6 space-y-16">
      
      <!-- Section Header -->
      <div class="text-center max-w-3xl mx-auto">
        <div class="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-purple-950/60 border border-purple-800/50 text-purple-400 text-xs font-semibold mb-4">
          <span class="w-2 h-2 rounded-full bg-purple-400 animate-pulse"></span>
          <span>Official Model Context Protocol (MCP) Server for PDF &amp; Documents</span>
        </div>
        <h2 class="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
          Give Your AI Assistants Hands to <span class="bg-gradient-to-r from-purple-400 to-indigo-400 bg-clip-text text-transparent">Generate &amp; Manage PDFs</span>
        </h2>
        <p class="text-slate-400 mt-3 text-sm sm:text-base leading-relaxed">
          Connect Tailprint to Claude Desktop, Cursor, Windsurf, or autonomous LLM agents in 30 seconds. Turn conversational prompts into pixel-perfect PDF documents, compliant European e-invoices, and automated PDF operations.
        </p>
      </div>

      <!-- 6 Focused Document & PDF Use Cases -->
      <div>
        <div class="flex items-center justify-between mb-6">
          <div>
            <h3 class="text-xl font-bold text-white">Document &amp; PDF Workflows via MCP</h3>
            <p class="text-xs text-slate-400 mt-1">What you can ask your AI assistant to generate right now with Tailprint MCP.</p>
          </div>
          <span class="hidden sm:inline-block text-xs font-semibold text-purple-400 px-3 py-1 rounded-lg bg-purple-950/60 border border-purple-800/40">
            Tools • Resources • Prompts
          </span>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

          <!-- Use Case 1: Instant Client Invoicing & Billing -->
          <div class="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between hover:border-emerald-500/50 transition shadow-lg group">
            <div class="space-y-4">
              <div class="flex items-center justify-between">
                <div class="flex items-center space-x-2.5">
                  <span class="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 text-lg">🧾</span>
                  <h4 class="text-sm font-bold text-white group-hover:text-emerald-400 transition">1. Instant Client Invoicing</h4>
                </div>
                <span class="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-800/40">render_template</span>
              </div>

              <div class="p-3.5 rounded-xl bg-slate-950/90 border border-slate-800/90 font-mono text-xs text-slate-300">
                <span class="text-emerald-400 font-bold">You to Claude:</span> "Create a PDF invoice for Acme Corp: 15h engineering at $150/hr, invoice #INV-2026-042, due in 14 days."
              </div>

              <div class="space-y-2 text-xs text-slate-400">
                <p class="flex items-start space-x-2">
                  <span class="text-emerald-400 font-bold">✓</span>
                  <span><strong class="text-slate-200">What happens:</strong> Calls <code class="text-slate-300">render_template('invoice', variables)</code> and compiles a vector PDF in under 500ms.</span>
                </p>
              </div>
            </div>
          </div>

          <!-- Use Case 2: EU Factur-X / PEPPOL E-Invoicing -->
          <div class="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between hover:border-emerald-500/50 transition shadow-lg group">
            <div class="space-y-4">
              <div class="flex items-center justify-between">
                <div class="flex items-center space-x-2.5">
                  <span class="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 text-lg">🇪🇺</span>
                  <h4 class="text-sm font-bold text-white group-hover:text-emerald-400 transition">2. EU Factur-X E-Invoicing</h4>
                </div>
                <span class="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-800/40">generate_einvoice</span>
              </div>

              <div class="p-3.5 rounded-xl bg-slate-950/90 border border-slate-800/90 font-mono text-xs text-slate-300">
                <span class="text-indigo-400 font-bold">You to Claude:</span> "Bill BMW AG in Munich for 40 hours consulting at 150 EUR/hr as an official EU Factur-X hybrid invoice."
              </div>

              <div class="space-y-2 text-xs text-slate-400">
                <p class="flex items-start space-x-2">
                  <span class="text-emerald-400 font-bold">✓</span>
                  <span><strong class="text-slate-200">What happens:</strong> Generates a Tailwind A4 PDF with valid <strong class="text-slate-200">factur-x.xml</strong> (EN 16931) embedded for SAP &amp; DATEV.</span>
                </p>
              </div>
            </div>
          </div>

          <!-- Use Case 3: Fulfillment: Tickets, Receipts & Shipping Labels -->
          <div class="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between hover:border-amber-500/50 transition shadow-lg group">
            <div class="space-y-4">
              <div class="flex items-center justify-between">
                <div class="flex items-center space-x-2.5">
                  <span class="p-2 rounded-xl bg-amber-500/10 text-amber-400 text-lg">🎟️</span>
                  <h4 class="text-sm font-bold text-white group-hover:text-amber-400 transition">3. Tickets, Receipts &amp; Labels</h4>
                </div>
                <span class="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-950/80 text-amber-300 border border-amber-800/40">render_pdf</span>
              </div>

              <div class="p-3.5 rounded-xl bg-slate-950/90 border border-slate-800/90 font-mono text-xs text-slate-300">
                <span class="text-amber-400 font-bold">Your Agent:</span> "Order #8492 placed. Issue a POS receipt, generate a shipping label PDF for DHL, and email customer."
              </div>

              <div class="space-y-2 text-xs text-slate-400">
                <p class="flex items-start space-x-2">
                  <span class="text-emerald-400 font-bold">✓</span>
                  <span><strong class="text-slate-200">What happens:</strong> Agents call <code class="text-slate-300">render_template('receipt' | 'shipping-label')</code> on-demand via JSON-RPC.</span>
                </p>
              </div>
            </div>
          </div>

          <!-- Use Case 4: PDF Merge, Split, Form-Fill & Compression -->
          <div class="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between hover:border-cyan-500/50 transition shadow-lg group">
            <div class="space-y-4">
              <div class="flex items-center justify-between">
                <div class="flex items-center space-x-2.5">
                  <span class="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 text-lg">📑</span>
                  <h4 class="text-sm font-bold text-white group-hover:text-cyan-400 transition">4. PDF Merge, Split &amp; Form Fill</h4>
                </div>
                <span class="text-[10px] font-bold px-2 py-0.5 rounded bg-cyan-950/80 text-cyan-300 border border-cyan-800/40">pdf operations</span>
              </div>

              <div class="p-3.5 rounded-xl bg-slate-950/90 border border-slate-800/90 font-mono text-xs text-slate-300">
                <span class="text-cyan-400 font-bold">You to Claude:</span> "Fill this PDF employment contract form with employee details, flatten it, and merge with our NDA."
              </div>

              <div class="space-y-2 text-xs text-slate-400">
                <p class="flex items-start space-x-2">
                  <span class="text-emerald-400 font-bold">✓</span>
                  <span><strong class="text-slate-200">What happens:</strong> Uses <code class="text-cyan-300">fill_pdf_form</code>, <code class="text-cyan-300">merge_pdfs</code>, and <code class="text-cyan-300">compress_pdf</code> with object stream compaction.</span>
                </p>
              </div>
            </div>
          </div>

          <!-- Use Case 5: Watermarking & Document Stamping -->
          <div class="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between hover:border-rose-500/50 transition shadow-lg group">
            <div class="space-y-4">
              <div class="flex items-center justify-between">
                <div class="flex items-center space-x-2.5">
                  <span class="p-2 rounded-xl bg-rose-500/10 text-rose-400 text-lg">🔒</span>
                  <h4 class="text-sm font-bold text-white group-hover:text-rose-400 transition">5. PDF Watermarking &amp; Stamping</h4>
                </div>
                <span class="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-950/80 text-rose-300 border border-rose-800/40">stamp_pdf</span>
              </div>

              <div class="p-3.5 rounded-xl bg-slate-950/90 border border-slate-800/90 font-mono text-xs text-slate-300">
                <span class="text-rose-400 font-bold">You to Claude:</span> "Stamp this PDF contract with a diagonal semi-transparent 'CONFIDENTIAL' watermark across all pages."
              </div>

              <div class="space-y-2 text-xs text-slate-400">
                <p class="flex items-start space-x-2">
                  <span class="text-emerald-400 font-bold">✓</span>
                  <span><strong class="text-slate-200">What happens:</strong> Streams the PDF through pdf-lib, injecting vector watermark layers with custom rotation and opacity.</span>
                </p>
              </div>
            </div>
          </div>

          <!-- Use Case 6: Widescreen 16:9 Presentation Slide Decks -->
          <div class="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between hover:border-purple-500/50 transition shadow-lg group">
            <div class="space-y-4">
              <div class="flex items-center justify-between">
                <div class="flex items-center space-x-2.5">
                  <span class="p-2 rounded-xl bg-purple-500/10 text-purple-400 text-lg">📽️</span>
                  <h4 class="text-sm font-bold text-white group-hover:text-purple-400 transition">6. 16:9 Presentation PDF Decks</h4>
                </div>
                <span class="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-950/80 text-purple-300 border border-purple-800/40">render_presentation</span>
              </div>

              <div class="p-3.5 rounded-xl bg-slate-950/90 border border-slate-800/90 font-mono text-xs text-slate-300">
                <span class="text-purple-400 font-bold">You to Claude:</span> "Turn this quarterly product roadmap and metrics into a 5-slide dark 16:9 vector presentation PDF."
              </div>

              <div class="space-y-2 text-xs text-slate-400">
                <p class="flex items-start space-x-2">
                  <span class="text-emerald-400 font-bold">✓</span>
                  <span><strong class="text-slate-200">What happens:</strong> Converts Markdown separated by <code class="text-purple-300">---</code> into a 1920×1080 full-bleed vector PDF deck.</span>
                </p>
              </div>
            </div>
          </div>

        </div>
      </div>

      <!-- Quickstart Config Box & Protocol Breakdown -->
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start pt-8 border-t border-slate-800/80">
        
        <!-- Left: Protocol Capabilities Breakdown -->
        <div class="lg:col-span-5 space-y-4">
          <div class="space-y-2">
            <span class="text-xs font-bold text-indigo-400 uppercase tracking-wider">Protocol Architecture</span>
            <h3 class="text-xl font-bold text-white">Full MCP Protocol Compliance</h3>
            <p class="text-xs text-slate-400 leading-relaxed">
              Tailprint implements all three official Model Context Protocol primitives for seamless PDF and document generation across AI runtimes.
            </p>
          </div>

          <div class="space-y-3 pt-2">
            <div class="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 flex items-start space-x-3">
              <span class="text-base">🛠️</span>
              <div>
                <h4 class="text-xs font-bold text-white">Native PDF &amp; Document Tools</h4>
                <p class="text-[11px] text-slate-400 mt-0.5">render_pdf, render_template, generate_einvoice, merge_pdfs, split_pdf, fill_pdf_form, compress_pdf, stamp_pdf, render_presentation, list_templates, get_template_source.</p>
              </div>
            </div>

            <div class="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 flex items-start space-x-3">
              <span class="text-base">📚</span>
              <div>
                <h4 class="text-xs font-bold text-white">12 Resources (Context URIs)</h4>
                <p class="text-[11px] text-slate-400 mt-0.5">tailprint://templates/catalog, tailprint://templates/all, tailprint://docs/tailwind-guide, tailprint://docs/smart-pagination, and all HTML templates directly readable into LLM context.</p>
              </div>
            </div>

            <div class="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 flex items-start space-x-3">
              <span class="text-base">💬</span>
              <div>
                <h4 class="text-xs font-bold text-white">Automated Document Prompts</h4>
                <p class="text-[11px] text-slate-400 mt-0.5">generate_invoice, generate_b2b_invoice, and executive PDF report workflows pre-configured for Claude Desktop and Cursor.</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Right: Config Snippets & Code Box -->
        <div class="lg:col-span-7 bg-slate-900/90 rounded-2xl border border-slate-800 p-6 shadow-2xl space-y-4">
          <div class="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
            <div class="flex flex-wrap gap-1.5">
              <button onclick="switchMcpTab('claude')" id="btn-mcp-claude" class="px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 text-white">Claude Desktop</button>
              <button onclick="switchMcpTab('cursor')" id="btn-mcp-cursor" class="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 text-slate-400 hover:text-white">Cursor</button>
              <button onclick="switchMcpTab('sse')" id="btn-mcp-sse" class="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 text-slate-400 hover:text-white">Remote Cloud SSE</button>
            </div>
            <div class="flex items-center space-x-2">
              <a id="btn-cursor-deeplink" href="#" class="hidden px-3 py-1.5 rounded-lg text-xs font-bold bg-cyan-600 hover:bg-cyan-500 text-white transition flex items-center space-x-1.5 shadow-md shadow-cyan-600/20">
                <span>⚡ 1-Click Install in Cursor</span>
              </a>
              <button onclick="copyMcpSnippet()" id="mcp-copy-btn" class="px-3 py-1.5 rounded-lg text-xs bg-slate-800 hover:bg-slate-700 text-indigo-300 font-semibold flex items-center space-x-1 transition">
                <span>📋 Copy Config</span>
              </button>
            </div>
          </div>

          <!-- Dynamic Key Status Banner -->
          <div id="mcp-key-banner" class="flex items-center justify-between px-3.5 py-2 rounded-xl bg-slate-950/60 border border-slate-800 text-xs">
            <div class="flex items-center space-x-2">
              <span id="mcp-key-dot" class="w-2 h-2 rounded-full bg-amber-400"></span>
              <span id="mcp-key-text" class="text-slate-400">Using placeholder key</span>
            </div>
            <button onclick="startCheckout('free')" id="mcp-key-action-btn" class="text-indigo-400 hover:text-indigo-300 font-bold transition">
              Get 100 free renders ⚡
            </button>
          </div>

          <pre id="mcp-code-block" class="p-4 bg-slate-950 rounded-xl text-xs font-mono text-slate-300 overflow-x-auto leading-relaxed border border-slate-800/80 max-h-80 whitespace-pre"></pre>
          <p id="mcp-hint" class="text-[11px] text-slate-400 leading-relaxed"></p>
        </div>

      </div>

    </div>
  </section>

  <!-- Free PDF & Document Tools Showcase Section -->
  <section id="tools" class="py-20 border-b border-slate-800/80 bg-slate-900/30">
    <div class="max-w-7xl mx-auto px-6">
      
      <div class="flex flex-col md:flex-row md:items-end justify-between mb-12">
        <div>
          <div class="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-950/60 border border-emerald-800/50 text-emerald-400 text-xs font-semibold mb-3">
            <span>🛠️ Free Browser PDF &amp; Document Tools</span>
          </div>
          <h2 class="text-3xl sm:text-4xl font-extrabold text-white">Interactive PDF Tools Hub</h2>
          <p class="text-slate-400 mt-2 text-sm max-w-xl">Zero signup required. Test Tailwind HTML-to-PDF rendering and European Factur-X e-invoicing directly in your browser.</p>
        </div>
        <a href="/tools" class="mt-4 md:mt-0 text-sm font-bold text-indigo-400 hover:text-indigo-300 flex items-center space-x-1.5 transition">
          <span>Explore PDF Tools</span>
          <span>→</span>
        </a>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        <!-- Tool 1: Interactive PDF Studio -->
        <a href="/studio" class="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-purple-500/50 transition shadow-xl group flex flex-col justify-between">
          <div>
            <div class="flex items-center justify-between mb-4">
              <span class="p-2.5 rounded-xl bg-purple-500/10 text-purple-400 text-xl border border-purple-500/20 group-hover:scale-110 transition duration-200">⚡</span>
              <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40">LIVE PDF IDE</span>
            </div>
            <h3 class="text-lg font-bold text-white group-hover:text-purple-300 transition">Interactive PDF Studio</h3>
            <p class="text-xs text-slate-400 mt-2 leading-relaxed">Browser-based IDE with real-time Tailwind JIT preview, paper sizing (A4, US Letter, 16:9 Presentation), and Smart Pagination Shield.</p>
          </div>
          <div class="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs text-purple-400 font-semibold">
            <span>Launch Studio</span>
            <span class="group-hover:translate-x-1 transition duration-200">/studio →</span>
          </div>
        </a>

        <!-- Tool 2: EU Factur-X / PEPPOL E-Invoice Generator -->
        <a href="/tools/factur-x" class="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-emerald-500/50 transition shadow-xl group flex flex-col justify-between">
          <div>
            <div class="flex items-center justify-between mb-4">
              <span class="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 text-xl border border-emerald-500/20 group-hover:scale-110 transition duration-200">🇪🇺</span>
              <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">EN 16931</span>
            </div>
            <h3 class="text-lg font-bold text-white group-hover:text-emerald-300 transition">Factur-X &amp; ZUGFeRD Generator</h3>
            <p class="text-xs text-slate-400 mt-2 leading-relaxed">Generate compliant European hybrid PDF/A-3 e-invoices with embedded XML (factur-x.xml) readable by DATEV, SAP, Dinero, and Billy.</p>
          </div>
          <div class="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs text-emerald-400 font-semibold">
            <span>Issue E-Invoice</span>
            <span class="group-hover:translate-x-1 transition duration-200">/factur-x →</span>
          </div>
        </a>

        <!-- All Tools Card -->
        <div class="p-6 rounded-2xl bg-gradient-to-br from-indigo-950/40 to-slate-900 border border-indigo-800/40 flex flex-col justify-between">
          <div>
            <div class="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-xl mb-4 border border-indigo-500/30">
              📄
            </div>
            <h3 class="text-lg font-bold text-white">Full PDF Cloud API &amp; SDK</h3>
            <p class="text-xs text-slate-400 mt-2 leading-relaxed">Every document tool is powered by the Tailprint REST API and MCP protocol server. Integrate PDF rendering in cURL, Node.js, Python, or AI agents.</p>
          </div>
          <div class="mt-6 pt-4 border-t border-indigo-800/40 flex items-center justify-between text-xs">
            <a href="/docs" target="_blank" class="text-indigo-400 hover:text-white font-semibold transition">View API Reference ↗</a>
            <button onclick="startCheckout('free')" class="text-emerald-400 hover:text-emerald-300 font-bold transition">Get API Key ⚡</button>
          </div>
        </div>

      </div>

    </div>
  </section>

  <!-- Pricing Section -->
  <section id="pricing" class="py-24">
    <div class="max-w-7xl mx-auto px-6">
      <div class="text-center max-w-2xl mx-auto mb-16">
        <div class="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-950/60 border border-emerald-800/50 text-emerald-400 text-xs font-semibold mb-4">
          <span>High-Margin, Conversion-Optimized Tiers</span>
        </div>
        <h2 class="text-3xl sm:text-4xl font-extrabold text-white">Simple, High-Value Pricing</h2>
        <p class="text-slate-400 mt-3">Underbidding competitors while delivering instant sub-500ms Chromium execution. Automatic API key provisioning via Stripe Checkout.</p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch">
        <!-- Free / Developer Sandbox Plan -->
        <div class="p-6 rounded-2xl bg-slate-900/70 border border-emerald-500/30 flex flex-col justify-between hover:border-emerald-500/50 transition relative">
          <div class="absolute -top-3.5 right-6 px-3 py-0.5 rounded-full bg-emerald-600/90 text-white text-[10px] font-black tracking-wider uppercase">
            NO CREDIT CARD
          </div>
          <div>
            <div class="flex justify-between items-center">
              <h3 class="text-lg font-bold text-white">${PLANS.free.name}</h3>
            </div>
            <p class="text-xs text-emerald-400 font-medium mt-1">${PLANS.free.targetAudience}</p>
            <div class="mt-5 flex items-baseline">
              <span class="text-4xl font-extrabold text-white">$0</span>
              <span class="text-slate-400 ml-1.5 text-sm">/ forever</span>
            </div>
            <p class="text-xs text-emerald-400 font-bold mt-1">100 renders / month</p>
            <p class="text-xs text-slate-400 mt-3 leading-relaxed">${PLANS.free.description}</p>

            <ul class="mt-6 space-y-2.5 text-xs text-slate-300">
              ${PLANS.free.features.map((f) => `<li class="flex items-start space-x-2"><span class="text-emerald-400 font-bold mt-0.5">✓</span><span>${f}</span></li>`).join('')}
            </ul>
          </div>
          <button onclick="startCheckout('free')" class="mt-6 w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition text-xs shadow-lg shadow-emerald-600/20">
            Start Free via Stripe (No Card) ⚡
          </button>
        </div>

        <!-- Starter Plan -->
        <div class="p-6 rounded-2xl bg-slate-900/70 border border-slate-800 flex flex-col justify-between hover:border-slate-700 transition">
          <div>
            <div class="flex justify-between items-center">
              <h3 class="text-lg font-bold text-white">${PLANS.starter.name}</h3>
            </div>
            <p class="text-xs text-indigo-400 font-medium mt-1">${PLANS.starter.targetAudience}</p>
            <div class="mt-5 flex items-baseline">
              <span class="text-4xl font-extrabold text-white">$${PLANS.starter.priceUsd}</span>
              <span class="text-slate-400 ml-1.5 text-sm">/ mo</span>
            </div>
            <p class="text-xs text-emerald-400 font-bold mt-1">3,000 renders / month</p>
            <p class="text-xs text-slate-400 mt-3 leading-relaxed">${PLANS.starter.description}</p>

            <ul class="mt-6 space-y-2.5 text-xs text-slate-300">
              ${PLANS.starter.features.map((f) => `<li class="flex items-start space-x-2"><span class="text-emerald-400 font-bold mt-0.5">✓</span><span>${f}</span></li>`).join('')}
            </ul>
          </div>
          <button onclick="startCheckout('starter')" class="mt-6 w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold transition text-xs">
            Start with Starter ($${PLANS.starter.priceUsd}/mo)
          </button>
        </div>

        <!-- Pro Plan (Most Popular) -->
        <div class="p-6 rounded-2xl bg-gradient-to-b from-indigo-950/70 via-slate-900 to-slate-900 border-2 border-indigo-500 flex flex-col justify-between relative shadow-xl shadow-indigo-500/10 lg:-translate-y-2">
          <div class="absolute -top-3.5 right-6 px-3 py-0.5 rounded-full bg-indigo-500 text-white text-[10px] font-black tracking-wider uppercase shadow-md">
            MOST POPULAR
          </div>
          <div>
            <div class="flex justify-between items-center">
              <h3 class="text-lg font-bold text-white">${PLANS.pro.name}</h3>
            </div>
            <p class="text-xs text-indigo-300 font-medium mt-1">${PLANS.pro.targetAudience}</p>
            <div class="mt-5 flex items-baseline">
              <span class="text-4xl font-extrabold text-white">$${PLANS.pro.priceUsd}</span>
              <span class="text-slate-400 ml-1.5 text-sm">/ mo</span>
            </div>
            <p class="text-xs text-emerald-400 font-bold mt-1">25,000 renders / month</p>
            <p class="text-xs text-slate-300 mt-3 leading-relaxed">${PLANS.pro.description}</p>

            <ul class="mt-6 space-y-2.5 text-xs text-slate-200">
              ${PLANS.pro.features.map((f) => `<li class="flex items-start space-x-2"><span class="text-emerald-400 font-bold mt-0.5">✓</span><span>${f}</span></li>`).join('')}
            </ul>
          </div>
          <button onclick="startCheckout('pro')" class="mt-6 w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition text-xs shadow-lg shadow-indigo-600/30">
            Get Pro (25k Renders)
          </button>
        </div>

        <!-- Business / Scale Plan -->
        <div class="p-6 rounded-2xl bg-slate-900/70 border border-slate-800 flex flex-col justify-between hover:border-slate-700 transition relative">
          <div class="absolute -top-3.5 right-6 px-3 py-0.5 rounded-full bg-indigo-600/90 text-white text-[10px] font-black tracking-wider uppercase">
            SCALE VALUE
          </div>
          <div>
            <div class="flex justify-between items-center">
              <h3 class="text-lg font-bold text-white">${PLANS.business.name}</h3>
            </div>
            <p class="text-xs text-emerald-400 font-medium mt-1">${PLANS.business.targetAudience}</p>
            <div class="mt-5 flex items-baseline">
              <span class="text-4xl font-extrabold text-white">$${PLANS.business.priceUsd}</span>
              <span class="text-slate-400 ml-1.5 text-sm">/ mo</span>
            </div>
            <p class="text-xs text-emerald-400 font-bold mt-1">100,000 renders / month</p>
            <p class="text-xs text-slate-400 mt-3 leading-relaxed">${PLANS.business.description}</p>

            <ul class="mt-6 space-y-2.5 text-xs text-slate-300">
              ${PLANS.business.features.map((f) => `<li class="flex items-start space-x-2"><span class="text-emerald-400 font-bold mt-0.5">✓</span><span>${f}</span></li>`).join('')}
            </ul>
          </div>
          <button onclick="startCheckout('business')" class="mt-6 w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold transition text-xs">
            Scale with Business ($${PLANS.business.priceUsd}/mo)
          </button>
        </div>
      </div>

      <!-- Enterprise Callout Banner -->
      <div class="mt-10 p-6 rounded-2xl bg-slate-900/50 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-6">
        <div>
          <div class="inline-flex items-center space-x-2 px-2.5 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20 text-[10px] font-bold uppercase tracking-wider mb-1.5">
            <span>Enterprise & Custom Pools</span>
          </div>
          <h4 class="text-white font-bold text-base">Need 250,000+ monthly renders, dedicated browser workers or strict 99.9% uptime SLA?</h4>
          <p class="text-xs text-slate-400 mt-1">Enterprise plans start at $${PLANS.enterprise.priceUsd}/mo with dedicated Chromium instances and private Slack/Discord technical channel.</p>
        </div>
        <button onclick="startCheckout('enterprise')" class="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition whitespace-nowrap border border-slate-700">
          Deploy Enterprise ($${PLANS.enterprise.priceUsd}/mo)
        </button>
      </div>
    </div>
  </section>

  <!-- Frequently Asked Questions Section (SEO & GEO Knowledge Engine) -->
  <section id="faq" class="py-20 bg-slate-900/40 border-t border-slate-800/80">
    <div class="max-w-4xl mx-auto px-6">
      <div class="text-center mb-12">
        <div class="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-950/60 border border-indigo-800/50 text-indigo-400 text-xs font-semibold mb-3">
          <span>Architecture & Knowledge Base</span>
        </div>
        <h2 class="text-3xl sm:text-4xl font-extrabold text-white">Frequently Asked Questions</h2>
        <p class="text-slate-400 mt-2 text-sm">Everything you need to know about Tailwind rendering, the MCP server, performance, and security.</p>
      </div>

      <div class="space-y-4">
        <!-- Q1 -->
        <details class="group rounded-2xl bg-slate-900/70 border border-slate-800 p-6 transition duration-200 open:border-indigo-500/50 open:bg-slate-900/90" open>
          <summary class="flex items-center justify-between font-bold text-white cursor-pointer list-none text-base">
            <span>How does Tailprint convert Tailwind CSS HTML to vector PDF?</span>
            <span class="text-indigo-400 text-lg group-open:rotate-180 transition-transform duration-200">↓</span>
          </summary>
          <p class="text-slate-300 text-sm mt-3 leading-relaxed">
            Tailprint uses isolated, pre-warmed Chromium instances with native Tailwind CSS JIT compilation. You submit raw HTML containing arbitrary utility classes (e.g. <code class="text-indigo-300 bg-slate-950 px-1.5 py-0.5 rounded text-xs font-mono">w-[350px]</code>, <code class="text-indigo-300 bg-slate-950 px-1.5 py-0.5 rounded text-xs font-mono">grid-cols-12</code>, custom gradients), and Tailprint compiles print-ready vector PDFs in under 500ms without build steps, PostCSS configs, or local browser dependencies.
          </p>
        </details>

        <!-- Q2 -->
        <details class="group rounded-2xl bg-slate-900/70 border border-slate-800 p-6 transition duration-200 open:border-indigo-500/50 open:bg-slate-900/90">
          <summary class="flex items-center justify-between font-bold text-white cursor-pointer list-none text-base">
            <span>How do I connect Tailprint to Claude Desktop, Cursor, or AI coding agents via MCP?</span>
            <span class="text-indigo-400 text-lg group-open:rotate-180 transition-transform duration-200">↓</span>
          </summary>
          <p class="text-slate-300 text-sm mt-3 leading-relaxed">
            Tailprint implements the official <a href="#mcp" class="text-indigo-400 underline font-semibold">Model Context Protocol (MCP)</a> specification. Connect via Remote SSE at <code class="text-indigo-300 bg-slate-950 px-1.5 py-0.5 rounded text-xs font-mono">https://tailprint.com/v1/mcp/sse</code> by passing your API key in the headers of your Claude Desktop configuration (<code class="text-slate-400 text-xs font-mono">claude_desktop_config.json</code>) or Cursor IDE settings. Autonomous agents can then call PDF tools like <code class="text-purple-300 bg-slate-950 px-1.5 py-0.5 rounded text-xs font-mono">render_pdf</code>, <code class="text-purple-300 bg-slate-950 px-1.5 py-0.5 rounded text-xs font-mono">render_template</code>, and <code class="text-purple-300 bg-slate-950 px-1.5 py-0.5 rounded text-xs font-mono">generate_einvoice</code> directly.
          </p>
        </details>

        <!-- Q3 -->
        <details class="group rounded-2xl bg-slate-900/70 border border-slate-800 p-6 transition duration-200 open:border-indigo-500/50 open:bg-slate-900/90">
          <summary class="flex items-center justify-between font-bold text-white cursor-pointer list-none text-base">
            <span>What are the latency benchmarks and caching mechanisms?</span>
            <span class="text-indigo-400 text-lg group-open:rotate-180 transition-transform duration-200">↓</span>
          </summary>
          <p class="text-slate-300 text-sm mt-3 leading-relaxed">
            Fresh PDF renders execute in 350ms to 500ms on pre-warmed Chromium instances with memory pooling and strict concurrency throttling (<code class="text-slate-400 text-xs font-mono">p-limit</code>). For social preview cards and images, Tailprint automatically computes a SHA-256 hash of the input markup, returning instant cache hits in under 50ms with an <code class="text-emerald-400 bg-slate-950 px-1.5 py-0.5 rounded text-xs font-mono">X-Cache: HIT</code> header.
          </p>
        </details>

        <!-- Q4 -->
        <details class="group rounded-2xl bg-slate-900/70 border border-slate-800 p-6 transition duration-200 open:border-indigo-500/50 open:bg-slate-900/90">
          <summary class="flex items-center justify-between font-bold text-white cursor-pointer list-none text-base">
            <span>What security and Server-Side Request Forgery (SSRF) protections are in place?</span>
            <span class="text-indigo-400 text-lg group-open:rotate-180 transition-transform duration-200">↓</span>
          </summary>
          <p class="text-slate-300 text-sm mt-3 leading-relaxed">
            Tailprint provides an enterprise-hardened network sandbox. All outbound network requests are scrutinized, and requests targeting local addresses or private IP subnets (<code class="text-slate-400 text-xs font-mono">127.0.0.1</code>, <code class="text-slate-400 text-xs font-mono">10.0.0.0/8</code>, <code class="text-slate-400 text-xs font-mono">172.16.0.0/12</code>, <code class="text-slate-400 text-xs font-mono">192.168.0.0/16</code>, and cloud metadata services like <code class="text-slate-400 text-xs font-mono">169.254.169.254</code>) are blocked instantly before socket connection.
          </p>
        </details>

        <!-- Q5 -->
        <details class="group rounded-2xl bg-slate-900/70 border border-slate-800 p-6 transition duration-200 open:border-indigo-500/50 open:bg-slate-900/90">
          <summary class="flex items-center justify-between font-bold text-white cursor-pointer list-none text-base">
            <span>Is there a free tier available for developers?</span>
            <span class="text-indigo-400 text-lg group-open:rotate-180 transition-transform duration-200">↓</span>
          </summary>
          <p class="text-slate-300 text-sm mt-3 leading-relaxed">
            Yes. Tailprint offers a <strong>Developer Free Sandbox</strong> granting 100 free monthly renders with zero credit card required. You can claim an instant API key directly from the homepage and start using it with cURL, Node.js, Python, or MCP immediately.
          </p>
        </details>

        <!-- Q6: Smart Pagination -->
        <details class="group rounded-2xl bg-slate-900/70 border border-slate-800 p-6 transition duration-200 open:border-indigo-500/50 open:bg-slate-900/90">
          <summary class="flex items-center justify-between font-bold text-white cursor-pointer list-none text-base">
            <span>How does the Smart Pagination &amp; Table Split Shield prevent broken PDFs?</span>
            <span class="text-indigo-400 text-lg group-open:rotate-180 transition-transform duration-200">↓</span>
          </summary>
          <p class="text-slate-300 text-sm mt-3 leading-relaxed">
            By default (<code class="text-emerald-400 bg-slate-950 px-1.5 py-0.5 rounded text-xs font-mono">smart_pagination: true</code>), Tailprint inspects the DOM before Chromium page printing and injects critical CSS rules: table headers (<code class="text-emerald-300">&lt;thead&gt;</code>) are assigned <code class="text-slate-300">display: table-header-group;</code> so they cleanly repeat at the top of every subsequent printed page. Table rows (<code class="text-slate-300">&lt;tr&gt;</code>, <code class="text-slate-300">&lt;td&gt;</code>, <code class="text-slate-300">&lt;th&gt;</code>) are shielded with <code class="text-slate-300">break-inside: avoid;</code> to prevent mid-row horizontal cuts, and headings (<code class="text-slate-300">&lt;h1&gt;</code> to <code class="text-slate-300">&lt;h6&gt;</code>) are locked to their following content with <code class="text-slate-300">break-after: avoid;</code>. Headless tables without a header are even auto-wrapped into semantic <code class="text-emerald-300">&lt;thead&gt;</code> tags.
          </p>
        </details>

        <!-- Q7: Zero-Retention GDPR -->
        <details class="group rounded-2xl bg-slate-900/70 border border-slate-800 p-6 transition duration-200 open:border-indigo-500/50 open:bg-slate-900/90">
          <summary class="flex items-center justify-between font-bold text-white cursor-pointer list-none text-base">
            <span>What is Zero-Retention Mode and how does it guarantee GDPR &amp; HIPAA privacy?</span>
            <span class="text-indigo-400 text-lg group-open:rotate-180 transition-transform duration-200">↓</span>
          </summary>
          <p class="text-slate-300 text-sm mt-3 leading-relaxed">
            When you pass <code class="text-rose-400 bg-slate-950 px-1.5 py-0.5 rounded text-xs font-mono">no_store: true</code> in your API request, Tailprint renders your document strictly in volatile, transient Chromium memory and streams the binary buffer directly back in the HTTP response. No file is saved to disk, no file is stored on the CDN, and the Redis SHA-256 cache layer is completely bypassed. The server returns an <code class="text-rose-300 bg-slate-950 px-1.5 py-0.5 rounded text-xs font-mono">X-Tailprint-Zero-Retention: active</code> header confirming zero persistence.
          </p>
        </details>

        <!-- Q8: MCP PDF Tools -->
        <details class="group rounded-2xl bg-slate-900/70 border border-slate-800 p-6 transition duration-200 open:border-indigo-500/50 open:bg-slate-900/90">
          <summary class="flex items-center justify-between font-bold text-white cursor-pointer list-none text-base">
            <span>What document and PDF capabilities does the Tailprint MCP server provide?</span>
            <span class="text-indigo-400 text-lg group-open:rotate-180 transition-transform duration-200">↓</span>
          </summary>
          <p class="text-slate-300 text-sm mt-3 leading-relaxed">
            The Tailprint MCP server equips AI assistants (Claude Desktop, Cursor, Windsurf) with native document tools: <strong>Document generation</strong> (<code class="text-indigo-300">render_pdf</code>, <code class="text-indigo-300">render_template</code>, <code class="text-indigo-300">render_presentation</code>), <strong>PDF Toolkit operations</strong> (<code class="text-indigo-300">merge_pdfs</code>, <code class="text-indigo-300">split_pdf</code>, <code class="text-indigo-300">fill_pdf_form</code>, <code class="text-indigo-300">compress_pdf</code>, <code class="text-indigo-300">stamp_pdf</code>), and <strong>European E-Invoicing Compliance</strong> (<code class="text-indigo-300">generate_einvoice</code>).
          </p>
        </details>

        <!-- Q9: EU Factur-X / PEPPOL -->
        <details class="group rounded-2xl bg-slate-900/70 border border-slate-800 p-6 transition duration-200 open:border-indigo-500/50 open:bg-slate-900/90">
          <summary class="flex items-center justify-between font-bold text-white cursor-pointer list-none text-base">
            <span>How does Tailprint handle EU Factur-X / ZUGFeRD / EN 16931 compliance?</span>
            <span class="text-indigo-400 text-lg group-open:rotate-180 transition-transform duration-200">↓</span>
          </summary>
          <p class="text-slate-300 text-sm mt-3 leading-relaxed">
            Via <code class="text-emerald-400 bg-slate-950 px-1.5 py-0.5 rounded text-xs font-mono">POST /v1/render/einvoice</code> or the MCP tool <code class="text-emerald-400 bg-slate-950 px-1.5 py-0.5 rounded text-xs font-mono">generate_einvoice</code>, Tailprint generates a hybrid PDF document compliant with the European Standard EN 16931. It renders an A4 vector visual invoice using Tailwind CSS and embeds a machine-readable <code class="text-emerald-300">factur-x.xml</code> (CrossIndustryInvoice) file into the PDF document catalog dictionary (<code class="text-slate-400 text-xs font-mono">/EmbeddedFiles</code>). This is directly readable by ERP systems such as DATEV, SAP, Chorus Pro, Dinero, and Billy.
          </p>
        </details>
      </div>
    </div>
  </section>

  <!-- Stripe Checkout Success Modal -->
  <div id="success-modal" class="hidden fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
    <div class="relative w-full max-w-xl rounded-2xl bg-slate-900 border border-emerald-500/40 p-8 shadow-2xl shadow-emerald-500/10 text-center">
      <div class="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-3xl">
        🎉
      </div>
      <h3 class="text-2xl font-black text-white">Payment Successful!</h3>
      <p class="text-slate-400 text-sm mt-1">Welcome to Tailprint. Your live API key is ready below:</p>

      <div class="mt-6 p-4 rounded-xl bg-slate-950 border border-slate-800 text-left">
        <div class="flex items-center justify-between mb-2">
          <span class="text-xs font-bold text-slate-400 uppercase tracking-wider">Your Live API Key</span>
          <button onclick="copyRevealedKey()" id="copy-revealed-key-btn" class="text-xs text-emerald-400 hover:text-emerald-300 font-bold flex items-center space-x-1">
            <span>📋 Copy Key</span>
          </button>
        </div>
        <div id="revealed-api-key" class="font-mono text-sm text-emerald-300 break-all bg-slate-900/80 p-3 rounded-lg border border-slate-800">
          Provisioning your API key...
        </div>
      </div>

      <div class="mt-4 text-left">
        <span class="text-xs font-semibold text-slate-400">Quickstart cURL:</span>
        <pre id="revealed-curl" class="mt-1.5 p-3 rounded-xl bg-slate-950 text-xs font-mono text-slate-300 overflow-x-auto border border-slate-800">curl -X POST https://tailprint.com/v1/render/pdf \
  -H "Authorization: Bearer YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"html":"&lt;h1 class=\"text-2xl font-bold\"&gt;Hello Tailprint&lt;/h1&gt;"}' \
  --output test.pdf</pre>
      </div>

      <div class="mt-6 flex justify-end">
        <button onclick="closeSuccessModal()" class="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition shadow-lg shadow-indigo-600/30">
          Start Building 🚀
        </button>
      </div>
    </div>
  </div>

  <!-- Claim Free API Key Modal -->
  <div id="free-key-modal" class="hidden fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
    <div class="relative w-full max-w-md rounded-2xl bg-slate-900 border border-emerald-500/40 p-6 sm:p-8 shadow-2xl shadow-emerald-500/10">
      <button onclick="closeFreeKeyModal()" class="absolute top-4 right-4 text-slate-400 hover:text-white text-lg">✕</button>

      <div id="free-key-form-view">
        <div class="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center text-2xl mb-4">
          ⚡
        </div>
        <h3 class="text-xl font-bold text-white">Claim 100 Free Renders / mo</h3>
        <p class="text-xs text-slate-400 mt-1">Instant developer sandbox key. No credit card required. Works with cURL, Node.js, Python, and MCP.</p>

        <form onsubmit="handleClaimFreeKey(event)" class="mt-6 space-y-4">
          <div>
            <label class="block text-xs font-semibold text-slate-300 mb-1">Developer Email</label>
            <input id="free-key-email" type="email" required placeholder="alex@company.com" class="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-emerald-500" />
          </div>
          <div id="free-key-error" class="hidden text-xs text-rose-400 bg-rose-950/40 border border-rose-900/50 p-2.5 rounded-lg"></div>
          <button id="free-key-submit-btn" type="submit" class="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition shadow-lg shadow-emerald-600/30 flex items-center justify-center space-x-2">
            <span>Claim 100 Free Renders ⚡</span>
          </button>
        </form>
      </div>

      <div id="free-key-success-view" class="hidden text-left">
        <div class="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center text-2xl mb-4">
          ✓
        </div>
        <h3 class="text-xl font-bold text-white">Your Free API Key is Active!</h3>
        <p class="text-xs text-slate-400 mt-1">100 monthly renders unlocked. Use it immediately in your code or terminal:</p>

        <div class="mt-4 p-3 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs text-emerald-400 break-all flex items-center justify-between">
          <span id="free-key-display"></span>
          <button onclick="copyFreeKey()" id="copy-free-key-btn" class="ml-2 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] rounded font-sans font-semibold">Copy</button>
        </div>

        <div class="mt-4">
          <span class="text-xs font-semibold text-slate-400">cURL Quickstart:</span>
          <pre id="free-key-curl" class="mt-1.5 p-3 rounded-xl bg-slate-950 text-[10px] font-mono text-slate-300 overflow-x-auto border border-slate-800"></pre>
        </div>

        <div class="mt-6 flex space-x-3">
          <a href="/dashboard" class="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold text-center transition">
            Open Dashboard →
          </a>
          <button onclick="closeFreeKeyModal()" class="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition">
            Done
          </button>
        </div>
      </div>
    </div>
  </div>

  <!-- Footer -->
  <footer class="py-12 border-t border-slate-900 bg-slate-950 text-xs text-slate-500">
    <div class="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
      <div class="flex items-center space-x-2">
        <span class="font-mono text-sm font-bold text-white">&lt;tailprint /&gt;</span>
        <span class="text-slate-600">|</span>
        <span>Developer-First PDF &amp; Document Engine</span>
      </div>

      <div class="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-slate-400">
        <a href="/docs" target="_blank" class="hover:text-white transition">API Docs</a>
        <a href="https://www.npmjs.com/package/tailprint" target="_blank" class="hover:text-rose-300 transition">TypeScript SDK (npm)</a>
        <a href="https://pypi.org/project/tailprint/" target="_blank" class="hover:text-emerald-300 transition">Python SDK (PyPI)</a>
        <a href="https://github.com/coheroseb/tailprint" target="_blank" class="hover:text-slate-200 transition">GitHub</a>
        <a href="/tools/factur-x" class="hover:text-indigo-300 transition">Factur-X Validator</a>
        <a href="/studio" class="hover:text-indigo-300 transition">Studio</a>
        <a href="/guides" class="hover:text-cyan-300 transition">Guides</a>
        <a href="/#faq" class="hover:text-white transition">FAQ</a>
      </div>

      <p>© 2026 Tailprint. All rights reserved.</p>
    </div>
  </footer>

  <!-- Script for Interactivity -->
  <script>
    // Interactive Avatar Mascot Easter Eggs & Tips
    const botTips = [
      "⚡ Ultra-fast rendering: Sub-500ms execution from Tailwind HTML to vector PDF!",
      "🤖 22 Native MCP Tools: Connect Claude Desktop, Cursor, or Windsurf directly via /v1/mcp/sse.",
      "🛡️ Smart Pagination Shield: Repeating thead across pages and zero sliced table rows!",
      "🎨 Live Template Studio: Design and test Tailwind templates directly in your browser at /studio.",
      "🇪🇺 EU Factur-X & PEPPOL: Generate hybrid PDFs with embedded XML for DATEV, SAP, Dinero & Billy.",
      "🔒 Zero-Retention Mode: 100% GDPR/HIPAA privacy with transient volatile memory rendering.",
      "📐 Mermaid & 16:9 Slides: Convert architecture diagrams and markdown into presentation decks.",
      "🚀 Zero headless browser setup: Just send a POST request or prompt your AI agent."
    ];
    let tipIdx = 0;
    window.cycleAvatarTip = function() {
      tipIdx = (tipIdx + 1) % botTips.length;
      const el = document.getElementById('speech-text');
      const avatar = document.getElementById('hero-avatar');
      if (el) {
        el.style.opacity = '0';
        setTimeout(function() {
          el.innerText = botTips[tipIdx];
          el.style.opacity = '1';
        }, 150);
      }
      if (avatar) {
        avatar.classList.add('rotate-6', 'scale-110');
        setTimeout(function() {
          avatar.classList.remove('rotate-6', 'scale-110');
        }, 300);
      }
    };

    const templatesData = {
      ${TEMPLATES.map((t) => `'${t.id}': ${JSON.stringify(t.html)}`).join(',\n      ')}
    };

    const templateMeta = {
      ${TEMPLATES.map((t) => `'${t.id}': { landscape: ${t.landscape}, isImage: ${t.id === 'og-card'} }`).join(',\n      ')}
    };

    window.switchTab = function(tabName) {
      document.querySelectorAll('.template-panel').forEach(function(p) {
        p.classList.add('hidden');
      });
      const activePanel = document.getElementById('tab-' + tabName);
      if (activePanel) {
        activePanel.classList.remove('hidden');
      }

      ${JSON.stringify(TEMPLATES.map((t) => t.id))}.forEach(function(id) {
        const btn = document.getElementById('btn-' + id);
        if (btn) {
          if (id === tabName) {
            btn.className = 'px-4 py-2 rounded-xl font-bold text-xs bg-indigo-600 text-white shadow-md shadow-indigo-600/30 transition flex items-center space-x-2';
          } else {
            btn.className = 'px-4 py-2 rounded-xl font-bold text-xs bg-slate-900/90 border border-slate-800 text-slate-400 hover:text-white transition flex items-center space-x-2';
          }
        }
      });
    };

    window.copyHtml = function(key) {
      const html = templatesData[key];
      if (!html) return;
      navigator.clipboard.writeText(html).then(function() {
        alert('Tailwind HTML copied to clipboard!');
      }).catch(function(err) {
        console.error('Clipboard copy failed:', err);
      });
    };

    window.copyCurl = function(key) {
      const html = templatesData[key];
      if (!html) return;
      const meta = templateMeta[key] || { landscape: false, isImage: false };
      const endpoint = meta.isImage ? '/v1/render/image' : '/v1/render/pdf';
      const outputExt = meta.isImage ? 'png' : 'pdf';
      
      const payloadObj = meta.isImage
        ? { width: 1200, height: 630, type: 'png', html: html }
        : { format: 'A4', landscape: meta.landscape, html: html };

      const jsonStr = JSON.stringify(payloadObj);
      const cmd = 'curl -X POST ' + window.location.origin + endpoint + ' ' +
        '-H "Authorization: Bearer YOUR_API_KEY" ' +
        '-H "Content-Type: application/json" ' +
        '--data-raw ' + JSON.stringify(jsonStr) + ' ' +
        '--output ' + key + '.' + outputExt;

      navigator.clipboard.writeText(cmd).then(function() {
        alert('cURL command copied to clipboard!');
      }).catch(function(err) {
        console.error('Clipboard copy failed:', err);
      });
    };

    function getStoredApiKey() {
      return localStorage.getItem('tailprint_api_key') || 'sec_live_your_key_here';
    }

    function updateMcpKeyBanner() {
      const key = localStorage.getItem('tailprint_api_key');
      const dot = document.getElementById('mcp-key-dot');
      const text = document.getElementById('mcp-key-text');
      const action = document.getElementById('mcp-key-action-btn');
      if (!dot || !text || !action) return;

      if (key && key.startsWith('sec_live_')) {
        dot.className = 'w-2 h-2 rounded-full bg-emerald-400';
        text.innerHTML = 'Using your active API key: <code class="text-emerald-300 font-mono">' + key.slice(0, 16) + '...</code>';
        action.outerHTML = '<a href="/dashboard" id="mcp-key-action-btn" class="text-indigo-400 hover:text-indigo-300 font-bold transition">View Dashboard →</a>';
      } else {
        dot.className = 'w-2 h-2 rounded-full bg-amber-400';
        text.innerText = 'Using placeholder key';
      }
    }

    window.getMcpSnippets = function() {
      const apiKey = getStoredApiKey();
      const nl = String.fromCharCode(10);
      return {
        claude: JSON.stringify({
          mcpServers: {
            tailprint: {
              command: "npx",
              args: ["-y", "tailprint"],
              env: {
                TAILPRINT_API_KEY: apiKey
              }
            }
          }
        }, null, 2),
        cursor: JSON.stringify({
          mcpServers: {
            tailprint: {
              url: window.location.origin + "/v1/mcp/sse?api_key=" + apiKey
            }
          }
        }, null, 2),
        sse: [
          "# Remote MCP via Server-Sent Events (SSE)",
          "URL: " + window.location.origin + "/v1/mcp/sse?api_key=" + apiKey,
          "POST Messages: " + window.location.origin + "/v1/mcp/messages",
          "",
          "# Header Auth Option:",
          "Authorization: Bearer " + apiKey
        ].join(nl)
      };
    };

    window.switchMcpTab = function(type) {
      const block = document.getElementById('mcp-code-block');
      const hint = document.getElementById('mcp-hint');
      const cursorBtn = document.getElementById('btn-cursor-deeplink');
      const tabs = ['claude', 'cursor', 'sse'];
      const snippets = window.getMcpSnippets();
      const apiKey = getStoredApiKey();
      
      updateMcpKeyBanner();

      tabs.forEach(function(t) {
        const btn = document.getElementById('btn-mcp-' + t);
        if (btn) {
          if (t === type) {
            btn.className = 'px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 text-white';
          } else {
            btn.className = 'px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 text-slate-400 hover:text-white';
          }
        }
      });

      if (cursorBtn) {
        if (type === 'cursor') {
          cursorBtn.href = 'cursor://anysphere.cursor-mcp/install?name=tailprint&url=' + encodeURIComponent(window.location.origin + '/v1/mcp/sse?api_key=' + apiKey);
          cursorBtn.classList.remove('hidden');
        } else {
          cursorBtn.classList.add('hidden');
        }
      }

      if (type === 'claude') {
        block.innerText = snippets.claude;
        hint.innerHTML = 'Add this snippet to <code class="text-indigo-300">~/Library/Application Support/Claude/claude_desktop_config.json</code> on macOS (or <code class="text-indigo-300">%APPDATA%/Claude/claude_desktop_config.json</code> on Windows).';
      } else if (type === 'cursor') {
        block.innerText = snippets.cursor;
        hint.innerHTML = 'Add this snippet to your project root under <code class="text-indigo-300">.cursor/mcp.json</code> or open Cursor Settings &gt; MCP to add via Remote SSE.';
      } else if (type === 'sse') {
        block.innerText = snippets.sse;
        hint.innerHTML = 'Directly connect web agents, custom GPTs, LangChain, or remote LLM runtimes to this live endpoint.';
      }
    };

    window.copyMcpSnippet = function() {
      const block = document.getElementById('mcp-code-block');
      const btn = document.getElementById('mcp-copy-btn');
      if (!block) return;
      navigator.clipboard.writeText(block.innerText).then(function() {
        if (btn) {
          btn.innerHTML = '<span>✅ Copied!</span>';
          setTimeout(function() {
            btn.innerHTML = '<span>📋 Copy Config</span>';
          }, 2000);
        }
      });
    };

    window.startCheckout = async function(planId) {
      const activeBtn = (typeof event !== 'undefined' && event && event.currentTarget) ? event.currentTarget : null;
      const origText = activeBtn ? activeBtn.innerHTML : '';
      if (activeBtn) {
        activeBtn.disabled = true;
        activeBtn.innerHTML = '⏳ Redirecting to Stripe...';
      }
      try {
        const res = await fetch('/v1/billing/checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ planId: planId })
        });
        const data = await res.json();
        if (data.checkoutUrl) {
          window.location.href = data.checkoutUrl;
        } else {
          if (activeBtn) {
            activeBtn.disabled = false;
            activeBtn.innerHTML = origText;
          }
          alert('Failed to start checkout: ' + (data.message || data.error || 'Unknown error'));
        }
      } catch (err) {
        if (activeBtn) {
          activeBtn.disabled = false;
          activeBtn.innerHTML = origText;
        }
        alert('Failed to initiate checkout: ' + err.message);
      }
    };

    // Auto-detect Stripe Checkout return and reveal live API key
    (function checkCheckoutSuccess() {
      const urlParams = new URLSearchParams(window.location.search);
      const isSuccess = urlParams.get('checkout_success') === 'true';
      const sessionId = urlParams.get('session_id');

      if (!isSuccess || !sessionId) return;

      const modal = document.getElementById('success-modal');
      const keyEl = document.getElementById('revealed-api-key');
      const curlEl = document.getElementById('revealed-curl');
      if (modal) modal.classList.remove('hidden');

      let attempts = 0;
      const maxAttempts = 15;

      async function fetchKey() {
        try {
          const res = await fetch('/v1/billing/session-key?session_id=' + encodeURIComponent(sessionId));
          const data = await res.json();
          if (data.status === 'ready' && data.apiKey) {
            keyEl.innerText = data.apiKey;
            keyEl.className = 'font-mono text-sm text-emerald-400 break-all bg-emerald-950/40 p-3 rounded-lg border border-emerald-500/40 font-bold';
            const sq = String.fromCharCode(39);
            const bslash = String.fromCharCode(92);
            const nl = String.fromCharCode(10);
            const demoPayload = JSON.stringify({ html: '<h1 class="text-2xl font-bold text-indigo-600">Hello from Tailprint</h1>' });
            curlEl.innerText = [
              'curl -X POST ' + window.location.origin + '/v1/render/pdf ' + bslash,
              '  -H "Authorization: Bearer ' + data.apiKey + '" ' + bslash,
              '  -H "Content-Type: application/json" ' + bslash,
              '  -d ' + sq + demoPayload + sq + ' ' + bslash,
              '  --output test.pdf'
            ].join(nl);
            return;
          }
        } catch {}

        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(fetchKey, 1200);
        } else {
          keyEl.innerText = 'Key provisioned! Check your Stripe confirmation email.';
        }
      }

      fetchKey();
    })();

    window.copyRevealedKey = function() {
      const keyEl = document.getElementById('revealed-api-key');
      if (!keyEl || !keyEl.innerText) return;
      navigator.clipboard.writeText(keyEl.innerText).then(function() {
        const btn = document.getElementById('copy-revealed-key-btn');
        if (btn) btn.innerHTML = '<span>✅ Copied!</span>';
        setTimeout(function() { if (btn) btn.innerHTML = '<span>📋 Copy Key</span>'; }, 2000);
      });
    };

    window.closeSuccessModal = function() {
      const modal = document.getElementById('success-modal');
      if (modal) modal.classList.add('hidden');
      window.history.replaceState({}, document.title, window.location.pathname);
    };

    window.openFreeKeyModal = function() {
      window.startCheckout('free');
    };

    window.closeFreeKeyModal = function() {
      const modal = document.getElementById('free-key-modal');
      if (modal) modal.classList.add('hidden');
    };

    window.handleClaimFreeKey = async function(e) {
      e.preventDefault();
      const emailInput = document.getElementById('free-key-email');
      const btn = document.getElementById('free-key-submit-btn');
      const errEl = document.getElementById('free-key-error');
      const formView = document.getElementById('free-key-form-view');
      const successView = document.getElementById('free-key-success-view');
      const keyDisplay = document.getElementById('free-key-display');
      const curlDisplay = document.getElementById('free-key-curl');

      if (!emailInput || !emailInput.value) return;

      btn.disabled = true;
      btn.innerHTML = '<span>Provisioning Key...</span>';
      if (errEl) errEl.classList.add('hidden');

      try {
        const res = await fetch('/v1/auth/claim-free-key', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: emailInput.value.trim() }),
        });

        const data = await res.json();
        if (!res.ok) {
          errEl.innerText = data.message || 'Failed to claim key. Please try again.';
          errEl.classList.remove('hidden');
          btn.disabled = false;
          btn.innerHTML = '<span>Claim 100 Free Renders ⚡</span>';
          return;
        }

        localStorage.setItem('tailprint_api_key', data.apiKey);
        keyDisplay.innerText = data.apiKey;
        if (typeof window.switchMcpTab === 'function') {
          window.switchMcpTab('claude');
        }

        const sq = String.fromCharCode(39);
        const bslash = String.fromCharCode(92);
        const nl = String.fromCharCode(10);
        const demoPayload = JSON.stringify({ html: '<h1 class="text-2xl font-bold text-indigo-600">Hello from Tailprint</h1>' });
        curlDisplay.innerText = [
          'curl -X POST ' + window.location.origin + '/v1/render/pdf ' + bslash,
          '  -H "Authorization: Bearer ' + data.apiKey + '" ' + bslash,
          '  -H "Content-Type: application/json" ' + bslash,
          '  -d ' + sq + demoPayload + sq + ' ' + bslash,
          '  --output invoice.pdf'
        ].join(nl);

        formView.classList.add('hidden');
        successView.classList.remove('hidden');
      } catch (err) {
        errEl.innerText = 'Network error. Please try again.';
        errEl.classList.remove('hidden');
        btn.disabled = false;
        btn.innerHTML = '<span>Claim 100 Free Renders ⚡</span>';
      }
    };

    window.copyFreeKey = function() {
      const keyDisplay = document.getElementById('free-key-display');
      if (!keyDisplay || !keyDisplay.innerText) return;
      navigator.clipboard.writeText(keyDisplay.innerText).then(function() {
        const btn = document.getElementById('copy-free-key-btn');
        if (btn) btn.innerText = 'Copied!';
        setTimeout(function() { if (btn) btn.innerText = 'Copy'; }, 2000);
      });
    };

    // Initialize default MCP config on page load
    setTimeout(function() {
      if (typeof window.switchMcpTab === 'function') {
        window.switchMcpTab('claude');
      }
    }, 100);
  </script>
</body>
</html>`;

      return reply.code(200).header('Content-Type', 'text/html; charset=utf-8').send(html);
    }
  );
};
