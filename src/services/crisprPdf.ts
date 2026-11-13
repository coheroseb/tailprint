import crypto from 'node:crypto';
import zlib from 'node:zlib';
import { PDFDocument, PDFName } from 'pdf-lib';
import { browserService } from './browser.js';
import { smartPdfService, type TailprintManifest } from './smartPdf.js';
import { redisService } from './redis.js';
import type { TailprintNeuralCortex } from './neuralCortex.js';

export type CrisprPhenotype = 'executive-indigo' | 'legal-contract' | 'board-dossier';

export interface DocumentExon {
  exon_id: string;
  parent_index: number;
  parent_doc_id: string;
  parent_label: string;
  tag: string;
  section: string;
  content: string;
  is_table_row: boolean;
}

export interface DocumentGenome {
  genome_id: string;
  parent_index: number;
  label: string;
  doc_id: string;
  file_sha256: string;
  title: string;
  issuer: string;
  issued_at: string;
  page_count: number;
  has_neural_cortex: boolean;
  has_dual_brain: boolean;
  persona: string | null;
  exons: DocumentExon[];
  epigenome: Record<string, unknown>;
  proteome: Record<string, unknown>;
}

export interface GeneticConflictResolution {
  locus: string;
  layer: 'proteome' | 'epigenome';
  parent_a: { label: string; value: unknown };
  parent_b: { label: string; value: unknown };
  resolved_value: unknown;
  resolution_strategy: 'dominant_last_parent' | 'cas9_mutation_override';
}

export interface CrisprSplicingReport {
  offspring_doc_id: string;
  offspring_sha256: string;
  brain_url: string;
  verify_url: string;
  phenotype: CrisprPhenotype;
  parent_count: number;
  parents: Array<{
    parent_index: number;
    label: string;
    doc_id: string;
    title: string;
    exons_contributed: number;
    epigenome_keys_contributed: number;
    proteome_keys_contributed: number;
  }>;
  total_exons_spliced: number;
  duplicate_exons_excised: number;
  knockout_exons_excised: number;
  total_synapses_in_offspring: number;
  conflicts_resolved: GeneticConflictResolution[];
  mutations_applied: string[];
  spliced_proteome: Record<string, unknown>;
  spliced_epigenome: Record<string, unknown>;
}

export interface CrisprSpliceInputItem {
  pdfBuffer?: Buffer;
  docId?: string;
  label?: string;
}

export interface CrisprSpliceOptions {
  inputs: CrisprSpliceInputItem[];
  title?: string;
  subtitle?: string;
  phenotype?: CrisprPhenotype;
  /**
   * Dominant trait overrides ("CRISPR Point Mutations") applied across both the visual exons,
   * structured Dual-Brain proteome, and subconscious latent epigenome.
   */
  mutations?: Record<string, unknown>;
  /**
   * "CRISPR-Cas9 Knockouts" — section names or keywords to excise from parent genomes before synthesis.
   */
  knockout_terms?: string[];
  neural_persona?: string;
  neural_custom_url?: string;
  neural_badge_label?: string;
  verify_custom_url?: string;
  customer_id?: string;
  no_store?: boolean;
}

