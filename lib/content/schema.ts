import { z } from "zod";

// Brief seulement — jamais l'article final. Un humain écrit et vérifie le
// contenu avant publication (sujet santé/nutrition = YMYL, cf. prompts.ts).
export const ContentBriefSchema = z.object({
  title: z.string().describe("Titre SEO, formulé comme la vraie question que les gens tapent"),
  angle: z
    .string()
    .describe("En 1-2 phrases : ce que cet article promet de résoudre, et pourquoi c'est différent des contenus génériques déjà en ligne"),
  outline: z.array(z.string()).describe("Titres de section (H2), dans l'ordre logique de l'article"),
  targetAudience: z.string(),
  quotes: z
    .array(
      z.object({
        signalIndex: z.number().int().describe("Index (0-based) du signal source dans la liste fournie"),
        quote: z.string().describe("Courte citation ou paraphrase fidèle du signal, à utiliser comme preuve dans l'article"),
      })
    )
    .describe("2 à 5 citations réelles qui justifient l'angle et l'intérêt du sujet"),
});

export type ContentBriefResult = z.infer<typeof ContentBriefSchema>;
