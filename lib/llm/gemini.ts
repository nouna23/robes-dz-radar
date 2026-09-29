import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import type { LlmClient, StructuredRequest } from "./types";

// gemini-3.6-flash : palier gratuit généreux via Google AI Studio, largement
// suffisant pour de l'extraction structurée à faible volume (V1).
// (gemini-2.5-flash n'est plus proposé aux nouvelles clés API depuis 2026.)
const DEFAULT_MODEL = "gemini-3.6-flash";

export function createGeminiClient(apiKey = process.env.GEMINI_API_KEY): LlmClient {
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY manquante — voir .env.example");
  }
  const ai = new GoogleGenAI({ apiKey });

  return {
    async generateStructured<T>({ system, prompt, schema }: StructuredRequest<T>): Promise<T> {
      const jsonSchema: Record<string, unknown> = z.toJSONSchema(schema, { target: "draft-7" });
      delete jsonSchema.$schema; // Gemini rejette ce champ, propre à JSON Schema, hors de son sous-ensemble supporté

      const response = await ai.models.generateContent({
        model: DEFAULT_MODEL,
        contents: prompt,
        config: {
          systemInstruction: system,
          responseMimeType: "application/json",
          responseSchema: jsonSchema,
        },
      });

      const text = response.text;
      if (!text) {
        throw new Error("Réponse LLM vide");
      }

      // Le schéma Zod reste l'ultime garde-fou : même si le modèle dévie du
      // schéma envoyé, une réponse mal formée est rejetée ici plutôt que
      // silencieusement acceptée comme preuve.
      return schema.parse(JSON.parse(text));
    },
  };
}
