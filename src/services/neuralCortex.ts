import crypto from 'node:crypto';
import type { ExtractedDomSynapse } from './browser.js';

export const NEURAL_CORTEX_CONTEXT = 'https://tailprint.com/schema/neural-cortex/v1';
export const CORTEX_FILENAME = 'tailprint-cortex.json';

export interface SpatialBoundingBox {
  page: number;
  x_pct: number;
  y_pct: number;
  w_pct: number;
  h_pct: number;
  x_pt: number;
  y_pt: number;
  w_pt: number;
  h_pt: number;
}

export type SynapseLayer = 'visual_dom' | 'latent_memory' | 'structured_data';

export interface NeuralSynapse {
  id: string;
  layer: SynapseLayer;
  tag: string;
  section: string;
  content: string;
  bbox: SpatialBoundingBox | null;
  entities: string[];
  concepts: string[];
  tokens: string[];
  vector_int8: number[]; // 64-dimensional signed Int8 hyperdimensional vector [-127..127]
}

export interface KnowledgeTriple {
  subject: string;
  predicate: string;
  object: string;
  source_synapse_id: string;
  layer: SynapseLayer;
}

export interface TailprintNeuralCortex {
  '@context': typeof NEURAL_CORTEX_CONTEXT;
  engine: 'Tailprint Neuro-Symbolic Spatial Cortex v1 (Int8-HDC + DOM-Tensor)';
  doc_id: string;
  created_at: string;
  persona: string;
  total_synapses: number;
  visual_synapses_count: number;
  latent_synapses_count: number;
  data_synapses_count: number;
  suggested_questions: string[];
  knowledge_graph: KnowledgeTriple[];
  synapses: NeuralSynapse[];
  cortex_hash: string;
  brain_url: string;
}

export interface NeuralCitation {
  synapse_id: string;
  layer: SynapseLayer;
  section: string;
  content: string;
  score: number;
  bbox: SpatialBoundingBox | null;
}

export interface NeuralAskResponse {
  doc_id: string | null;
  question: string;
  answer: string;
  persona: string;
  confidence: number;
  primary_source_layer: SynapseLayer | 'none';
  execution_time_ms: number;
  cryptographically_verified: boolean;
  cortex_hash: string | null;
  brain_url: string | null;
  citations: NeuralCitation[];
  matched_facts: KnowledgeTriple[];
  suggested_followups: string[];
}

const STOP_WORDS = new Set([
  'the', 'and', 'for', 'with', 'that', 'this', 'from', 'what', 'when', 'where',
  'how', 'who', 'which', 'are', 'was', 'were', 'will', 'can', 'does', 'have',
  'has', 'had', 'our', 'your', 'their', 'about', 'into', 'over', 'under',
  'hvad', 'hvornår', 'hvor', 'hvordan', 'hvem', 'hvilke', 'hvilken', 'er',
  'var', 'vil', 'kan', 'skal', 'har', 'vores', 'jeres', 'deres', 'om', 'ved',
  'eller', 'men', 'som', 'til', 'fra', 'på', 'af', 'med', 'for', 'en', 'et',
  'den', 'det', 'de', 'vi', 'du', 'i', 'og', 'at', 'get', 'if', 'hvis', 'jeg',
]);

/**
 * Cross-lingual semantic concept clusters (English, Danish, German)
 * Maps domain vocabulary into unified hyperdimensional concept anchors.
 */