function escapeHtml(raw: string): string {
  return String(raw)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export class CrisprPdfService {
  /**
   * Fallback text extractor for plain third-party PDFs that do not yet have an embedded
   * Tailprint Neural Cortex or Dual-Brain manifest.
   */
  private extractFallbackTextLinesFromPdf(pdfDoc: PDFDocument, rawBuffer: Buffer): string[] {
    const lines: string[] = [];
    const seen = new Set<string>();

    const pushLine = (txt: string) => {
      const cleaned = txt
        .replace(/\\([()\\])/g, '$1')
        .replace(/[^\x20-\x7E\u00A0-\u00FF€]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      if (cleaned.length >= 4 && cleaned.length <= 400 && !seen.has(cleaned.toLowerCase())) {
        seen.add(cleaned.toLowerCase());
        lines.push(cleaned);
      }
    };

    try {
      for (const page of pdfDoc.getPages()) {
        const contents = page.node.Contents();
        if (!contents) continue;

        const streams: any[] = [];
        if (typeof (contents as any).size === 'function') {
          for (let i = 0; i < (contents as any).size(); i++) {
            streams.push((contents as any).lookup(i));
          }
        } else {
          streams.push(contents);
        }

        for (const s of streams) {
          if (!s || !s.contents) continue;
          let decoded = '';
          try {
            decoded = zlib.inflateSync(Buffer.from(s.contents)).toString('latin1');
          } catch {
            decoded = Buffer.from(s.contents).toString('latin1');
          }

          const matches = decoded.matchAll(/\(([^()]{3,250})\)\s*Tj/g);
          for (const m of matches) {
            pushLine(m[1]);
          }
        }
      }
    } catch {
      // Fallback to raw buffer scan
    }

    if (lines.length === 0) {
      const rawStr = rawBuffer.toString('latin1');
      const matches = rawStr.matchAll(/\(([^()]{4,200})\)\s*Tj/g);
      for (const m of matches) {
        pushLine(m[1]);
        if (lines.length >= 40) break;
      }
    }

    return lines.slice(0, 50);
  }

  /**
   * Sequences a single parent PDF (from Buffer or `docId`) into a structured `DocumentGenome`
   * containing its identity locus, visual exons, latent epigenome, and Dual-Brain proteome.
   */
  public async sequenceGenome(
    input: CrisprSpliceInputItem,
    parentIndex: number
  ): Promise<DocumentGenome> {
    let manifest: TailprintManifest | null = null;
    let cortex: TailprintNeuralCortex | null = null;
    let fileSha256 = '';
    let pageCount = 1;
    let fallbackLines: string[] = [];

    if (input.pdfBuffer) {
      fileSha256 = crypto.createHash('sha256').update(input.pdfBuffer).digest('hex');
      const pdfDoc = await PDFDocument.load(input.pdfBuffer, { ignoreEncryption: true });
      pageCount = pdfDoc.getPageCount();
      manifest = smartPdfService.extractManifestFromPdfDoc(pdfDoc, input.pdfBuffer);
      cortex = smartPdfService.extractCortexFromPdfDoc(pdfDoc, input.pdfBuffer);

      if (!cortex && manifest?.doc_id) {
        cortex = await redisService.getPdfCortex<TailprintNeuralCortex>(manifest.doc_id);
      }
      if (!cortex) {
        fallbackLines = this.extractFallbackTextLinesFromPdf(pdfDoc, input.pdfBuffer);
      }
    } else if (input.docId) {
      const proof = await redisService.getPdfProof(input.docId);
      cortex = await redisService.getPdfCortex<TailprintNeuralCortex>(input.docId);
      if (!proof && !cortex) {
        throw new Error(`Parent document "${input.docId}" was not found in the Tailprint ledger.`);
      }
      if (proof) {
        fileSha256 = proof.file_sha256;
        pageCount = proof.page_count;
        manifest = {
          '@context': 'https://tailprint.com/schema/dual-brain/v1',
          schema_version: '1.0',
          doc_id: proof.doc_id,
          issued_at: proof.issued_at,
          issuer: proof.customer_id,
          template_id: proof.template_id,
          ai_ready: proof.ai_ready,
          signed: proof.signed,
          page_count: proof.page_count,
          content_fingerprint: proof.content_fingerprint,
          data_hash: proof.data_hash,
          data: null,
          verification_url: proof.verification_url,
          signature: proof.signature,
        };
      }
    } else {
      throw new Error('Each CRISPR splice input must provide either a PDF file or a doc_id.');
    }

    const docId =
      cortex?.doc_id ||
      manifest?.doc_id ||
      `ext_${fileSha256.slice(0, 12) || crypto.randomBytes(4).toString('hex')}`;
    const label = input.label?.trim() || `Parent #${parentIndex + 1} (${docId})`;

    const exons: DocumentExon[] = [];
    const epigenome: Record<string, unknown> = {};
    const proteome: Record<string, unknown> =
      manifest?.data && typeof manifest.data === 'object' ? { ...manifest.data } : {};

    let detectedTitle = '';

    if (cortex && Array.isArray(cortex.synapses)) {
      for (const syn of cortex.synapses) {
        if (syn.layer === 'latent_memory') {
          const colonIdx = syn.content.indexOf(':');
          if (colonIdx !== -1) {
            const key = syn.content
              .slice(0, colonIdx)
              .trim()
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, '_')
              .replace(/^_|_$/g, '');
            const val = syn.content.slice(colonIdx + 1).trim();
            if (key) epigenome[key] = val;
          } else {
            epigenome[syn.id] = syn.content;
          }
        } else if (syn.layer === 'structured_data') {
          const colonIdx = syn.content.indexOf(':');
          if (colonIdx !== -1) {
            const key = syn.content
              .slice(0, colonIdx)
              .trim()
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, '_')
              .replace(/^_|_$/g, '');
            const val = syn.content.slice(colonIdx + 1).trim();
            if (key && !(key in proteome)) {
              proteome[key] = val;
            }
          }
        } else if (syn.layer === 'visual_dom') {
          if (!detectedTitle && (syn.tag === 'h1' || syn.tag === 'h2')) {
            detectedTitle = syn.content;
          }
          exons.push({
            exon_id: `chr${parentIndex + 1}_${syn.id}`,
            parent_index: parentIndex,
            parent_doc_id: docId,
            parent_label: label,
            tag: syn.tag || 'p',
            section: syn.section || label,
            content: syn.content,
            is_table_row: syn.tag === 'tr' || syn.content.includes(' | '),
          });
        }
      }
    }

    if (exons.length === 0 && fallbackLines.length > 0) {
      detectedTitle = fallbackLines[0];
      for (let i = 0; i < fallbackLines.length; i++) {
        exons.push({
          exon_id: `chr${parentIndex + 1}_ex_${i + 1}`,
          parent_index: parentIndex,
          parent_doc_id: docId,
          parent_label: label,
          tag: i === 0 ? 'h1' : 'p',
          section: detectedTitle.slice(0, 80) || label,
          content: fallbackLines[i],
          is_table_row: fallbackLines[i].includes('|'),
        });
      }
    }

    if (exons.length === 0 && Object.keys(proteome).length > 0) {
      for (const [k, v] of Object.entries(proteome)) {
        exons.push({
          exon_id: `chr${parentIndex + 1}_data_${k}`,
          parent_index: parentIndex,
          parent_doc_id: docId,
          parent_label: label,
          tag: 'p',
          section: label,
          content: `${k.replace(/_/g, ' ')}: ${typeof v === 'object' ? JSON.stringify(v) : String(v)}`,
          is_table_row: false,
        });
      }
    }

    const finalTitle =
      detectedTitle ||
      (typeof proteome.title === 'string' ? proteome.title : '') ||
      (typeof proteome.document_title === 'string' ? proteome.document_title : '') ||
      label;

    return {
      genome_id: `gnm_${crypto.randomBytes(5).toString('hex')}`,
      parent_index: parentIndex,
      label,
      doc_id: docId,
      file_sha256: fileSha256 || crypto.createHash('sha256').update(docId).digest('hex'),
      title: finalTitle,
      issuer: manifest?.issuer || 'tailprint.com',
      issued_at: manifest?.issued_at || cortex?.created_at || new Date().toISOString(),
      page_count: pageCount,
      has_neural_cortex: Boolean(cortex),
      has_dual_brain: Boolean(manifest),
      persona: cortex?.persona || null,
      exons,
      epigenome,
      proteome,
    };
  }

  /**
   * Applies point-mutation string replacements inside exon text when a mutation key matches
   * a known token or placeholder.
   */
  private applyMutationsToText(text: string, mutations?: Record<string, unknown>): string {
    if (!mutations || Object.keys(mutations).length === 0) return text;
    let updated = text;
    for (const [key, val] of Object.entries(mutations)) {
      if (val === undefined || val === null) continue;
      const strVal = typeof val === 'object' ? JSON.stringify(val) : String(val);
      const placeholderRegex = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'gi');
      updated = updated.replace(placeholderRegex, strVal);
    }
    return updated;
  }

  /**
   * Synthesizes a cohesive Tailwind CSS Master HTML Document from the spliced chromosomes,
   * resolved proteome, and resolved epigenome.
   */
  private renderOffspringMasterHtml(params: {
    title: string;
    subtitle: string;
    phenotype: CrisprPhenotype;
    genomes: DocumentGenome[];
    splicedExons: DocumentExon[];
    splicedProteome: Record<string, unknown>;
    splicedEpigenome: Record<string, unknown>;
    conflictsResolved: GeneticConflictResolution[];
    mutationsApplied: string[];
  }): string {
    const {
      title,
      subtitle,
      phenotype,
      genomes,
      splicedExons,
      splicedProteome,
      conflictsResolved,
    } = params;

    const theme =
      phenotype === 'legal-contract'
        ? {
            accentBg: 'bg-slate-900',
            accentText: 'text-slate-900',
            badgeBg: 'bg-slate-100 text-slate-800 border-slate-300',
            borderAccent: 'border-slate-800',
            tableHead: 'bg-slate-900 text-white',
          }
        : phenotype === 'board-dossier'
          ? {
              accentBg: 'bg-emerald-900',
              accentText: 'text-emerald-900',
              badgeBg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
              borderAccent: 'border-emerald-700',
              tableHead: 'bg-emerald-900 text-white',
            }
          : {
              accentBg: 'bg-indigo-950',
              accentText: 'text-indigo-700',
              badgeBg: 'bg-indigo-50 text-indigo-800 border-indigo-200',
              borderAccent: 'border-indigo-600',
              tableAccent: 'bg-indigo-950 text-white',
              tableHead: 'bg-indigo-950 text-white',
            };

    // Group exons by parent chromosome & section for a clean, structured master document
    const groupedBySection = new Map<
      string,
      { parentLabel: string; parentDocId: string; items: DocumentExon[] }
    >();

    for (const exon of splicedExons) {
      const groupKey = `${exon.parent_label} — ${exon.section}`;
      if (!groupedBySection.has(groupKey)) {
        groupedBySection.set(groupKey, {
          parentLabel: exon.parent_label,
          parentDocId: exon.parent_doc_id,
          items: [],
        });
      }
      groupedBySection.get(groupKey)!.items.push(exon);
    }

    const parentLineagePills = genomes
      .map(
        (g, idx) => `
        <div class="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
          <div>
            <span class="font-mono font-bold text-indigo-600">CHR-${idx + 1}</span>
            <span class="font-bold text-slate-900 ml-1.5">${escapeHtml(g.title)}</span>
            <p class="text-[10px] font-mono text-slate-500 mt-0.5">ID: ${escapeHtml(g.doc_id)} • SHA-256: ${escapeHtml(g.file_sha256.slice(0, 12))}…</p>
          </div>
          <span class="px-2 py-0.5 rounded bg-white border border-slate-200 font-mono text-[10px] text-slate-600">
            ${g.exons.length} exons • ${Object.keys(g.epigenome).length} latent genes
          </span>
        </div>`
      )
      .join('');

    const proteomeEntries = Object.entries(splicedProteome).filter(
      ([k]) => !k.startsWith('_')
    );

    const proteomeGridHtml =
      proteomeEntries.length > 0
        ? `
      <div class="mt-6">
        <h2 class="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2.5">Harmonized Master Data Proteome (Unified Across Parents)</h2>
        <div class="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          ${proteomeEntries
            .slice(0, 12)
            .map(
              ([k, v]) => `
            <div class="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
              <div class="text-[10px] font-mono uppercase text-slate-400">${escapeHtml(k.replace(/_/g, ' '))}</div>
              <div class="text-xs font-bold text-slate-900 mt-0.5 truncate">${escapeHtml(typeof v === 'object' ? JSON.stringify(v) : String(v))}</div>
            </div>`
            )
            .join('')}
        </div>
      </div>`
        : '';

    const sectionsHtml = Array.from(groupedBySection.entries())
      .map(([ _, group]) => {
        const tableRows = group.items.filter((i) => i.is_table_row);
        const proseItems = group.items.filter((i) => !i.is_table_row);

        const proseHtml = proseItems
          .map((item) => {
            if (item.tag === 'h1' || item.tag === 'h2' || item.tag === 'h3') {
              return `<h3 class="text-sm font-bold text-slate-900 mt-3 mb-1">${escapeHtml(item.content)}</h3>`;
            }
            return `<p class="text-xs text-slate-700 leading-relaxed mb-1.5" data-synapse="Inherited from ${escapeHtml(group.parentLabel)} (${escapeHtml(group.parentDocId)})">${escapeHtml(item.content)}</p>`;
          })
          .join('');

        const tableHtml =
          tableRows.length > 0
            ? `
          <table class="w-full text-left border-collapse border border-slate-200 mt-3 text-xs">
            <thead class="${theme.tableHead} text-[10px] uppercase font-mono">
              <tr>
                <th class="p-2 border border-slate-300">Spliced Schedule / Line Item</th>
                <th class="p-2 border border-slate-300 text-right w-36">Origin Chromosome</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-200">
              ${tableRows
                .map(
                  (r) => `
                <tr class="bg-white">
                  <td class="p-2 font-medium text-slate-800">${escapeHtml(r.content)}</td>
                  <td class="p-2 text-right font-mono text-[10px] text-slate-500">${escapeHtml(r.parent_doc_id)}</td>
                </tr>`
                )
                .join('')}
            </tbody>
          </table>`
            : '';

        return `
        <div class="mt-6 p-5 rounded-xl bg-white border border-slate-200 shadow-sm avoid-break">
          <div class="flex items-center justify-between border-b border-slate-100 pb-2 mb-2.5">
            <span class="text-xs font-bold ${theme.accentText} uppercase tracking-wider">${escapeHtml(group.parentLabel)}</span>
            <span class="text-[10px] font-mono text-slate-400">Source: ${escapeHtml(group.parentDocId)}</span>
          </div>
          ${proseHtml}
          ${tableHtml}
        </div>`;
      })
      .join('');

    const conflictsHtml =
      conflictsResolved.length > 0
        ? `
      <div class="mt-6 p-4 rounded-xl bg-amber-50/70 border border-amber-200 avoid-break">
        <div class="text-xs font-bold text-amber-900 mb-1.5">🧬 CRISPR Genetic Conflict Resolution Log (${conflictsResolved.length} Alleles Harmonized)</div>
        <div class="space-y-1 text-[11px] font-mono text-amber-800">
          ${conflictsResolved
            .map(
              (c) =>
                `<div>• <strong>${escapeHtml(c.locus)}</strong> (${c.layer}): ${escapeHtml(String(c.parent_a.value))} → <strong class="text-emerald-800">${escapeHtml(String(c.resolved_value))}</strong> [${c.resolution_strategy}]</div>`
            )
            .join('')}
        </div>
      </div>`
        : '';

    return `
      <div class="max-w-4xl mx-auto p-10 bg-white text-slate-900 font-sans">
        <!-- Master Header with Built-In 1-Line Neural Button -->
        <div class="border-b-2 ${theme.borderAccent} pb-6 flex justify-between items-start gap-4">
          <div>
            <div class="inline-flex items-center space-x-2 px-2.5 py-1 rounded-full ${theme.badgeBg} border text-[10px] font-mono font-bold mb-2">
              <span>🧬 CRISPR-SPLICED MASTER DOCUMENT • ${genomes.length} PARENT GENOMES FUSED</span>
            </div>
            <h1 class="text-2xl font-black text-slate-900 tracking-tight">${escapeHtml(title)}</h1>
            <p class="text-xs text-slate-500 mt-1">${escapeHtml(subtitle)}</p>
          </div>
          <div class="text-right shrink-0 space-y-2">
            <div data-neural-button></div>
            <p class="text-[10px] font-mono text-slate-400">Issued: ${new Date().toISOString().split('T')[0]}</p>
          </div>
        </div>

        <!-- Genetic Lineage Provenance -->
        <div class="mt-6">
          <h2 class="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2.5">Parent Document Lineage (Cryptographic Provenance)</h2>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            ${parentLineagePills}
          </div>
        </div>

        ${proteomeGridHtml}
        ${conflictsHtml}

        <!-- Spliced Chromosomes & Exons -->
        <div class="mt-6">
          <h2 class="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Spliced Clauses, Schedules &amp; Semantic Exons</h2>
          ${sectionsHtml}
        </div>

        <!-- Footer Cryptographic Seal -->
        <div class="mt-8 pt-4 border-t border-slate-200 flex items-center justify-between text-[10px] text-slate-500 font-mono avoid-break">
          <span>Synthesized by Tailprint CRISPR-PDF™ Engine</span>
          <div data-verify-button></div>
        </div>
      </div>
    `;
  }

  /**
   * Splices 2 to 10 parent PDFs into a brand-new, unified Vector Offspring PDF with a fused
   * Multi-Parent Neural Cortex, conflict-resolved Dual-Brain JSON proteome, and Cryptographic Proof-of-Origin.
   */
  public async splicePdfs(
    options: CrisprSpliceOptions
  ): Promise<{ pdfBuffer: Buffer; report: CrisprSplicingReport }> {
    if (!options.inputs || options.inputs.length < 2) {
      throw new Error('CRISPR-PDF splicing requires at least 2 parent PDF documents.');
    }

    // 1. Sequence all parent genomes
    const genomes: DocumentGenome[] = [];
    for (let i = 0; i < options.inputs.length; i++) {
      const g = await this.sequenceGenome(options.inputs[i], i);
      genomes.push(g);
    }

    const phenotype: CrisprPhenotype = options.phenotype || 'executive-indigo';
    const knockoutTerms = (options.knockout_terms || [])
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);

    // 2. Splice Exons (with Cas9 Knockout filtering & deduplication)
    const splicedExons: DocumentExon[] = [];
    const seenExonFingerprints = new Set<string>();
    let duplicateExonsExcised = 0;
    let knockoutExonsExcised = 0;

    for (const g of genomes) {
      for (const exon of g.exons) {
        const lowerContent = exon.content.toLowerCase();
        const lowerSection = exon.section.toLowerCase();

        // Check Cas9 knockout terms
        if (
          knockoutTerms.length > 0 &&
          knockoutTerms.some((term) => lowerContent.includes(term) || lowerSection.includes(term))
        ) {
          knockoutExonsExcised++;
          continue;
        }

        const normFingerprint = lowerContent.replace(/[^a-z0-9]+/g, '');
        if (normFingerprint.length > 8 && seenExonFingerprints.has(normFingerprint)) {
          duplicateExonsExcised++;
          continue;
        }
        seenExonFingerprints.add(normFingerprint);

        splicedExons.push({
          ...exon,
          content: this.applyMutationsToText(exon.content, options.mutations),
        });
      }
    }

    // 3. Splice & Conflict-Resolve Proteome (Structured Data) & Epigenome (Subconscious Latent Memory)
    const splicedProteome: Record<string, unknown> = {};
    const splicedEpigenome: Record<string, unknown> = {};
    const conflictsResolved: GeneticConflictResolution[] = [];

    for (const g of genomes) {
      for (const [k, v] of Object.entries(g.proteome)) {
        if (k in splicedProteome && JSON.stringify(splicedProteome[k]) !== JSON.stringify(v)) {
          conflictsResolved.push({
            locus: k,
            layer: 'proteome',
            parent_a: { label: 'Previous Parent', value: splicedProteome[k] },
            parent_b: { label: g.label, value: v },
            resolved_value: v,
            resolution_strategy: 'dominant_last_parent',
          });
        }
        splicedProteome[k] = v;
      }

      for (const [k, v] of Object.entries(g.epigenome)) {
        if (k in splicedEpigenome && JSON.stringify(splicedEpigenome[k]) !== JSON.stringify(v)) {
          conflictsResolved.push({
            locus: k,
            layer: 'epigenome',
            parent_a: { label: 'Previous Parent', value: splicedEpigenome[k] },
            parent_b: { label: g.label, value: v },
            resolved_value: v,
            resolution_strategy: 'dominant_last_parent',
          });
        }
        splicedEpigenome[k] = v;
      }
    }

    // 4. Apply Dominant Point Mutations (`options.mutations`)
    const mutationsApplied: string[] = [];
    if (options.mutations && typeof options.mutations === 'object') {
      for (const [k, v] of Object.entries(options.mutations)) {
        if (v === undefined) continue;
        mutationsApplied.push(k);
        if (k in splicedProteome && splicedProteome[k] !== v) {
          conflictsResolved.push({
            locus: k,
            layer: 'proteome',
            parent_a: { label: 'Inherited Allele', value: splicedProteome[k] },
            parent_b: { label: 'CRISPR Point Mutation', value: v },
            resolved_value: v,
            resolution_strategy: 'cas9_mutation_override',
          });
        }
        splicedProteome[k] = v;
        splicedEpigenome[k] = v;
      }
    }

    // Record genetic lineage inside both proteome and epigenome so `/v1/pdf/ask` knows its exact ancestry
    const lineageSummary = genomes
      .map((g, idx) => `Chr${idx + 1}: ${g.title} (${g.doc_id})`)
      .join(' + ');
    splicedEpigenome.genetic_lineage_ancestry = `CRISPR-spliced from ${genomes.length} parent documents: ${lineageSummary}`;
    splicedProteome._genetic_lineage = genomes.map((g) => ({
      doc_id: g.doc_id,
      title: g.title,
      sha256: g.file_sha256,
    }));

    const masterTitle =
      options.title?.trim() ||
      `Composite Master Agreement & Dossier (${genomes.map((g) => g.title.slice(0, 28)).join(' + ')})`;
    const masterSubtitle =
      options.subtitle?.trim() ||
      `Genetically spliced from ${genomes.length} verified documents with harmonized data proteome and fused 64-D Neural Cortex`;

    const masterHtml = this.renderOffspringMasterHtml({
      title: masterTitle,
      subtitle: masterSubtitle,
      phenotype,
      genomes,
      splicedExons,
      splicedProteome,
      splicedEpigenome,
      conflictsResolved,
      mutationsApplied,
    });

    // 5. Render Vector Master PDF via Chromium and Enrich with Fused Neural-Implant Cortex
    const rawPdfBuffer = await browserService.renderPdf({
      html: masterHtml,
      format: 'A4',
      landscape: false,
      smart_pagination: true,
      print_background: true,
      neural_implant: true,
    } as any);

    const domSynapses = browserService.getExtractedDomSynapses(rawPdfBuffer);
    const customButtons = browserService.getCustomButtonPlacement(rawPdfBuffer);

    const fusedPersona =
      options.neural_persona?.trim() ||
      genomes
        .map((g) => g.persona)
        .filter(Boolean)
        .join(' & ') ||
      `CRISPR-Spliced Master Document Intelligence (${genomes.length} Parent Genomes)`;

    const enriched = await smartPdfService.enrichPdf(rawPdfBuffer, {
      customerId: options.customer_id || 'crispr-splicer',
      templateId: 'crispr-master-offspring',
      data: splicedProteome,
      aiReady: true,
      sign: true,
      verifySeal: true,
      verifyCustomUrl: options.verify_custom_url,
      neuralImplant: true,
      neuralPersona: fusedPersona,
      neuralContext: splicedEpigenome,
      neuralCustomUrl: options.neural_custom_url,
      neuralBadgeLabel: options.neural_badge_label,
      hasCustomNeuralButton: customButtons?.hasCustomNeuralButton,
      hasCustomVerifyButton: customButtons?.hasCustomVerifyButton,
      domSynapses,
      noStore: Boolean(options.no_store),
    });

    const report: CrisprSplicingReport = {
      offspring_doc_id: enriched.docId,
      offspring_sha256: enriched.fileSha256,
      brain_url: enriched.cortex?.brain_url || `/brain/${enriched.docId}`,
      verify_url: enriched.manifest.verification_url,
      phenotype,
      parent_count: genomes.length,
      parents: genomes.map((g) => ({
        parent_index: g.parent_index,
        label: g.label,
        doc_id: g.doc_id,
        title: g.title,
        exons_contributed: g.exons.length,
        epigenome_keys_contributed: Object.keys(g.epigenome).length,
        proteome_keys_contributed: Object.keys(g.proteome).length,
      })),
      total_exons_spliced: splicedExons.length,
      duplicate_exons_excised: duplicateExonsExcised,
      knockout_exons_excised: knockoutExonsExcised,
      total_synapses_in_offspring: enriched.cortex?.total_synapses || 0,
      conflicts_resolved: conflictsResolved,
      mutations_applied: mutationsApplied,
      spliced_proteome: splicedProteome,
      spliced_epigenome: splicedEpigenome,
    };

    return {
      pdfBuffer: enriched.buffer,
      report,
    };
  }
}

export const crisprPdfService = new CrisprPdfService();
