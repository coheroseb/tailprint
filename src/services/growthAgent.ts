import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { env } from '../config/env.js';
import { browserService } from './browser.js';
import { storageService } from './storage.js';
import { scraperService } from './scraper.js';
import { emailService } from './email.js';
import { carouselService } from './carousel.js';
import { TEMPLATES } from '../config/templates.js';

export interface GrowthLead {
  id: string;
  domain: string;
  companyName: string;
  category: 'saas' | 'agency' | 'ecommerce' | 'erp' | 'legal' | 'fintech';
  description?: string;
  websiteUrl: string;
  contactEmail?: string;
  contactName?: string;
  logoUrl?: string;
  primaryColor?: string;
  customDemoPdfUrl?: string;
  customDemoFileId?: string;
  emailSubject?: string;
  emailBodyHtml?: string;
  pitchAngle?: string;
  status: 'discovered' | 'demo_generated' | 'queued' | 'sent' | 'viewed' | 'failed';
  discoveredAt: string;
  demoGeneratedAt?: string;
  sentAt?: string;
  viewCount: number;
  lastError?: string;
}

export interface GrowthContentItem {
  id: string;
  title: string;
  topic: string;
  format: 'linkedin_carousel' | 'twitter_thread' | 'show_hn';
  contentMarkdown: string;
  pdfUrl?: string;
  previewImageUrl?: string;
  status: 'draft' | 'published';
  createdAt: string;
}

export interface GrowthSettings {
  autoDispatchEnabled: boolean;
  maxDailyEmails: number;
  lastRunAt?: string;
  lastCarouselAt?: string;
}

export class GrowthAgentService {
  private static instance: GrowthAgentService | null = null;
  private leadsFile: string;
  private contentFile: string;
  private settingsFile: string;
  private isCycleRunning = false;

  private constructor() {
    const storageDir = path.isAbsolute(env.STORAGE_PATH)
      ? env.STORAGE_PATH
      : path.join(process.cwd(), env.STORAGE_PATH);

    if (!fs.existsSync(storageDir)) {
      fs.mkdirSync(storageDir, { recursive: true });
    }

    this.leadsFile = path.join(storageDir, 'growth_leads.json');
    this.contentFile = path.join(storageDir, 'growth_content.json');
    this.settingsFile = path.join(storageDir, 'growth_settings.json');

    this.initDefaultSeedLeads();
  }

  public static getInstance(): GrowthAgentService {
    if (!GrowthAgentService.instance) {
      GrowthAgentService.instance = new GrowthAgentService();
    }
    return GrowthAgentService.instance;
  }

  private loadLeads(): GrowthLead[] {
    try {
      if (fs.existsSync(this.leadsFile)) {
        return JSON.parse(fs.readFileSync(this.leadsFile, 'utf-8'));
      }
    } catch (err) {
      console.warn('[GrowthAgent] Error reading leads file:', err);
    }
    return [];
  }

  private saveLeads(leads: GrowthLead[]): void {
    try {
      fs.writeFileSync(this.leadsFile, JSON.stringify(leads, null, 2), 'utf-8');
    } catch (err) {
      console.error('[GrowthAgent] Error saving leads:', err);
    }
  }

  private loadContent(): GrowthContentItem[] {
    try {
      if (fs.existsSync(this.contentFile)) {
        return JSON.parse(fs.readFileSync(this.contentFile, 'utf-8'));
      }
    } catch (err) {
      console.warn('[GrowthAgent] Error reading content file:', err);
    }
    return [];
  }

  private saveContent(items: GrowthContentItem[]): void {
    try {
      fs.writeFileSync(this.contentFile, JSON.stringify(items, null, 2), 'utf-8');
    } catch (err) {
      console.error('[GrowthAgent] Error saving content:', err);
    }
  }

  private loadSettings(): GrowthSettings {
    const defaults: GrowthSettings = {
      autoDispatchEnabled: false,
      maxDailyEmails: 5,
    };
    try {
      if (fs.existsSync(this.settingsFile)) {
        return { ...defaults, ...JSON.parse(fs.readFileSync(this.settingsFile, 'utf-8')) };
      }
    } catch (err) {
      console.warn('[GrowthAgent] Error reading settings:', err);
    }
    return defaults;
  }

  private saveSettings(settings: GrowthSettings): void {
    try {
      fs.writeFileSync(this.settingsFile, JSON.stringify(settings, null, 2), 'utf-8');
    } catch (err) {
      console.error('[GrowthAgent] Error saving settings:', err);
    }
  }

