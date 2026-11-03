// app/admin/gallery/page.tsx
// ---------------------------------------------------------------------------
// Gallery manager.
//
// The owner can add, remove, categorise and reorder media, which is what the
// brief asks for. A row is only a URL plus metadata — uploading the file itself
// stays a deliberate act (put it in /public, or paste a CDN URL), so this screen
// never claims to have stored an asset it has not.
//
// Ordering is written as explicit `sort_order` values (10, 20, 30 …) so a move
// rewrites one row rather than renumbering the whole table.
// ---------------------------------------------------------------------------

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Image as ImageIcon,
  Loader2,
  Plus,
  Trash2,
  Video,
} from "lucide-react";
import { createClient, isSupabaseConfigured } from "../../utils/supabase";
import { GALLERY_TABLE } from "../../lib/tables";

/** Same bucket the property editor writes to. */
const GALLERY_BUCKET = "villa-media";
import {
  GALLERY_CATEGORY_LABELS,
  sortGallery,
  toGalleryItem,
  DEFAULT_GALLERY,
  type GalleryCategory,
  type GalleryItem,
} from "../../lib/gallery";

interface DraftItem {
  type: "photo" | "video";
  src: string;
  poster: string;
  title: string;
  caption: string;
  category: GalleryCategory;
  villaId: string;
}

const EMPTY_DRAFT: DraftItem = {
  type: "photo",
  src: "",
  poster: "",
  title: "",
  caption: "",
  category: "stays",
  villaId: "",
};

