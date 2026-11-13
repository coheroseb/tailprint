import { z } from 'zod';

/**
 * Hosted, data-driven document templates.
 *
 * Each template is a typed function: validated JSON `data` in, Tailwind HTML out.
 * Every value is HTML-escaped, totals are computed server-side and the HTML is
 * rendered by the same engine as `POST /v1/render/pdf` with `html`.
 */

export interface HostedTemplate<S extends z.ZodTypeAny = z.ZodTypeAny> {
  id: string;
  title: string;
  category: string;
  description: string;
  format: 'A4' | 'Letter';
  landscape: boolean;
  schema: S;
  example: z.input<S>;
  render: (data: z.output<S>) => string;
}

function defineTemplate<S extends z.ZodTypeAny>(template: HostedTemplate<S>): HostedTemplate<S> {
  return template;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const HTML_ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

export const esc = (value: unknown): string =>
  String(value ?? '').replace(/[&<>"']/g, (ch) => HTML_ESCAPES[ch]);

const nl2br = (value: unknown): string => esc(value).replace(/\r?\n/g, '<br>');

const joinLines = (lines?: string[]): string => (lines ?? []).map(esc).join('<br>');

const round2 = (n: number): number => Math.round((n + Number.EPSILON) * 100) / 100;

const isValidLocale = (locale: string): boolean => {
  try {
    return Intl.getCanonicalLocales(locale).length > 0;
  } catch {
    return false;
  }
};

function moneyFormatter(currency: string, locale: string): (n: number) => string {
  const fmt = new Intl.NumberFormat(locale, { style: 'currency', currency });
  return (n) => fmt.format(n);
}

function numberFormatter(locale: string): (n: number) => string {
  const fmt = new Intl.NumberFormat(locale, { maximumFractionDigits: 4 });
  return (n) => fmt.format(n);
}

function formatDate(value: string | undefined, locale: string): string {
  if (!value) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const d = new Date(`${value}T00:00:00Z`);
    if (!Number.isNaN(d.getTime())) {
      return new Intl.DateTimeFormat(locale, { dateStyle: 'long', timeZone: 'UTC' }).format(d);
    }
  }
  return value;
}

// Shared field schemas
const HexColor = z
  .string()
  .regex(/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, 'Must be a hex color such as #4f46e5');

const CurrencyCode = z
  .string()
  .regex(/^[A-Za-z]{3}$/, 'Must be a 3-letter ISO 4217 currency code such as USD, EUR or DKK')
  .transform((s) => s.toUpperCase());

const LocaleTag = z
  .string()
  .max(35)
  .refine(isValidLocale, 'Must be a valid BCP 47 locale such as en-US, da-DK or de-DE');

const HttpUrl = z
  .string()
  .max(2048)
  .url()
  .refine((u) => /^https?:\/\//i.test(u), 'Must be an http(s) URL');

const ShortText = z.string().max(200);
const LongText = z.string().max(5000);

const Party = z.object({
  name: z.string().min(1).max(200),
  address_lines: z.array(ShortText).max(8).optional(),
  vat_id: z.string().max(50).optional(),
  email: z.string().max(200).optional(),
  phone: z.string().max(50).optional(),
  logo_url: HttpUrl.optional().describe('Public http(s) URL of a logo image'),
});

const cell = (v: string | number | null | undefined): string =>
  v === null || v === undefined ? '' : esc(v);

// ---------------------------------------------------------------------------
// 1. Invoice (modern)
// ---------------------------------------------------------------------------

const InvoiceLabels = z
  .object({
    invoice: z.string().max(60),
    invoice_number: z.string().max(60),
    issue_date: z.string().max(60),
    due_date: z.string().max(60),
    billed_to: z.string().max(60),
    description: z.string().max(60),
    quantity: z.string().max(60),
    unit_price: z.string().max(60),
    tax: z.string().max(60),
    amount: z.string().max(60),
    subtotal: z.string().max(60),
    discount: z.string().max(60),
    total: z.string().max(60),
    notes: z.string().max(60),
    payment_terms: z.string().max(60),
    bank_details: z.string().max(60),
    paid: z.string().max(60),
    unpaid: z.string().max(60),
    overdue: z.string().max(60),
    draft: z.string().max(60),
  })
  .partial();

const DEFAULT_INVOICE_LABELS: Required<z.infer<typeof InvoiceLabels>> = {
  invoice: 'Invoice',
  invoice_number: 'Invoice no.',
  issue_date: 'Issue date',
  due_date: 'Due date',
  billed_to: 'Billed to',
  description: 'Description',
  quantity: 'Qty',
  unit_price: 'Unit price',
  tax: 'Tax',
  amount: 'Amount',
  subtotal: 'Subtotal',
  discount: 'Discount',
  total: 'Total',
  notes: 'Notes',
  payment_terms: 'Payment terms',
  bank_details: 'Bank details',
  paid: 'Paid',
  unpaid: 'Unpaid',
  overdue: 'Overdue',
  draft: 'Draft',
};

const InvoiceData = z.object({
  invoice_number: z.string().min(1).max(60),
  issue_date: z.string().min(1).max(60).describe('ISO date (2026-11-13) is formatted for the locale; other text is shown as-is'),
  due_date: z.string().max(60).optional(),
  currency: CurrencyCode.default('USD'),
  locale: LocaleTag.default('en-US'),
  seller: Party,
  buyer: Party,
  items: z
    .array(
      z.object({
        description: z.string().min(1).max(500),
        details: z.string().max(500).optional(),
        quantity: z.number().finite().min(0).max(1_000_000_000).default(1),
        unit_price: z.number().finite().min(-1_000_000_000).max(1_000_000_000),
        tax_rate: z.number().min(0).max(100).optional().describe('Percent. Falls back to the invoice-level tax_rate'),
      })
    )
    .min(1)
    .max(500),
  tax_rate: z.number().min(0).max(100).default(0).describe('Default tax percent applied to items without their own tax_rate'),
  discount: z.number().min(0).max(1_000_000_000).default(0).describe('Flat discount amount deducted before tax'),
  status: z.enum(['draft', 'unpaid', 'paid', 'overdue']).optional(),
  notes: LongText.optional(),
  payment_terms: LongText.optional(),
  bank_details: LongText.optional(),
  accent_color: HexColor.default('#4f46e5'),
  labels: InvoiceLabels.optional().describe('Override any label to translate the invoice (e.g. {"invoice":"Faktura"})'),
});

type InvoiceInput = z.output<typeof InvoiceData>;

function computeInvoice(d: InvoiceInput) {
  const lines = d.items.map((item) => {
    const net = round2(item.quantity * item.unit_price);
    return { ...item, net, rate: item.tax_rate ?? d.tax_rate };
  });
  const subtotal = round2(lines.reduce((sum, l) => sum + l.net, 0));
  const discount = Math.min(d.discount, Math.max(subtotal, 0));
  const factor = subtotal > 0 ? (subtotal - discount) / subtotal : 1;

  const byRate = new Map<number, number>();
  for (const l of lines) {
    byRate.set(l.rate, (byRate.get(l.rate) ?? 0) + l.net);
  }
  const taxes = [...byRate.entries()]
    .filter(([rate]) => rate > 0)
    .map(([rate, base]) => ({ rate, amount: round2((base * factor * rate) / 100) }));

  const taxTotal = round2(taxes.reduce((sum, t) => sum + t.amount, 0));
  const total = round2(subtotal - discount + taxTotal);
  return { lines, subtotal, discount, taxes, total, showTaxColumn: lines.some((l) => l.rate > 0) };
}

const STATUS_STYLES: Record<string, string> = {
  paid: 'border-emerald-300 bg-emerald-50 text-emerald-700',
  unpaid: 'border-amber-300 bg-amber-50 text-amber-700',
  overdue: 'border-rose-300 bg-rose-50 text-rose-700',
  draft: 'border-slate-300 bg-slate-50 text-slate-500',
};

const invoiceModern = defineTemplate({
  id: 'invoice-modern',
  title: 'Modern Invoice',
  category: 'Billing & Accounting',
  description:
    'Clean invoice with automatic line totals, per-rate tax breakdown, discount, status badge, logo and translatable labels.',
  format: 'A4',
  landscape: false,
  schema: InvoiceData,
  example: {
    invoice_number: 'INV-2026-042',
    issue_date: '2026-11-13',
    due_date: '2026-11-27',
    currency: 'EUR',
    locale: 'en-GB',
    seller: {
      name: 'Tailprint ApS',
      address_lines: ['Nyhavn 12', '1051 Copenhagen K', 'Denmark'],
      vat_id: 'DK44928172',
      email: 'billing@tailprint.com',
    },
    buyer: {
      name: 'Cohero Technologies',
      address_lines: ['Vesterbrogade 40', '1620 Copenhagen V'],
      vat_id: 'DK39281928',
    },
    items: [
      { description: 'Business plan, November 2026', details: '100,000 renders / month', quantity: 1, unit_price: 119 },
      { description: 'Dedicated Chromium worker', quantity: 2, unit_price: 45 },
    ],
    tax_rate: 25,
    status: 'unpaid',
    payment_terms: 'Net 14 days',
    bank_details: 'IBAN DK50 0040 0440 1162 43\nBIC DABADKKK',
    notes: 'Thank you for your business.',
  },
  render: (d) => {
    const L = { ...DEFAULT_INVOICE_LABELS, ...(d.labels ?? {}) };
    const money = moneyFormatter(d.currency, d.locale);
    const qty = numberFormatter(d.locale);
    const calc = computeInvoice(d);
    const accent = d.accent_color;

    const logo = d.seller.logo_url
      ? `<img src="${esc(d.seller.logo_url)}" alt="" class="mb-3 h-12 w-auto object-contain">`
      : '';
    const sellerMeta = [
      d.seller.address_lines?.length ? joinLines(d.seller.address_lines) : '',
      d.seller.vat_id ? `VAT: ${esc(d.seller.vat_id)}` : '',
      d.seller.email ? esc(d.seller.email) : '',
      d.seller.phone ? esc(d.seller.phone) : '',
    ]
      .filter(Boolean)
      .join('<br>');
    const buyerMeta = [
      d.buyer.address_lines?.length ? joinLines(d.buyer.address_lines) : '',
      d.buyer.vat_id ? `VAT: ${esc(d.buyer.vat_id)}` : '',
      d.buyer.email ? esc(d.buyer.email) : '',
    ]
      .filter(Boolean)
      .join('<br>');

    const stamp = d.status
      ? `<span class="mt-3 inline-block rounded-md border px-3 py-1 text-xs font-bold uppercase tracking-widest ${STATUS_STYLES[d.status]}">${esc(L[d.status])}</span>`
      : '';

    const rows = calc.lines
      .map(
        (l) => `
        <tr>
          <td class="px-4 py-3.5 align-top">
            <p class="font-medium text-slate-900">${esc(l.description)}</p>
            ${l.details ? `<p class="mt-0.5 text-xs text-slate-500">${esc(l.details)}</p>` : ''}
          </td>
          <td class="px-4 py-3.5 text-center align-top">${qty(l.quantity)}</td>
          <td class="px-4 py-3.5 text-right align-top">${money(l.unit_price)}</td>
          ${calc.showTaxColumn ? `<td class="px-4 py-3.5 text-right align-top">${qty(l.rate)}%</td>` : ''}
          <td class="px-4 py-3.5 text-right align-top font-medium text-slate-900">${money(l.net)}</td>
        </tr>`
      )
      .join('');

    const taxRows = calc.taxes
      .map(
        (t) => `
        <div class="flex justify-between py-1">
          <span>${esc(L.tax)} (${qty(t.rate)}%)</span>
          <span class="font-medium text-slate-900">${money(t.amount)}</span>
        </div>`
      )
      .join('');

    const footerBlocks = [
      d.notes ? `<div><p class="text-xs font-bold uppercase tracking-wider text-slate-400">${esc(L.notes)}</p><p class="mt-1 text-sm text-slate-600">${nl2br(d.notes)}</p></div>` : '',
      d.payment_terms ? `<div><p class="text-xs font-bold uppercase tracking-wider text-slate-400">${esc(L.payment_terms)}</p><p class="mt-1 text-sm text-slate-600">${nl2br(d.payment_terms)}</p></div>` : '',
      d.bank_details ? `<div><p class="text-xs font-bold uppercase tracking-wider text-slate-400">${esc(L.bank_details)}</p><p class="mt-1 text-sm text-slate-600">${nl2br(d.bank_details)}</p></div>` : '',
    ]
      .filter(Boolean)
      .join('');

    return `<div class="mx-auto max-w-4xl bg-white p-12 font-sans text-slate-800">
  <div class="flex items-start justify-between border-b border-slate-200 pb-8">
    <div>
      ${logo}
      <p class="text-xl font-black tracking-tight text-slate-900">${esc(d.seller.name)}</p>
      <p class="mt-2 text-sm leading-relaxed text-slate-500">${sellerMeta}</p>
    </div>
    <div class="text-right">
      <h1 class="text-3xl font-black uppercase tracking-wide text-slate-900">${esc(L.invoice)}</h1>
      <p class="mt-1 text-sm font-semibold" style="color:${accent}">#${esc(d.invoice_number)}</p>
      ${stamp}
      <div class="mt-4 space-y-1 text-xs text-slate-500">
        <p><span class="font-medium text-slate-700">${esc(L.issue_date)}:</span> ${esc(formatDate(d.issue_date, d.locale))}</p>
        ${d.due_date ? `<p><span class="font-medium text-slate-700">${esc(L.due_date)}:</span> ${esc(formatDate(d.due_date, d.locale))}</p>` : ''}
      </div>
    </div>
  </div>

  <div class="mt-8 text-sm">
    <p class="text-xs font-bold uppercase tracking-wider text-slate-400">${esc(L.billed_to)}</p>
    <p class="mt-1 text-base font-bold text-slate-900">${esc(d.buyer.name)}</p>
    <p class="mt-1 leading-relaxed text-slate-600">${buyerMeta}</p>
  </div>

  <div class="mt-10 overflow-hidden rounded-xl border border-slate-200">
    <table class="w-full border-collapse text-left text-sm">
      <thead>
        <tr class="bg-slate-100 text-xs font-semibold uppercase tracking-wider text-slate-700">
          <th class="px-4 py-3">${esc(L.description)}</th>
          <th class="px-4 py-3 text-center">${esc(L.quantity)}</th>
          <th class="px-4 py-3 text-right">${esc(L.unit_price)}</th>
          ${calc.showTaxColumn ? `<th class="px-4 py-3 text-right">${esc(L.tax)}</th>` : ''}
          <th class="px-4 py-3 text-right">${esc(L.amount)}</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-slate-100 text-slate-700">${rows}
      </tbody>
    </table>
  </div>

  <div class="mt-6 flex justify-end">
    <div class="w-72 text-sm text-slate-600">
      <div class="flex justify-between py-1">
        <span>${esc(L.subtotal)}</span>
        <span class="font-medium text-slate-900">${money(calc.subtotal)}</span>
      </div>
      ${calc.discount > 0 ? `<div class="flex justify-between py-1"><span>${esc(L.discount)}</span><span class="font-medium text-slate-900">-${money(calc.discount)}</span></div>` : ''}
      ${taxRows}
      <div class="mt-2 flex justify-between border-t border-slate-300 pt-3 text-base font-bold text-slate-900">
        <span>${esc(L.total)}</span>
        <span style="color:${accent}">${money(calc.total)}</span>
      </div>
    </div>
  </div>

  ${footerBlocks ? `<div class="mt-12 grid grid-cols-1 gap-6 border-t border-slate-200 pt-8">${footerBlocks}</div>` : ''}
</div>`;
  },
});

// ---------------------------------------------------------------------------
// 2. Receipt (minimal)
// ---------------------------------------------------------------------------

const ReceiptData = z.object({
  merchant: Party,
  receipt_number: z.string().min(1).max(60),
  date: z.string().min(1).max(60),
  currency: CurrencyCode.default('USD'),
  locale: LocaleTag.default('en-US'),
  items: z
    .array(
      z.object({
        name: z.string().min(1).max(300),
        quantity: z.number().finite().min(0).max(1_000_000).default(1),
        unit_price: z.number().finite().min(-1_000_000_000).max(1_000_000_000),
      })
    )
    .min(1)
    .max(500),
  tax_rate: z.number().min(0).max(100).default(0),
  tax_included: z.boolean().default(false).describe('True if unit prices already include tax'),
  tip: z.number().min(0).max(1_000_000_000).default(0),
  payment_method: ShortText.optional(),
  card_last4: z.string().regex(/^\d{4}$/, 'Must be exactly 4 digits').optional(),
  cashier: ShortText.optional(),
  footer_note: LongText.optional(),
  accent_color: HexColor.default('#0f172a'),
});

const receiptMinimal = defineTemplate({
  id: 'receipt-minimal',
  title: 'Minimal Receipt',
  category: 'Billing & Accounting',
  description: 'Compact point-of-sale style receipt with tax (inclusive or exclusive), tip and payment details.',
  format: 'A4',
  landscape: false,
  schema: ReceiptData,
  example: {
    merchant: { name: 'Nordic Roasters', address_lines: ['Jægersborggade 41', '2200 Copenhagen N'], vat_id: 'DK12345678' },
    receipt_number: 'R-20931',
    date: '2026-11-13',
    currency: 'DKK',
    locale: 'da-DK',
    items: [
      { name: 'Flat white', quantity: 2, unit_price: 42 },
      { name: 'Cardamom bun', quantity: 1, unit_price: 36 },
    ],
    tax_rate: 25,
    tax_included: true,
    tip: 10,
    payment_method: 'Card',
    card_last4: '4242',
    footer_note: 'Tak for besøget!',
  },
  render: (d) => {
    const money = moneyFormatter(d.currency, d.locale);
    const qty = numberFormatter(d.locale);
    const lines = d.items.map((i) => ({ ...i, net: round2(i.quantity * i.unit_price) }));
    const sum = round2(lines.reduce((s, l) => s + l.net, 0));
    const tax = d.tax_included ? round2(sum - sum / (1 + d.tax_rate / 100)) : round2((sum * d.tax_rate) / 100);
    const total = round2((d.tax_included ? sum : sum + tax) + d.tip);

    const rows = lines
      .map(
        (l) => `
      <div class="flex justify-between gap-4 py-1.5">
        <div><p class="font-medium text-slate-900">${esc(l.name)}</p><p class="text-xs text-slate-500">${qty(l.quantity)} × ${money(l.unit_price)}</p></div>
        <p class="font-medium text-slate-900">${money(l.net)}</p>
      </div>`
      )
      .join('');

    const payment = [d.payment_method, d.card_last4 ? `•••• ${d.card_last4}` : '']
      .filter(Boolean)
      .map(esc)
      .join(' ');

    return `<div class="mx-auto my-8 max-w-sm bg-white p-8 font-sans text-sm text-slate-700">
  <div class="text-center">
    <p class="text-xl font-black tracking-tight" style="color:${d.accent_color}">${esc(d.merchant.name)}</p>
    <p class="mt-1 text-xs leading-relaxed text-slate-500">${joinLines(d.merchant.address_lines)}${d.merchant.vat_id ? `<br>VAT: ${esc(d.merchant.vat_id)}` : ''}${d.merchant.phone ? `<br>${esc(d.merchant.phone)}` : ''}</p>
  </div>
  <div class="my-5 border-t border-dashed border-slate-300"></div>
  <div class="flex justify-between text-xs text-slate-500">
    <span>Receipt #${esc(d.receipt_number)}</span>
    <span>${esc(formatDate(d.date, d.locale))}</span>
  </div>
  ${d.cashier ? `<p class="mt-1 text-xs text-slate-500">Served by ${esc(d.cashier)}</p>` : ''}
  <div class="mt-4 divide-y divide-slate-100">${rows}</div>
  <div class="my-4 border-t border-dashed border-slate-300"></div>
  <div class="space-y-1">
    <div class="flex justify-between"><span>Subtotal</span><span>${money(sum)}</span></div>
    ${d.tax_rate > 0 ? `<div class="flex justify-between"><span>Tax (${qty(d.tax_rate)}%${d.tax_included ? ' incl.' : ''})</span><span>${money(tax)}</span></div>` : ''}
    ${d.tip > 0 ? `<div class="flex justify-between"><span>Tip</span><span>${money(d.tip)}</span></div>` : ''}
    <div class="flex justify-between border-t border-slate-300 pt-2 text-base font-bold text-slate-900"><span>Total</span><span>${money(total)}</span></div>
  </div>
  ${payment ? `<p class="mt-4 text-center text-xs text-slate-500">Paid with ${payment}</p>` : ''}
  ${d.footer_note ? `<p class="mt-6 text-center text-xs text-slate-500">${nl2br(d.footer_note)}</p>` : ''}
</div>`;
  },
});

// ---------------------------------------------------------------------------
// 3. Certificate (classic)
// ---------------------------------------------------------------------------

const CertificateData = z.object({
  recipient_name: z.string().min(1).max(200),
  heading: ShortText.default('Certificate of Achievement'),
  subheading: ShortText.default('This certificate is proudly presented to'),
  description: LongText.optional().describe('Body text shown under the recipient name'),
  organization: ShortText.optional(),
  logo_url: HttpUrl.optional(),
  issuer_name: ShortText.optional(),
  issuer_title: ShortText.optional(),
  date: z.string().max(60).optional(),
  certificate_id: z.string().max(80).optional(),
  locale: LocaleTag.default('en-US'),
  accent_color: HexColor.default('#b45309'),
});

const certificateClassic = defineTemplate({
  id: 'certificate-classic',
  title: 'Classic Certificate',
  category: 'Education & Events',
  description: 'Elegant bordered certificate with recipient, description, issuer signature line and certificate ID.',
  format: 'A4',
  landscape: false,
  schema: CertificateData,
  example: {
    recipient_name: 'Sebastian Viste',
    description: 'for outstanding contribution to the Tailprint open source community and the successful completion of the Advanced PDF Engineering programme.',
    organization: 'Tailprint Academy',
    issuer_name: 'Maria Jensen',
    issuer_title: 'Head of Education',
    date: '2026-11-13',
    certificate_id: 'TP-2026-00042',
  },
  render: (d) => {
    const accent = d.accent_color;
    // Smart Pagination Shield reserves a 15mm bottom page margin, so the frame is 281mm tall
    // (A4 297mm - 15mm) to stay on one page; the 14mm top padding keeps it visually balanced.
    return `<div class="bg-white font-serif text-slate-800" style="height:281mm;padding:14mm 14mm 0;box-sizing:border-box;overflow:hidden">
  <div class="flex h-full flex-col items-center justify-between border-4 p-10 text-center" style="border-color:${accent}">
    <div class="w-full border-2 p-8" style="border-color:${accent}33;height:100%;box-sizing:border-box;display:flex;flex-direction:column;align-items:center;justify-content:space-between">
      <div>
        ${d.logo_url ? `<img src="${esc(d.logo_url)}" alt="" class="mx-auto mb-4 h-16 w-auto object-contain">` : ''}
        ${d.organization ? `<p class="text-sm font-semibold uppercase tracking-[0.35em] text-slate-500">${esc(d.organization)}</p>` : ''}
      </div>
      <div>
        <h1 class="text-5xl font-bold leading-tight" style="color:${accent}">${esc(d.heading)}</h1>
        <p class="mt-10 text-lg italic text-slate-500">${esc(d.subheading)}</p>
        <p class="mt-6 border-b-2 pb-3 text-5xl font-bold text-slate-900" style="border-color:${accent}">${esc(d.recipient_name)}</p>
        ${d.description ? `<p class="mx-auto mt-8 max-w-xl text-lg leading-relaxed text-slate-600">${nl2br(d.description)}</p>` : ''}
      </div>
      <div class="flex w-full items-end justify-between px-6 text-sm">
        <div class="text-left">
          ${d.date ? `<p class="font-semibold text-slate-900">${esc(formatDate(d.date, d.locale))}</p><p class="mt-1 border-t border-slate-400 pt-1 text-xs uppercase tracking-widest text-slate-500">Date</p>` : ''}
        </div>
        <div class="text-right">
          ${d.issuer_name ? `<p class="font-semibold text-slate-900">${esc(d.issuer_name)}</p><p class="mt-1 border-t border-slate-400 pt-1 text-xs uppercase tracking-widest text-slate-500">${esc(d.issuer_title ?? 'Issuer')}</p>` : ''}
        </div>
      </div>
      ${d.certificate_id ? `<p class="mt-4 text-xs tracking-widest text-slate-400">Certificate ID: ${esc(d.certificate_id)}</p>` : ''}
    </div>
  </div>
</div>`;
  },
});

// ---------------------------------------------------------------------------
// 4. Report (executive)
// ---------------------------------------------------------------------------

const ReportData = z.object({
  title: z.string().min(1).max(200),
  subtitle: ShortText.optional(),
  author: ShortText.optional(),
  organization: ShortText.optional(),
  logo_url: HttpUrl.optional(),
  date: z.string().max(60).optional(),
  locale: LocaleTag.default('en-US'),
  summary: LongText.optional().describe('Executive summary. Separate paragraphs with a blank line'),
  metrics: z
    .array(
      z.object({
        label: ShortText,
        value: z.union([z.string().max(60), z.number()]),
        change: z.string().max(30).optional().describe('e.g. "+12.4%" or "-3%"'),
        trend: z
          .enum(['good', 'bad', 'neutral'])
          .optional()
          .describe('Colors the change. Defaults to green for "+" and red for a leading "-"; set "good" for e.g. falling latency'),
      })
    )
    .max(8)
    .optional(),
  sections: z
    .array(
      z.object({
        heading: ShortText,
        body: LongText.optional().describe('Separate paragraphs with a blank line'),
        bullets: z.array(z.string().max(500)).max(50).optional(),
      })
    )
    .max(50)
    .optional(),
  table: z
    .object({
      title: ShortText.optional(),
      columns: z.array(ShortText).min(1).max(12),
      rows: z.array(z.array(z.union([z.string().max(500), z.number(), z.null()])).max(12)).max(500),
    })
    .optional(),
  accent_color: HexColor.default('#4f46e5'),
});

const reportExecutive = defineTemplate({
  id: 'report-executive',
  title: 'Executive Report',
  category: 'Business Reports',
  description: 'Structured report with cover header, KPI tiles, summary, free-form sections and a data table.',
  format: 'A4',
  landscape: false,
  schema: ReportData,
  example: {
    title: 'Q4 2026 Performance Report',
    subtitle: 'Platform usage and revenue overview',
    author: 'Maria Jensen',
    organization: 'Tailprint ApS',
    date: '2026-11-13',
    summary: 'Q4 was our strongest quarter to date, driven by the launch of asynchronous batch rendering and the official Python SDK.\n\nRevenue grew steadily while render latency stayed below 380 ms.',
    metrics: [
      { label: 'Renders', value: '1.82M', change: '+38%' },
      { label: 'MRR', value: '€14.2k', change: '+21%' },
      { label: 'p95 latency', value: '361 ms', change: '-6%', trend: 'good' },
      { label: 'New API keys', value: 412, change: '+64%' },
    ],
    sections: [
      { heading: 'Highlights', bullets: ['Batch rendering with signed webhooks shipped', 'Python SDK published on PyPI', 'Free key onboarding without a card'] },
      { heading: 'Outlook', body: 'Next quarter focuses on hosted templates, direct-to-cloud delivery and PAdES digital signatures.' },
    ],
    table: {
      title: 'Renders by month',
      columns: ['Month', 'Renders', 'Errors'],
      rows: [
        ['October', 520000, 41],
        ['November', 610000, 33],
        ['December', 690000, 29],
      ],
    },
  },
  render: (d) => {
    const accent = d.accent_color;
    const paragraphs = (text?: string) =>
      (text ?? '')
        .split(/\n\s*\n/)
        .map((p) => p.trim())
        .filter(Boolean)
        .map((p) => `<p class="mt-3 text-sm leading-relaxed text-slate-600">${nl2br(p)}</p>`)
        .join('');

    const metrics = (d.metrics ?? [])
      .map((m) => {
        const trend = m.trend ?? (m.change?.trim().startsWith('-') ? 'bad' : 'good');
        const trendColor = { good: 'text-emerald-600', bad: 'text-rose-600', neutral: 'text-slate-500' }[trend];
        return `<div class="rounded-xl border border-slate-200 bg-slate-50 p-4">
        <p class="text-xs font-semibold uppercase tracking-wider text-slate-500">${esc(m.label)}</p>
        <p class="mt-1 text-2xl font-black text-slate-900">${esc(m.value)}</p>
        ${m.change ? `<p class="mt-1 text-xs font-semibold ${trendColor}">${esc(m.change)}</p>` : ''}
      </div>`;
      })
      .join('');

    const sections = (d.sections ?? [])
      .map(
        (s) => `<section class="mt-8">
      <h2 class="border-l-4 pl-3 text-lg font-bold text-slate-900" style="border-color:${accent}">${esc(s.heading)}</h2>
      ${paragraphs(s.body)}
      ${s.bullets?.length ? `<ul class="mt-3 list-disc space-y-1 pl-6 text-sm text-slate-600">${s.bullets.map((b) => `<li>${esc(b)}</li>`).join('')}</ul>` : ''}
    </section>`
      )
      .join('');

    const table = d.table
      ? (() => {
          const cols = d.table.columns;
          const numericCol = cols.map((_, i) => d.table!.rows.some((row) => typeof row[i] === 'number'));
          const head = cols
            .map((c, i) => `<th class="px-4 py-2.5${numericCol[i] ? ' text-right' : ''}">${esc(c)}</th>`)
            .join('');
          const body = d.table.rows
            .map(
              (row) =>
                `<tr>${cols
                  .map((_, i) => {
                    const v = row[i];
                    const align = typeof v === 'number' ? 'text-right tabular-nums' : '';
                    const text = typeof v === 'number' ? new Intl.NumberFormat(d.locale).format(v) : cell(v);
                    return `<td class="px-4 py-2.5 ${align}">${text}</td>`;
                  })
                  .join('')}</tr>`
            )
            .join('');
          return `<section class="mt-8">
      ${d.table.title ? `<h2 class="border-l-4 pl-3 text-lg font-bold text-slate-900" style="border-color:${accent}">${esc(d.table.title)}</h2>` : ''}
      <div class="mt-3 overflow-hidden rounded-xl border border-slate-200">
        <table class="w-full border-collapse text-left text-sm">
          <thead><tr class="bg-slate-100 text-xs font-semibold uppercase tracking-wider text-slate-700">${head}</tr></thead>
          <tbody class="divide-y divide-slate-100 text-slate-700">${body}</tbody>
        </table>
      </div>
    </section>`;
        })()
      : '';

    const meta = [d.author, d.organization, d.date ? formatDate(d.date, d.locale) : '']
      .filter(Boolean)
      .map(esc)
      .join(' &nbsp;•&nbsp; ');

    return `<div class="mx-auto max-w-4xl bg-white p-12 font-sans text-slate-800">
  <header class="border-b-4 pb-8" style="border-color:${accent}">
    ${d.logo_url ? `<img src="${esc(d.logo_url)}" alt="" class="mb-6 h-10 w-auto object-contain">` : ''}
    <h1 class="text-4xl font-black leading-tight tracking-tight text-slate-900">${esc(d.title)}</h1>
    ${d.subtitle ? `<p class="mt-2 text-lg text-slate-500">${esc(d.subtitle)}</p>` : ''}
    ${meta ? `<p class="mt-4 text-xs font-semibold uppercase tracking-wider" style="color:${accent}">${meta}</p>` : ''}
  </header>
  ${metrics ? `<div class="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">${metrics}</div>` : ''}
  ${d.summary ? `<section class="mt-8"><h2 class="border-l-4 pl-3 text-lg font-bold text-slate-900" style="border-color:${accent}">Summary</h2>${paragraphs(d.summary)}</section>` : ''}
  ${sections}
  ${table}
</div>`;
  },
});

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

export const HOSTED_TEMPLATES: HostedTemplate<any>[] = [
  invoiceModern,
  receiptMinimal,
  certificateClassic,
  reportExecutive,
];

export const HOSTED_TEMPLATE_IDS = HOSTED_TEMPLATES.map((t) => t.id);

export function getHostedTemplate(id: string): HostedTemplate<any> | undefined {
  return HOSTED_TEMPLATES.find((t) => t.id === id);
}
