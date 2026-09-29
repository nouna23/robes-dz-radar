import type { Connector, RawItem } from "./types";
import { fetchFeedAsRawItems, type FeedTarget } from "./feedCore";

// Aucun flux RSS identifié pour ce créneau (pas de blog/publication/forum
// dédié aux robes algériennes avec un flux découvrable) — voir plan §3.
// Vide volontairement, pas un oubli : ajouter ici si un flux fiable est
// trouvé plus tard (ex. blog d'une créatrice avec un flux RSS natif).
export const DEFAULT_RSS_FEEDS: FeedTarget[] = [];

export function createRssConnector(feeds: FeedTarget[] = DEFAULT_RSS_FEEDS): Connector {
  return {
    name: "rss",
    async collect(): Promise<RawItem[]> {
      const results: RawItem[] = [];
      for (const feed of feeds) {
        try {
          results.push(...(await fetchFeedAsRawItems(feed)));
        } catch (err) {
          console.error(`[rss] échec de collecte pour "${feed.sourceName}" (${feed.url}):`, err);
        }
      }
      return results;
    },
  };
}
