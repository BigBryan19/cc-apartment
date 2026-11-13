// app/admin/house-rules/page.tsx
// ---------------------------------------------------------------------------
// Add, reword, reorder, hide or delete the house rules shown to guests on
// /verify.
//
// Order is a plain number: lower appears first. Hiding a rule keeps its words but
// takes it off the guest page, which is usually what you want for a seasonal
// rule rather than deleting and retyping it.
// ---------------------------------------------------------------------------

"use client";

import React, { useCallback, useEffect, useState } from "react";
import { AlertCircle, Check, GripVertical, Loader2, Plus, Trash2 } from "lucide-react";
import { useAlertToast } from "../../lib/use-toast-message";
import { createClient, isSupabaseConfigured } from "../../utils/supabase";

const TABLE = "house_rules";

interface Rule {
  id: string;
  title: string;
  body: string | null;
  active: boolean;
  sort_order: number;
  /** Present for rows added in this session, so a new rule can be typed before it is saved. */
  isNew?: boolean;
}

export default function HouseRulesPage() {
  const configured = isSupabaseConfigured();
  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  useAlertToast(error, message);

  const load = useCallback(async () => {
    if (!configured) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error: readError } = await createClient()
      .from(TABLE)
      .select("id, title, body, active, sort_order")
      .order("sort_order", { ascending: true });

    if (readError) setError(readError.message);
    else setRules((data ?? []) as Rule[]);
    setLoading(false);
  }, [configured]);

  useEffect(() => {
    void load();
  }, [load]);

  const update = (id: string, patch: Partial<Rule>) =>
    setRules((prev) => prev.map((rule) => (rule.id === id ? { ...rule, ...patch } : rule)));

  const addRule = () => {
    const nextOrder = rules.length ? Math.max(...rules.map((r) => r.sort_order)) + 10 : 10;
    setRules((prev) => [
      ...prev,
      {
        id: `new-${Date.now()}`,
        title: "",
        body: "",
        active: true,
        sort_order: nextOrder,
        isNew: true,
      },
    ]);
  };

  const removeRule = async (rule: Rule) => {
    if (rule.isNew) {
      setRules((prev) => prev.filter((entry) => entry.id !== rule.id));
      return;
    }
    setRules((prev) => prev.filter((entry) => entry.id !== rule.id));
    const { error: deleteError } = await createClient().from(TABLE).delete().eq("id", rule.id);
    if (deleteError) {
      setError(deleteError.message);
      await load();
    }
  };

  async function saveAll() {
    setError("");
    setMessage("");
    if (!configured) return;

    const invalid = rules.find((rule) => !rule.title.trim());
    if (invalid) {
      setError("Every rule needs a title. Give it one, or delete the empty rule.");
      return;
    }

    setSaving(true);
    const client = createClient();

    const payload = rules.map((rule) => ({
      title: rule.title.trim(),
      body: rule.body?.trim() || null,
      active: rule.active,
      sort_order: rule.sort_order,
      updated_at: new Date().toISOString(),
    }));

    /*
     * Existing rules are updated by id; new ones are inserted and receive their
     * id back, so a second save is an update rather than a duplicate.
     */
    for (const [index, rule] of rules.entries()) {
      const row = payload[index];

      if (rule.isNew) {
        const { data, error: insertError } = await client
          .from(TABLE)
          .insert(row)
          .select("id")
          .single();
        if (insertError) {
          setError(insertError.message);
          setSaving(false);
          return;
        }
        update(rule.id, { id: (data as { id: string }).id, isNew: false });
      } else {
        const { error: updateError } = await client.from(TABLE).update(row).eq("id", rule.id);
        if (updateError) {
          setError(updateError.message);
          setSaving(false);
          return;
        }
      }
    }

    setSaving(false);
    setMessage("Saved. The guest page shows the new wording immediately.");
    await load();
  }

  return (
    <div className="p-8 max-w-3xl">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">House rules</h1>
          <p className="mt-1 text-sm text-slate-500">
            Shown to every guest on the check-in page, under their details. Lower numbers appear
            first.
          </p>
        </div>
        <button
          type="button"
          onClick={addRule}
          className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white"
        >
          <Plus className="h-4 w-4" /> Add rule
        </button>
      </div>


      {loading ? (
        <p className="mt-8 inline-flex items-center gap-2 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </p>
      ) : (
        <div className="mt-6 space-y-4">
          {rules.length === 0 && (
            <p className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
              No rules yet. Add one, or run the house-rules migration to load the starter set.
            </p>
          )}

          {rules.map((rule) => (
            <div
              key={rule.id}
              className={`rounded-2xl border bg-white p-5 ${
                rule.active ? "border-slate-200" : "border-dashed border-slate-300 opacity-70"
              }`}
            >
              <div className="flex items-start gap-3">
                <GripVertical className="mt-2.5 h-4 w-4 shrink-0 text-slate-300" />
                <div className="grid flex-1 gap-3 sm:grid-cols-[1fr_5rem]">
                  <input
                    value={rule.title}
                    onChange={(event) => update(rule.id, { title: event.target.value })}
                    placeholder="Rule title, e.g. No smoking indoors"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium outline-none focus:border-slate-900"
                  />
                  <input
                    type="number"
                    value={rule.sort_order}
                    onChange={(event) =>
                      update(rule.id, { sort_order: Number(event.target.value) || 0 })
                    }
                    aria-label="Order"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-900"
                  />
                  <textarea
                    value={rule.body ?? ""}
                    onChange={(event) => update(rule.id, { body: event.target.value })}
                    placeholder="One or two sentences of detail (optional)"
                    rows={2}
                    className="sm:col-span-2 w-full resize-y rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-900"
                  />
                </div>
                <div className="flex flex-col items-end gap-3">
                  <label className="inline-flex items-center gap-2 text-xs text-slate-600">
                    <input
                      type="checkbox"
                      checked={rule.active}
                      onChange={(event) => update(rule.id, { active: event.target.checked })}
                      className="h-4 w-4 rounded border-slate-300"
                    />
                    Shown
                  </label>
                  <button
                    type="button"
                    onClick={() => void removeRule(rule)}
                    aria-label={`Delete ${rule.title || "rule"}`}
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-8 flex items-center gap-3">
        <button
          type="button"
          onClick={() => void saveAll()}
          disabled={saving || !configured}
          className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
        >
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          {saving ? "Saving…" : "Save changes"}
        </button>
        <a href="/admin" className="text-sm text-slate-500 underline underline-offset-4">
          Back to dashboard
        </a>
      </div>
    </div>
  );
}
