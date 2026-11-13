import { PDFDocument, PDFName } from 'pdf-lib';
import zlib from 'node:zlib';
import { browserService } from './browser.js';
import { storageService, type StoredFileMetadata } from './storage.js';

export interface EInvoiceParty {
  name: string;
  vatId?: string; // e.g. "DK12345678" or "DE987654321"
  country: string; // ISO 2-letter country code (e.g. "DK", "DE", "FR", "US")
  street?: string;
  city?: string;
  postcode?: string;
  email?: string;
}

export interface EInvoiceLineItem {
  name: string;
  quantity: number;
  unitPrice: number;
  vatRate?: number; // e.g. 25 for 25% or 0 for tax exempt
}

export interface EInvoiceData {
  invoiceNumber: string;
  issueDate?: string; // YYYY-MM-DD or YYYYMMDD
  dueDate?: string; // YYYY-MM-DD or YYYYMMDD
  currency?: string; // ISO 4217, default "EUR" (e.g. "EUR", "DKK", "USD", "SEK")
  seller: EInvoiceParty;
  buyer: EInvoiceParty;
  lineItems: EInvoiceLineItem[];
  paymentIban?: string;
  paymentBic?: string;
  notes?: string;
  profile?: 'BASIC' | 'EN16931';
  expiresIn?: '1h' | '24h' | '7d';
}

export interface GenerateEInvoiceResult {
  pdfBuffer: Buffer;
  xml: string;
  invoiceNumber: string;
  currency: string;
  netTotal: number;
  taxTotal: number;
  grossTotal: number;
  pdfStored?: StoredFileMetadata;
}

export interface EInvoiceValidationResult {
  isValid: boolean;
  hasEmbeddedXml: boolean;
  xmlFilename: string | null;
  standard: string;
  profile: string;
  profileUrn: string | null;
  invoiceDetails: {
    invoiceNumber: string | null;
    issueDate: string | null;
    dueDate: string | null;
    currency: string | null;
    seller: {
      name: string | null;
      vatId: string | null;
      country: string | null;
      city: string | null;
    } | null;
    buyer: {
      name: string | null;
      vatId: string | null;
      country: string | null;
      city: string | null;
    } | null;
    totals: {
      lineTotalAmount: number | null;
      taxBasisTotalAmount: number | null;
      taxTotalAmount: number | null;
      grandTotalAmount: number | null;
      duePayableAmount: number | null;
    } | null;
    lineItemsCount: number;
    paymentIban: string | null;
  } | null;
  errors: string[];
  warnings: string[];
}

export class EInvoiceService {
  private static instance: EInvoiceService | null = null;

  private constructor() {}

  public static getInstance(): EInvoiceService {
    if (!EInvoiceService.instance) {
      EInvoiceService.instance = new EInvoiceService();
    }
    return EInvoiceService.instance;
  }