const CONCEPT_CLUSTERS: Record<string, string[]> = {
  '@CONCEPT_DISCOUNT': [
    'discount', 'discounts', 'rebate', 'rabat', 'kontantrabat', 'årsrabat',
    'prisnedslag', 'early', 'hurtig', 'annual', 'årlig', 'årsbetaling', 'promo',
  ],
  '@CONCEPT_PRICE_TOTAL': [
    'total', 'subtotal', 'amount', 'price', 'cost', 'sum', 'grand', 'payable',
    'pris', 'beløb', 'ialt', 'betale', 'kostpris', 'fakturatotal', 'netto', 'brutto',
    'eur', 'usd', 'dkk', 'gbp', 'kr',
  ],
  '@CONCEPT_TAX_VAT': [
    'vat', 'tax', 'taxes', 'moms', 'afgift', 'steuer', 'mwst', 'salgsmoms',
  ],
  '@CONCEPT_PAYMENT_DUE': [
    'due', 'payment', 'pay', 'deadline', 'terms', 'net', 'betaling', 'betalingsfrist',
    'forfald', 'forfaldsdato', 'forfalder', 'betales', 'betalingsbetingelser', 'frist',
  ],
  '@CONCEPT_BANK_IBAN': [
    'iban', 'bic', 'swift', 'bank', 'wire', 'account', 'konto', 'kontonummer',
    'reg', 'overførsel', 'routing',
  ],
  '@CONCEPT_SECURITY_GDPR': [
    'gdpr', 'privacy', 'security', 'data', 'hosting', 'hosted', 'server', 'servers',
    'cloud', 'iso', 'soc2', 'encryption', 'dpa', 'databehandler', 'databehandleraftale',
    'sikkerhed', 'servere', 'hostes', 'hoster', 'eu', 'frankfurt', 'opbevaring',
  ],
  '@CONCEPT_SLA_UPTIME': [
    'sla', 'uptime', 'availability', 'guarantee', 'support', 'response',
    'oppetid', 'oppetidsgaranti', 'tilgængelighed', 'garanti', 'kompensation', 'nedetid',
  ],
  '@CONCEPT_TERMINATION': [
    'termination', 'terminate', 'cancel', 'cancellation', 'notice', 'renewal', 'renew',
    'opsigelse', 'opsiges', 'opsigelsesvarsel', 'binding', 'bindingsperiode', 'ophør',
  ],
  '@CONCEPT_LIABILITY': [
    'liability', 'indemnity', 'cap', 'damages', 'breach', 'warranty',
    'ansvar', 'hæftelse', 'hæfter', 'erstatning', 'ansvarsbegrænsning', 'konkurs',
  ],
  '@CONCEPT_PARTIES': [
    'seller', 'buyer', 'client', 'customer', 'supplier', 'vendor', 'recipient', 'issuer',
    'sælger', 'køber', 'kunde', 'leverandør', 'modtager', 'udsteder', 'virksomhed', 'cvr',
  ],
  '@CONCEPT_DELIVERY': [
    'delivery', 'shipping', 'implementation', 'onboarding', 'timeline', 'schedule',
    'levering', 'implementering', 'tidsplan', 'opstart',
  ],
};

