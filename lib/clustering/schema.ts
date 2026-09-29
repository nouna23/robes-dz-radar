import { z } from "zod";

// Un seul appel LLM traite tout le lot de signaux non regroupés en une fois
// (plutôt qu'un appel par paire signal/problème) — economise le quota
// journalier, qui est la vraie contrainte à ce stade du projet (V1, faible
// volume). Cahier des charges section 6 : les signaux d'un même problème
// sont regroupés, mais chaque source reste une preuve indépendante — le
// clustering ne fait que relier des Signal existants à un Problem partagé,
// il ne fusionne ni ne supprime rien.
export const ClusteringResultSchema = z.object({
  assignments: z
    .array(
      z.object({
        signalIndex: z.number().int().describe("Index (0-based) du signal dans la liste fournie"),
        matchedProblemId: z
          .string()
          .nullable()
          .describe("id d'un Problem EXISTANT auquel rattacher ce signal, ou null si aucun ne correspond"),
        newGroupKey: z
          .string()
          .nullable()
          .describe(
            "Clé arbitraire commune à tous les signaux qui décrivent le même nouveau problème (pas encore dans la liste des Problem existants) ; null si matchedProblemId est renseigné"
          ),
      })
    )
    .describe("Une entrée par signal fourni en entrée, dans le même ordre"),
  newGroups: z
    .array(
      z.object({
        key: z.string().describe("Doit correspondre à un newGroupKey utilisé dans assignments"),
        title: z.string().describe("Titre court du problème regroupé"),
        description: z.string(),
        category: z.string().nullable(),
        targetAudience: z.string().nullable(),
      })
    )
    .describe("Un groupe par nouveau problème identifié (absent des Problem existants)"),
});

export type ClusteringResult = z.infer<typeof ClusteringResultSchema>;