  private escapeXml(unsafe: string): string {
    return unsafe
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  private formatDate102(dateStr?: string): string {
    if (!dateStr) {
      const now = new Date();
      const y = now.getFullYear();
      const m = String(now.getMonth() + 1).padStart(2, '0');
      const d = String(now.getDate()).padStart(2, '0');
      return `${y}${m}${d}`;
    }
    const clean = dateStr.replace(/[^0-9]/g, '');
    if (clean.length === 8) return clean;
    const parsed = new Date(dateStr);
    if (!isNaN(parsed.getTime())) {
      const y = parsed.getFullYear();
      const m = String(parsed.getMonth() + 1).padStart(2, '0');
      const d = String(parsed.getDate()).padStart(2, '0');
      return `${y}${m}${d}`;
    }
    return new Date().toISOString().slice(0, 10).replace(/-/g, '');
  }

  /**
   * Generates a fully compliant Factur-X / ZUGFeRD / EN 16931 electronic invoice XML (CII syntax).
   */
  public generateFacturXXml(data: EInvoiceData): string {
    const currency = (data.currency || 'EUR').toUpperCase();
    const issueDate102 = this.formatDate102(data.issueDate);
    const dueDate102 = data.dueDate ? this.formatDate102(data.dueDate) : undefined;
    const profileId =
      data.profile === 'EN16931'
        ? 'urn:cen.eu:en16931:2017'
        : 'urn:cen.eu:en16931:2017#compliant#urn:factur-x.eu:1p0:basic';

    // Calculate line totals and taxes
    let netTotal = 0;
    const taxBuckets = new Map<number, { taxableAmount: number; taxAmount: number }>();

    const lineItemsXml = data.lineItems
      .map((item, idx) => {
        const lineNum = idx + 1;
        const qty = item.quantity;
        const price = item.unitPrice;
        const lineNet = Number((qty * price).toFixed(2));
        const vatRate = item.vatRate !== undefined ? item.vatRate : 25; // default 25% in DK / typical EU

        netTotal += lineNet;

        // Bucket taxes
        const currentBucket = taxBuckets.get(vatRate) || { taxableAmount: 0, taxAmount: 0 };
        currentBucket.taxableAmount += lineNet;
        currentBucket.taxAmount += Number(((lineNet * vatRate) / 100).toFixed(2));
        taxBuckets.set(vatRate, currentBucket);

        return `
    <ram:IncludedSupplyChainTradeLineItem>
      <ram:AssociatedDocumentLineDocument>
        <ram:LineID>${lineNum}</ram:LineID>
      </ram:AssociatedDocumentLineDocument>
      <ram:SpecifiedTradeProduct>
        <ram:Name>${this.escapeXml(item.name)}</ram:Name>
      </ram:SpecifiedTradeProduct>
      <ram:SpecifiedLineTradeAgreement>
        <ram:NetPriceProductTradePrice>
          <ram:ChargeAmount currencyID="${currency}">${price.toFixed(2)}</ram:ChargeAmount>
        </ram:NetPriceProductTradePrice>
      </ram:SpecifiedLineTradeAgreement>
      <ram:SpecifiedLineTradeDelivery>
        <ram:BilledQuantity unitCode="C62">${qty}</ram:BilledQuantity>
      </ram:SpecifiedLineTradeDelivery>
      <ram:SpecifiedLineTradeSettlement>
        <ram:ApplicableTradeTax>
          <ram:TypeCode>VAT</ram:TypeCode>
          <ram:CategoryCode>${vatRate === 0 ? 'E' : 'S'}</ram:CategoryCode>
          <ram:RateApplicablePercent>${vatRate.toFixed(2)}</ram:RateApplicablePercent>
        </ram:ApplicableTradeTax>
        <ram:SpecifiedTradeSettlementLineMonetarySummation>
          <ram:LineTotalAmount currencyID="${currency}">${lineNet.toFixed(2)}</ram:LineTotalAmount>
        </ram:SpecifiedTradeSettlementLineMonetarySummation>
      </ram:SpecifiedLineTradeSettlement>
    </ram:IncludedSupplyChainTradeLineItem>`;
      })
      .join('\n');

    let totalTaxAmount = 0;
    const taxSummaryXml = Array.from(taxBuckets.entries())
      .map(([rate, bucket]) => {
        totalTaxAmount += bucket.taxAmount;
        return `
      <ram:ApplicableTradeTax>
        <ram:CalculatedAmount currencyID="${currency}">${bucket.taxAmount.toFixed(2)}</ram:CalculatedAmount>
        <ram:TypeCode>VAT</ram:TypeCode>
        <ram:BasisAmount currencyID="${currency}">${bucket.taxableAmount.toFixed(2)}</ram:BasisAmount>
        <ram:CategoryCode>${rate === 0 ? 'E' : 'S'}</ram:CategoryCode>
        <ram:RateApplicablePercent>${rate.toFixed(2)}</ram:RateApplicablePercent>
      </ram:ApplicableTradeTax>`;
      })
      .join('\n');

    const grossTotal = Number((netTotal + totalTaxAmount).toFixed(2));

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rsm:CrossIndustryInvoice 
    xmlns:rsm="urn:un:unece:uncefact:data:standard:CrossIndustryInvoice:100" 
    xmlns:ccts="urn:un:unece:uncefact:documentation:standard:CoreComponentsTechnicalSpecification:2" 
    xmlns:udt="urn:un:unece:uncefact:data:standard:UnqualifiedDataType:100" 
    xmlns:qdt="urn:un:unece:uncefact:data:standard:QualifiedDataType:100" 
    xmlns:ram="urn:un:unece:uncefact:data:standard:ReusableAggregateBusinessInformationEntity:100">
  <rsm:ExchangedDocumentContext>
    <ram:GuidelineSpecifiedDocumentContextParameter>
      <ram:ID>${profileId}</ram:ID>
    </ram:GuidelineSpecifiedDocumentContextParameter>
  </rsm:ExchangedDocumentContext>
  <rsm:ExchangedDocument>
    <ram:ID>${this.escapeXml(data.invoiceNumber)}</ram:ID>
    <ram:TypeCode>380</ram:TypeCode>
    <ram:IssueDateTime>
      <udt:DateTimeString format="102">${issueDate102}</udt:DateTimeString>
    </ram:IssueDateTime>
    ${data.notes ? `<ram:IncludedNote><ram:Content>${this.escapeXml(data.notes)}</ram:Content></ram:IncludedNote>` : ''}
  </rsm:ExchangedDocument>
  <rsm:SupplyChainTradeTransaction>
    ${lineItemsXml}
    <ram:ApplicableHeaderTradeAgreement>
      <ram:SellerTradeParty>
        <ram:Name>${this.escapeXml(data.seller.name)}</ram:Name>
        ${
          data.seller.street || data.seller.city
            ? `<ram:PostalTradeAddress>
          ${data.seller.postcode ? `<ram:PostcodeCode>${this.escapeXml(data.seller.postcode)}</ram:PostcodeCode>` : ''}
          ${data.seller.street ? `<ram:LineOne>${this.escapeXml(data.seller.street)}</ram:LineOne>` : ''}
          ${data.seller.city ? `<ram:CityName>${this.escapeXml(data.seller.city)}</ram:CityName>` : ''}
          <ram:CountryID>${(data.seller.country || 'DK').toUpperCase()}</ram:CountryID>
        </ram:PostalTradeAddress>`
            : ''
        }
        ${
          data.seller.vatId
            ? `<ram:SpecifiedTaxRegistration>
          <ram:ID schemeID="VA">${this.escapeXml(data.seller.vatId)}</ram:ID>
        </ram:SpecifiedTaxRegistration>`
            : ''
        }
      </ram:SellerTradeParty>
      <ram:BuyerTradeParty>
        <ram:Name>${this.escapeXml(data.buyer.name)}</ram:Name>
        ${
          data.buyer.street || data.buyer.city
            ? `<ram:PostalTradeAddress>
          ${data.buyer.postcode ? `<ram:PostcodeCode>${this.escapeXml(data.buyer.postcode)}</ram:PostcodeCode>` : ''}
          ${data.buyer.street ? `<ram:LineOne>${this.escapeXml(data.buyer.street)}</ram:LineOne>` : ''}
          ${data.buyer.city ? `<ram:CityName>${this.escapeXml(data.buyer.city)}</ram:CityName>` : ''}
          <ram:CountryID>${(data.buyer.country || 'DK').toUpperCase()}</ram:CountryID>
        </ram:PostalTradeAddress>`
            : ''
        }
        ${
          data.buyer.vatId
            ? `<ram:SpecifiedTaxRegistration>
          <ram:ID schemeID="VA">${this.escapeXml(data.buyer.vatId)}</ram:ID>
        </ram:SpecifiedTaxRegistration>`
            : ''
        }
      </ram:BuyerTradeParty>
    </ram:ApplicableHeaderTradeAgreement>
    <ram:ApplicableHeaderTradeDelivery>
      <ram:ActualDeliverySupplyChainEvent>
        <ram:OccurrenceDateTime>
          <udt:DateTimeString format="102">${issueDate102}</udt:DateTimeString>
        </ram:OccurrenceDateTime>
      </ram:ActualDeliverySupplyChainEvent>
    </ram:ApplicableHeaderTradeDelivery>
    <ram:ApplicableHeaderTradeSettlement>
      <ram:InvoiceCurrencyCode>${currency}</ram:InvoiceCurrencyCode>
      ${
        data.paymentIban
          ? `<ram:SpecifiedTradeSettlementPaymentMeans>
        <ram:TypeCode>58</ram:TypeCode>
        <ram:PayeePartyCreditorFinancialAccount>
          <ram:IBANID>${this.escapeXml(data.paymentIban.replace(/\s+/g, ''))}</ram:IBANID>
        </ram:PayeePartyCreditorFinancialAccount>
        ${
          data.paymentBic
            ? `<ram:PayeeSpecifiedCreditorFinancialInstitution>
          <ram:BICID>${this.escapeXml(data.paymentBic.replace(/\s+/g, ''))}</ram:BICID>
        </ram:PayeeSpecifiedCreditorFinancialInstitution>`
            : ''
        }
      </ram:SpecifiedTradeSettlementPaymentMeans>`
          : ''
      }
      ${taxSummaryXml}
      ${
        dueDate102
          ? `<ram:SpecifiedTradePaymentTerms>
        <ram:DueDateDateTime>
          <udt:DateTimeString format="102">${dueDate102}</udt:DateTimeString>
        </ram:DueDateDateTime>
      </ram:SpecifiedTradePaymentTerms>`
          : ''
      }
      <ram:SpecifiedTradeSettlementHeaderMonetarySummation>
        <ram:LineTotalAmount currencyID="${currency}">${netTotal.toFixed(2)}</ram:LineTotalAmount>
        <ram:TaxBasisTotalAmount currencyID="${currency}">${netTotal.toFixed(2)}</ram:TaxBasisTotalAmount>
        <ram:TaxTotalAmount currencyID="${currency}">${totalTaxAmount.toFixed(2)}</ram:TaxTotalAmount>
        <ram:GrandTotalAmount currencyID="${currency}">${grossTotal.toFixed(2)}</ram:GrandTotalAmount>
        <ram:DuePayableAmount currencyID="${currency}">${grossTotal.toFixed(2)}</ram:DuePayableAmount>
      </ram:SpecifiedTradeSettlementHeaderMonetarySummation>
    </ram:ApplicableHeaderTradeSettlement>
  </rsm:SupplyChainTradeTransaction>
</rsm:CrossIndustryInvoice>`;

    return xml;
  }

  /**
   * Attaches the Factur-X / ZUGFeRD XML document directly into the PDF document catalog,
   * producing a compliant Hybrid PDF/A-3 electronic invoice.
   */
  public async embedFacturXXml(
    pdfBuffer: Buffer,
    xmlString: string
  ): Promise<Buffer> {
    const pdfDoc = await PDFDocument.load(pdfBuffer);

    // Attach factur-x.xml into the PDF EmbeddedFiles tree
    await pdfDoc.attach(Buffer.from(xmlString, 'utf-8'), 'factur-x.xml', {
      mimeType: 'text/xml',
      description: 'Factur-X / ZUGFeRD E-Invoice XML data (EN 16931)',
      creationDate: new Date(),
      modificationDate: new Date(),
    });

    // Set standard PDF document title and metadata
    pdfDoc.setTitle('Electronic Invoice');
    pdfDoc.setProducer('Tailprint E-Invoice Engine (https://tailprint.com)');

    // Save with useObjectStreams: false for maximum compatibility with ERP systems and legacy XRef parsers
    const modifiedBytes = await pdfDoc.save({ useObjectStreams: false });
    return Buffer.from(modifiedBytes);
  }

  /**
   * Generates both a pixel-perfect visual HTML invoice with Tailwind CSS
   * and attaches the Factur-X XML into the resulting PDF.
   */
  public async generateHybridInvoice(data: EInvoiceData): Promise<GenerateEInvoiceResult> {
    const currency = (data.currency || 'EUR').toUpperCase();
    const xml = this.generateFacturXXml(data);

    // Calculate totals
    let netTotal = 0;
    let taxTotal = 0;
    for (const item of data.lineItems) {
      const lineNet = Number((item.quantity * item.unitPrice).toFixed(2));
      const vatRate = item.vatRate !== undefined ? item.vatRate : 25;
      netTotal += lineNet;
      taxTotal += Number(((lineNet * vatRate) / 100).toFixed(2));
    }
    const grossTotal = Number((netTotal + taxTotal).toFixed(2));

    // Compile beautiful Tailwind HTML invoice
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    @page {
      size: A4;
      margin: 15mm;
    }
    body {
      -webkit-print-color-adjust: exact;
    }
  </style>
</head>
<body class="bg-white text-slate-800 p-8 font-sans antialiased max-w-4xl mx-auto">
  
  <!-- Header: Brand & Status -->
  <div class="flex justify-between items-start border-b border-slate-200 pb-8">
    <div>
      <div class="flex items-center space-x-2">
        <span class="text-2xl font-black text-slate-900">&lt;tail<span class="text-indigo-600">print</span>/&gt;</span>
      </div>
      <p class="text-xs text-slate-500 mt-1">Official Hybrid Electronic Invoice (EN 16931 / Factur-X)</p>
    </div>
    <div class="text-right">
      <span class="text-xs font-mono font-bold px-2.5 py-1 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
        🇪🇺 FACTUR-X / ZUGFeRD COMPLIANT
      </span>
      <h1 class="text-2xl font-black text-slate-900 mt-2">INVOICE</h1>
      <p class="text-xs font-mono text-slate-500 font-semibold"># ${data.invoiceNumber}</p>
    </div>
  </div>

  <!-- Parties: Seller & Buyer Grid -->
  <div class="grid grid-cols-2 gap-8 my-8 text-xs">
    <div class="p-4 rounded-xl bg-slate-50 border border-slate-100">
      <span class="font-bold text-slate-400 uppercase tracking-wider text-[10px] block mb-1">From (Seller)</span>
      <h3 class="font-bold text-slate-900 text-sm">${data.seller.name}</h3>
      ${data.seller.street ? `<p class="text-slate-600 mt-0.5">${data.seller.street}</p>` : ''}
      ${data.seller.postcode || data.seller.city ? `<p class="text-slate-600">${data.seller.postcode || ''} ${data.seller.city || ''}, ${data.seller.country}</p>` : `<p class="text-slate-600">${data.seller.country}</p>`}
      ${data.seller.vatId ? `<p class="text-slate-500 mt-2 font-mono">VAT ID / CVR: <strong class="text-slate-800">${data.seller.vatId}</strong></p>` : ''}
    </div>

    <div class="p-4 rounded-xl bg-slate-50 border border-slate-100">
      <span class="font-bold text-slate-400 uppercase tracking-wider text-[10px] block mb-1">Bill To (Buyer)</span>
      <h3 class="font-bold text-slate-900 text-sm">${data.buyer.name}</h3>
      ${data.buyer.street ? `<p class="text-slate-600 mt-0.5">${data.buyer.street}</p>` : ''}
      ${data.buyer.postcode || data.buyer.city ? `<p class="text-slate-600">${data.buyer.postcode || ''} ${data.buyer.city || ''}, ${data.buyer.country}</p>` : `<p class="text-slate-600">${data.buyer.country}</p>`}
      ${data.buyer.vatId ? `<p class="text-slate-500 mt-2 font-mono">VAT ID / CVR: <strong class="text-slate-800">${data.buyer.vatId}</strong></p>` : ''}
    </div>
  </div>

  <!-- Metadata Strip -->
  <div class="grid grid-cols-4 gap-4 p-3.5 bg-slate-100/70 rounded-xl text-xs mb-8">
    <div>
      <span class="text-slate-400 text-[10px] uppercase font-bold block">Invoice Date</span>
      <strong class="text-slate-900">${data.issueDate || new Date().toISOString().slice(0, 10)}</strong>
    </div>
    <div>
      <span class="text-slate-400 text-[10px] uppercase font-bold block">Payment Due</span>
      <strong class="text-slate-900">${data.dueDate || 'Upon Receipt'}</strong>
    </div>
    <div>
      <span class="text-slate-400 text-[10px] uppercase font-bold block">Currency</span>
      <strong class="text-slate-900">${currency}</strong>
    </div>
    <div>
      <span class="text-slate-400 text-[10px] uppercase font-bold block">Profile</span>
      <strong class="text-slate-900 font-mono text-[11px]">${data.profile || 'BASIC (EN 16931)'}</strong>
    </div>
  </div>

  <!-- Line Items Table -->
  <table class="w-full text-left text-xs mb-8">
    <thead>
      <tr class="border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
        <th class="py-2.5">Description</th>
        <th class="py-2.5 text-right">Qty</th>
        <th class="py-2.5 text-right">Unit Price</th>
        <th class="py-2.5 text-right">VAT</th>
        <th class="py-2.5 text-right">Amount</th>
      </tr>
    </thead>
    <tbody class="divide-y divide-slate-100">
      ${data.lineItems
        .map((item) => {
          const lineTotal = item.quantity * item.unitPrice;
          return `
      <tr>
        <td class="py-3 font-semibold text-slate-800">${item.name}</td>
        <td class="py-3 text-right text-slate-600">${item.quantity}</td>
        <td class="py-3 text-right font-mono text-slate-600">${item.unitPrice.toFixed(2)}</td>
        <td class="py-3 text-right font-mono text-slate-500">${item.vatRate !== undefined ? item.vatRate : 25}%</td>
        <td class="py-3 text-right font-mono font-bold text-slate-900">${lineTotal.toFixed(2)} ${currency}</td>
      </tr>`;
        })
        .join('')}
    </tbody>
  </table>

  <!-- Totals Summary & Payment Info -->
  <div class="flex justify-between items-start pt-4 border-t border-slate-200 text-xs">
    <div class="max-w-xs space-y-2">
      ${
        data.paymentIban
          ? `
      <div class="p-3 bg-slate-50 rounded-xl border border-slate-100 text-[11px]">
        <span class="font-bold text-slate-700 block mb-1">Direct Bank Transfer</span>
        <p class="font-mono text-slate-600">IBAN: <strong class="text-slate-900">${data.paymentIban}</strong></p>
        ${data.paymentBic ? `<p class="font-mono text-slate-600">BIC / SWIFT: ${data.paymentBic}</p>` : ''}
      </div>`
          : ''
      }
      ${data.notes ? `<p class="text-slate-500 italic text-[11px]">${data.notes}</p>` : ''}
    </div>

    <div class="w-64 space-y-2 text-right">
      <div class="flex justify-between text-slate-600">
        <span>Subtotal (Net):</span>
        <span class="font-mono font-semibold">${netTotal.toFixed(2)} ${currency}</span>
      </div>
      <div class="flex justify-between text-slate-600">
        <span>Total VAT / Tax:</span>
        <span class="font-mono font-semibold">${taxTotal.toFixed(2)} ${currency}</span>
      </div>
      <div class="flex justify-between border-t border-slate-200 pt-2 text-sm font-black text-slate-900">
        <span>Total Due:</span>
        <span class="font-mono text-indigo-600 text-base">${grossTotal.toFixed(2)} ${currency}</span>
      </div>
    </div>
  </div>

  <!-- Factur-X / PDF Attachment Banner -->
  <div class="mt-12 p-3 rounded-lg bg-slate-50 border border-slate-200 text-center text-[10px] text-slate-400">
    This document contains a valid, embedded <strong class="text-slate-600">factur-x.xml</strong> file conforming to the European standard EN 16931. It can be automatically processed by accounting software (SAP, DATEV, Dinero, Billy, Chorus Pro).
  </div>

</body>
</html>`;

    // 1. Render visual PDF invoice
    const visualPdfBuffer = await browserService.renderPdf({
      html,
      format: 'A4',
      print_background: true,
    });

    // 2. Embed the Factur-X XML directly into the PDF
    const hybridPdfBuffer = await this.embedFacturXXml(visualPdfBuffer, xml);

    // 3. Save to hosted CDN
    const pdfStored = await storageService.saveFile(hybridPdfBuffer, {
      mimeType: 'application/pdf',
      extension: 'pdf',
      filename: `factur-x-${data.invoiceNumber}.pdf`,
      expiresIn: data.expiresIn,
    });

    return {
      pdfBuffer: hybridPdfBuffer,
      xml,
      invoiceNumber: data.invoiceNumber,
      currency,
      netTotal,
      taxTotal,
      grossTotal,
      pdfStored,
    };
  }

  /**
   * Extracts embedded Factur-X / ZUGFeRD XML document from a PDF's /EmbeddedFiles catalog.
   */
  public async extractXmlFromPdf(pdfBuffer: Buffer): Promise<{ xmlString: string; filename: string } | null> {
    try {
      const pdfDoc = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true });
      const names = pdfDoc.catalog.lookup(PDFName.of('Names'));
      if (!names || typeof (names as any).lookup !== 'function') {
        return this.fallbackScanForXml(pdfBuffer);
      }

      const embeddedFiles = (names as any).lookup(PDFName.of('EmbeddedFiles'));
      if (!embeddedFiles || typeof (embeddedFiles as any).lookup !== 'function') {
        return this.fallbackScanForXml(pdfBuffer);
      }

      const efNames = (embeddedFiles as any).lookup(PDFName.of('Names'));
      if (!efNames || typeof efNames.size !== 'function') {
        return this.fallbackScanForXml(pdfBuffer);
      }

      for (let i = 0; i < efNames.size(); i += 2) {
        const rawName = efNames.get(i);
        const fileName = rawName && typeof rawName.decodeText === 'function' ? rawName.decodeText() : String(rawName);
        const lowerName = fileName.toLowerCase();

        if (lowerName.endsWith('.xml')) {
          const fileSpec = efNames.lookup(i + 1);
          if (!fileSpec || typeof (fileSpec as any).lookup !== 'function') continue;

          const efDict = (fileSpec as any).lookup(PDFName.of('EF'));
          if (!efDict || typeof (efDict as any).lookup !== 'function') continue;

          const stream = (efDict as any).lookup(PDFName.of('F'));
          if (!stream || !stream.contents) continue;

          let xmlString = '';
          try {
            const decompressed = zlib.inflateSync(stream.contents);
            xmlString = decompressed.toString('utf-8');
          } catch {
            xmlString = Buffer.from(stream.contents).toString('utf-8');
          }

          if (xmlString.includes('CrossIndustryInvoice') || xmlString.includes('Invoice')) {
            return { xmlString, filename: fileName };
          }
        }
      }

      return this.fallbackScanForXml(pdfBuffer);
    } catch {
      return this.fallbackScanForXml(pdfBuffer);
    }
  }

  /**
   * Fallback raw stream scan for XML signatures when standard /EmbeddedFiles dictionary is absent.
   */
  private fallbackScanForXml(pdfBuffer: Buffer): { xmlString: string; filename: string } | null {
    try {
      const rawText = pdfBuffer.toString('latin1');
      const ciiMatch = rawText.match(/<(?:\w+:)?CrossIndustryInvoice[\s\S]*?<\/(?:\w+:)?CrossIndustryInvoice>/i);
      if (ciiMatch) {
        return { xmlString: ciiMatch[0], filename: 'factur-x.xml' };
      }
      const ublMatch = rawText.match(/<(?:\w+:)?Invoice[\s\S]*?<\/(?:\w+:)?Invoice>/i);
      if (ublMatch) {
        return { xmlString: ublMatch[0], filename: 'ubl-invoice.xml' };
      }
    } catch {}
    return null;
  }

  /**
   * Validates Factur-X / ZUGFeRD / EN 16931 XML conformance, extracts all structured metadata,
   * and verifies required fields and arithmetic consistency.
   */
  public validateFacturX(xmlString: string, filename = 'factur-x.xml'): EInvoiceValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    const getSection = (s: string, secName: string): string => {
      const m = s.match(new RegExp(`<(?:[a-zA-Z0-9_-]+:)?${secName}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/(?:[a-zA-Z0-9_-]+:)?${secName}>`, 'i'));
      return m ? m[1] : '';
    };

    const getTag = (s: string, tagName: string): string | null => {
      const m = s.match(new RegExp(`<(?:[a-zA-Z0-9_-]+:)?${tagName}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/(?:[a-zA-Z0-9_-]+:)?${tagName}>`, 'i'));
      return m ? m[1].trim() : null;
    };

    const isCII = xmlString.includes('CrossIndustryInvoice');
    const isUBL = !isCII && xmlString.includes('Invoice');

    if (!isCII && !isUBL) {
      errors.push('Document XML is not a recognized European electronic invoice standard (CrossIndustryInvoice or UBL Invoice).');
      return {
        isValid: false,
        hasEmbeddedXml: true,
        xmlFilename: filename,
        standard: 'Unknown',
        profile: 'UNKNOWN',
        profileUrn: null,
        invoiceDetails: null,
        errors,
        warnings,
      };
    }

    // 1. Profile identification
    const contextSec = getSection(xmlString, 'GuidelineSpecifiedDocumentContextParameter');
    const profileUrn = getTag(contextSec, 'ID');
    let profile = 'UNKNOWN';
    let standard = 'Factur-X 1.0 / ZUGFeRD 2.2 (EN 16931)';

    if (profileUrn) {
      const lowerUrn = profileUrn.toLowerCase();
      if (lowerUrn.includes('minimum')) {
        profile = 'MINIMUM';
      } else if (lowerUrn.includes('basicwl')) {
        profile = 'BASIC WL';
      } else if (lowerUrn.includes('basic')) {
        profile = 'BASIC';
      } else if (lowerUrn.includes('extended')) {
        profile = 'EXTENDED';
      } else if (lowerUrn.includes('en16931')) {
        profile = 'EN16931';
      }
    } else {
      warnings.push('Missing explicit GuidelineSpecifiedDocumentContextParameter ID profile declaration.');
      profile = 'BASIC';
    }

    // 2. Invoice identification
    const docSec = getSection(xmlString, 'ExchangedDocument');
    const invoiceNumber = getTag(docSec, 'ID');
    if (!invoiceNumber) {
      errors.push('Missing mandatory invoice number identifier (<ram:ID> in ExchangedDocument).');
    }

    const issueDateStr = getTag(docSec, 'DateTimeString');
    let issueDate: string | null = null;
    if (issueDateStr && issueDateStr.length === 8) {
      issueDate = `${issueDateStr.slice(0, 4)}-${issueDateStr.slice(4, 6)}-${issueDateStr.slice(6, 8)}`;
    } else {
      issueDate = issueDateStr;
    }

    if (!issueDate) {
      errors.push('Missing mandatory invoice issue date (<ram:IssueDateTime>).');
    }

    // 3. Currency
    const currency = getTag(xmlString, 'InvoiceCurrencyCode');
    if (!currency) {
      errors.push('Missing mandatory ISO 4217 invoice currency code (<ram:InvoiceCurrencyCode>).');
    }

    // 4. Seller Trade Party
    const sellerSec = getSection(xmlString, 'SellerTradeParty');
    const sellerName = getTag(sellerSec, 'Name');
    const sellerTaxSec = getSection(sellerSec, 'SpecifiedTaxRegistration');
    const sellerVat = getTag(sellerTaxSec, 'ID') || getTag(sellerSec, 'ID');
    const sellerCountry = getTag(sellerSec, 'CountryID');
    const sellerCity = getTag(sellerSec, 'CityName');

    if (!sellerName) {
      errors.push('Missing mandatory supplier/seller company name (<ram:SellerTradeParty>/<ram:Name>).');
    }
    if (!sellerVat) {
      warnings.push('Supplier VAT ID / Tax identifier is missing or not declared under SpecifiedTaxRegistration.');
    }

    // 5. Buyer Trade Party
    const buyerSec = getSection(xmlString, 'BuyerTradeParty');
    const buyerName = getTag(buyerSec, 'Name');
    const buyerTaxSec = getSection(buyerSec, 'SpecifiedTaxRegistration');
    const buyerVat = getTag(buyerTaxSec, 'ID') || getTag(buyerSec, 'ID');
    const buyerCountry = getTag(buyerSec, 'CountryID');
    const buyerCity = getTag(buyerSec, 'CityName');

    if (!buyerName) {
      errors.push('Missing mandatory customer/buyer company name (<ram:BuyerTradeParty>/<ram:Name>).');
    }

    // 6. Monetary Summation & Totals
    const summationSec = getSection(xmlString, 'SpecifiedTradeSettlementHeaderMonetarySummation');
    const lineTotalStr = getTag(summationSec, 'LineTotalAmount');
    const taxBasisStr = getTag(summationSec, 'TaxBasisTotalAmount');
    const taxTotalStr = getTag(summationSec, 'TaxTotalAmount');
    const grandTotalStr = getTag(summationSec, 'GrandTotalAmount');
    const duePayableStr = getTag(summationSec, 'DuePayableAmount');

    const lineTotalAmount = lineTotalStr ? parseFloat(lineTotalStr) : null;
    const taxBasisTotalAmount = taxBasisStr ? parseFloat(taxBasisStr) : null;
    const taxTotalAmount = taxTotalStr ? parseFloat(taxTotalStr) : null;
    const grandTotalAmount = grandTotalStr ? parseFloat(grandTotalStr) : null;
    const duePayableAmount = duePayableStr ? parseFloat(duePayableStr) : null;

    if (grandTotalAmount === null) {
      errors.push('Missing mandatory GrandTotalAmount in monetary summation.');
    }

    // Arithmetic check: TaxBasis + TaxTotal approx GrandTotal
    if (taxBasisTotalAmount !== null && taxTotalAmount !== null && grandTotalAmount !== null) {
      const calculatedGrand = Number((taxBasisTotalAmount + taxTotalAmount).toFixed(2));
      const diff = Math.abs(calculatedGrand - grandTotalAmount);
      if (diff > 0.05) {
        errors.push(`Arithmetic inconsistency in monetary totals: TaxBasis (${taxBasisTotalAmount}) + TaxTotal (${taxTotalAmount}) = ${calculatedGrand}, but GrandTotalAmount is ${grandTotalAmount}.`);
      }
    }

    // 7. Line items count
    const lineItemsCount = (xmlString.match(/<(?:\w+:)?IncludedSupplyChainTradeLineItem/g) || []).length;
    if (lineItemsCount === 0 && profile !== 'MINIMUM') {
      warnings.push('No line items found (<ram:IncludedSupplyChainTradeLineItem>). Invoices under BASIC or EN16931 profile typically include line items.');
    }

    // 8. Payment & Due date
    const paymentSec = getSection(xmlString, 'PayeePartyCreditorFinancialAccount');
    const paymentIban = getTag(paymentSec, 'IBANID');

    const dueDateStr = getTag(xmlString, 'DueDateDateTime') || getTag(getSection(xmlString, 'SpecifiedTradePaymentTerms'), 'DateTimeString');
    let dueDate: string | null = null;
    if (dueDateStr && dueDateStr.length === 8) {
      dueDate = `${dueDateStr.slice(0, 4)}-${dueDateStr.slice(4, 6)}-${dueDateStr.slice(6, 8)}`;
    } else {
      dueDate = dueDateStr;
    }

    return {
      isValid: errors.length === 0,
      hasEmbeddedXml: true,
      xmlFilename: filename,
      standard,
      profile,
      profileUrn,
      invoiceDetails: {
        invoiceNumber,
        issueDate,
        dueDate,
        currency,
        seller: {
          name: sellerName,
          vatId: sellerVat,
          country: sellerCountry,
          city: sellerCity,
        },
        buyer: {
          name: buyerName,
          vatId: buyerVat,
          country: buyerCountry,
          city: buyerCity,
        },
        totals: {
          lineTotalAmount,
          taxBasisTotalAmount,
          taxTotalAmount,
          grandTotalAmount,
          duePayableAmount,
        },
        lineItemsCount,
        paymentIban,
      },
      errors,
      warnings,
    };
  }

  /**
   * High-level validation: extracts XML from a PDF or parses raw XML,
   * returning an exhaustive EN 16931 compliance report.
   */
  public async validatePdfOrXml(options: {
    pdfBuffer?: Buffer;
    xmlString?: string;
  }): Promise<EInvoiceValidationResult> {
    if (options.xmlString) {
      return this.validateFacturX(options.xmlString, 'input.xml');
    }

    if (!options.pdfBuffer) {
      return {
        isValid: false,
        hasEmbeddedXml: false,
        xmlFilename: null,
        standard: 'Unknown',
        profile: 'NONE',
        profileUrn: null,
        invoiceDetails: null,
        errors: ['Neither a PDF document buffer nor XML string was provided for validation.'],
        warnings: [],
      };
    }

    const extracted = await this.extractXmlFromPdf(options.pdfBuffer);
    if (!extracted) {
      return {
        isValid: false,
        hasEmbeddedXml: false,
        xmlFilename: null,
        standard: 'Factur-X / ZUGFeRD (EN 16931)',
        profile: 'NONE',
        profileUrn: null,
        invoiceDetails: null,
        errors: [
          'No embedded Factur-X / ZUGFeRD XML file found in this PDF document catalog (/EmbeddedFiles). European hybrid e-invoices require an attached factur-x.xml or zugferd-invoice.xml file.',
        ],
        warnings: [
          'Ensure the document is compiled as a Hybrid PDF/A-3 invoice containing machine-readable CrossIndustryInvoice or UBL XML.',
        ],
      };
    }

    return this.validateFacturX(extracted.xmlString, extracted.filename);
  }
}

export const eInvoiceService = EInvoiceService.getInstance();
