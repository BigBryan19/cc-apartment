// app/lib/guides/index.ts
// ---------------------------------------------------------------------------
// Guide registry.
//
// Adding a guide means adding it to one of the three content modules; the
// listing page, the sitemap, the structured data and the related-links blocks
// all pick it up from here.
// ---------------------------------------------------------------------------

import { PLACE_GUIDES } from "./places";
import { PRACTICAL_GUIDES } from "./practical";
import { OCCASION_GUIDES } from "./occasions";
import type { Guide, GuideCategory } from "./types";

/** Publication order, and the order the listing page renders them in. */
export const GUIDES: Guide[] = [
  ...PLACE_GUIDES,
  ...PRACTICAL_GUIDES,
  ...OCCASION_GUIDES,
];

const CATEGORY_ORDER: GuideCategory[] = [
  "Where to stay",
  "Practical",
  "Occasions",
];

export function getGuide(slug: string): Guide | undefined {
  return GUIDES.find((guide) => guide.slug === slug);
}

export function guidesByCategory(): {
  category: GuideCategory;
  guides: Guide[];
}[] {
  return CATEGORY_ORDER.map((category) => ({
    category,
    guides: GUIDES.filter((guide) => guide.category === category),
  })).filter((group) => group.guides.length > 0);
}

/**
 * Other guides to surface beneath an article.
 *
 * Prefers the hand-picked `related` list, then tops up with others from the
 * same category so no article is ever a dead end — which matters as much for a
 * crawler as for a reader.
 */
export function relatedGuides(guide: Guide, limit = 3): Guide[] {
  const picked: Guide[] = [];

  for (const link of guide.related ?? []) {
    const slug = link.href.replace(/^\/guides\//, "");
    const match = getGuide(slug);
    if (match && match.slug !== guide.slug) picked.push(match);
    if (picked.length >= limit) return picked;
  }

  for (const candidate of GUIDES) {
    if (picked.length >= limit) break;
    if (candidate.slug === guide.slug) continue;
    if (picked.some((g) => g.slug === candidate.slug)) continue;
    if (candidate.category === guide.category) picked.push(candidate);
  }

  return picked;
}

export type { Guide, GuideCategory, GuideSection, GuideLink } from "./types";
