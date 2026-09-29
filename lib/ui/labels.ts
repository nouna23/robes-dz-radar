// Les valeurs stockées en base (sentiment, claimType, status) restent en
// anglais côté données/LLM — seules ces correspondances traduisent
// l'affichage en français dans le dashboard.

export const SENTIMENT_LABEL: Record<string, string> = {
  frustrated: "Frustré",
  negative: "Négatif",
  neutral: "Neutre",
  positive: "Positif",
};

export const CLAIM_TYPE_LABEL: Record<string, string> = {
  EXPLICIT: "EXPLICITE",
  INFERRED: "DÉDUIT",
  HYPOTHESIS: "HYPOTHÈSE",
};

// Noms des champs tels qu'utilisés dans lib/detection/schema.ts (claims[].field).
export const CLAIM_FIELD_LABEL: Record<string, string> = {
  problemSummary: "Résumé du problème",
  targetAudience: "Cible",
  sentiment: "Sentiment",
  intensity: "Intensité",
  timeLostMentioned: "Temps perdu",
  moneyLostMentioned: "Argent perdu",
  currentSolution: "Solution actuelle",
  existingToolsMentioned: "Boutiques/marques déjà essayées",
  solutionsSeemSatisfactory: "Solutions actuelles satisfaisantes",
  activeSearchIndicator: "Recherche active d'une solution",
  willingnessToPay: "Volonté de payer",
  aiRelevance: "Pertinence de l'IA",
  categories: "Catégories",
};

// llmProvider tel que renseigné par lib/llm/index.ts
export const LLM_PROVIDER_LABEL: Record<string, string> = {
  gemini: "Gemini",
  groq: "Groq (gpt-oss-120b)",
};

export const CONTENT_BRIEF_STATUS_LABEL: Record<string, string> = {
  draft: "Brouillon",
  reviewed: "Relu",
  published: "Publié",
};

export const PROBLEM_STATUS_LABEL: Record<string, string> = {
  NEW: "Nouveau",
  WATCHING: "Surveillance",
  INVESTIGATING: "Approfondissement",
  TESTING: "Test en cours",
  TESTED: "Testé",
  ABANDONED: "Abandonné",
  ARCHIVED_LOW_MOMENTUM: "Archivé (faible élan)",
};

export const LISTING_STATUS_LABEL: Record<string, string> = {
  ACTIVE: "Active",
  SOLD_OUT: "Épuisée",
  REMOVED: "Retirée",
  UNKNOWN: "Statut inconnu",
};

export const LISTING_PLATFORM_LABEL: Record<string, string> = {
  ETSY: "Etsy",
  WEB: "Recherche web",
};
