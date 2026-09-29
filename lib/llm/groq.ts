import { z } from "zod";
import type { LlmClient, StructuredRequest } from "./types";

// openai/gpt-oss-120b : palier gratuit Groq sans carte bancaire, ~1000
// requêtes/jour — même quota que la version 20b mais nettement plus capable
// pour un jugement calibré (distinction EXPLICITE/DÉDUIT/HYPOTHÈSE). Utilisé
// en secours quand Gemini est épuisé.
const DEFAULT_MODEL = "openai/gpt-oss-120b";
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

export function createGroqClient(apiKey = process.env.GROQ_API_KEY): LlmClient {
  if (!apiKey) {
    throw new Error("GROQ_API_KEY manquante — voir .env.example");
  }

  return {
    async generateStructured<T>({ system, prompt, schema }: StructuredRequest<T>): Promise<T> {
      const jsonSchema: Record<string, unknown> = z.toJSONSchema(schema, { target: "draft-7" });
      delete jsonSchema.$schema;

      const response = await fetch(GROQ_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: DEFAULT_MODEL,
          messages: [
            { role: "system", content: system },
            { role: "user", content: prompt },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "structured_response",
              // strict:false (best-effort) : le mode strict de Groq attend un sous-ensemble
              // très précis de JSON Schema (union nullable via type:[..,"null"]) que Zod
              // n'émet pas de la même forme (anyOf). Le garde-fou reste schema.parse() ci-dessous.
              strict: false,
              schema: jsonSchema,
            },
          },
        }),
      });

      if (!response.ok) {
        const body = await response.text();
        throw new Error(`Groq API error ${response.status}: ${body}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;
      if (!content) {
        throw new Error("Réponse Groq vide");
      }

      return schema.parse(JSON.parse(content));
    },
  };
}
