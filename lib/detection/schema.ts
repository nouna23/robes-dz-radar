import { z } from "zod";

// Liste fermée : certains modèles (observé avec Groq/gpt-oss-120b) inventent
// des noms de champ libres si on laisse `field` en texte libre, ce qui casse
// la traçabilité preuve -> champ réellement extrait. Doit rester synchronisé
// avec les clés de ProblemExtractionSchema ci-dessous.
export const CLAIM_FIELDS = [
  "hasProblem",
  "problemSummary",
  "targetAudience",
  "sentiment",
  "intensity",
  "categories",
  "timeLostMentioned",
  "moneyLostMentioned",
  "currentSolution",
  "existingToolsMentioned",
  "solutionsSeemSatisfactory",
  "activeSearchIndicator",
  "willingnessToPay",
  "aiRelevance",
] as const;

// Cahier des charges section 5 : l'agent doit toujours distinguer ce qui est
// explicitement dit, ce qui est déduit, et ce qui est une hypothèse — jamais
// inventer une preuve.
export const ClaimSchema = z.object({
  field: z.enum(CLAIM_FIELDS).describe("Doit être exactement un des champs du schéma ci-dessous, jamais un nom inventé"),
  value: z.string().describe("La valeur/justification, courte citation ou paraphrase du texte source"),
  claimType: z.enum(["EXPLICIT", "INFERRED", "HYPOTHESIS"]),
});

export const ProblemExtractionSchema = z.object({
  hasProblem: z
    .boolean()
    .describe(
      "Faux si le texte ne décrit aucun problème, frustration ou besoin exploitable (ex: pur contenu promotionnel, question déjà résolue, hors-sujet)"
    ),
  problemSummary: z.string().describe("Résumé concis du problème en une phrase, vide si hasProblem=false"),
  targetAudience: z.string().nullable().describe("Qui rencontre ce problème (rôle, secteur, contexte)"),
  sentiment: z.enum(["frustrated", "negative", "neutral", "positive"]).nullable(),
  intensity: z.number().int().min(1).max(5).nullable().describe("Intensité de la frustration, 1=faible 5=forte"),
  categories: z.array(z.string()).describe("Catégories courtes, ex: 'reporting', 'admin', 'communication'"),
  timeLostMentioned: z.boolean(),
  moneyLostMentioned: z.boolean(),
  currentSolution: z.string().nullable().describe("Comment la personne résout le problème actuellement, si mentionné"),
  existingToolsMentioned: z.array(z.string()),
  solutionsSeemSatisfactory: z.boolean().nullable(),
  activeSearchIndicator: z
    .boolean()
    .describe("La personne recherche activement une solution ou demande explicitement un outil"),
  willingnessToPay: z.boolean().describe("Signe explicite ou fortement suggéré de volonté de payer — jamais déduit d'une simple frustration"),
  aiRelevance: z.boolean().nullable().describe("Une solution basée sur l'IA semble-t-elle techniquement pertinente"),
  claims: z.array(ClaimSchema).describe("Une entrée par affirmation notable, typée EXPLICIT/INFERRED/HYPOTHESIS"),
});

export type ProblemExtraction = z.infer<typeof ProblemExtractionSchema>;
