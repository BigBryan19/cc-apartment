// app/admin/villas/page.tsx
// ---------------------------------------------------------------------------
// Property manager.
//
// The owner can create a property and edit everything a guest sees: the name,
// location, description, headline price, the actual bookable rates, the star
// rating, the amenities, the photographs and the walkthrough video. Nothing here
// requires a code change or a deploy.
//
// Two things worth knowing:
//
//   • `rates` is what the booking engine charges. `price` is only the headline
//     used by the listing card when rates are absent, so the price field says so
//     instead of pretending to be the booking price.
//   • Images can be added by path ("/Lake2.jpg"), by full URL, or uploaded to
//     Supabase Storage. Upload is offered only when a bucket exists; otherwise
//     the screen explains what to create rather than failing silently.
// ---------------------------------------------------------------------------

"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "../../utils/supabase";
import {
  approvedCapacity,
  capacityIsApprovedByRule,
  capacityRuleNote,
} from "../../lib/capacity";
import {
  Plus,
  Trash2,
  Loader2,
  X,
  ArrowUp,
  ArrowDown,
  ImagePlus,
  Pencil,
  Upload,
  Star,
} from "lucide-react";

/** The bucket used for uploaded property media. Create it as a public bucket. */
const MEDIA_BUCKET = "villa-media";

type PriceBasis = "per_night" | "per_stay" | "per_day" | "monthly" | "quote";

interface UnitDraft {
  option: string;
  amount: string;
  priceBasis: PriceBasis;
  maxGuests: string;
  /** Optional clip of this specific room, e.g. "/aburi-studio.mp4". */
  video: string;
}

interface VillaRow {
  id: number;
  title: string | null;
  location: string | null;
  price: number | null;
  guests: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  has_pool: boolean | null;
  image: string | null;
  images: string[] | null;
  video: string | null;
  description: string | null;
  amenities: string[] | null;
  rates:
    | {
        option?: string;
        amount?: number;
        priceBasis?: string;
        maxGuests?: number;
        video?: string;
        videoPoster?: string;
      }[]
    | null;
  rating: number | null;
}

interface EditorState {
  id: number | null;
  title: string;
  location: string;
  description: string;
  price: string;
  guests: string;
  bedrooms: string;
  bathrooms: string;
  hasPool: boolean;
  rating: string;
  video: string;
  amenities: string;
  images: string[];
  units: UnitDraft[];
}

const EMPTY_EDITOR: EditorState = {
  id: null,
  title: "",
  location: "",
  description: "",
  price: "",
  guests: "2",
  bedrooms: "1",
  bathrooms: "1",
  hasPool: false,
  rating: "4.9",
  video: "",
  amenities: "Free Wi-Fi, Air conditioning, Kitchen, Parking",
  images: [],
  units: [
    { option: "Whole apartment", amount: "", priceBasis: "per_night", maxGuests: "", video: "" },
  ],
};

const BASIS_OPTIONS: { value: PriceBasis; label: string }[] = [
  { value: "per_night", label: "Per night" },
  { value: "per_stay", label: "Per stay" },
  { value: "per_day", label: "Per day" },
  { value: "monthly", label: "Per month" },
  { value: "quote", label: "On enquiry" },
];

function toEditor(row: VillaRow): EditorState {
  return {
    id: row.id,
    title: row.title ?? "",
    location: row.location ?? "",
    description: row.description ?? "",
    price: row.price !== null && row.price !== undefined ? String(row.price) : "",
    guests: String(row.guests ?? 2),
    bedrooms: String(row.bedrooms ?? 1),
    bathrooms: String(row.bathrooms ?? 1),
    hasPool: Boolean(row.has_pool),
    rating: row.rating !== null && row.rating !== undefined ? String(row.rating) : "4.9",
    video: row.video ?? "",
    amenities: (row.amenities ?? []).join(", "),
    images: row.images ?? [],
    units: (row.rates ?? []).length
      ? (row.rates ?? []).map((unit) => ({
          option: unit.option ?? "",
          amount:
            unit.amount !== null && unit.amount !== undefined ? String(unit.amount) : "",
          priceBasis: (unit.priceBasis as PriceBasis) ?? "per_night",
          maxGuests:
            unit.maxGuests !== null && unit.maxGuests !== undefined
              ? String(unit.maxGuests)
              : "",
          video: unit.video ?? "",
        }))
      : [
          {
            option: "Whole apartment",
            amount: "",
            priceBasis: "per_night",
            maxGuests: "",
            video: "",
          },
        ],
  };
}

