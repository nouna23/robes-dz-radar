import Parser from "rss-parser";
import type { RawItem } from "./types";

export interface FeedTarget {
  sourceName: string;
  url: string;
  platform: string;
}

const HTML_ENTITIES: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&nbsp;": " ",
};

// Nettoyage minimal : le contenu RSS embarque souvent du HTML (<p>, <hr>...)
// qu'on ne veut pas conserver tel quel dans le texte analysé/affiché.
// Exporté pour scripts/backfill-strip-html.ts (données collectées avant ce nettoyage).
export function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&[a-z#0-9]+;/gi, (entity) => HTML_ENTITIES[entity.toLowerCase()] ?? entity)
    .replace(/\s+/g, " ")
    .trim();
}

// Cœur partagé RSS/Atom : Reddit expose ses subreddits en RSS/Atom au même
// titre que n'importe quel blog, donc un seul parseur suffit pour les deux
// connecteurs (cahier des charges section 3 : flux RSS natifs en priorité).
export async function fetchFeedAsRawItems(
  target: FeedTarget,
  headers?: Record<string, string>
): Promise<RawItem[]> {
  const parser = new Parser({ headers, timeout: 15000 });
  const feed = await parser.parseURL(target.url);

  return feed.items
    .filter((item) => Boolean(item.link))
    .map((item) => ({
      platform: target.platform,
      sourceName: target.sourceName,
      url: item.link!,
      author: item.creator ?? undefined,
      publishedAt: item.isoDate ? new Date(item.isoDate) : undefined,
      rawContent: stripHtml(item.content ?? item.contentSnippet ?? item.title ?? ""),
    }));
}
