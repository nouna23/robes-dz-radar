import { createGeminiClient } from "./gemini";
import { createGroqClient } from "./groq";
import type { LlmClient, StructuredRequest } from "./types";

// Point d'entrée unique : le reste du code importe `llm` depuis ici et ne
// connaît jamais un fournisseur en particulier. Plusieurs fournisseurs
// gratuits sont combinés (plutôt qu'un seul payant) : si le premier échoue
// (quota épuisé, erreur réseau...), on bascule sur le suivant. Chaque
// fournisseur est instancié une seule fois (lazy), pour ne jamais exiger une
// clé API tant qu'aucun appel n'est réellement effectué.
interface Provider {
  name: string;
  create: () => LlmClient;
}

const PROVIDERS: Provider[] = [
  { name: "gemini", create: createGeminiClient },
  { name: "groq", create: createGroqClient },
];

const instances = new Map<string, LlmClient>();

function getClient(provider: Provider): LlmClient {
  let instance = instances.get(provider.name);
  if (!instance) {
    instance = provider.create();
    instances.set(provider.name, instance);
  }
  return instance;
}

export interface StructuredResult<T> {
  data: T;
  provider: string;
}

// Variante qui rapporte quel fournisseur a effectivement répondu — utile pour
// tracer la provenance (ex: Signal.llmProvider) sans coupler les appelants à
// la liste des fournisseurs.
export async function generateStructuredWithProvider<T>(request: StructuredRequest<T>): Promise<StructuredResult<T>> {
  let lastError: unknown;

  for (const provider of PROVIDERS) {
    try {
      const data = await getClient(provider).generateStructured(request);
      return { data, provider: provider.name };
    } catch (err) {
      lastError = err;
      console.warn(
        `[llm] ${provider.name} indisponible, tentative du fournisseur suivant :`,
        err instanceof Error ? err.message : err
      );
    }
  }

  throw lastError;
}

export const llm: LlmClient = {
  async generateStructured<T>(request: StructuredRequest<T>): Promise<T> {
    const { data } = await generateStructuredWithProvider(request);
    return data;
  },
};

export type { LlmClient, StructuredRequest } from "./types";