export default function ManageVillas() {
  const [villas, setVillas] = useState<VillaRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "" });
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [imagePath, setImagePath] = useState("");
  const fileInput = useRef<HTMLInputElement | null>(null);

  const supabase = useMemo(() => createClient(), []);

  const load = useCallback(async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("villas")
      .select(
        "id, title, location, price, guests, bedrooms, bathrooms, has_pool, image, images, video, description, amenities, rates, rating",
      )
      .order("id", { ascending: true });

    if (error) {
      // `rating` only exists after the migration, so fall back once to the older
      // column list rather than leaving the screen empty.
      const retry = await supabase
        .from("villas")
        .select(
          "id, title, location, price, guests, bedrooms, bathrooms, has_pool, image, images, video, description, amenities, rates",
        )
        .order("id", { ascending: true });

      if (retry.error) {
        setMessage({ text: `Could not load properties: ${retry.error.message}`, type: "error" });
      } else {
        setVillas((retry.data ?? []) as unknown as VillaRow[]);
        setMessage({
          text: "The rating column is missing. Run the latest SQL migration to enable per-property ratings.",
          type: "error",
        });
      }
    } else {
      setVillas((data ?? []) as unknown as VillaRow[]);
    }
    setIsLoading(false);
  }, [supabase]);

  /* eslint-disable react-hooks/set-state-in-effect -- fetch on mount */
  useEffect(() => {
    load();
  }, [load]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const addImage = () => {
    const value = imagePath.trim();
    if (!value || !editor) return;
    if (editor.images.includes(value)) {
      setMessage({ text: "That image is already in the gallery.", type: "error" });
      return;
    }
    setEditor({ ...editor, images: [...editor.images, value] });
    setImagePath("");
  };

  const uploadImage = async (file: File) => {
    if (!editor) return;
    setIsUploading(true);
    const extension = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
    const path = `properties/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extension}`;

    const { error } = await supabase.storage
      .from(MEDIA_BUCKET)
      .upload(path, file, { cacheControl: "31536000", upsert: false });

    if (error) {
      setIsUploading(false);
      setMessage({
        text: `Upload failed: ${error.message}. Create a public Storage bucket named "${MEDIA_BUCKET}" in Supabase, or paste the image path instead.`,
        type: "error",
      });
      return;
    }

    const { data } = supabase.storage.from(MEDIA_BUCKET).getPublicUrl(path);
    setIsUploading(false);

    if (!data?.publicUrl) {
      setMessage({ text: "Uploaded, but no public URL was returned.", type: "error" });
      return;
    }
    setEditor({ ...editor, images: [...editor.images, data.publicUrl] });
    setMessage({ text: "Image uploaded.", type: "success" });
  };

  const moveImage = (index: number, direction: -1 | 1) => {
    if (!editor) return;
    const next = [...editor.images];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setEditor({ ...editor, images: next });
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!editor) return;

    if (!editor.title.trim()) {
      setMessage({ text: "A property name is required.", type: "error" });
      return;
    }

    // Rates are what the booking engine charges, so an empty amount on a
    // published rate would price a night at zero. Refuse instead of saving it.
    const units = editor.units
      .filter((unit) => unit.option.trim())
      .map((unit) => ({
        option: unit.option.trim(),
        amount: unit.amount === "" ? null : Number(unit.amount),
        priceBasis: unit.priceBasis,
        maxGuests: unit.maxGuests === "" ? undefined : Number(unit.maxGuests),
        ...(unit.video.trim() ? { video: unit.video.trim() } : {}),
      }));

    const badUnit = units.find(
      (unit) => unit.priceBasis !== "quote" && (unit.amount === null || Number.isNaN(unit.amount)),
    );
    if (badUnit) {
      setMessage({
        text: `"${badUnit.option}" needs a price, or set its rate to "On enquiry".`,
        type: "error",
      });
      return;
    }

    const payload = {
      title: editor.title.trim(),
      location: editor.location.trim() || null,
      description: editor.description.trim() || null,
      price: editor.price === "" ? 0 : Number(editor.price),
      // Stored as the rule's figure, not whatever the old row said. A four-
      // bedroom house was saved as 4 guests and checkout refused five.
      guests:
        approvedCapacity(Number(editor.bedrooms), Number(editor.guests)) || 1,
      bedrooms: Number(editor.bedrooms) || 0,
      bathrooms: Number(editor.bathrooms) || 0,
      has_pool: editor.hasPool,
      rating: editor.rating === "" ? null : Math.min(5, Math.max(0, Number(editor.rating))),
      video: editor.video.trim() || null,
      amenities: editor.amenities
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
      images: editor.images,
      image: editor.images[0] ?? null,
      rates: units,
    };

    setIsSaving(true);
    const { error } = editor.id
      ? await supabase.from("villas").update(payload).eq("id", editor.id)
      : await supabase.from("villas").insert([payload]);
    setIsSaving(false);

    if (error) {
      // Older databases have no `rating` column. Retrying without it keeps the
      // rest of the edit (price, rates, images) from being lost, and the message
      // says what to run to get the rating working.
      const missingRating = error.message.toLowerCase().includes("rating");
      if (missingRating) {
        const { rating: _rating, ...withoutRating } = payload;
        const retry = editor.id
          ? await supabase.from("villas").update(withoutRating).eq("id", editor.id)
          : await supabase.from("villas").insert([withoutRating]);

        if (!retry.error) {
          setMessage({
            text: "Saved — but the rating was not stored: the `rating` column is missing. Run supabase/migrations/2026-10-30-admin-rating.sql to enable it.",
            type: "error",
          });
          setEditor(null);
          load();
          return;
        }
      }

      setMessage({ text: error.message, type: "error" });
      return;
    }

    setMessage({
      text: editor.id ? "Property updated." : "Property created.",
      type: "success",
    });
    setEditor(null);
    load();
  };

  const remove = async (id: number) => {
    if (!confirm("Delete this property? This cannot be undone.")) return;
    const { error } = await supabase.from("villas").delete().eq("id", id);
    if (error) {
      setMessage({ text: error.message, type: "error" });
      return;
    }
    setMessage({ text: "Property deleted.", type: "success" });
    load();
  };

  return (
    <div className="mx-auto max-w-6xl animate-in fade-in duration-500">
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="mb-2 text-2xl font-semibold tracking-tight text-[var(--color-ink)]">
            Properties
          </h1>
          <p className="text-sm text-slate-500">
            Prices, rates, ratings, photographs and videos — all editable here.
          </p>
        </div>
        <button
          onClick={() => {
            setEditor(EMPTY_EDITOR);
            setMessage({ text: "", type: "" });
          }}
          className="btn-ink flex items-center gap-2 rounded-xl px-5 py-3 text-sm"
        >
          <Plus size={18} /> Add property
        </button>
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

      {isLoading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="animate-spin text-slate-900" size={40} />
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-[var(--color-line-soft)] bg-white shadow-[var(--shadow-raise)]">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-400">
                  <th className="py-4 px-6">Property</th>
                  <th className="py-4 px-6">Location</th>
                  <th className="py-4 px-6">Headline price</th>
                  <th className="py-4 px-6">Rates</th>
                  <th className="py-4 px-6">Rating</th>
                  <th className="py-4 px-6">Media</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                {villas.map((villa) => (
                  <tr key={villa.id} className="transition-colors hover:bg-slate-50/50">
                    <td className="py-3 px-6">
                      <div className="flex items-center gap-3">
                        {villa.image ? (
                          <img
                            src={villa.image}
                            alt=""
                            className="h-10 w-14 rounded-md object-cover"
                          />
                        ) : (
                          <span className="flex h-10 w-14 items-center justify-center rounded-md bg-slate-100 text-slate-400">
                            <ImagePlus size={14} />
                          </span>
                        )}
                        <span className="font-medium text-slate-900">
                          {villa.title ?? `Property ${villa.id}`}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-6 text-slate-500">{villa.location ?? "—"}</td>
                    <td className="py-3 px-6 font-semibold text-slate-900">
                      {villa.price ? `₵${Number(villa.price).toLocaleString()}` : "—"}
                    </td>
                    <td className="py-3 px-6 text-slate-500">
                      {(villa.rates ?? []).length} rate
                      {(villa.rates ?? []).length === 1 ? "" : "s"}
                    </td>
                    <td className="py-3 px-6">
                      <span className="inline-flex items-center gap-1 text-slate-700">
                        <Star size={12} className="fill-amber-400 text-amber-400" />
                        {villa.rating !== null && villa.rating !== undefined
                          ? Number(villa.rating).toFixed(1)
                          : "—"}
                      </span>
                    </td>
                    <td className="py-3 px-6 text-slate-500">
                      {(villa.images ?? []).length} photo
                      {(villa.images ?? []).length === 1 ? "" : "s"}
                      {villa.video ? " · video" : ""}
                    </td>
                    <td className="py-3 px-6">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => {
                            setEditor(toEditor(villa));
                            setMessage({ text: "", type: "" });
                          }}
                          className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
                          title="Edit property"
                        >
                          <Pencil size={17} />
                        </button>
                        <button
                          onClick={() => remove(villa.id)}
                          className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500"
                          title="Delete property"
                        >
                          <Trash2 size={17} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {villas.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      No properties yet. Use “Add property” to create one.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ---------------- Editor ---------------- */}
      {editor && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="flex h-full w-full max-w-2xl flex-col overflow-y-auto bg-white p-6 shadow-2xl animate-in slide-in-from-right duration-300 sm:p-8">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="font-serif text-2xl text-slate-900">
                {editor.id ? "Edit property" : "New property"}
              </h2>
              <button
                onClick={() => setEditor(null)}
                className="rounded-full p-2 transition-colors hover:bg-slate-100"
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>

            <form id="villa-form" onSubmit={save} className="space-y-6">
              {/* Basics */}
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">
                  Property name
                </label>
                <input
                  required
                  value={editor.title}
                  onChange={(event) => setEditor({ ...editor, title: event.target.value })}
                  placeholder="e.g. Airport Residential Suite"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-blue-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">
                  Location line
                </label>
                <input
                  value={editor.location}
                  onChange={(event) => setEditor({ ...editor, location: event.target.value })}
                  placeholder="Greater Accra • Adenta"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-blue-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">
                  Description
                </label>
                <textarea
                  rows={4}
                  value={editor.description}
                  onChange={(event) =>
                    setEditor({ ...editor, description: event.target.value })
                  }
                  className="w-full resize-none rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-blue-600 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div>
                  <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">
                    Guests
                  </label>
                  {capacityIsApprovedByRule(Number(editor.bedrooms)) ? (
                    <>
                      <input
                        type="number"
                        value={approvedCapacity(Number(editor.bedrooms), Number(editor.guests))}
                        readOnly
                        aria-describedby="guests-rule"
                        className="w-full cursor-not-allowed rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600"
                      />
                      <p id="guests-rule" className="mt-1 text-[11px] leading-relaxed text-slate-500">
                        {capacityRuleNote(Number(editor.bedrooms))}
                      </p>
                    </>
                  ) : (
                    <input
                      type="number"
                      min={1}
                      value={editor.guests}
                      onChange={(event) => setEditor({ ...editor, guests: event.target.value })}
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-blue-600 focus:outline-none"
                    />
                  )}
                </div>
                <div>
                  <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">
                    Bedrooms
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={editor.bedrooms}
                    onChange={(event) => setEditor({ ...editor, bedrooms: event.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-blue-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">
                    Bathrooms
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={editor.bathrooms}
                    onChange={(event) => setEditor({ ...editor, bathrooms: event.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-blue-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">
                    Rating (0–5)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={5}
                    step={0.1}
                    value={editor.rating}
                    onChange={(event) => setEditor({ ...editor, rating: event.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-blue-600 focus:outline-none"
                  />
                </div>
              </div>

              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={editor.hasPool}
                  onChange={(event) => setEditor({ ...editor, hasPool: event.target.checked })}
                  className="h-4 w-4 accent-[var(--color-ink)]"
                />
                <span className="text-sm text-slate-700">This property has a pool</span>
              </label>

              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">
                  Headline price (₵)
                </label>
                <input
                  type="number"
                  min={0}
                  value={editor.price}
                  onChange={(event) => setEditor({ ...editor, price: event.target.value })}
                  placeholder="2000"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-blue-600 focus:outline-none"
                />
                <p className="mt-1.5 text-[11px] leading-relaxed text-slate-500">
                  Used only on the listing card when no rates are set. The booking
                  total always comes from the rates below.
                </p>
              </div>

              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">
                  Amenities (comma separated)
                </label>
                <input
                  value={editor.amenities}
                  onChange={(event) => setEditor({ ...editor, amenities: event.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-blue-600 focus:outline-none"
                />
              </div>

              {/* Rates */}
              <div className="rounded-xl border border-slate-200 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Bookable rates</h3>
                    <p className="text-[11px] text-slate-500">
                      What guests are actually charged. Add one per room type.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setEditor({
                        ...editor,
                        units: [
                          ...editor.units,
                          { option: "", amount: "", priceBasis: "per_night", maxGuests: "", video: "" },
                        ],
                      })
                    }
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    <Plus size={13} /> Add rate
                  </button>
                </div>

                <div className="space-y-3">
                  {editor.units.map((unit, index) => (
                    <div key={index} className="grid grid-cols-12 gap-2">
                      <input
                        value={unit.option}
                        onChange={(event) => {
                          const next = [...editor.units];
                          next[index] = { ...unit, option: event.target.value };
                          setEditor({ ...editor, units: next });
                        }}
                        placeholder="Whole apartment"
                        className="col-span-12 rounded-lg border border-slate-200 px-3 py-2 text-sm sm:col-span-4"
                      />
                      <input
                        type="number"
                        min={0}
                        value={unit.amount}
                        onChange={(event) => {
                          const next = [...editor.units];
                          next[index] = { ...unit, amount: event.target.value };
                          setEditor({ ...editor, units: next });
                        }}
                        placeholder="Amount"
                        className="col-span-4 rounded-lg border border-slate-200 px-3 py-2 text-sm sm:col-span-3"
                      />
                      <select
                        value={unit.priceBasis}
                        onChange={(event) => {
                          const next = [...editor.units];
                          next[index] = { ...unit, priceBasis: event.target.value as PriceBasis };
                          setEditor({ ...editor, units: next });
                        }}
                        className="col-span-5 rounded-lg border border-slate-200 px-2 py-2 text-sm sm:col-span-3"
                      >
                        {BASIS_OPTIONS.map((basis) => (
                          <option key={basis.value} value={basis.value}>
                            {basis.label}
                          </option>
                        ))}
                      </select>
                      <div className="col-span-3 flex gap-1 sm:col-span-2">
                        <input
                          type="number"
                          min={1}
                          value={unit.maxGuests}
                          onChange={(event) => {
                            const next = [...editor.units];
                            next[index] = { ...unit, maxGuests: event.target.value };
                            setEditor({ ...editor, units: next });
                          }}
                          placeholder="Max"
                          title="Maximum guests for this rate"
                          className="w-full rounded-lg border border-slate-200 px-2 py-2 text-sm"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setEditor({
                              ...editor,
                              units: editor.units.filter((_, i) => i !== index),
                            })
                          }
                          disabled={editor.units.length === 1}
                          aria-label="Remove rate"
                          className="rounded-lg border border-red-100 p-1.5 text-red-600 hover:bg-red-50 disabled:opacity-30"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                      {/* Optional clip of this room. Leave blank to show only the
                          property walkthrough and the photographs. */}
                      <input
                        value={unit.video}
                        onChange={(event) => {
                          const next = [...editor.units];
                          next[index] = { ...unit, video: event.target.value };
                          setEditor({ ...editor, units: next });
                        }}
                        placeholder={`Clip for this room only (optional), e.g. /aburi-studio.mp4`}
                        aria-label={`Video clip for ${unit.option || "this rate"}`}
                        className="col-span-12 rounded-lg border border-slate-100 bg-slate-50 px-3 py-1.5 text-xs text-slate-700"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Images */}
              <div className="rounded-xl border border-slate-200 p-4">
                <h3 className="text-sm font-bold text-slate-900">Photographs</h3>
                <p className="mb-3 text-[11px] text-slate-500">
                  The first image is the listing card. Every image here appears in
                  the property gallery.
                </p>

                {editor.images.length > 0 && (
                  <ul className="mb-3 space-y-2">
                    {editor.images.map((src, index) => (
                      <li
                        key={src + index}
                        className="flex items-center gap-3 rounded-lg border border-slate-100 p-2"
                      >
                        <img src={src} alt="" className="h-12 w-16 rounded object-cover" />
                        <span className="min-w-0 flex-1 truncate text-xs text-slate-600">
                          {src}
                          {index === 0 && (
                            <span className="ml-2 rounded bg-slate-900 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white">
                              cover
                            </span>
                          )}
                        </span>
                        <div className="flex gap-1">
                          <button
                            type="button"
                            onClick={() => moveImage(index, -1)}
                            disabled={index === 0}
                            aria-label="Move up"
                            className="rounded border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-50 disabled:opacity-30"
                          >
                            <ArrowUp size={12} />
                          </button>
                          <button
                            type="button"
                            onClick={() => moveImage(index, 1)}
                            disabled={index === editor.images.length - 1}
                            aria-label="Move down"
                            className="rounded border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-50 disabled:opacity-30"
                          >
                            <ArrowDown size={12} />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setEditor({
                                ...editor,
                                images: editor.images.filter((_, i) => i !== index),
                              })
                            }
                            aria-label="Remove image"
                            className="rounded border border-red-100 p-1.5 text-red-600 hover:bg-red-50"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}

                <div className="flex flex-col gap-2 sm:flex-row">
                  <input
                    value={imagePath}
                    onChange={(event) => setImagePath(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        addImage();
                      }
                    }}
                    placeholder="/Lake2.jpg or https://…"
                    className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  />
                  <button
                    type="button"
                    onClick={addImage}
                    className="inline-flex items-center justify-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    <Plus size={13} /> Add
                  </button>
                  <button
                    type="button"
                    onClick={() => fileInput.current?.click()}
                    disabled={isUploading}
                    className="inline-flex items-center justify-center gap-1 rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
                  >
                    {isUploading ? (
                      <Loader2 size={13} className="animate-spin" />
                    ) : (
                      <Upload size={13} />
                    )}
                    Upload
                  </button>
                  <input
                    ref={fileInput}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) uploadImage(file);
                      event.target.value = "";
                    }}
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">
                  Walkthrough video (path or URL)
                </label>
                <input
                  value={editor.video}
                  onChange={(event) => setEditor({ ...editor, video: event.target.value })}
                  placeholder="/aburi.mp4"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-blue-600 focus:outline-none"
                />
              </div>
            </form>

            <div className="mt-8 flex gap-4 border-t border-slate-100 pt-6">
              <button
                type="button"
                onClick={() => setEditor(null)}
                className="w-1/3 rounded-xl border border-slate-200 py-3.5 text-sm font-bold text-slate-500 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="villa-form"
                disabled={isSaving}
                className="btn-ink flex w-2/3 items-center justify-center gap-2 rounded-xl py-3.5 text-sm"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="animate-spin" size={16} /> Saving…
                  </>
                ) : (
                  "Save property"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
