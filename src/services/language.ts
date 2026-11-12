export interface LanguageProfile {
  code: string;
  label: string;
  flag: string;
  defaultBrand: string;
  slide1Hook: string;
  problemTag: string;
  problemHeadlineFallback: string;
  solutionTag: string;
  solutionHeadlineFallback: string;
  insightTag: string;
  insightHeadlineFallback: string;
  actionTag: string;
  actionHeadlineFallback: string;
  defaultStat: string;
  defaultStatLabel: string;
  statLabels: string[];
  cta: string;
  fallbackProblemBody: string;
  fallbackInsightBody: string;
  fallbackActionBody: string;
  problemKeywords: string[];
  solutionKeywords: string[];
}

export const LANGUAGE_PROFILES: Record<string, LanguageProfile> = {
  da: {
    code: 'da',
    label: 'Dansk',
    flag: '🇩🇰',
    defaultBrand: 'Indsigter',
    slide1Hook: 'Her er hvad du skal vide på under 30 sekunder:',
    problemTag: 'UDFORDRINGEN',
    problemHeadlineFallback: 'Den skjulte flaskehals',
    solutionTag: 'LØSNINGEN',
    solutionHeadlineFallback: 'En smartere fremgangsmåde',
    insightTag: 'NØGLEINDSIGT',
    insightHeadlineFallback: 'Det afgørende vendepunkt',
    actionTag: 'SÅDAN VINDER DU',
    actionHeadlineFallback: 'Konkret anbefaling',
    defaultStat: '10x',
    defaultStatLabel: 'EFFEKT',
    statLabels: ['EFFEKT', 'VÆKST', 'RESULTAT', 'BESPARELSE', 'KVALITET', 'HASTIGHED'],
    cta: 'Følg for flere indsigter • Link i bio',
    fallbackProblemBody: 'Mange oplever spildtid og manuelle arbejdsgange, der sinker udviklingen og skaber unødig kompleksitet.',
    fallbackInsightBody: 'Virksomheder der samler processer og fjerner friktion opnår markant højere præcision og lavere omkostninger.',
    fallbackActionBody: 'Automatiser rutineopgaver og skab et sammenhængende workflow, så der frigøres tid til kerneopgaven.',
    problemKeywords: [
      'problem', 'udfordring', 'manuelt', 'tidskrævende', 'fejl', 'usikker', 'spredte',
      'svært', 'kompleks', 'risiko', 'kaos', 'bøvl', 'dyrt', 'tab', 'flaskehals', 'langsom'
    ],
    solutionKeywords: [
      'løsning', 'fordele', 'funktioner', 'automatiser', 'styr', 'saml', 'spar',
      'hurtig', 'nemt', 'enkelt', 'sikker', 'platform', 'hjælper', 'integrer', 'fagsystem'
    ],
  },
  en: {
    code: 'en',
    label: 'English',
    flag: '🇬🇧',
    defaultBrand: 'Insights',
    slide1Hook: 'Here is what you need to know in under 30 seconds:',
    problemTag: 'THE CHALLENGE',
    problemHeadlineFallback: 'The Hidden Bottleneck',
    solutionTag: 'THE SOLUTION',
    solutionHeadlineFallback: 'A Smarter Approach',
    insightTag: 'KEY INSIGHT',
    insightHeadlineFallback: 'The Turning Point',
    actionTag: 'HOW TO WIN',
    actionHeadlineFallback: 'Actionable Takeaway',
    defaultStat: '10x',
    defaultStatLabel: 'GROWTH',
    statLabels: ['GROWTH', 'EFFICIENCY', 'IMPACT', 'SPEED', 'ACCURACY', 'RESULT'],
    cta: 'Follow for daily insights • Link in bio',
    fallbackProblemBody: 'Engineering and product teams spend too many hours maintaining fragile workarounds instead of shipping value.',
    fallbackInsightBody: 'Organizations that unify their systems eliminate friction and scale outputs with zero added overhead.',
    fallbackActionBody: 'Automate repetitive workflows and deploy reliable building blocks designed for high performance.',
    problemKeywords: [
      'problem', 'challenge', 'bottleneck', 'slow', 'manual', 'expensive', 'risk',
      'error', 'complex', 'frustrating', 'struggle', 'waste', 'scattered', 'pain'
    ],
    solutionKeywords: [
      'solution', 'features', 'automate', 'scale', 'fast', 'simple', 'secure',
      'boost', 'streamline', 'eliminate', 'platform', 'easy', 'transform'
    ],
  },
  de: {
    code: 'de',
    label: 'Deutsch',
    flag: '🇩🇪',
    defaultBrand: 'Einblicke',
    slide1Hook: 'Das musst du in unter 30 Sekunden wissen:',
    problemTag: 'DIE HERAUSFORDERUNG',
    problemHeadlineFallback: 'Der unsichtbare Engpass',
    solutionTag: 'DIE LÖSUNG',
    solutionHeadlineFallback: 'Der smarte Weg',
    insightTag: 'SCHLÜSSELERKENNTNIS',
    insightHeadlineFallback: 'Der entscheidende Wendepunkt',
    actionTag: 'SO GEHT ES',
    actionHeadlineFallback: 'Konkrete Empfehlung',
    defaultStat: '10x',
    defaultStatLabel: 'EFFIZIENZ',
    statLabels: ['EFFIZIENZ', 'WACHSTUM', 'ERGEBNIS', 'QUALITÄT', 'GESCHWINDIGKEIT'],
    cta: 'Folgen für mehr Insights • Link in der Bio',
    fallbackProblemBody: 'Manuelle Prozesse und veraltete Systeme kosten wertvolle Arbeitszeit und führen zu vermeidbaren Fehlern.',
    fallbackInsightBody: 'Unternehmen, die moderne Automatisierung einsetzen, steigern ihre Durchlaufzeiten drastisch.',
    fallbackActionBody: 'Setzen Sie auf einheitliche Standards und automatisierte Workflows für maximale Produktivität.',
    problemKeywords: [
      'problem', 'herausforderung', 'engpass', 'zeitaufwändig', 'manuell',
      'teuer', 'fehler', 'komplex', 'langsam', 'risiko'
    ],
    solutionKeywords: [
      'lösung', 'automatisieren', 'effizient', 'einfach', 'schnell', 'sicher',
      'vorteile', 'plattform', 'integriert'
    ],
  },
  sv: {
    code: 'sv',
    label: 'Svenska',
    flag: '🇸🇪',
    defaultBrand: 'Insikter',
    slide1Hook: 'Här är vad du behöver veta på under 30 sekunder:',
    problemTag: 'UTMANINGEN',
    problemHeadlineFallback: 'Den dolda flaskhalsen',
    solutionTag: 'LÖSNINGEN',
    solutionHeadlineFallback: 'Ett smartare tillvägagångssätt',
    insightTag: 'NYCKELINSIKT',
    insightHeadlineFallback: 'Den avgörande vändpunkten',
    actionTag: 'SÅ VINNER DU',
    actionHeadlineFallback: 'Konkret åtgärd',
    defaultStat: '10x',
    defaultStatLabel: 'TILLVÄXT',
    statLabels: ['TILLVÄXT', 'EFFEKTIVITET', 'RESULTAT', 'KVALITET'],
    cta: 'Följ för fler insikter • Länk i bio',
    fallbackProblemBody: 'Manuella rutiner och spridda system skapar friktion och stjäl tid från kärnverksamheten.',
    fallbackInsightBody: 'Genom att automatisera arbetsflöden uppnås högre precision och snabbare leveranser.',
    fallbackActionBody: 'Fokusera på det som skapar värde och låt moderna verktyg sköta repetitiva uppgifter.',
    problemKeywords: ['problem', 'utmaning', 'manuellt', 'tidskrävande', 'fel', 'risk', 'långsamt'],
    solutionKeywords: ['lösning', 'fördelar', 'automatisera', 'snabb', 'enkel', 'säker', 'plattform'],
  },
  no: {
    code: 'no',
    label: 'Norsk',
    flag: '🇳🇴',
    defaultBrand: 'Innsikter',
    slide1Hook: 'Her er det du må vite på under 30 sekunder:',
    problemTag: 'UTFORDRINGEN',
    problemHeadlineFallback: 'Den skjulte flaskehalsen',
    solutionTag: 'LØSNINGEN',
    solutionHeadlineFallback: 'En smartere fremgangsmåte',
    insightTag: 'NØKKELINSIKT',
    insightHeadlineFallback: 'Det avgjørende vendepunktet',
    actionTag: 'SLIK VINNER DU',
    actionHeadlineFallback: 'Konkret tiltak',
    defaultStat: '10x',
    defaultStatLabel: 'VEKST',
    statLabels: ['VEKST', 'EFFEKTIVITET', 'RESULTAT', 'KVALITET'],
    cta: 'Følg for flere innsikter • Link i bio',
    fallbackProblemBody: 'Manuelle oppgaver og fragmenterte verktøy skaper unødig tidsbruk og risiko.',
    fallbackInsightBody: 'Virksomheter som samler data og automatiserer oppnår markant bedre resultater.',
    fallbackActionBody: 'Ta i bruk moderne integrasjoner og frigjør tid til de viktigste oppgavene.',
    problemKeywords: ['problem', 'utfordring', 'manuelt', 'tidkrevende', 'feil', 'risiko', 'tregt'],
    solutionKeywords: ['løsning', 'fordeler', 'automatiser', 'rask', 'enkel', 'sikker', 'plattform'],
  },
};