  private initDefaultSeedLeads(): void {
    const existing = this.loadLeads();
    if (existing.length > 0) return;

    // High-value seed B2B targets across SaaS, ERP, agencies & billing
    const seedTargets: Array<Omit<GrowthLead, 'id' | 'discoveredAt' | 'viewCount'>> = [
      {
        domain: 'twenty.com',
        companyName: 'Twenty CRM',
        category: 'saas',
        websiteUrl: 'https://twenty.com',
        description: 'Modern open-source CRM platform needing automated customer proposal & contract generation.',
        status: 'discovered',
      },
      {
        domain: 'cal.com',
        companyName: 'Cal.com',
        category: 'saas',
        websiteUrl: 'https://cal.com',
        description: 'Open scheduling infrastructure generating booking receipts, invoices, and enterprise agreements.',
        status: 'discovered',
      },
      {
        domain: 'formbricks.com',
        companyName: 'Formbricks',
        category: 'saas',
        websiteUrl: 'https://formbricks.com',
        description: 'Experience management and survey platform needing automated executive survey reports & summaries.',
        status: 'discovered',
      },
      {
        domain: 'pebl.io',
        companyName: 'Pebl',
        category: 'fintech',
        websiteUrl: 'https://pebl.io',
        description: 'B2B payment and invoicing platform subject to 2026 EU e-invoicing & Factur-X requirements.',
        status: 'discovered',
      },
      {
        domain: 'nordicdigital.dk',
        companyName: 'Nordic Digital Agency',
        category: 'agency',
        websiteUrl: 'https://nordicdigital.dk',
        description: 'Full-service enterprise web agency issuing proposals, NDAs, and monthly retainer statements.',
        status: 'discovered',
      },
    ];

    const leads: GrowthLead[] = seedTargets.map((s) => ({
      ...s,
      id: `lead_${crypto.randomBytes(6).toString('hex')}`,
      discoveredAt: new Date().toISOString(),
      viewCount: 0,
    }));

    this.saveLeads(leads);
  }

  public getDashboardSnapshot() {
    const leads = this.loadLeads();
    const content = this.loadContent();
    const settings = this.loadSettings();

    const stats = {
      totalLeads: leads.length,
      demosGenerated: leads.filter((l) => l.status === 'demo_generated' || l.status === 'sent' || l.status === 'viewed').length,
      queuedEmails: leads.filter((l) => l.status === 'queued' || l.status === 'demo_generated').length,
      sentEmails: leads.filter((l) => l.status === 'sent' || l.status === 'viewed').length,
      totalDemoViews: leads.reduce((acc, l) => acc + (l.viewCount || 0), 0),
      publishedPosts: content.length,
    };

    return {
      stats,
      leads,
      content,
      settings,
    };
  }

  public toggleAutoDispatch(enabled: boolean): GrowthSettings {
    const settings = this.loadSettings();
    settings.autoDispatchEnabled = enabled;
    this.saveSettings(settings);
    return settings;
  }

