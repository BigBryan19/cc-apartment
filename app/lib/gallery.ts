// app/lib/gallery.ts
// ---------------------------------------------------------------------------
// The Media & Gallery catalogue.
//
// ONLY REAL COSY CREST MEDIA
//
//   Every item below is a photograph or video that exists in /public and was
//   taken at one of the three properties. Nothing here is a stock scene
//   presented as a Cosy Crest experience, and no guest testimonial or "recent
//   stay" is invented.
//
// THE EMPTY CATEGORIES ARE DELIBERATE
//
//   There are no birthday-setup, honeymoon-setup or guest-event photographs in
//   the repository. Those filters therefore exist but show an honest empty
//   state explaining that the media has not been uploaded yet — inventing a
//   gallery to fill a tab is exactly what the brief forbids.
//
// OWNER-EDITABLE
//
//   When Supabase is configured, the gallery is read from `gallery_media` and
//   managed at /admin/gallery (add, remove, categorise, reorder). The bundled
//   list is the fallback so the section still renders on a fresh clone.
// ---------------------------------------------------------------------------

export type GalleryCategory = "stays" | "birthdays" | "couples" | "other";

export type GalleryFilter = "all" | GalleryCategory;

export interface GalleryItem {
  id: string;
  type: "photo" | "video";
  /** Image URL, or the video file for a video item. */
  src: string;
  /** Poster shown before a video plays. Required for videos. */
  poster?: string;
  category: GalleryCategory;
  title: string;
  caption?: string;
  /** Which property the media belongs to, so it is never mislabelled. */
  villaId?: number;
  sortOrder: number;
}

export const GALLERY_FILTERS: { id: GalleryFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "stays", label: "Stays" },
  { id: "birthdays", label: "Birthdays" },
  { id: "couples", label: "Couples" },
  { id: "other", label: "Other Experiences" },
];

export const GALLERY_CATEGORY_LABELS: Record<GalleryCategory, string> = {
  stays: "Stays",
  birthdays: "Birthdays",
  couples: "Couples",
  other: "Other Experiences",
};

/**
 * An empty-state message per category, so a filtered tab never looks broken.
 * Written to be true: we do not claim a setup has happened at Cosy Crest.
 */
export const GALLERY_EMPTY_MESSAGE: Record<GalleryFilter, string> = {
  all: "Photographs and videos of our apartments are being added.",
  stays:
    "Photographs and videos of our apartments are being added. Ask us and we will send the latest.",
  birthdays:
    "We have not published photographs of a birthday setup yet. Ask us for recent examples before you book.",
  couples:
    "We have not published photographs of a honeymoon setup yet. Ask us and we will send what we have.",
  other:
    "Photographs from guest experiences have not been published yet. Ask us and we will share recent ones.",
};

function photo(
  id: string,
  src: string,
  villaId: number,
  title: string,
  caption: string,
  sortOrder: number,
): GalleryItem {
  return {
    id,
    type: "photo",
    src,
    category: "stays",
    title,
    caption,
    villaId,
    sortOrder,
  };
}

function video(
  id: string,
  src: string,
  poster: string,
  villaId: number,
  title: string,
  sortOrder: number,
): GalleryItem {
  return {
    id,
    type: "video",
    src,
    poster,
    category: "stays",
    title,
    villaId,
    sortOrder,
  };
}

/**
 * Bundled fallback gallery — 12 photographs and 3 walkthrough videos, all real.
 * Ordering interleaves a video per property so the section never opens on a
 * wall of stills.
 */
export const DEFAULT_GALLERY: GalleryItem[] = [
  video("lake-video", "/lakeside.mp4", "/Lake2.jpg", 1, "Lakeside Estate walkthrough", 10),
  photo("lake-1", "/Lake1.jpg", 1, "Games room", "Pool table and bar in the Lakeside games room.", 20),
  photo("lake-4", "/Lake4.jpg", 1, "Living room", "The main sitting room at Lakeside Estate.", 30),
  photo("lake-3", "/Lake3.jpg", 1, "Pool terrace", "Poolside seating at Lakeside Estate.", 40),
  photo("lake-2", "/Lake2.jpg", 1, "Courtyard", "The paved courtyard and entrance.", 50),

  video("aburi-video", "/aburi.mp4", "/Aburi2.jpeg", 2, "Aburi Mountain Retreat walkthrough", 60),
  photo("aburi-2", "/Aburi2.jpeg", 2, "Living room", "Sitting room with the glass staircase and bar.", 70),
  photo("aburi-1", "/Aburi1.jpeg", 2, "Bedroom", "Principal bedroom at Aburi Mountain Retreat.", 80),
  photo("aburi-4", "/Aburi4.jpeg", 2, "Kitchen", "Open kitchen with breakfast bar.", 90),
  photo("aburi-3", "/Aburi3.jpeg", 2, "Bar", "The bar beneath the staircase.", 100),

  video("adenta-video", "/adenta.mp4", "/Adenta1.jpg", 3, "Adenta Serenity walkthrough", 110),
  photo("adenta-1", "/Adenta1.jpg", 3, "Exterior", "The front elevation at Adenta Serenity.", 120),
  photo("adenta-2", "/Adenta2.jpg", 3, "Pool", "The pool and pergola seating.", 130),
  photo("adenta-3", "/Adenta3.jpg", 3, "Living & dining", "Open living and dining area.", 140),
  photo("adenta-4", "/Adenta4.jpg", 3, "Bedroom", "A prepared bedroom at Adenta Serenity.", 150),
];

/** Stable ordering for both the bundled list and database rows. */
export function sortGallery(items: GalleryItem[]): GalleryItem[] {
  return [...items].sort((a, b) => {
    if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
    return a.id.localeCompare(b.id);
  });
}

export function filterGallery(items: GalleryItem[], filter: GalleryFilter): GalleryItem[] {
  const sorted = sortGallery(items);
  if (filter === "all") return sorted;
  return sorted.filter((item) => item.category === filter);
}

/** How many items each filter would show, for the tab badges. */
export function galleryCounts(items: GalleryItem[]): Record<GalleryFilter, number> {
  return {
    all: items.length,
    stays: items.filter((item) => item.category === "stays").length,
    birthdays: items.filter((item) => item.category === "birthdays").length,
    couples: items.filter((item) => item.category === "couples").length,
    other: items.filter((item) => item.category === "other").length,
  };
}

/**
 * Map a `gallery_media` row (or anything row-shaped) to a GalleryItem.
 * Unknown categories fall back to "other" rather than crashing the section.
 */
export function toGalleryItem(row: Record<string, unknown>, index: number): GalleryItem | null {
  const src = typeof row.src === "string" ? row.src.trim() : "";
  if (!src) return null;

  const type = row.type === "video" ? "video" : "photo";
  const rawCategory = row.category;
  const category: GalleryCategory =
    rawCategory === "stays" ||
    rawCategory === "birthdays" ||
    rawCategory === "couples" ||
    rawCategory === "other"
      ? rawCategory
      : "other";

  const sortOrder =
    typeof row.sort_order === "number" && Number.isFinite(row.sort_order)
      ? row.sort_order
      : index * 10;

  return {
    id: typeof row.id === "string" ? row.id : `media-${index}`,
    type,
    src,
    poster: typeof row.poster === "string" && row.poster ? row.poster : undefined,
    category,
    title: typeof row.title === "string" && row.title ? row.title : "Cosy Crest",
    caption: typeof row.caption === "string" && row.caption ? row.caption : undefined,
    villaId: typeof row.villa_id === "number" ? row.villa_id : undefined,
    sortOrder,
  };
}