const STOPWORDS_BY_LANG: Record<string, string[]> = {
  da: [
    'og', 'i', 'jeg', 'det', 'at', 'en', 'den', 'til', 'er', 'som', 'på', 'de', 'med', 'af',
    'for', 'ikke', 'der', 'et', 'har', 'om', 'vi', 'du', 'ud', 'vores', 'dine', 'samt',
    'eller', 'kan', 'skal', 'blive', 'mere', 'også', 'hvor', 'efter', 'dansk', 'fagsystem'
  ],
  en: [
    'and', 'the', 'is', 'for', 'with', 'not', 'to', 'of', 'that', 'have', 'we', 'you', 'our',
    'how', 'what', 'from', 'this', 'your', 'they', 'their', 'will', 'all', 'would', 'there',
    'about', 'get', 'can', 'are', 'which', 'been', 'more', 'when', 'into'
  ],
  de: [
    'und', 'der', 'die', 'das', 'ist', 'für', 'nicht', 'mit', 'von', 'sie', 'sich', 'ein',
    'eine', 'wir', 'wie', 'auf', 'dass', 'er', 'es', 'auch', 'als', 'an', 'nach', 'im', 'dem'
  ],
  sv: [
    'och', 'det', 'att', 'i', 'en', 'jag', 'som', 'på', 'den', 'med', 'för', 'så', 'till',
    'är', 'ett', 'om', 'av', 'vi', 'du', 'våra', 'kan', 'eller', 'inte', 'ska'
  ],
  no: [
    'og', 'i', 'det', 'på', 'som', 'er', 'en', 'til', 'å', 'av', 'for', 'ikke', 'med',
    'at', 'var', 'de', 'seg', 'den', 'ut', 'om', 'et', 'har', 'vi', 'du', 'våre'
  ],
};