  public addLead(domain: string, category: GrowthLead['category'] = 'saas', contactEmail?: string): GrowthLead {
    const leads = this.loadLeads();
    const cleanDomain = domain.replace(/^https?:\/\//i, '').replace(/\/.*$/, '').toLowerCase().trim();

    const existing = leads.find((l) => l.domain === cleanDomain);
    if (existing) {
      if (contactEmail && !existing.contactEmail) {
        existing.contactEmail = contactEmail;
        this.saveLeads(leads);
      }
      return existing;
    }

    const newLead: GrowthLead = {
      id: `lead_${crypto.randomBytes(6).toString('hex')}`,
      domain: cleanDomain,
      companyName: cleanDomain.split('.')[0]?.toUpperCase() || cleanDomain,
      category,
      websiteUrl: `https://${cleanDomain}`,
      contactEmail: contactEmail || `founders@${cleanDomain}`,
      status: 'discovered',
      discoveredAt: new Date().toISOString(),
      viewCount: 0,
    };

    leads.unshift(newLead);
    this.saveLeads(leads);
    return newLead;
  }

  /**
   * Generates a tailored, branded PDF demo and a high-converting cold pitch for a target lead.
   */
  public async generateDemoForLead(leadId: string): Promise<GrowthLead> {
    const leads = this.loadLeads();
    const lead = leads.find((l) => l.id === leadId);
    if (!lead) throw new Error(`Lead ${leadId} not found`);

    try {
      // 1. Scrape target brand metadata
      let brandName = lead.companyName;
      let brandDesc = lead.description || '';
      let logoUrl: string | undefined = undefined;
      let brandColor = '#4f46e5';

      try {
        const scraped = await scraperService.scrapeUrl({
          url: lead.websiteUrl,
          timeout_ms: 12000,
          strip_images: false,
          include_raw_html: false,
        });

        if (scraped.title) {
          brandName = scraped.title.split(/[-|•:]/)[0]?.trim() || brandName;
        }
        if (scraped.description) {
          brandDesc = scraped.description;
        }

        // Try extracting favicon or apple-touch-icon
        logoUrl = `https://www.google.com/s2/favicons?domain=${lead.domain}&sz=128`;
      } catch (err) {
        console.warn(`[GrowthAgent] Scrape fallback for ${lead.domain}:`, err);
        logoUrl = `https://www.google.com/s2/favicons?domain=${lead.domain}&sz=128`;
      }

      lead.companyName = brandName;
      lead.description = brandDesc;
      lead.logoUrl = logoUrl;
      lead.primaryColor = brandColor;

      // 2. Select matching template & customize HTML
      let templateHtml = '';
      if (lead.category === 'fintech' || lead.category === 'erp' || lead.category === 'saas') {
        const einvoiceTpl = TEMPLATES.find((t) => t.id === 'einvoice') || TEMPLATES[0]!;
        templateHtml = einvoiceTpl.html
          .replace(/Nordic Cloud Systems ApS/g, brandName)
          .replace(/STR-2026-9042/g, `INV-${lead.domain.slice(0, 3).toUpperCase()}-2026-001`)
          .replace(/Enterprise Cloud Infrastructure Cluster/g, `${brandName} Platform Pro License & Cloud API Tier`);
      } else {
        const quoteTpl = TEMPLATES.find((t) => t.id === 'quote') || TEMPLATES[0]!;
        templateHtml = quoteTpl.html
          .replace(/Nordic Digital Agency ApS/g, brandName)
          .replace(/QUO-2026-0842/g, `EST-${lead.domain.slice(0, 3).toUpperCase()}-9401`)
          .replace(/Apex Health/g, 'Global Enterprise Client Inc.');
      }

      // 3. Render Vector PDF with Smart Pagination Shield
      const pdfBuffer = await browserService.renderPdf({
        html: templateHtml,
        format: 'A4',
        smart_pagination: true,
        print_background: true,
      });

      // 4. Save to permanent hosted CDN storage
      const stored = await storageService.saveFile(pdfBuffer, {
        mimeType: 'application/pdf',
        extension: 'pdf',
        filename: `${lead.domain}-tailprint-demo.pdf`,
        isPermanent: true,
      });

      lead.customDemoPdfUrl = stored.hostedUrl;
      lead.customDemoFileId = stored.fileId;
      lead.demoGeneratedAt = new Date().toISOString();

      // 5. Generate high-converting personalized pitch using Gemini
      const pitch = await this.synthesizePersonalizedPitch(lead, brandDesc);
      lead.emailSubject = pitch.subject;
      lead.emailBodyHtml = pitch.bodyHtml;
      lead.pitchAngle = pitch.angle;
      lead.status = 'demo_generated';

      this.saveLeads(leads);
      return lead;
    } catch (err: any) {
      console.error(`[GrowthAgent] Failed generating demo for ${lead.domain}:`, err);
      lead.status = 'failed';
      lead.lastError = err.message || 'Render failure';
      this.saveLeads(leads);
      throw err;
    }
  }

  /**
   * Synthesizes an ultra-relevant, non-spammy B2B cold email using Gemini 2.5 Flash.
   */
  private async synthesizePersonalizedPitch(
    lead: GrowthLead,
    brandDesc: string
  ): Promise<{ subject: string; bodyHtml: string; angle: string }> {
    const geminiKey = env.GEMINI_API_KEY;

    const fallback = {
      subject: `⚡ Quick question regarding ${lead.companyName}'s document & PDF rendering`,
      bodyHtml: `<p>Hi ${lead.companyName} team,</p>
<p>I came across <strong>${lead.companyName}</strong> and love what you're building.</p>
<p>Most SaaS engineering teams struggle with slow headless Chrome timeouts, cut-off multi-page table rows, or the upcoming <strong>2026 EU E-Invoicing mandate (Factur-X / EN 16931)</strong>.</p>
<p>I ran your brand through our headless engine and generated this live vector PDF demo for you in 600ms:</p>
<p>It includes zero-split page protection, repeated headers, and clean vector rendering. You can integrate this with 5 lines of code or through our Claude/Cursor MCP tool.</p>
<p>Would you be open to a 5-minute chat, or should I send over the cURL snippet?</p>
<p>Best regards,<br>Sebastian Viste<br>Founder, <a href="https://tailprint.com">Tailprint.com</a></p>`,
      angle: 'EU E-Invoicing & Multi-Page Pagination Shield',
    };

    if (!geminiKey) return fallback;

    const prompt = `You are the founder of Tailprint (tailprint.com), an elite B2B document & PDF rendering infrastructure with Smart Pagination and EU E-Invoicing (Factur-X) compliance.
TARGET PROSPECT:
- Company Name: ${lead.companyName}
- Domain: ${lead.domain}
- Category: ${lead.category}
- Description: ${brandDesc}
- Live Demo Link: ${lead.customDemoPdfUrl}

TASK:
Write a punchy, ultra-concise, high-converting B2B cold outreach email to their Head of Engineering or Founder.
Rules:
1. Subject line must be short, intriguing, and feel like an internal engineering note (max 7 words).
2. First sentence must acknowledge something specific about their platform.
3. Mention that you generated a custom live vector PDF specifically for their brand (without asking for credentials).
4. Emphasize that it renders sub-second, prevents awkward multi-page table splits, and is Factur-X / EN 16931 compliant.
5. Soft, frictionless Call To Action (e.g. "Would you like me to send the cURL snippet, or test it in our live studio?").
6. Tone: humble, engineering-savvy, zero buzzwords.

Respond ONLY with valid JSON in this exact structure:
{
  "subject": "Subject line",
  "angle": "Brief 3-word hook",
  "bodyHtml": "<p>Paragraph 1...</p><p>Paragraph 2...</p>"
}`;

    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              responseMimeType: 'application/json',
              temperature: 0.3,
            },
          }),
          signal: AbortSignal.timeout(12000),
        }
      );

      if (res.ok) {
        const json = await res.json();
        const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
          const parsed = JSON.parse(text);
          if (parsed.subject && parsed.bodyHtml) {
            return {
              subject: parsed.subject,
              bodyHtml: parsed.bodyHtml,
              angle: parsed.angle || fallback.angle,
            };
          }
        }
      }
    } catch (err) {
      console.warn('[GrowthAgent] Gemini pitch synthesis warning:', err);
    }

    return fallback;
  }

  /**
   * Dispatches the personalized pitch email to the lead.
   */
  public async dispatchLeadEmail(leadId: string): Promise<GrowthLead> {
    const leads = this.loadLeads();
    const lead = leads.find((l) => l.id === leadId);
    if (!lead) throw new Error(`Lead ${leadId} not found`);

    if (!lead.customDemoPdfUrl) {
      await this.generateDemoForLead(leadId);
    }

    const targetEmail = lead.contactEmail || `hello@${lead.domain}`;

    const res = await emailService.sendOutboundPitchEmail({
      to: targetEmail,
      companyName: lead.companyName,
      subject: lead.emailSubject || `⚡ Tailprint vector rendering for ${lead.companyName}`,
      bodyHtml: lead.emailBodyHtml || `<p>Hi ${lead.companyName} team, check out your custom demo below.</p>`,
      demoPdfUrl: lead.customDemoPdfUrl || 'https://tailprint.com',
    });

    if (!res.success) {
      lead.lastError = res.error;
      this.saveLeads(leads);
      throw new Error(`Email dispatch failed: ${res.error}`);
    }

    lead.status = 'sent';
    lead.sentAt = new Date().toISOString();
    lead.contactEmail = targetEmail;
    this.saveLeads(leads);

    return lead;
  }

  /**
   * Generates a viral 5-7 slide LinkedIn / Social carousel PDF ready to publish.
   */
  public async generateLinkedInCarousel(topicTitle?: string): Promise<GrowthContentItem> {
    const topics = [
      {
        title: '5 reasons Puppeteer crashes in Serverless (and how to fix PDF generation)',
        slides: [
          { headline: 'Why Headless Chrome Fails in Production', content: 'Serverless PDF rendering is broken for 90% of SaaS startups. Here is why.' },
          { headline: '1. Memory Spikes & Chromium Zombie Processes', content: 'Each page load leaks memory unless you isolate browser contexts with a dedicated worker pool.' },
          { headline: '2. The Multi-Page Table Split Trap', content: 'Chromium chops table rows right down the middle unless you force break-inside: avoid and repeating theads.' },
          { headline: '3. Webfont Flash of Unstyled Text', content: 'Generating PDFs before fonts finish loading outputs fallback Times New Roman vectors.' },
          { headline: '4. The 2026 EU E-Invoicing Wave', content: 'From 2026, raw PDFs are not enough. B2B invoices must embed Factur-X EN 16931 XML.' },
          { headline: 'The Fix: Modern Document Infrastructure', content: 'Use an optimized headless engine like Tailprint with Smart Pagination Shield built-in.' },
        ],
      },
      {
        title: 'The 2026 EU E-Invoicing Mandate: What developers need to know',
        slides: [
          { headline: 'EU Invoicing is Changing in 2026', content: 'Standard visual PDFs are no longer compliant for EU B2B transactions.' },
          { headline: 'What is Factur-X / ZUGFeRD?', content: 'A hybrid PDF/A-3 document containing human-readable visual layout AND machine-readable XML.' },
          { headline: 'The Technical Hurdle', content: 'Embedding valid CrossIndustryInvoice XML inside vector PDF streams requires compliant metadata dictionaries.' },
          { headline: 'How Tailprint Automates It', content: 'Post your invoice data or Tailwind HTML to /v1/render/einvoice and receive instant verified hybrid PDFs.' },
          { headline: 'Ready in 5 minutes', content: 'Test your templates directly in tailprint.com/studio.' },
        ],
      },
    ];

    const selectedTopic = topicTitle
      ? { title: topicTitle, slides: topics[0]!.slides }
      : topics[Math.floor(Math.random() * topics.length)]!;

    const rendered = await carouselService.renderCarousel({
      title: selectedTopic.title,
      subtitle: 'Document Infrastructure for Modern Apps & AI Agents',
      author: {
        name: 'Sebastian Viste',
        handle: 'tailprint.com',
        role: 'Founder & Architect',
      },
      theme: 'dark',
      slides: selectedTopic.slides.map((s, idx) => ({
        headline: s.headline,
        content: s.content,
        tag: `LESSON 0${idx + 1}`,
      })),
    });

    const item: GrowthContentItem = {
      id: `content_${crypto.randomBytes(6).toString('hex')}`,
      title: selectedTopic.title,
      topic: 'Engineering & SaaS Architecture',
      format: 'linkedin_carousel',
      contentMarkdown: selectedTopic.slides.map((s) => `### ${s.headline}\n${s.content}`).join('\n\n---\n\n'),
      pdfUrl: rendered.pdfStored?.hostedUrl,
      previewImageUrl: rendered.previewStored?.hostedUrl,
      status: 'draft',
      createdAt: new Date().toISOString(),
    };

    const contentList = this.loadContent();
    contentList.unshift(item);
    this.saveContent(contentList);

    return item;
  }

  /**
   * Autonomous background worker step.
   * Can be triggered periodically by cron or fastify timer.
   */
  public async runAutopilotCycle(): Promise<{ actionsTaken: string[] }> {
    if (this.isCycleRunning) return { actionsTaken: ['Cycle already running'] };
    this.isCycleRunning = true;

    const actionsTaken: string[] = [];

    try {
      const leads = this.loadLeads();
      const settings = this.loadSettings();

      // 1. Check if any discovered leads need automated custom demo generation
      const leadNeedingDemo = leads.find((l) => l.status === 'discovered');
      if (leadNeedingDemo) {
        console.log(`[GrowthAgent] Generating autonomous demo for ${leadNeedingDemo.domain}...`);
        await this.generateDemoForLead(leadNeedingDemo.id);
        actionsTaken.push(`Generated custom demo PDF for ${leadNeedingDemo.domain}`);
      }

      // 2. If auto-dispatch enabled, send 1 queued email
      if (settings.autoDispatchEnabled) {
        const leadReadyToSend = leads.find((l) => l.status === 'demo_generated');
        if (leadReadyToSend) {
          console.log(`[GrowthAgent] Auto-dispatching email to ${leadReadyToSend.domain}...`);
          await this.dispatchLeadEmail(leadReadyToSend.id);
          actionsTaken.push(`Dispatched pitch email to ${leadReadyToSend.contactEmail}`);
        }
      }

      // 3. Ensure we have at least 1 LinkedIn carousel ready in queue
      const content = this.loadContent();
      if (content.length === 0) {
        console.log('[GrowthAgent] Generating seed LinkedIn carousel...');
        const item = await this.generateLinkedInCarousel();
        actionsTaken.push(`Created LinkedIn carousel: "${item.title}"`);
      }

      settings.lastRunAt = new Date().toISOString();
      this.saveSettings(settings);
    } catch (err: any) {
      console.error('[GrowthAgent] Autopilot cycle error:', err);
      actionsTaken.push(`Error: ${err.message}`);
    } finally {
      this.isCycleRunning = false;
    }

    return { actionsTaken };
  }
}

export const growthAgentService = GrowthAgentService.getInstance();
