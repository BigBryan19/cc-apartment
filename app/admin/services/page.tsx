// app/admin/services/page.tsx
// ---------------------------------------------------------------------------
// Owner control for the Experiences & services cards.
//
// Each row here is one card on the public site. The owner sets three things:
//
//   • whether the card is shown;
//   • its price (leave blank for "Enquire for pricing");
//   • whether the button books the service with a stay or opens a WhatsApp
//     enquiry.
//
// Saved rows live in `service_settings` and are read by the services section and
// by the booking add-on list, so the card and the charge cannot disagree. With no
// row saved, the approved figures in app/lib/services.ts apply.
// ---------------------------------------------------------------------------

"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { createClient, isSupabaseConfigured } from "../../utils/supabase";
import { SERVICES } from "../../lib/services";
import {
  defaultServiceSettings,
  toServiceSetting,
  type ServiceSetting,
} from "../../lib/service-settings";

export default function AdminServicesPage() {
  const [rows, setRows] = useState<ServiceSetting[]>(defaultServiceSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setLoading(false);
      return;
    }
    const supabase = createClient();
    supabase
      .from("service_settings")
      .select("service_id, amount, active, cta")
      .then(({ data, error: readError }) => {
        if (readError) {
          setError(
            "Could not read service_settings. Run the migration in supabase/migrations first.",
          );
        } else if (data?.length) {
          const saved = (data as Record<string, unknown>[])
            .map(toServiceSetting)
            .filter((entry): entry is ServiceSetting => entry !== null);
          // Merge: a card with no saved row keeps its approved default.
          setRows((current) =>
            current.map((row) => saved.find((entry) => entry.serviceId === row.serviceId) ?? row),
          );
        }
        setLoading(false);
      });
  }, []);

  const update = (serviceId: string, patch: Partial<ServiceSetting>) =>
    setRows((current) =>
      current.map((row) => (row.serviceId === serviceId ? { ...row, ...patch } : row)),
    );

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
        updated_at: new Date().toISOString(),
      })),
      { onConflict: "service_id" },
    );

    setSaving(false);
    if (writeError) {
      setError(writeError.message);
      return;
    }
    setMessage("Saved. The services section updates on the next load.");
  };

  return (
    <div className="mx-auto max-w-4xl p-6 md:p-8">
      <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Services</h1>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-500">
        These are the cards under &ldquo;Experiences &amp; services&rdquo;. A card with a
        price can be added to a stay; one without a price asks the guest to enquire.
        Leave the price blank to show &ldquo;Enquire for pricing&rdquo;.
      </p>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button
          onClick={save}
          disabled={saving || loading}
          className="rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save changes"}
        </button>
        <Link href="/admin" className="text-sm font-medium text-slate-500 underline">
          Back to dashboard
        </Link>
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

      <div className="mt-6 space-y-3">
        {rows.map((row) => {
          const service = SERVICES.find((entry) => entry.id === row.serviceId);
          return (
            <div
              key={row.serviceId}
              className="grid grid-cols-1 gap-4 rounded-xl border border-slate-200 p-4 sm:grid-cols-12 sm:items-center"
            >
              <div className="sm:col-span-4">
                <p className="text-sm font-semibold text-slate-900">
                  {service?.name ?? row.serviceId}
                </p>
                <p className="text-xs text-slate-500">{service?.tagline}</p>
              </div>

              <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 sm:col-span-3">
                Price (GHS)
                <input
                  value={row.amount === null ? "" : String(row.amount)}
                  onChange={(event) =>
                    update(row.serviceId, {
                      amount: event.target.value.trim() === "" ? null : Number(event.target.value),
                    })
                  }
                  inputMode="decimal"
                  placeholder="Blank = enquire"
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-normal normal-case tracking-normal text-slate-900"
                />
              </label>

              <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 sm:col-span-3">
                Button
                <select
                  value={row.cta}
                  onChange={(event) =>
                    update(row.serviceId, { cta: event.target.value as ServiceSetting["cta"] })
                  }
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-normal normal-case tracking-normal text-slate-900"
                >
                  <option value="book">Add to a stay</option>
                  <option value="enquire">WhatsApp enquiry</option>
                </select>
              </label>

              <label className="flex items-center gap-2 text-sm text-slate-700 sm:col-span-2">
                <input
                  type="checkbox"
                  checked={row.active}
                  onChange={(event) => update(row.serviceId, { active: event.target.checked })}
                  className="h-4 w-4"
                />
                Shown
              </label>
            </div>
          );
        })}
      </div>

      <p className="mt-6 text-xs leading-relaxed text-slate-500">
        Saving needs the <code className="font-mono">service_settings</code> table.
        If saving fails, run the migration in{" "}
        <code className="font-mono">supabase/migrations/2026-11-03-services.sql</code>.
      </p>
    </div>
  );
}
