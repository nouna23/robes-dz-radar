import type { Connector, RawItem } from "./types";
import { fetchFeedAsRawItems } from "./feedCore";

// Reddit expose chaque subreddit en RSS public (endpoint officiel, aucune
// authentification requise) : https://www.reddit.com/r/<subreddit>/.rss
// Un User-Agent descriptif est nécessaire, Reddit bloquant les UA génériques.
const REDDIT_USER_AGENT = "robes-dz-radar/0.1 (personal research tool)";
// Reddit rate-limite assez agressivement les requêtes non-authentifiées :
// avec 3s de délai, seul le premier subreddit passait systématiquement et
// tous les suivants recevaient un 429. Délai plus généreux + une tentative
// de secours après une pause plus longue. (Constantes reprises telles
// quelles du projet ai-opportunity-engine — comportement Reddit, pas lié au domaine.)
const DELAY_BETWEEN_REQUESTS_MS = 6_000;
const RETRY_DELAY_MS = 15_000;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Pas de communauté Reddit dédiée aux robes algériennes/à la mode diaspora
// (contrairement à la nutrition, qui a des subreddits actifs et volumineux).
// Ces deux subreddits généralistes sont un essai à faible coût, pas une
// hypothèse de volume garanti — voir plan §3, jalon M4 : mesurer le rendement
// réel avant de décider si ça vaut la peine de les garder.
export const DEFAULT_SUBREDDITS = ["Algeria", "algerie"];

async function fetchSubreddit(subreddit: string): Promise<RawItem[]> {
  return fetchFeedAsRawItems(
    {
      platform: "reddit",
      sourceName: `r/${subreddit}`,
      url: `https://www.reddit.com/r/${subreddit}/.rss`,
    },
    { "User-Agent": REDDIT_USER_AGENT }
  );
}

export function createRedditConnector(subreddits: string[] = DEFAULT_SUBREDDITS): Connector {
  return {
    name: "reddit",
    async collect(): Promise<RawItem[]> {
      const results: RawItem[] = [];
      for (const [index, subreddit] of subreddits.entries()) {
        if (index > 0) await sleep(DELAY_BETWEEN_REQUESTS_MS);
        try {
          results.push(...(await fetchSubreddit(subreddit)));
        } catch {
          try {
            await sleep(RETRY_DELAY_MS);
            results.push(...(await fetchSubreddit(subreddit)));
          } catch (retryErr) {
            console.error(`[reddit] échec de collecte pour r/${subreddit}:`, retryErr);
          }
        }
      }
      return results;
    },
  };
}
