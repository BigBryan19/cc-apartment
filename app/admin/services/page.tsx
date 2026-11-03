// app/admin/services/page.tsx
// ---------------------------------------------------------------------------
// Owner control for the Experiences & services cards.
//
// Three cards to a row on a desktop, two on a tablet, one on a phone. Each card
// shows its photograph and the two settings that change day to day — price and
// button — with the wording and image inside "Wording & photo" so the page stays
// short.
//
// Saved rows live in `service_settings` and are read by both the public services
// section and the booking add-on list, so the card and the charge cannot
// disagree. With no row saved, the approved figures in app/lib/services.ts apply.
// ---------------------------------------------------------------------------

"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronDown, ImagePlus, Plus, Trash2 } from "lucide-react";
import { createClient, isSupabaseConfigured } from "../../utils/supabase";
import { SERVICES } from "../../lib/services";
import {
  defaultServiceSettings,
  toServiceSetting,
  type ServiceSetting,
} from "../../lib/service-settings";

const BUCKET = "villa-media";

export default function AdminServicesPage() {
  const [rows, setRows] = useState<ServiceSetting[]>(defaultServiceSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState<string | null>(null);
  /** Ids removed in this session, deleted from the table when Save is pressed. */
  const [removed, setRemoved] = useState<string[]>([]);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setLoading(false);
      return;
    }
    const supabase = createClient();
    // `*` rather than a column list: naming a column that does not exist makes
    // the whole read fail, and the page then claims the table is missing.
    supabase
      .from("service_settings")
      .select("*")
      .then(({ data, error: readError }) => {
        if (readError) {
          setError(`Could not read service_settings: ${readError.message}`);
        } else if (data?.length) {
          const saved = (data as Record<string, unknown>[])
            .map(toServiceSetting)
            .filter((entry): entry is ServiceSetting => entry !== null);
          setRows((current) =>
            current.map((row) => saved.find((entry) => entry.serviceId === row.serviceId) ?? row),
          );
        }
        setLoading(false);
      });
  }, []);

  /** Adds a blank card. It is not saved until Save changes is pressed. */
  const addService = () => {
    const id = `custom-${Date.now().toString(36)}`;
    setRows((current) => [
      ...current,
      {
        serviceId: id,
        amount: null,
        active: true,
        cta: "enquire",
        title: "",
        description: "",
        image: null,
        imageAlt: null,
        sortOrder: (current.at(-1)?.sortOrder ?? 0) + 10,
      },
    ]);
    setOpen((current) => ({ ...current, [id]: true }));
  };

  const removeService = (serviceId: string) => {
    setRows((current) => current.filter((row) => row.serviceId !== serviceId));
    setRemoved((current) => [...current, serviceId]);
  };

  const update = (serviceId: string, patch: Partial<ServiceSetting>) =>
    setRows((current) =>
      current.map((row) => (row.serviceId === serviceId ? { ...row, ...patch } : row)),
    );

  const upload = async (serviceId: string, file: File) => {
    setUploading(serviceId);
    setError(null);
    const supabase = createClient();
    const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `services/${serviceId}-${Date.now()}.${extension}`;
    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(path, file, { cacheControl: "31536000" });
    setUploading(null);

    if (uploadError) {
      setError(`Upload failed: ${uploadError.message}`);
      return;
    }
    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
    update(serviceId, { image: data.publicUrl });
    setMessage("Photograph uploaded. Press Save changes to publish it.");
  };

  const save = async () => {
    if (!isSupabaseConfigured()) {
      setError("Supabase is not configured on this deployment.");
      return;
    }
    setSaving(true);
    setError(null);
    setMessage(null);

    const supabase = createClient();
    const { error: writeError } = await supabase.from("service_settings").upsert(
      rows.map((row) => ({
        service_id: row.serviceId,
        amount: row.amount,
        active: row.active,
        cta: row.cta,
        title: row.title,
        description: row.description,
        image: row.image,
        image_alt: row.imageAlt,
        sort_order: row.sortOrder,
        updated_at: new Date().toISOString(),
      })),
      { onConflict: "service_id" },
    );

    if (writeError) {
      /*
       * A column that does not exist yet would reject the whole row. Price,
       * button and visibility are the settings that matter most, so they are
       * saved on their own and the missing copy columns are reported plainly.
       */
      if (/column|schema cache/i.test(writeError.message)) {
        const { error: retryError } = await supabase.from("service_settings").upsert(
          rows.map((row) => ({
            service_id: row.serviceId,
            amount: row.amount,
            active: row.active,
            cta: row.cta,
            updated_at: new Date().toISOString(),
          })),
          { onConflict: "service_id" },
        );
        setSaving(false);
        if (retryError) {
          setError(retryError.message);
          return;
        }
        setMessage(
          "Saved price, button and visibility. The wording and photo fields need the four extra columns — run supabase/FIX-service-settings.sql.",
        );
        return;
      }
      setSaving(false);
      setError(writeError.message);
      return;
    }
    if (removed.length) {
      await supabase.from("service_settings").delete().in("service_id", removed);
      setRemoved([]);
    }

    setSaving(false);
    setMessage("Saved. The services section updates on the next load.");
  };

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-ink)]">
            Services
          </h1>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-slate-500">
            The cards under &ldquo;Experiences &amp; services&rdquo;. A price makes a card
            bookable; leave it blank to show &ldquo;Enquire for pricing&rdquo;.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/admin" className="text-sm font-medium text-slate-500 hover:text-slate-900">
            Back
          </Link>
          <button
            onClick={addService}
            disabled={saving || loading}
            className="flex items-center gap-1.5 rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm font-semibold text-slate-800 disabled:opacity-50"
          >
            <Plus size={15} /> Add service
          </button>
          <button
            onClick={save}
            disabled={saving || loading}
            className="rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </div>

      {error && (
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {error}
        </p>
      )}
      {message && (
        <p className="mt-4 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">
          {message}
        </p>
      )}

      <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
        {rows.map((row) => {
          const service = SERVICES.find((entry) => entry.id === row.serviceId);
          const image = row.image ?? service?.image;
          const isOpen = open[row.serviceId] ?? false;

          return (
            <div
              key={row.serviceId}
              className={`flex flex-col overflow-hidden rounded-2xl border bg-white shadow-[var(--shadow-raise)] transition-opacity ${
                row.active
                  ? "border-[var(--color-line-soft)]"
                  : "border-dashed border-slate-300 opacity-60"
              }`}
            >
              <div className="relative h-40 w-full overflow-hidden bg-slate-100">
                {image ? (
                  <img src={image} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-slate-400">
                    <ImagePlus size={22} />
                  </div>
                )}
                <label className="absolute bottom-2 right-2 cursor-pointer rounded-lg bg-black/60 px-2.5 py-1.5 text-[11px] font-semibold text-white backdrop-blur-sm">
                  {uploading === row.serviceId ? "Uploading…" : "Replace photo"}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      event.target.value = "";
                      if (file) void upload(row.serviceId, file);
                    }}
                  />
                </label>
              </div>

              <div className="flex flex-1 flex-col p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h2 className="truncate text-sm font-semibold text-slate-900">
                      {row.title ?? service?.name ?? row.serviceId}
                    </h2>
                    <p className="truncate text-xs text-slate-500">{service?.tagline}</p>
                  </div>
                  <label className="flex shrink-0 items-center gap-1.5 text-[11px] font-medium text-slate-600">
                    <input
                      type="checkbox"
                      checked={row.active}
                      onChange={(event) => update(row.serviceId, { active: event.target.checked })}
                      className="h-3.5 w-3.5"
                    />
                    Shown
                  </label>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Price (GHS)
                    <input
                      value={row.amount === null ? "" : String(row.amount)}
                      onChange={(event) =>
                        update(row.serviceId, {
                          amount:
                            event.target.value.trim() === "" ? null : Number(event.target.value),
                        })
                      }
                      inputMode="decimal"
                      placeholder="Enquire"
                      className="mt-1 w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm font-normal normal-case tracking-normal text-slate-900"
                    />
                  </label>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Button
                    <select
                      value={row.cta}
                      onChange={(event) =>
                        update(row.serviceId, { cta: event.target.value as ServiceSetting["cta"] })
                      }
                      className="mt-1 w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm font-normal normal-case tracking-normal text-slate-900"
                    >
                      <option value="book">Book</option>
                      <option value="enquire">Enquire</option>
                    </select>
                  </label>
                </div>

                <button
                  type="button"
                  onClick={() => removeService(row.serviceId)}
                  className="mt-2 flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-semibold text-red-600 hover:bg-red-50"
                >
                  <Trash2 size={12} /> Remove
                </button>

                <button
                  type="button"
                  onClick={() => setOpen((current) => ({ ...current, [row.serviceId]: !isOpen }))}
                  aria-expanded={isOpen}
                  className="mt-3 flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-slate-600"
                >
                  Wording &amp; photo
                  <ChevronDown
                    size={14}
                    className={`transition-transform ${isOpen ? "rotate-180" : ""}`}
                  />
                </button>

                {isOpen && (
                  <div className="mt-3 space-y-3">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      Card title
                      <input
                        value={row.title ?? ""}
                        onChange={(event) =>
                          update(row.serviceId, { title: event.target.value.trim() || null })
                        }
                        placeholder={service?.name}
                        className="mt-1 w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm font-normal normal-case tracking-normal text-slate-900"
                      />
                    </label>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      Description
                      <textarea
                        value={row.description ?? ""}
                        onChange={(event) =>
                          update(row.serviceId, { description: event.target.value.trim() || null })
                        }
                        placeholder={service?.description}
                        rows={3}
                        className="mt-1 w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm font-normal normal-case tracking-normal text-slate-900"
                      />
                    </label>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      Photograph path or URL
                      <input
                        value={row.image ?? ""}
                        onChange={(event) =>
                          update(row.serviceId, { image: event.target.value.trim() || null })
                        }
                        placeholder={service?.image}
                        className="mt-1 w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-normal normal-case tracking-normal text-slate-900"
                      />
                    </label>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <p className="mt-6 text-xs leading-relaxed text-slate-500">
        Saving needs the <code className="font-mono">service_settings</code> table and its four
        copy columns. If saving fails, run{" "}
        <code className="font-mono">supabase/migrations/2026-11-03-services.sql</code>.
      </p>
    </div>
  );
}