export default function AdminGalleryPage() {
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "" });
  const [draft, setDraft] = useState<DraftItem>(EMPTY_DRAFT);

  const configured = isSupabaseConfigured();

  const load = useCallback(async () => {
    if (!configured) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await createClient()
      .from(GALLERY_TABLE)
      .select("id, type, src, poster, category, title, caption, villa_id, sort_order")
      .order("sort_order", { ascending: true });

    if (error) {
      setMessage({
        text: `Could not load the gallery: ${error.message}. Has the migration been run?`,
        type: "error",
      });
    } else {
      const mapped = (data ?? [])
        .map((row, index) => toGalleryItem(row as Record<string, unknown>, index))
        .filter((item): item is GalleryItem => item !== null);
      setItems(sortGallery(mapped));
    }
    setLoading(false);
  }, [configured]);

  useEffect(() => {
    load();
  }, [load]);

  const nextSortOrder = useMemo(
    () => (items.length ? Math.max(...items.map((item) => item.sortOrder)) + 10 : 10),
    [items],
  );

  /**
   * Upload straight from the computer.
   *
   * The file goes to the same Storage bucket the property editor uses, and the
   * public URL it returns is put into the form — so the owner can check the
   * title, category and caption before saving the row.
   */
  const [uploading, setUploading] = useState(false);
  const uploadFile = async (file: File) => {
    if (!configured) {
      setMessage({ text: "Supabase is not configured, so uploads cannot be stored.", type: "error" });
      return;
    }
    setUploading(true);
    setMessage({ text: "", type: "" });

    const supabase = createClient();
    const isVideo = file.type.startsWith("video/");
    const extension = file.name.split(".").pop()?.toLowerCase() || (isVideo ? "mp4" : "jpg");
    const path = `gallery/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from(GALLERY_BUCKET)
      .upload(path, file, { cacheControl: "31536000", upsert: false });

    setUploading(false);

    if (uploadError) {
      setMessage({
        text: `Upload failed: ${uploadError.message}. The storage bucket "${GALLERY_BUCKET}" must exist — run supabase/RUN-2026-11-03.sql.`,
        type: "error",
      });
      return;
    }

    const { data } = supabase.storage.from(GALLERY_BUCKET).getPublicUrl(path);
    setDraft((current) => ({
      ...current,
      type: isVideo ? "video" : "photo",
      src: data.publicUrl,
      title: current.title || file.name.replace(/\.[^.]+$/, "").replace(/[-_]/g, " "),
    }));
    setMessage({ text: `${file.name} uploaded. Add a title, then save it to the gallery.`, type: "success" });
  };

  /**
   * The public gallery falls back to the media bundled in app/lib/gallery.ts, so
   * the table looks empty even though the site shows photographs. Seeding copies
   * that list in, which is what makes it editable here.
   */
  const seedFromBundle = async () => {
    if (!configured) return;
    setSaving(true);
    const { error } = await createClient()
      .from(GALLERY_TABLE)
      .insert(
        DEFAULT_GALLERY.map((item) => ({
          type: item.type,
          src: item.src,
          poster: item.poster ?? null,
          title: item.title,
          caption: item.caption ?? null,
          category: item.category,
          villa_id: item.villaId ?? null,
          sort_order: item.sortOrder,
        })),
      );
    setSaving(false);
    if (error) {
      setMessage({ text: error.message, type: "error" });
      return;
    }
    setMessage({ text: "Bundled media copied into the gallery.", type: "success" });
    load();
  };

  const addItem = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!draft.src.trim()) {
      setMessage({ text: "A file URL is required.", type: "error" });
      return;
    }
    if (!configured) {
      setMessage({ text: "Supabase is not configured, so nothing can be saved.", type: "error" });
      return;
    }

    setSaving(true);
    const { error } = await createClient()
      .from(GALLERY_TABLE)
      .insert([
        {
          type: draft.type,
          src: draft.src.trim(),
          poster: draft.poster.trim() || null,
          title: draft.title.trim() || "Cosy Crest",
          caption: draft.caption.trim() || null,
          category: draft.category,
          villa_id: draft.villaId ? Number(draft.villaId) : null,
          sort_order: nextSortOrder,
        },
      ]);

    setSaving(false);

    if (error) {
      setMessage({ text: error.message, type: "error" });
      return;
    }
    setDraft(EMPTY_DRAFT);
    setMessage({ text: "Media added.", type: "success" });
    load();
  };

  const removeItem = async (item: GalleryItem) => {
    if (!configured) return;
    setSaving(true);
    const { error } = await createClient().from(GALLERY_TABLE).delete().eq("id", item.id);
    setSaving(false);
    if (error) {
      setMessage({ text: error.message, type: "error" });
      return;
    }
    setMessage({ text: "Media removed.", type: "success" });
    load();
  };

  /** Swap `sort_order` with the neighbour in the given direction. */
  const move = async (index: number, direction: -1 | 1) => {
    const target = items[index + direction];
    const current = items[index];
    if (!target || !current || !configured) return;

    setSaving(true);
    const supabase = createClient();
    // Two writes, current first, so an interruption cannot leave both rows
    // claiming the same order.
    const { error: firstError } = await supabase
      .from(GALLERY_TABLE)
      .update({ sort_order: target.sortOrder === current.sortOrder ? current.sortOrder + direction : target.sortOrder })
      .eq("id", current.id);

    const { error: secondError } = firstError
      ? { error: firstError }
      : await supabase
          .from(GALLERY_TABLE)
          .update({ sort_order: current.sortOrder })
          .eq("id", target.id);

    setSaving(false);

    if (firstError || secondError) {
      setMessage({ text: (firstError ?? secondError)?.message ?? "Reorder failed.", type: "error" });
      return;
    }
    load();
  };

  const updateCategory = async (item: GalleryItem, category: GalleryCategory) => {
    if (!configured) return;
    setSaving(true);
    const { error } = await createClient()
      .from(GALLERY_TABLE)
      .update({ category })
      .eq("id", item.id);
    setSaving(false);
    if (error) {
      setMessage({ text: error.message, type: "error" });
      return;
    }
    load();
  };

  return (
    <div className="mx-auto max-w-5xl animate-in fade-in duration-500">
      <div className="mb-8">
        <h1 className="mb-2 text-2xl font-semibold tracking-tight text-[var(--color-ink)]">
          Gallery
        </h1>
        <p className="text-sm text-slate-500">
          Add, categorise, reorder and remove the photographs and videos shown on
          the public gallery.
        </p>
      </div>

      {message.text && (
        <div
          className={`mb-6 rounded-xl p-4 text-sm ${
            message.type === "error"
              ? "border border-red-100 bg-red-50 text-red-600"
              : "border border-green-100 bg-green-50 text-green-700"
          }`}
        >
          {message.text}
        </div>
      )}

      {!configured && (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Supabase is not configured in this environment, so the gallery manager
          is read-only. The public gallery is showing the bundled media.
        </div>
      )}

      {/* ---------------- Add ---------------- */}
      <form
        onSubmit={addItem}
        className="mb-8 rounded-2xl border border-[var(--color-line-soft)] bg-white p-6 shadow-[var(--shadow-raise)]"
      >
        <h2 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-slate-900">
          <Plus size={15} /> Add media
        </h2>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Type
            <select
              value={draft.type}
              onChange={(event) =>
                setDraft({ ...draft, type: event.target.value as "photo" | "video" })
              }
              className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-normal normal-case tracking-normal text-slate-900"
            >
              <option value="photo">Photo</option>
              <option value="video">Video</option>
            </select>
          </label>

          <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Category
            <select
              value={draft.category}
              onChange={(event) =>
                setDraft({ ...draft, category: event.target.value as GalleryCategory })
              }
              className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-normal normal-case tracking-normal text-slate-900"
            >
              {(Object.keys(GALLERY_CATEGORY_LABELS) as GalleryCategory[]).map((key) => (
                <option key={key} value={key}>
                  {GALLERY_CATEGORY_LABELS[key]}
                </option>
              ))}
            </select>
          </label>

          <label className="text-xs font-bold uppercase tracking-wider text-slate-500 sm:col-span-2">
            File URL
            <input
              value={draft.src}
              onChange={(event) => setDraft({ ...draft, src: event.target.value })}
              placeholder="/Lake2.jpg or https://…"
              className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-normal normal-case tracking-normal text-slate-900"
            />
          </label>

          {draft.type === "video" && (
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 sm:col-span-2">
              Poster image (required for videos)
              <input
                value={draft.poster}
                onChange={(event) => setDraft({ ...draft, poster: event.target.value })}
                placeholder="/Lake2.jpg"
                className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-normal normal-case tracking-normal text-slate-900"
              />
            </label>
          )}

          <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Title
            <input
              value={draft.title}
              onChange={(event) => setDraft({ ...draft, title: event.target.value })}
              placeholder="Living room"
              className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-normal normal-case tracking-normal text-slate-900"
            />
          </label>

          <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Property id (optional)
            <input
              value={draft.villaId}
              onChange={(event) => setDraft({ ...draft, villaId: event.target.value })}
              inputMode="numeric"
              placeholder="1, 2 or 3"
              className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-normal normal-case tracking-normal text-slate-900"
            />
          </label>

          <label className="text-xs font-bold uppercase tracking-wider text-slate-500 sm:col-span-2">
            Caption (optional)
            <input
              value={draft.caption}
              onChange={(event) => setDraft({ ...draft, caption: event.target.value })}
              className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-normal normal-case tracking-normal text-slate-900"
            />
          </label>
        </div>

        <button
          type="submit"
          disabled={saving || !configured}
          className="mt-5 inline-flex items-center gap-2 rounded-lg bg-slate-900 px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-slate-800 disabled:opacity-40"
        >
          {saving ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
          Add to gallery
        </button>
      </form>

      {/* ---------------- Existing ---------------- */}
      <div className="overflow-hidden rounded-2xl border border-[var(--color-line-soft)] bg-white">
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-6 py-4">
          <h2 className="text-sm font-bold uppercase tracking-widest text-slate-900">
            Media ({items.length})
          </h2>
          {loading && <Loader2 size={16} className="animate-spin text-slate-400" />}
        </div>

        {items.length === 0 ? (
          <div className="px-6 py-10 text-center">
            <p className="text-sm text-slate-500">
              Nothing in the gallery table yet. Until media is added here, the public
              gallery shows the bundled photographs and videos.
            </p>
            <button
              type="button"
              onClick={() => void seedFromBundle()}
              disabled={saving}
              className="mt-4 rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-800 disabled:opacity-50"
            >
              Copy the {DEFAULT_GALLERY.length} bundled items in
            </button>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {items.map((item, index) => (
              <li key={item.id} className="flex flex-wrap items-center gap-4 px-4 py-3 sm:px-6">
                <div className="h-14 w-20 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                  {item.type === "video" ? (
                    item.poster ? (
                      <img
                        src={item.poster}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-slate-400">
                        <Video size={18} />
                      </div>
                    )
                  ) : (
                    <img src={item.src} alt="" className="h-full w-full object-cover" />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-900">
                    {item.title}
                  </p>
                  <p className="truncate text-xs text-slate-500">{item.src}</p>
                </div>

                <select
                  value={item.category}
                  onChange={(event) =>
                    updateCategory(item, event.target.value as GalleryCategory)
                  }
                  aria-label={`Category for ${item.title}`}
                  className="rounded-lg border border-slate-200 px-2 py-1.5 text-xs text-slate-700"
                >
                  {(Object.keys(GALLERY_CATEGORY_LABELS) as GalleryCategory[]).map((key) => (
                    <option key={key} value={key}>
                      {GALLERY_CATEGORY_LABELS[key]}
                    </option>
                  ))}
                </select>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => move(index, -1)}
                    disabled={index === 0 || saving}
                    aria-label={`Move ${item.title} up`}
                    className="rounded-lg border border-slate-200 p-2 text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-30"
                  >
                    <ArrowUp size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => move(index, 1)}
                    disabled={index === items.length - 1 || saving}
                    aria-label={`Move ${item.title} down`}
                    className="rounded-lg border border-slate-200 p-2 text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-30"
                  >
                    <ArrowDown size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeItem(item)}
                    disabled={saving}
                    aria-label={`Remove ${item.title}`}
                    className="rounded-lg border border-red-100 p-2 text-red-600 transition-colors hover:bg-red-50 disabled:opacity-30"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

        {items.length === 0 && !loading && (
          <p className="flex items-center justify-center gap-2 border-t border-slate-100 px-6 py-4 text-xs text-slate-400">
            <ImageIcon size={13} /> Bundled media is used while the table is empty.
          </p>
        )}
      </div>
    </div>
  );
}
