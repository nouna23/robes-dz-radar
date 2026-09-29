import type { z } from "zod";

export interface StructuredRequest<T> {
  system: string;
  prompt: string;
  schema: z.ZodType<T>;
}

// Abstraction volontairement minimale pour pouvoir changer de fournisseur/modèle
// sans toucher à la logique métier (détection, scoring...).
export interface LlmClient {
  generateStructured<T>(request: StructuredRequest<T>): Promise<T>;
}
