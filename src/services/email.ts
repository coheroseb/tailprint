import nodemailer, { type Transporter } from 'nodemailer';
import { env } from '../config/env.js';

export class EmailService {
  private static instance: EmailService;
  private transporter: Transporter | null = null;

  private constructor() {
    if (env.SMTP_USER && env.SMTP_PASS) {
      this.transporter = nodemailer.createTransport({
        host: env.SMTP_HOST,
        port: env.SMTP_PORT,
        secure: env.SMTP_PORT === 465,
        auth: {
          user: env.SMTP_USER,
          pass: env.SMTP_PASS,
        },
        pool: true,
        maxConnections: 3,
      });
    }
  }

  public static getInstance(): EmailService {
    if (!EmailService.instance) {
      EmailService.instance = new EmailService();
    }
    return EmailService.instance;
  }

  /**
   * Sends a styled welcome email containing the Developer Free Sandbox API key.
   */
  public async sendFreeApiKeyEmail(params: {
    to: string;
    apiKey: string;
    monthlyLimit: number;
  }): Promise<boolean> {
    if (!this.transporter) {
      console.warn('[EmailService] SMTP transporter not configured, skipping email.');
      return false;
    }

    const { to, apiKey, monthlyLimit } = params;
    const dashboardUrl = `${env.APP_URL}/dashboard`;
    const docsUrl = `${env.APP_URL}/docs`;

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Your Tailprint API Key</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #020617; color: #f8fafc; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
    .card { background-color: #0f172a; border: 1px solid #1e293b; border-radius: 16px; padding: 32px; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5); }
    .logo { display: inline-flex; align-items: center; font-size: 20px; font-weight: 800; color: #ffffff; text-decoration: none; margin-bottom: 24px; }
    .badge { display: inline-block; background-color: rgba(16, 185, 129, 0.15); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.3); font-size: 11px; font-weight: 700; padding: 3px 8px; border-radius: 9999px; text-transform: uppercase; margin-bottom: 16px; }
    h1 { font-size: 24px; font-weight: 900; color: #ffffff; margin-top: 0; margin-bottom: 8px; letter-spacing: -0.025em; }
    p { font-size: 14px; line-height: 1.6; color: #94a3b8; margin: 12px 0; }
    .key-box { background-color: #020617; border: 1px solid #10b981; border-radius: 10px; padding: 14px; margin: 20px 0; font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace; font-size: 13px; color: #34d399; word-break: break-all; font-weight: 600; }
    .code-block { background-color: #020617; border: 1px solid #1e293b; border-radius: 10px; padding: 14px; margin: 16px 0; font-family: monospace; font-size: 11px; color: #cbd5e1; overflow-x: auto; line-height: 1.5; }
    .btn { display: inline-block; background-color: #4f46e5; color: #ffffff !important; font-weight: 700; font-size: 13px; text-decoration: none; padding: 12px 24px; border-radius: 10px; margin-top: 16px; text-align: center; }
    .footer { margin-top: 32px; text-align: center; font-size: 11px; color: #64748b; line-height: 1.6; }
    .footer a { color: #818cf8; text-decoration: none; }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <div class="logo">⚡ Tailprint</div>
      <div><span class="badge">Developer Sandbox Active</span></div>
      <h1>Your Free API Key is Ready</h1>
      <p>Welcome to <strong>Tailprint</strong>. You have been provisioned <strong>${monthlyLimit.toLocaleString()} free renders per month</strong> for vector PDFs, Open Graph images, and clean Markdown scraping.</p>
      
      <p style="font-size: 12px; font-weight: 600; color: #cbd5e1; margin-bottom: 6px;">Your Private API Key:</p>
      <div class="key-box">${apiKey}</div>

      <p style="font-size: 12px; font-weight: 600; color: #cbd5e1; margin-bottom: 6px;">Instant cURL Test (generates test.pdf):</p>
      <div class="code-block">curl -X POST ${env.APP_URL}/v1/render/pdf \\<br>
  -H "Authorization: Bearer ${apiKey}" \\<br>
  -H "Content-Type: application/json" \\<br>
  -d '{"html":"&lt;div class=\\"p-10 bg-slate-900 text-white font-bold\\"&gt;Hello Tailprint&lt;/div&gt;"}' \\<br>
  --output test.pdf</div>

      <a href="${dashboardUrl}" class="btn">Open Customer Dashboard →</a>

      <p style="font-size: 12px; color: #64748b; margin-top: 24px;">
        Need interactive documentation? Explore our <a href="${docsUrl}" style="color: #818cf8;">Scalar API Reference</a>.<br>
        Using Claude Desktop or Cursor? Connect directly with our <a href="${env.APP_URL}/#mcp" style="color: #818cf8;">Model Context Protocol (MCP) server</a>.
      </p>
    </div>

    <div class="footer">
      <p>© 2026 Tailprint (tailprint.com). Fastify & Chromium Cloud Rendering.<br>
      You received this because you claimed a free developer key at tailprint.com.</p>
    </div>
  </div>
</body>
</html>
`;

    try {
      const info = await this.transporter.sendMail({
        from: env.SMTP_FROM,
        to,
        subject: '⚡ Your Tailprint API Key (100 Free Renders / mo)',
        text: `Welcome to Tailprint!\n\nYour Developer Free API Key is:\n${apiKey}\n\nMonthly limit: ${monthlyLimit} renders.\n\nOpen your dashboard: ${dashboardUrl}\nDocumentation: ${docsUrl}`,
        html: htmlContent,
      });

      console.log(`[EmailService] Free API key email dispatched to ${to} (MessageId: ${info.messageId})`);
      return true;
    } catch (err: any) {
      console.error(`[EmailService] Failed to send email to ${to}:`, err.message);
      return false;
    }
  }

  /**
   * Sends an official receipt and API key email upon Stripe subscription purchase.
   */
  public async sendPaidApiKeyEmail(params: {
    to: string;
    apiKey: string;
    planName: string;
    monthlyLimit: number;
  }): Promise<boolean> {
    if (!this.transporter) {
      return false;
    }

    const { to, apiKey, planName, monthlyLimit } = params;
    const dashboardUrl = `${env.APP_URL}/dashboard`;

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Welcome to Tailprint ${planName}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #020617; color: #f8fafc; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
    .card { background-color: #0f172a; border: 1px solid #1e293b; border-radius: 16px; padding: 32px; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5); }
    .logo { display: inline-flex; align-items: center; font-size: 20px; font-weight: 800; color: #ffffff; text-decoration: none; margin-bottom: 24px; }
    .badge { display: inline-block; background-color: rgba(99, 102, 241, 0.15); color: #818cf8; border: 1px solid rgba(99, 102, 241, 0.3); font-size: 11px; font-weight: 700; padding: 3px 8px; border-radius: 9999px; text-transform: uppercase; margin-bottom: 16px; }
    h1 { font-size: 24px; font-weight: 900; color: #ffffff; margin-top: 0; margin-bottom: 8px; letter-spacing: -0.025em; }
    p { font-size: 14px; line-height: 1.6; color: #94a3b8; margin: 12px 0; }
    .key-box { background-color: #020617; border: 1px solid #6366f1; border-radius: 10px; padding: 14px; margin: 20px 0; font-family: monospace; font-size: 13px; color: #a5b4fc; word-break: break-all; font-weight: 600; }
    .btn { display: inline-block; background-color: #4f46e5; color: #ffffff !important; font-weight: 700; font-size: 13px; text-decoration: none; padding: 12px 24px; border-radius: 10px; margin-top: 16px; text-align: center; }
    .footer { margin-top: 32px; text-align: center; font-size: 11px; color: #64748b; line-height: 1.6; }
    .footer a { color: #818cf8; text-decoration: none; }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <div class="logo">⚡ Tailprint</div>
      <div><span class="badge">${planName} Tier Subscribed</span></div>
      <h1>Thank you for your purchase!</h1>
      <p>Your subscription is active with <strong>${monthlyLimit.toLocaleString()} renders per month</strong>.</p>
      
      <p style="font-size: 12px; font-weight: 600; color: #cbd5e1; margin-bottom: 6px;">Your Production API Key:</p>
      <div class="key-box">${apiKey}</div>

      <a href="${dashboardUrl}" class="btn">Manage Subscription & View Usage →</a>
    </div>

    <div class="footer">
      <p>© 2026 Tailprint (tailprint.com).<br>Manage subscription, update VAT/tax number, or cancel anytime from the dashboard.</p>
    </div>
  </div>
</body>
</html>
`;

    try {
      const info = await this.transporter.sendMail({
        from: env.SMTP_FROM,
        to,
        subject: `⚡ Welcome to Tailprint ${planName} (Your Production API Key)`,
        text: `Thank you for choosing Tailprint ${planName}!\n\nYour API key is:\n${apiKey}\n\nMonthly limit: ${monthlyLimit} renders.\n\nDashboard: ${dashboardUrl}`,
        html: htmlContent,
      });

      console.log(`[EmailService] Paid API key email dispatched to ${to} (MessageId: ${info.messageId})`);
      return true;
    } catch (err: any) {
      console.error(`[EmailService] Failed to send paid key email to ${to}:`, err.message);
      return false;
    }
  }
}

export const emailService = EmailService.getInstance();
