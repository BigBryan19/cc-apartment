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
    "Birthday setups are shown above. Tell us the date and we will confirm what we can stage for it.",
  couples:
    "We have no honeymoon-setup photographs published yet. Ask us and we will send what we have before you book.",
  other:
    "Guest shoots, treatments and outings are shown above. Ask us and we will send more from recent bookings.",
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
 * Photo in an explicit category.
 *
 * The original `photo()`/`video()` helpers pin everything to "stays", which was
 * correct when the gallery only held apartments. Setups, treatments and guest
 * shoots need their own tab, so these take the category as an argument.
 */
function albumPhoto(
  id: string,
  src: string,
  category: GalleryCategory,
  title: string,
  caption: string,
  sortOrder: number,
): GalleryItem {
  return { id, type: "photo", src, category, title, caption, sortOrder };
}

function albumVideo(
  id: string,
  src: string,
  poster: string,
  category: GalleryCategory,
  title: string,
  caption: string,
  sortOrder: number,
): GalleryItem {
  return { id, type: "video", src, poster, category, title, caption, sortOrder };
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

  /*
   * The clip that used to be labelled "Adenta Serenity walkthrough" is the Aburi
   * studio — same room, proven by frame comparison with `/aburi.mp4` at 55–75s.
   * It is credited to the room it was filmed in, and Adenta keeps no video until
   * a real one is supplied.
   */
  video("aburi-studio-video", "/aburi-studio.mp4", "/aburi-studio-poster.jpg", 2, "Aburi Studio", 65),
  video("adenta-video", "/adenta-tour.mp4", "/adenta-tour-poster.jpg", 3, "Adenta Serenity walkthrough", 110),
  photo("adenta-1", "/Adenta1.jpg", 3, "Exterior", "The front elevation at Adenta Serenity.", 120),
  photo("adenta-2", "/Adenta2.jpg", 3, "Pool", "The pool and pergola seating.", 130),
  photo("adenta-3", "/Adenta3.jpg", 3, "Living & dining", "Open living and dining area.", 140),
  photo("adenta-4", "/Adenta4.jpg", 3, "Bedroom", "A prepared bedroom at Adenta Serenity.", 150),

  // ---- Birthday setups (supplied 30 October 2026) -------------------------
  albumPhoto(
    "bday-room",
    "/media/birthday-room.jpg",
    "birthdays",
    "Birthday room setup",
    "The bedroom dressed with balloons and a birthday message before arrival.",
    200,
  ),
  albumVideo(
    "bday-table",
    "/media/birthday-table.mp4",
    "/media/birthday-table-poster.jpg",
    "birthdays",
    "Birthday table",
    "Pink linen, place settings and a cake for a hosted celebration.",
    210,
  ),
  albumVideo(
    "bday-party",
    "/media/birthday-party.mp4",
    "/media/birthday-party-poster.jpg",
    "birthdays",
    "Birthday party",
    "Guests seated for a birthday dinner at the apartment.",
    220,
  ),
  albumVideo(
    "bday-cake",
    "/media/birthday-cake.mp4",
    "/media/birthday-cake-poster.jpg",
    "birthdays",
    "Birthday cake",
    "Cake and candles laid out in the kitchen.",
    230,
  ),

  // ---- Massage ------------------------------------------------------------
  albumVideo(
    "massage-pergola",
    "/media/massage-pergola.mp4",
    "/media/massage-pergola-poster.jpg",
    "other",
    "Massage under the pergola",
    "A treatment table set up beside the pool.",
    240,
  ),
  albumVideo(
    "massage-poolside",
    "/media/massage-poolside.mp4",
    "/media/massage-poolside-poster.jpg",
    "other",
    "Poolside massage",
    "Towels and towels-down preparation on the pool terrace.",
    250,
  ),
  albumVideo(
    "massage-pool",
    "/media/massage-pool.mp4",
    "/media/massage-pool-poster.jpg",
    "other",
    "Massage by the pool",
    "The treatment area overlooking the water.",
    260,
  ),

  // ---- Graduation shoot (a real guest booking) ----------------------------
  albumPhoto(
    "grad-lounge",
    "/media/graduation-lounge.jpg",
    "other",
    "Graduation portraits",
    "A graduation shoot in the apartment's living space.",
    270,
  ),
  albumPhoto(
    "grad-dress",
    "/media/graduation-blue-dress.jpg",
    "other",
    "Graduation portraits",
    "Traditional dress and sash, photographed indoors.",
    280,
  ),
  albumPhoto(
    "grad-sash",
    "/media/graduation-sash.jpg",
    "other",
    "Graduation portraits",
    "Seated portrait with the graduation sash.",
    290,
  ),
  albumPhoto(
    "grad-piano",
    "/media/graduation-piano.jpg",
    "other",
    "Graduation portraits",
    "Portrait at the piano.",
    300,
  ),
  albumPhoto(
    "grad-suit",
    "/media/graduation-suit.jpg",
    "other",
    "Graduation portraits",
    "Portrait on the glass staircase.",
    310,
  ),
  albumVideo(
    "grad-stairs",
    "/media/graduation-stairs.mp4",
    "/media/graduation-stairs-poster.jpg",
    "other",
    "Graduation film",
    "A short clip from a graduation shoot.",
    320,
  ),
  albumVideo(
    "grad-gown",
    "/media/graduation-gown.mp4",
    "/media/graduation-gown-poster.jpg",
    "other",
    "Graduation film",
    "Cap and gown in the apartment.",
    330,
  ),
  albumVideo(
    "grad-portrait",
    "/media/graduation-portrait.mp4",
    "/media/graduation-portrait-poster.jpg",
    "other",
    "Graduation film",
    "A longer portrait session around the property.",
    340,
  ),

  // ---- Other --------------------------------------------------------------
  albumVideo(
    "travel-road",
    "/media/travel-road.mp4",
    "/media/travel-road-poster.jpg",
    "other",
    "On the road to Aburi",
    "The drive up to the Eastern Region.",
    350,
  ),
  albumVideo(
    "games-lounge",
    "/media/games-lounge.mp4",
    "/media/games-lounge-poster.jpg",
    "stays",
    "Games lounge",
    "The pool table and pergola by the pool.",
    360,
  ),
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
/**
 * Files that were proven to belong to a different property.
 *
 * A `gallery_media` row written before the reassignment still points at
 * `/adenta.mp4`, which is the Aburi studio. Until the migration is run, a live
 * gallery would keep publishing it as an Adenta walkthrough — the exact claim
 * the owner asked to remove. The correction happens here as well so the public
 * page is right immediately, and the migration persists it.
 */
const MISATTRIBUTED_MEDIA: Record<string, { src: string; poster?: string; title: string; villaId: number }> = {
  "/adenta.mp4": {
    src: "/aburi-studio.mp4",
    poster: "/aburi-studio-poster.jpg",
    title: "Aburi Studio",
    villaId: 2,
  },
};

export function toGalleryItem(row: Record<string, unknown>, index: number): GalleryItem | null {
  const rawSrc = typeof row.src === "string" ? row.src.trim() : "";
  const correction = MISATTRIBUTED_MEDIA[rawSrc];
  const src = correction?.src ?? rawSrc;
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
    poster: correction?.poster
      ? correction.poster
      : typeof row.poster === "string" && row.poster
        ? row.poster
        : undefined,
    category,
    title: correction?.title
      ? correction.title
      : typeof row.title === "string" && row.title
        ? row.title
        : "Cosy Crest",
    caption: typeof row.caption === "string" && row.caption ? row.caption : undefined,
    villaId: correction?.villaId
      ? correction.villaId
      : typeof row.villa_id === "number"
        ? row.villa_id
        : undefined,
    sortOrder,
  };
}