function fnv1aHash(str: string, seed = 2166136261): number {
  let h = seed >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

export function normalizeTokens(text: string): string[] {
  const lower = text
    .toLowerCase()
    .replace(/[^a-z0-9æøåäöüß@._%-]+/gi, ' ')
    .trim();
  if (!lower) return [];

  const rawWords = lower.split(/\s+/);
  const tokens: string[] = [];

  for (const w of rawWords) {
    if (w.length < 2 || STOP_WORDS.has(w)) continue;
    // Simple morphological stemmer for EN/DA plurals & suffixes
    const stem = w
      .replace(/(erne|eren|heden|elser|else|ninger|ning|tioner|tions|tion|ing|ed|es|er|en|et|s)$/i, '')
      .trim();
    tokens.push(stem.length >= 3 ? stem : w);
  }
  return Array.from(new Set(tokens));
}

export function extractConcepts(text: string, tokens: string[]): string[] {
  const lower = text.toLowerCase();
  const matched = new Set<string>();

  for (const [concept, keywords] of Object.entries(CONCEPT_CLUSTERS)) {
    for (const kw of keywords) {
      if (
        tokens.includes(kw) ||
        lower.includes(kw) ||
        tokens.some((t) => (t.length >= 4 && kw.startsWith(t)) || (kw.length >= 4 && t.startsWith(kw)))
      ) {
        matched.add(concept);
        break;
      }
    }
  }
  return Array.from(matched);
}

export function extractEntities(text: string): string[] {
  const entities = new Set<string>();
  // Currency / Numbers / Percentages
  const numMatches = text.match(
    /(?:(?:\$|€|£|EUR|USD|DKK|GBP|SEK|NOK)\s*\d[\d.,]*|\d[\d.,]*\s*(?:%|EUR|USD|DKK|GBP|kr\.?|days|dage|months|måneder|år|years))/gi
  );
  if (numMatches) {
    for (const m of numMatches) entities.add(m.trim());
  }
  // ISO Dates
  const dateMatches = text.match(/\b\d{4}-\d{2}-\d{2}\b/g);
  if (dateMatches) {
    for (const d of dateMatches) entities.add(d);
  }
  // Document / Invoice IDs
  const idMatches = text.match(/\b[A-Z]{2,5}-\d{2,6}(?:-\d{1,6})?\b/g);
  if (idMatches) {
    for (const id of idMatches) entities.add(id);
  }
  return Array.from(entities).slice(0, 12);
}

/**
 * Computes a deterministic 64-dimensional signed Int8 Hyperdimensional Semantic Vector [-127..127]
 * combining concept anchors, morphological stems, and character 3-grams.
 */
export function computeInt8Vector(text: string, tokens: string[], concepts: string[]): number[] {
  const dims = 64;
  const accum = new Float64Array(dims);

  const projectFeature = (feature: string, weight: number) => {
    for (let p = 0; p < 4; p++) {
      const h = fnv1aHash(`${feature}#${p}`);
      const idx = h % dims;
      const sign = (h & 0x100) !== 0 ? 1 : -1;
      accum[idx] += sign * weight;
    }
  };

  // 1. High-weight semantic concept anchors
  for (const c of concepts) {
    projectFeature(c, 3.5);
  }

  // 2. Word stem projections
  for (const t of tokens) {
    projectFeature(`w:${t}`, 2.0);
    // Character 3-grams for compound word & typo resilience
    if (t.length >= 4) {
      for (let i = 0; i <= t.length - 3; i++) {
        projectFeature(`g:${t.slice(i, i + 3)}`, 0.6);
      }
    }
  }

  // 3. L2 normalization and Int8 quantization [-127..127]
  let normSq = 0;
  for (let i = 0; i < dims; i++) {
    normSq += accum[i] * accum[i];
  }
  const norm = Math.sqrt(normSq) || 1;

  const out: number[] = new Array(dims);
  for (let i = 0; i < dims; i++) {
    const scaled = Math.round((accum[i] / norm) * 127 * 2.2);
    out[i] = Math.max(-127, Math.min(127, scaled));
  }
  return out;
}

export function cosineSimilarityInt8(a: number[], b: number[]): number {
  const len = Math.min(a.length, b.length);
  if (len === 0) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < len; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  if (denom === 0) return 0;
  return Math.max(0, dot / denom);
}

function humanizeKey(key: string): string {
  return key
    .replace(/[._-]+/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

function flattenObjectToStatements(
  obj: Record<string, unknown>,
  prefix = ''
): Array<{ key: string; section: string; content: string; subject: string; predicate: string; object: string }> {
  const entries: Array<{
    key: string;
    section: string;
    content: string;
    subject: string;
    predicate: string;
    object: string;
  }> = [];

  for (const [k, v] of Object.entries(obj)) {
    if (v === null || v === undefined || v === '') continue;
    const pathKey = prefix ? `${prefix}.${k}` : k;
    const readableSection = humanizeKey(prefix || k);
    const readablePredicate = humanizeKey(k);

    if (Array.isArray(v)) {
      if (v.length === 0) continue;
      if (typeof v[0] === 'object' && v[0] !== null) {
        v.forEach((item, idx) => {
          const pairs = Object.entries(item as Record<string, unknown>)
            .filter(([, val]) => val !== null && val !== undefined)
            .map(([ik, iv]) => `${humanizeKey(ik)}: ${String(iv)}`)
            .join(' | ');
          if (pairs) {
            entries.push({
              key: `${pathKey}[${idx}]`,
              section: readableSection,
              content: `${readableSection} #${idx + 1} — ${pairs}`,
              subject: `${readableSection} #${idx + 1}`,
              predicate: 'details',
              object: pairs,
            });
          }
        });
      } else {
        const joined = v.map((item) => String(item)).join(', ');
        entries.push({
          key: pathKey,
          section: readableSection,
          content: `${readablePredicate}: ${joined}`,
          subject: readableSection,
          predicate: readablePredicate,
          object: joined,
        });
      }
    } else if (typeof v === 'object') {
      entries.push(...flattenObjectToStatements(v as Record<string, unknown>, pathKey));
    } else {
      const strVal = String(v);
      entries.push({
        key: pathKey,
        section: readableSection,
        content: `${readablePredicate}: ${strVal}`,
        subject: prefix ? humanizeKey(prefix) : 'Document',
        predicate: readablePredicate,
        object: strVal,
      });
    }
  }

  return entries;
}

export class NeuralCortexService {
  private static instance: NeuralCortexService | null = null;

  private constructor() {}

  public static getInstance(): NeuralCortexService {
    if (!NeuralCortexService.instance) {
      NeuralCortexService.instance = new NeuralCortexService();
    }
    return NeuralCortexService.instance;
  }

  /**
   * Compiles a complete Neuro-Symbolic Spatial Cortex from:
   * 1. Live Chromium DOM spatial synapses (with exact page + x,y,w,h coordinates),
   * 2. Sender's Subconscious Latent Memory (`neural_context` — knowledge not printed on the page),
   * 3. Structured Dual-Brain JSON (`data`).
   */
  public compileCortex(options: {
    docId: string;
    persona?: string;
    domSynapses?: ExtractedDomSynapse[];
    latentContext?: Record<string, unknown> | string | null;
    structuredData?: Record<string, unknown> | null;
    appBaseUrl?: string;
  }): TailprintNeuralCortex {
    const createdAt = new Date().toISOString();
    const persona =
      options.persona?.trim() ||
      'Tailprint Autonomous Document Cortex — answers strictly from verified visual DOM synapses and implanted latent memory.';
    const baseUrl = (options.appBaseUrl || 'https://tailprint.com').replace(/\/+$/, '');
    const brainUrl = `${baseUrl}/brain/${options.docId}`;

    const synapses: NeuralSynapse[] = [];
    const knowledgeGraph: KnowledgeTriple[] = [];

    const createSynapse = (
      id: string,
      layer: SynapseLayer,
      tag: string,
      section: string,
      content: string,
      bbox: SpatialBoundingBox | null
    ): NeuralSynapse => {
      const fullText = `${section} ${content}`;
      const tokens = normalizeTokens(fullText);
      const concepts = extractConcepts(fullText, tokens);
      const entities = extractEntities(content);
      const vectorInt8 = computeInt8Vector(fullText, tokens, concepts);

      return {
        id,
        layer,
        tag,
        section,
        content,
        bbox,
        entities,
        concepts,
        tokens,
        vector_int8: vectorInt8,
      };
    };

    // 1. Compile Subconscious Latent Memory (`neural_context`) — highest semantic priority for unwritten facts
    let latentCount = 0;
    if (options.latentContext) {
      if (typeof options.latentContext === 'string') {
        const chunks = options.latentContext
          .split(/\n{2,}|(?<=[.!?])\s+(?=[A-ZÆØÅ])/)
          .map((s) => s.trim())
          .filter((s) => s.length >= 5);

        chunks.forEach((chunk, idx) => {
          const synId = `syn_latent_${idx + 1}`;
          const syn = createSynapse(synId, 'latent_memory', 'latent:note', 'Latent Memory', chunk, null);
          synapses.push(syn);
          latentCount++;
          knowledgeGraph.push({
            subject: 'Latent Knowledge',
            predicate: `Fact #${idx + 1}`,
            object: chunk,
            source_synapse_id: synId,
            layer: 'latent_memory',
          });
        });
      } else if (typeof options.latentContext === 'object') {
        const flatLatent = flattenObjectToStatements(options.latentContext);
        flatLatent.forEach((item, idx) => {
          const synId = `syn_latent_${idx + 1}`;
          const syn = createSynapse(
            synId,
            'latent_memory',
            `latent:${item.key}`,
            `Latent Memory (${item.section})`,
            item.content,
            null
          );
          synapses.push(syn);
          latentCount++;
          knowledgeGraph.push({
            subject: item.subject,
            predicate: item.predicate,
            object: item.object,
            source_synapse_id: synId,
            layer: 'latent_memory',
          });
        });
      }
    }

    // 2. Compile Structured Dual-Brain JSON (`structuredData`)
    let dataCount = 0;
    if (options.structuredData && typeof options.structuredData === 'object') {
      const flatData = flattenObjectToStatements(options.structuredData);
      flatData.forEach((item, idx) => {
        const synId = `syn_data_${idx + 1}`;
        const syn = createSynapse(
          synId,
          'structured_data',
          `data:${item.key}`,
          item.section,
          item.content,
          null
        );
        synapses.push(syn);
        dataCount++;
        knowledgeGraph.push({
          subject: item.subject,
          predicate: item.predicate,
          object: item.object,
          source_synapse_id: synId,
          layer: 'structured_data',
        });
      });
    }

    // 3. Compile Visual DOM Synapses with exact physical PDF coordinates (page, x, y, w, h)
    let visualCount = 0;
    if (options.domSynapses && options.domSynapses.length > 0) {
      options.domSynapses.forEach((domSyn, idx) => {
        const synId = `syn_dom_${idx + 1}`;
        const syn = createSynapse(
          synId,
          'visual_dom',
          domSyn.tag,
          domSyn.section,
          domSyn.content,
          domSyn.bbox
        );
        synapses.push(syn);
        visualCount++;

        if (domSyn.content.includes(':')) {
          const [lhs, ...rhsParts] = domSyn.content.split(':');
          const rhs = rhsParts.join(':').trim();
          if (lhs && rhs && lhs.length < 50) {
            knowledgeGraph.push({
              subject: domSyn.section,
              predicate: lhs.trim(),
              object: rhs,
              source_synapse_id: synId,
              layer: 'visual_dom',
            });
          }
        }
      });
    }

    // 4. Generate intelligent starter questions tailored to this document's synapses
    const suggestedQuestions: string[] = [];
    if (
      options.latentContext &&
      typeof options.latentContext === 'object' &&
      Object.keys(options.latentContext).length > 0
    ) {
      for (const k of Object.keys(options.latentContext).slice(0, 2)) {
        suggestedQuestions.push(`What is the policy on ${humanizeKey(k).toLowerCase()}?`);
      }
    }
    if (synapses.some((s) => s.concepts.includes('@CONCEPT_PRICE_TOTAL'))) {
      suggestedQuestions.push('What is the total amount and currency of this document?');
    }
    if (synapses.some((s) => s.concepts.includes('@CONCEPT_PAYMENT_DUE'))) {
      suggestedQuestions.push('When is the payment due date or deadline?');
    }
    if (synapses.some((s) => s.concepts.includes('@CONCEPT_DISCOUNT'))) {
      suggestedQuestions.push('Are there any discounts or early payment terms?');
    }
    if (synapses.some((s) => s.concepts.includes('@CONCEPT_SECURITY_GDPR'))) {
      suggestedQuestions.push('How is GDPR compliance and data hosting handled?');
    }
    if (suggestedQuestions.length === 0) {
      suggestedQuestions.push('Summarize the key facts and obligations in this document.');
    }

    const hashPayload = JSON.stringify({
      doc_id: options.docId,
      persona,
      synapse_ids: synapses.map((s) => ({
        id: s.id,
        layer: s.layer,
        content: s.content,
        bbox: s.bbox,
      })),
    });
    const cortexHash = crypto.createHash('sha256').update(hashPayload).digest('hex');

    return {
      '@context': NEURAL_CORTEX_CONTEXT,
      engine: 'Tailprint Neuro-Symbolic Spatial Cortex v1 (Int8-HDC + DOM-Tensor)',
      doc_id: options.docId,
      created_at: createdAt,
      persona,
      total_synapses: synapses.length,
      visual_synapses_count: visualCount,
      latent_synapses_count: latentCount,
      data_synapses_count: dataCount,
      suggested_questions: suggestedQuestions.slice(0, 5),
      knowledge_graph: knowledgeGraph.slice(0, 80),
      synapses,
      cortex_hash: cortexHash,
      brain_url: brainUrl,
    };
  }

  /**
   * Executes a sub-millisecond Neuro-Symbolic query directly against a PDF's Neural Cortex.
   * Combines 64-D Int8 Hyperdimensional Cosine Similarity + Cross-Lingual Concept Anchors
   * + Morphological Token Overlap + Spatial Bounding-Box Grounding.
   */
  public askCortex(
    cortex: TailprintNeuralCortex,
    question: string,
    cryptographicallyVerified = true
  ): NeuralAskResponse {
    const startTime = performance.now();
    const cleanQuestion = question.trim();
    const qTokens = normalizeTokens(cleanQuestion);
    const qConcepts = extractConcepts(cleanQuestion, qTokens);
    const qVector = computeInt8Vector(cleanQuestion, qTokens, qConcepts);

    const scored = cortex.synapses.map((syn) => {
      // 1. 64-D Int8 Vector Cosine Similarity
      const vecSim = cosineSimilarityInt8(qVector, syn.vector_int8);

      // 2. Cross-lingual Concept Anchor overlap
      let conceptOverlap = 0;
      if (qConcepts.length > 0) {
        const matchedConcepts = qConcepts.filter((c) => syn.concepts.includes(c));
        conceptOverlap = matchedConcepts.length / qConcepts.length;
      }

      // 3. Direct & Prefix Morphological Token overlap
      let tokenHits = 0;
      if (qTokens.length > 0) {
        for (const qt of qTokens) {
          if (
            syn.tokens.includes(qt) ||
            syn.tokens.some(
              (st) => (st.length >= 4 && qt.startsWith(st)) || (qt.length >= 4 && st.startsWith(qt))
            )
          ) {
            tokenHits += 1;
          }
        }
      }
      const tokenOverlap = qTokens.length > 0 ? Math.min(1, tokenHits / Math.max(1, qTokens.length * 0.75)) : 0;

      // 4. Layer weighting: if a latent_memory synapse has strong token/concept overlap, boost it
      // because latent_memory holds the sender's explicit Q&A / domain knowledge
      const layerBoost =
        syn.layer === 'latent_memory' && (tokenHits > 0 || conceptOverlap > 0)
          ? 0.14
          : syn.layer === 'visual_dom' && syn.bbox
            ? 0.04
            : 0;

      const totalScore = Number(
        Math.min(0.99, vecSim * 0.35 + conceptOverlap * 0.35 + tokenOverlap * 0.3 + layerBoost).toFixed(3)
      );

      return { syn, score: totalScore, tokenHits, conceptOverlap };
    });

    scored.sort((a, b) => b.score - a.score);

    const topMatches = scored.filter((m) => m.score >= 0.18).slice(0, 5);
    const citations: NeuralCitation[] = (topMatches.length > 0 ? topMatches : scored.slice(0, 3)).map((m) => ({
      synapse_id: m.syn.id,
      layer: m.syn.layer,
      section: m.syn.section,
      content: m.syn.content,
      score: m.score,
      bbox: m.syn.bbox,
    }));

    const primaryLayer: SynapseLayer | 'none' =
      citations.length > 0 ? citations[0].layer : 'none';
    const confidence = citations.length > 0 ? Math.max(0.45, citations[0].score) : 0.2;

    // Synthesize grounded neuro-symbolic answer
    let answer = '';
    if (citations.length === 0) {
      answer = 'No matching synapses found in this document cortex.';
    } else {
      const top = citations[0];
      const supporting = citations.slice(1, 3).filter((c) => c.score >= 0.28);

      const sourceTag =
        top.layer === 'latent_memory'
          ? `[Implanted Latent Memory • ${top.section}]`
          : top.layer === 'visual_dom' && top.bbox
            ? `[Visual Page ${top.bbox.page} • ${top.section} @ (${top.bbox.x_pct}%, ${top.bbox.y_pct}%)]`
            : `[Structured Data • ${top.section}]`;

      const lines = [`${top.content} ${sourceTag}`];
      for (const sup of supporting) {
        if (sup.content !== top.content) {
          const supTag =
            sup.layer === 'latent_memory'
              ? `[Latent Memory]`
              : sup.layer === 'visual_dom' && sup.bbox
                ? `[Page ${sup.bbox.page}]`
                : `[Data]`;
          lines.push(`• ${sup.content} ${supTag}`);
        }
      }
      answer = lines.join('\n');
    }

    const matchedSynapseIds = new Set(citations.map((c) => c.synapse_id));
    const matchedFacts = cortex.knowledge_graph
      .filter((fact) => matchedSynapseIds.has(fact.source_synapse_id))
      .slice(0, 6);

    const elapsedMs = Number(Math.max(0.2, performance.now() - startTime).toFixed(2));

    return {
      doc_id: cortex.doc_id,
      question: cleanQuestion,
      answer,
      persona: cortex.persona,
      confidence,
      primary_source_layer: primaryLayer,
      execution_time_ms: elapsedMs,
      cryptographically_verified: cryptographicallyVerified,
      cortex_hash: cortex.cortex_hash,
      brain_url: cortex.brain_url,
      citations,
      matched_facts: matchedFacts,
      suggested_followups: cortex.suggested_questions.filter((q) => q !== cleanQuestion).slice(0, 3),
    };
  }
}

export const neuralCortexService = NeuralCortexService.getInstance();
