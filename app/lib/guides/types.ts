// app/lib/guides/types.ts
// ---------------------------------------------------------------------------
// Shape of a guide article.
//
// Guides are structured data rather than MDX so that the same definitions feed
// the page, the per-article metadata, the Article structured data and the
// sitemap. One source, four outputs, no drift — and no extra build dependency.
//
// Inline links use a minimal `[label](/href)` syntax, rendered into real React
// elements. Nothing here is ever passed to dangerouslySetInnerHTML.
// ---------------------------------------------------------------------------

export type GuideCategory = "Where to stay" | "Practical" | "Occasions";

export interface GuideSection {
  /** Rendered as an h2. */
  heading: string;
  /** Body copy. Supports `[label](/href)` links. */
  paragraphs?: string[];
  /** Optional bullet list, rendered after the paragraphs. */
  list?: string[];
}

export interface GuideLink {
  label: string;
  href: string;
}

export interface Guide {
  slug: string;
  /** Rendered as the h1 and, via the layout template, in the <title>. */
  title: string;
  /** Overrides `title` in the <title> tag when a longer phrase reads better. */
  metaTitle?: string;
  /** Meta description and card blurb. Keep under ~155 characters. */
  description: string;
  /** On-page standfirst under the h1. Longer and friendlier than `description`. */
  summary: string;
  category: GuideCategory;
  /**
   * The phrase this page is built to answer. Documentation only — never
   * rendered. It exists so a future edit does not quietly drift off-target.
   */
  targetQuery: string;
  keywords: string[];
  /** ISO date, surfaced in Article structured data. */
  updated: string;
  readingMinutes: number;
  sections: GuideSection[];
  related?: GuideLink[];
  cta?: GuideLink & { note?: string };
}
