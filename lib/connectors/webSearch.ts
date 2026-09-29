import type { Connector, RawItem } from "./types";
import { stripHtml } from "./feedCore";

const TAVILY_URL = "https://api.tavily.com/search";

// Requêtes ciblant des signaux de demande/frustration (pas de découverte de
// boutiques — voir lib/market/discoverSellers.ts pour ça, volontairement
// séparé du pipeline LLM de détection, voir plan §3).
export const DEFAULT_QUERIES = [
  "je ne trouve pas de robe algérienne moderne",
  "difficile de trouver une robe kabyle simple",
  "où acheter une robe algérienne pas trop chère en France",
  "robe algérienne pour le quotidien pas pour un mariage",
  "avis boutique robe algérienne diaspora",
  "robe algérienne grande taille difficile à trouver",
];

export function createWebSearchConnector(
  queries: string[] = DEFAULT_QUERIES,
  apiKey = process.env.TAVILY_API_KEY
): Connector {
  return {
    name: "web_search",
    async collect(): Promise<RawItem[]> {
      if (!apiKey) {
        console.warn("[web_search] TAVILY_API_KEY manquante — connecteur ignoré");
        return [];
      }

      const results: RawItem[] = [];

      for (const query of queries) {
        try {
          const response = await fetch(TAVILY_URL, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${apiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              query,
              search_depth: "basic",
              max_results: 8,
              time_range: "month",
            }),
          });

          if (!response.ok) {
            throw new Error(`Tavily API error ${response.status}: ${await response.text()}`);
          }

          const data = await response.json();
          for (const item of data.results ?? []) {
            if (!item.url || !item.content) continue;
            results.push({
              platform: "web_search",
              sourceName: safeHostname(item.url),
              url: item.url,
              rawContent: stripHtml(item.content),
            });
          }
        } catch (err) {
          console.error(`[web_search] échec pour la requête "${query}":`, err);
        }
      }

      return results;
    },
  };
}

function safeHostname(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return "web";
  }
}