/**
 * Detects the language of a webpage using URL signals, HTML attributes, and content stopword distribution.
 */
export function detectPageLanguage(options: {
  url: string;
  htmlLangAttr?: string | null;
  text?: string;
}): { code: string; label: string; flag: string; profile: LanguageProfile } {
  const { url, htmlLangAttr, text } = options;

  // 1. Check HTML lang or og:locale attribute if provided
  if (htmlLangAttr) {
    const clean = htmlLangAttr.trim().toLowerCase().split(/[-_]/)[0];
    if (clean === 'da' || clean === 'dk') return formatProfile('da');
    if (clean === 'de') return formatProfile('de');
    if (clean === 'sv' || clean === 'se') return formatProfile('sv');
    if (clean === 'no' || clean === 'nb' || clean === 'nn') return formatProfile('no');
    if (clean === 'en') return formatProfile('en');
    if (LANGUAGE_PROFILES[clean]) return formatProfile(clean);
  }

  // 2. Check URL domain TLD & language path indicators
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    const pathname = parsed.pathname.toLowerCase();

    if (host.endsWith('.dk') || pathname.startsWith('/da/') || pathname.startsWith('/dk/')) {
      return formatProfile('da');
    }
    if (host.endsWith('.de') || host.endsWith('.at') || host.endsWith('.ch') || pathname.startsWith('/de/')) {
      return formatProfile('de');
    }
    if (host.endsWith('.se') || pathname.startsWith('/sv/') || pathname.startsWith('/se/')) {
      return formatProfile('sv');
    }
    if (host.endsWith('.no') || pathname.startsWith('/no/') || pathname.startsWith('/nb/')) {
      return formatProfile('no');
    }
  } catch {}

  // 3. Check content stopwords if text is available
  if (text && text.length > 30) {
    const tokens = text
      .toLowerCase()
      .replace(/[^\p{L}\s]/gu, ' ')
      .split(/\s+/)
      .filter((w) => w.length >= 2);

    const tokenCounts = new Map<string, number>();
    for (const t of tokens) {
      tokenCounts.set(t, (tokenCounts.get(t) || 0) + 1);
    }

    const scores: Record<string, number> = {};
    for (const [lang, stopwords] of Object.entries(STOPWORDS_BY_LANG)) {
      let score = 0;
      for (const sw of stopwords) {
        score += tokenCounts.get(sw) || 0;
      }
      scores[lang] = score;
    }

    let bestLang = 'en';
    let maxScore = 0;
    for (const [lang, score] of Object.entries(scores)) {
      if (score > maxScore) {
        maxScore = score;
        bestLang = lang;
      }
    }

    if (maxScore >= 3 && LANGUAGE_PROFILES[bestLang]) {
      return formatProfile(bestLang);
    }
  }

  return formatProfile('en');
}

function formatProfile(code: string): { code: string; label: string; flag: string; profile: LanguageProfile } {
  const profile = LANGUAGE_PROFILES[code] || LANGUAGE_PROFILES.en;
  return {
    code: profile.code,
    label: `${profile.label} ${profile.flag}`,
    flag: profile.flag,
    profile,
  };
}
