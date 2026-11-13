// app/admin/verifications/page.tsx
// ---------------------------------------------------------------------------
// Guest registration queue.
//
// WHAT THIS IS FOR
//
//   /verify writes a row for every arrival: name, three contact channels, the
//   document they presented, the nights, and their declaration. Until this page
//   existed nothing in the panel read that table — the records and the ID photos
//   were only reachable by opening the Supabase dashboard.
//
// THE RULES OF THIS PAGE
//
//   1. Nothing is guessed. A record with no booking reference says so, and the
//      field is empty rather than carrying a placeholder that looks like data.
//   2. The photographs are never public. The bucket is private, so a row is
//      asked for a short-lived signed URL (two minutes) only when it is opened,
//      and the URL is kept in memory for that session, not written down.
//   3. Rejecting requires a reason. "Rejected" with no explanation is a dead end
//      for whoever reads the record next.
//   4. Deleting is limited to abandoned drafts — a guest who opened the form,
//      typed a name and never submitted. A submitted record is never deleted
//      from this page; it is verified or rejected.
// ---------------------------------------------------------------------------

"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Check,
  ChevronDown,
  ExternalLink,
  Loader2,
  Phone,
  Search,
  ShieldCheck,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { createClient, isSupabaseConfigured } from "../../utils/supabase";

/* -------------------------------------------------------------------------- */
/*  Types                                                                      */
/* -------------------------------------------------------------------------- */

type VerificationStatus = "draft" | "submitted" | "verified" | "rejected";

interface VerificationRow {
  id: string;
  session_id: string;
  booking_reference: string | null;
  full_name: string | null;
  contact_number: string | null;
  whatsapp_number: string | null;
  email: string | null;
  id_type: string | null;
  id_photo_path: string | null;
  photo_path: string | null;
  check_in_date: string | null;
  check_out_date: string | null;
  guests_count: number | null;
  emergency_name: string | null;
  emergency_relationship: string | null;
  emergency_phone: string | null;
  declared_accurate: boolean | null;
  accepted_rules: boolean | null;
  status: VerificationStatus;
  rejection_reason: string | null;
  reviewed_at: string | null;
  submitted_at: string | null;
  created_at: string;
  updated_at: string;
}

type Filter = "all" | VerificationStatus;

const STATUS_LABELS: Record<VerificationStatus, string> = {
  draft: "Draft",
  submitted: "Submitted",
  verified: "Verified",
  rejected: "Rejected",
};

/**
 * Status colours, on the same palette as the rest of the panel: amber means
 * "somebody has to do something", green is done, red was refused, slate is a
 * draft that nobody has finished.
 */
const STATUS_STYLES: Record<VerificationStatus, string> = {
  draft: "bg-slate-100 text-slate-600 border-slate-200",
  submitted: "bg-amber-50 text-amber-800 border-amber-200",
  verified: "bg-green-50 text-green-700 border-green-200",
  rejected: "bg-red-50 text-red-700 border-red-200",
};

const ID_TYPE_LABELS: Record<string, string> = {
  ghana_card: "Ghana Card",
  passport: "Passport",
  drivers_licence: "Driver's Licence",
};

/** A draft is abandoned once it has not been touched for this long. */
const ABANDONED_AFTER_HOURS = 24;

/* -------------------------------------------------------------------------- */
/*  Formatting                                                                 */
/* -------------------------------------------------------------------------- */

function formatDate(value: string | null): string {
  if (!value) return "—";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" }).format(date);
}

function formatStamp(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

/** Digits only, so "024 123 4567" and "+233241234567" can be compared. */
function digits(value: string | null): string {
  return (value ?? "").replace(/\D/g, "");
}

function stayLabel(row: VerificationRow): string {
  if (!row.check_in_date && !row.check_out_date) return "—";
  return `${formatDate(row.check_in_date)} → ${formatDate(row.check_out_date)}`;
}

/* -------------------------------------------------------------------------- */
/*  Page                                                                       */
/* -------------------------------------------------------------------------- */

export default function VerificationsQueue({
  initialOpenId = null,
}: {
  /** From `?open=<id>`, so the office alert can link straight to a record. */
  initialOpenId?: string | null;
}) {
  const configured = isSupabaseConfigured();

  const [rows, setRows] = useState<VerificationRow[]>([]);
  const [isLoading, setIsLoading] = useState(configured);
  /**
   * Read failures keep a home in the table body rather than only a toast: a
   * toast that has faded leaves somebody staring at an empty queue with no idea
   * why. Action outcomes are transient by nature and go to a toast.
   */
  const [loadError, setLoadError] = useState("");

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("submitted");
  const [openId, setOpenId] = useState<string | null>(initialOpenId);

  /** path → signed URL, or the reason it could not be signed. */
  const [signed, setSigned] = useState<Record<string, string | { error: string }>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  /** Per-record rejection text, so one draft reason does not affect another. */
  /** The record whose rejection modal is open, and what staff typed in it. */
  const [rejectTarget, setRejectTarget] = useState<VerificationRow | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [refDrafts, setRefDrafts] = useState<Record<string, string>>({});
  const [confirmSweep, setConfirmSweep] = useState(false);
  /** Ids of drafts that have not been touched for ABANDONED_AFTER_HOURS. */
  const [abandonedIds, setAbandonedIds] = useState<string[]>([]);


  /**
   * Read the queue.
   *
   * The state updates live inside the promise callbacks rather than in the
   * effect body: an effect that flips a loading flag synchronously and then
   * suspends is exactly the cascading-render shape the hooks lint warns about,
   * and there is no need for it here. `reloadKey` is the refresh trigger, so a
   * manual reload re-runs the same effect instead of duplicating the query.
   */
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!configured) return;
    let cancelled = false;

    void (async () => {
      try {
        const { data, error: readError } = await createClient()
          .from("guest_verifications")
          .select("*")
          .order("submitted_at", { ascending: false, nullsFirst: false })
          .order("created_at", { ascending: false })
          .limit(500);

        if (cancelled) return;

        if (readError) {
          setLoadError(readError.message);
          toast.error("Could not load the queue", { description: readError.message });
          return;
        }

        const loaded = (data ?? []) as VerificationRow[];
        setRows(loaded);
        setLoadError("");

        // Decided here rather than during render: reading the clock is not a
        // pure operation, and a draft's age must be measured once per load, not
        // on every keystroke somewhere else.
        const cutoff = Date.now() - ABANDONED_AFTER_HOURS * 60 * 60 * 1000;
        setAbandonedIds(
          loaded
            .filter((row) => row.status === "draft" && new Date(row.updated_at).getTime() < cutoff)
            .map((row) => row.id),
        );
      } catch (err) {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : "Could not reach the database.";
        setLoadError(message);
        toast.error("Could not load the queue", { description: message });
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [configured, reloadKey]);

  const refresh = useCallback(() => {
    setIsLoading(true);
    setReloadKey((key) => key + 1);
  }, []);

  /* ---------------- counts ---------------- */

  const counts = useMemo(() => {
    const base: Record<Filter, number> = {
      all: rows.length,
      draft: 0,
      submitted: 0,
      verified: 0,
      rejected: 0,
    };
    for (const row of rows) base[row.status] += 1;
    return base;
  }, [rows]);


  /* ---------------- search and filter ---------------- */

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    const termDigits = digits(search);

    return rows.filter((row) => {
      if (filter !== "all" && row.status !== filter) return false;
      if (!term) return true;

      // A phone search must work with or without spaces, and with or without
      // the country code, so digits are compared separately from text.
      if (termDigits.length >= 3) {
        if (digits(row.contact_number).includes(termDigits)) return true;
        if (digits(row.whatsapp_number).includes(termDigits)) return true;
        if (digits(row.emergency_phone).includes(termDigits)) return true;
      }

      const haystack = [
        row.full_name,
        row.email,
        row.booking_reference,
        row.contact_number,
        row.whatsapp_number,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(term);
    });
  }, [rows, filter, search]);

  /* ---------------- signed photographs ---------------- */

  const signPath = useCallback(async (path: string | null) => {
    if (!path) return;
    if (signed[path]) return;

    const { data, error: signError } = await createClient()
      .storage.from("verifications")
      // Two minutes: long enough to look, short enough that a copied URL is
      // useless before it leaves the building.
      .createSignedUrl(path, 120);

    if (signError || !data?.signedUrl) {
      setSigned((current) => ({
        ...current,
        [path]: { error: signError?.message ?? "The picture could not be opened." },
      }));
      return;
    }
    setSigned((current) => ({ ...current, [path]: data.signedUrl }));
  }, [signed]);

  const toggleRow = useCallback(
    (row: VerificationRow) => {
      const next = openId === row.id ? null : row.id;
      setOpenId(next);
      if (next) {
        void signPath(row.id_photo_path);
        void signPath(row.photo_path);
      }
    },
    [openId, signPath],
  );

  /* ---------------- mutations ---------------- */

  /**
   * Write a change and mirror it locally. Throws on failure, so the caller can
   * hand the message straight to a toast — action errors have no inline home
   * on this page any more.
   */
  async function patch(
    row: VerificationRow,
    changes: Partial<
      Pick<VerificationRow, "status" | "rejection_reason" | "reviewed_at" | "booking_reference">
    >,
  ) {
    const { error: writeError } = await createClient()
      .from("guest_verifications")
      .update({ ...changes, updated_at: new Date().toISOString() })
      .eq("id", row.id);

    if (writeError) throw new Error(writeError.message);

    setRows((current) =>
      current.map((item) => (item.id === row.id ? { ...item, ...changes } : item)),
    );
  }

  /**
   * Verify through the endpoint rather than patching the row here.
   *
   * The status change itself is trivial, but it is followed by an SMS, and the
   * Arkesel key is a server secret. Doing it in the browser would mean shipping
   * the key or pretending to send. The endpoint reports both outcomes, and the
   * toast carries whichever it returns — a verified guest whose text failed is
   * still verified, and saying so is more useful than a blanket error.
   */
  function markVerified(row: VerificationRow) {
    const who = row.full_name ?? "This guest";
    setBusyId(row.id);

    const task = (async () => {
      const response = await fetch("/api/verifications/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: row.id }),
      });

      const payload = (await response.json().catch(() => null)) as
        | { ok?: boolean; error?: string; sms?: { sent: boolean; error?: string; to?: string } }
        | null;

      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error ?? "The registration could not be verified.");
      }

      const reviewedAt = new Date().toISOString();
      setRows((current) =>
        current.map((item) =>
          item.id === row.id
            ? { ...item, status: "verified", rejection_reason: null, reviewed_at: reviewedAt }
            : item,
        ),
      );

      const sms = payload.sms;
      return sms?.sent
        ? `${who} verified and texted on ${sms.to ?? "their number"}.`
        : `${who} verified. No SMS went out${sms?.error ? ` — ${sms.error}` : ""}.`;
    })();

    void toast.promise(task, {
      loading: `Verifying ${who.toLowerCase()}…`,
      success: (message) => message,
      error: (error) =>
        error instanceof Error ? error.message : "The registration could not be verified.",
    });

    // The toast owns the rejection; this keeps the row's spinner honest and
    // stops an unhandled rejection reaching the console.
    void task.catch(() => {}).finally(() => setBusyId(null));
  }

  function openReject(row: VerificationRow) {
    setRejectTarget(row);
    setRejectReason("");
  }

  function closeReject() {
    setRejectTarget(null);
    setRejectReason("");
  }

  function submitRejection() {
    const target = rejectTarget;
    if (!target) return;

    const reason = rejectReason.trim();
    if (!reason) {
      toast.error("A reason is needed to reject", {
        description: "The next person to open this record will read it.",
      });
      return;
    }

    const who = target.full_name ?? "This guest";
    setBusyId(target.id);

    const task = (async () => {
      await patch(target, {
        status: "rejected",
        rejection_reason: reason,
        reviewed_at: new Date().toISOString(),
      });
      return `${who} rejected.`;
    })();

    void toast.promise(task, {
      loading: `Rejecting ${who.toLowerCase()}…`,
      success: (message) => message,
      error: (error) => (error instanceof Error ? error.message : "The registration was not rejected."),
    });

    void task
      .then(() => closeReject())
      .catch(() => {})
      .finally(() => setBusyId(null));
  }

  function saveReference(row: VerificationRow) {
    const value = (refDrafts[row.id] ?? row.booking_reference ?? "").trim().toUpperCase();
    setBusyId(row.id);

    const task = (async () => {
      await patch(row, { booking_reference: value || null });
      return value ? `Reference ${value} saved.` : "Booking reference cleared.";
    })();

    void toast.promise(task, {
      loading: "Saving reference…",
      success: (message) => message,
      error: (error) => (error instanceof Error ? error.message : "The reference was not saved."),
    });

    void task.catch(() => {}).finally(() => setBusyId(null));
  }

  function sweepDrafts() {
    if (!configured) return;
    setBusyId("sweep");
    setConfirmSweep(false);

    const task = (async () => {
      const { data, error: deleteError } = await createClient()
        .from("guest_verifications")
        .delete()
        .eq("status", "draft")
        .in("id", abandonedIds)
        .select("id");

      if (deleteError) throw new Error(deleteError.message);

      const gone = data ?? [];
      setRows((current) => current.filter((row) => !gone.some((item) => item.id === row.id)));
      setAbandonedIds([]);

      return gone.length === 0
        ? "No abandoned drafts to clear."
        : `Cleared ${gone.length} abandoned draft${gone.length === 1 ? "" : "s"}.`;
    })();

    void toast.promise(task, {
      loading: "Clearing abandoned drafts…",
      success: (message) => message,
      error: (error) => (error instanceof Error ? error.message : "The drafts were not cleared."),
    });

    void task.catch(() => {}).finally(() => setBusyId(null));
  }

  /* ---------------- render ---------------- */

  return (
    <div className="mx-auto max-w-6xl animate-in fade-in duration-500">
      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-ink)]">
            Verifications
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Guest registrations from the site. Check the document, tie the stay to its booking,
            then verify or reject.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {confirmSweep ? (
            <>
              <button
                type="button"
                onClick={() => void sweepDrafts()}
                className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-red-700"
              >
                {busyId === "sweep" ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Trash2 size={14} />
                )}
                Delete {abandonedIds.length} draft{abandonedIds.length === 1 ? "" : "s"}
              </button>
              <button
                type="button"
                onClick={() => setConfirmSweep(false)}
                className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50"
              >
                Cancel
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmSweep(true)}
              disabled={abandonedIds.length === 0}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Trash2 size={14} />
              Clear abandoned drafts{abandonedIds.length ? ` (${abandonedIds.length})` : ""}
            </button>
          )}
        </div>
      </header>

      {!configured && (
        <div className="mb-6 flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <AlertTriangle size={18} className="mt-0.5 shrink-0" />
          <p>
            Supabase is not configured, so there is nothing to show. Add your keys to{" "}
            <code className="font-mono text-xs">.env.local</code> and rebuild.
          </p>
        </div>
      )}

      {/* Toolbar: search plus the status a human actually wants first. */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search
            size={15}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search name, phone or reference"
            className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm text-slate-800 outline-none transition-colors placeholder:text-slate-400 focus:border-[var(--color-accent)]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {(["all", "submitted", "verified", "rejected", "draft"] as Filter[]).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                filter === key
                  ? "bg-[var(--color-ink)] text-white"
                  : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
              }`}
            >
              {key === "all" ? "All" : STATUS_LABELS[key]}
              <span className={`ml-1.5 ${filter === key ? "text-white/70" : "text-slate-400"}`}>
                {counts[key]}
              </span>
            </button>
          ))}

          <button
            type="button"
            onClick={refresh}
            disabled={isLoading}
            title="Reload the queue"
            className="ml-1 inline-flex items-center gap-1.5 rounded-lg bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 ring-1 ring-slate-200 transition-colors hover:bg-slate-50 disabled:opacity-50"
          >
            <Loader2 size={13} className={isLoading ? "animate-spin" : ""} />
            Reload
          </button>
        </div>
      </div>

      {/* Queue */}
      <div className="overflow-hidden rounded-2xl border border-[var(--color-line-soft)] bg-white shadow-[var(--shadow-raise)]">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              <th className="px-4 py-3">Guest</th>
              <th className="px-4 py-3">Phone</th>
              <th className="px-4 py-3">Stay</th>
              <th className="px-4 py-3">Guests</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Submitted</th>
              <th className="w-10 px-2 py-3" />
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-sm text-slate-500">
                  <Loader2 size={16} className="mr-2 inline animate-spin" />
                  Loading registrations…
                </td>
              </tr>
            )}

            {!isLoading && visible.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-sm text-slate-500">
                  {loadError ? (
                    <span className="inline-flex flex-col items-center gap-2">
                      <span className="text-red-700">Could not load the queue: {loadError}</span>
                      <button
                        type="button"
                        onClick={refresh}
                        className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50"
                      >
                        Try again
                      </button>
                    </span>
                  ) : rows.length === 0 ? (
                    "No registrations yet. They appear here as guests fill in the form."
                  ) : (
                    "Nothing matches that search."
                  )}
                </td>
              </tr>
            )}

            {!isLoading &&
              visible.map((row) => {
                const open = openId === row.id;
                return (
                  <React.Fragment key={row.id}>
                    <tr
                      onClick={() => toggleRow(row)}
                      className={`cursor-pointer border-b border-slate-100 transition-colors ${
                        open ? "bg-slate-50" : "hover:bg-slate-50/70"
                      }`}
                    >
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-[var(--color-ink)]">
                          {row.full_name || "Unnamed"}
                        </p>
                        {row.booking_reference ? (
                          <p className="text-[11px] text-slate-500">{row.booking_reference}</p>
                        ) : (
                          <p className="text-[11px] text-amber-700">no reference yet</p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">
                        {row.contact_number || "—"}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">{stayLabel(row)}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">{row.guests_count ?? "—"}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${
                            STATUS_STYLES[row.status]
                          }`}
                        >
                          {STATUS_LABELS[row.status]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">
                        {formatStamp(row.submitted_at ?? row.created_at)}
                      </td>
                      <td className="px-2 py-3 text-right">
                        <ChevronDown
                          size={16}
                          className={`text-slate-400 transition-transform ${open ? "rotate-180" : ""}`}
                        />
                      </td>
                    </tr>

                    {open && (
                      <tr className="border-b border-slate-100 bg-slate-50/60">
                        <td colSpan={7} className="px-4 py-5">
                          <DetailPanel
                            row={row}
                            busy={busyId === row.id}
                            signed={signed}
                            reference={refDrafts[row.id] ?? row.booking_reference ?? ""}

                            onReferenceChange={(value) =>
                              setRefDrafts((current) => ({ ...current, [row.id]: value }))
                            }
                            onSaveReference={() => void saveReference(row)}
                            onVerify={() => void markVerified(row)}
                            onReject={() => openReject(row)}
                            onClose={() => setOpenId(null)}
                          />
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
          </tbody>
        </table>
      </div>

      <p className="mt-4 text-[11px] text-slate-400">
        Showing {visible.length} of {rows.length}. Photographs open through links that expire after
        two minutes.
      </p>

      {rejectTarget && (
        <RejectDialog
          guest={rejectTarget.full_name ?? "this guest"}
          reason={rejectReason}
          busy={busyId === rejectTarget.id}
          onChange={setRejectReason}
          onCancel={closeReject}
          onConfirm={() => void submitRejection()}
        />
      )}
    </div>
  );
}

/**
 * A modal rather than an inline field: rejecting is destructive and rare, and a
 * box that appears inside an already-tall record reads as another ordinary
 * input. Here it is unmistakably a decision that needs a reason.
 */
function RejectDialog({
  guest,
  reason,
  busy,
  onChange,
  onCancel,
  onConfirm,
}: {
  guest: string;
  reason: string;
  busy: boolean;
  onChange: (value: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const ready = reason.trim().length > 0;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="reject-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm"
      onKeyDown={(event) => {
        if (event.key === "Escape") onCancel();
      }}
    >
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
        <h2 id="reject-title" className="text-base font-semibold text-slate-900">
          Reject this registration?
        </h2>
        <p className="mt-1 text-xs leading-relaxed text-slate-500">
          {guest} will not be checked in on this registration. The reason is saved with the record
          so the next person to open it knows why.
        </p>

        <label
          htmlFor="reject-reason"
          className="mb-1.5 mt-4 block text-[10px] font-bold uppercase tracking-widest text-slate-500"
        >
          Reason for rejection
        </label>
        <textarea
          id="reject-reason"
          autoFocus
          rows={3}
          value={reason}
          onChange={(event) => onChange(event.target.value)}
          placeholder="e.g. Ghana Card photo is too blurry to read the number"
          className="w-full resize-y rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none transition-colors placeholder:text-slate-400 focus:border-[var(--color-accent)]"
        />

        <div className="mt-4 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="rounded-lg border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={!ready || busy}
            className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy && <Loader2 className="h-3 w-3 animate-spin" />}
            Reject registration
          </button>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Detail panel                                                               */
/* -------------------------------------------------------------------------- */

function DetailPanel({
  row,
  busy,
  signed,
  reference,
  onReferenceChange,
  onSaveReference,
  onVerify,
  onReject,
  onClose,
}: {
  row: VerificationRow;
  busy: boolean;
  signed: Record<string, string | { error: string }>;
  reference: string;
  onReferenceChange: (value: string) => void;
  onSaveReference: () => void;
  onVerify: () => void;
  onReject: () => void;
  onClose: () => void;
}) {
  const referenceDirty = reference.trim().toUpperCase() !== (row.booking_reference ?? "");

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
      {/* ---- the record ---- */}
      <div>
        <div className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
          <Detail label="Full name" value={row.full_name} />
          <Detail label="Type of ID" value={row.id_type ? ID_TYPE_LABELS[row.id_type] ?? row.id_type : null} />
          <Detail
            label="Phone"
            value={row.contact_number}
            icon={<Phone size={12} />}
            href={row.contact_number ? `tel:${row.contact_number}` : undefined}
          />
          <Detail label="WhatsApp" value={row.whatsapp_number} />
          <Detail
            label="Email"
            value={row.email}
            href={row.email ? `mailto:${row.email}` : undefined}
          />
          <Detail label="Guests" value={row.guests_count ? String(row.guests_count) : null} />
          <Detail label="Check-in" value={row.check_in_date ? formatDate(row.check_in_date) : null} />
          <Detail
            label="Check-out"
            value={row.check_out_date ? formatDate(row.check_out_date) : null}
          />
          <Detail
            label="Emergency contact"
            value={
              row.emergency_name
                ? [row.emergency_name, row.emergency_relationship, row.emergency_phone]
                    .filter(Boolean)
                    .join(" · ")
                : null
            }
            emptyText="Not provided"
          />
          <Detail label="Submitted" value={formatStamp(row.submitted_at)} />
        </div>

        {/* Declaration — the two ticks the guest agreed to. */}
        <div className="mt-4 flex flex-wrap gap-2">
          <Tick on={Boolean(row.declared_accurate)} label="Information confirmed accurate" />
          <Tick on={Boolean(row.accepted_rules)} label="House rules accepted" />
        </div>

        {/* Booking reference: staff assign it here, not on the guest form. */}
        <div className="mt-5 rounded-xl border border-slate-200 bg-white p-3.5">
          <label
            htmlFor={`ref-${row.id}`}
            className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-slate-500"
          >
            Booking reference
          </label>
          <div className="flex gap-2">
            <input
              id={`ref-${row.id}`}
              value={reference}
              onChange={(event) => onReferenceChange(event.target.value)}
              placeholder="e.g. CC-1042"
              className="min-w-0 flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm uppercase text-slate-800 outline-none transition-colors placeholder:normal-case placeholder:text-slate-400 focus:border-[var(--color-accent)]"
            />
            <button
              type="button"
              onClick={onSaveReference}
              disabled={busy || !referenceDirty}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-[var(--color-ink)] px-3 py-2 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {busy ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
              Save
            </button>
          </div>
          <p className="mt-1.5 text-[11px] text-slate-400">
            Look the reservation up in Bookings, then paste the reference here to tie this
            registration to its stay.
          </p>
        </div>

        {row.status === "rejected" && row.rejection_reason && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3.5">
            <p className="text-[10px] font-bold uppercase tracking-widest text-red-700">
              Reason for rejection
            </p>
            <p className="mt-1 text-sm text-red-900">{row.rejection_reason}</p>
            {row.reviewed_at && (
              <p className="mt-1 text-[11px] text-red-700/70">
                Reviewed {formatStamp(row.reviewed_at)}
              </p>
            )}
          </div>
        )}

        {row.status === "verified" && row.reviewed_at && (
          <p className="mt-4 text-[11px] text-slate-500">
            Verified {formatStamp(row.reviewed_at)}
          </p>
        )}

        {/* ---- actions ---- */}
        <div className="mt-5 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onVerify}
            disabled={busy || row.status === "verified"}
            className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {busy ? <Loader2 size={14} className="animate-spin" /> : <ShieldCheck size={14} />}
            Mark verified
          </button>

          <button
            type="button"
            onClick={onReject}
            disabled={busy || row.status === "rejected"}
            className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2 text-xs font-semibold text-red-700 transition-colors hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <X size={14} />
            Reject
          </button>

          <button
            type="button"
            onClick={onClose}
            className="ml-auto rounded-lg px-3 py-2 text-xs font-semibold text-slate-500 transition-colors hover:bg-white hover:text-slate-700"
          >
            Close
          </button>
        </div>

      </div>

      {/* ---- the evidence ---- */}
      <div className="space-y-3">
        <SignedPhoto label="ID document" path={row.id_photo_path} signed={signed} />
        <SignedPhoto label="Photo of guest" path={row.photo_path} signed={signed} optional />
      </div>
    </div>
  );
}

function Detail({
  label,
  value,
  href,
  icon,
  emptyText = "—",
}: {
  label: string;
  value: string | null;
  href?: string;
  icon?: React.ReactNode;
  emptyText?: string;
}) {
  const shown = value?.trim() ? value : emptyText;
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{label}</p>
      {href && value ? (
        <a
          href={href}
          className="mt-0.5 inline-flex items-center gap-1.5 truncate text-sm text-[var(--color-accent)] hover:underline"
        >
          {icon}
          {shown}
        </a>
      ) : (
        <p className={`mt-0.5 truncate text-sm ${value?.trim() ? "text-slate-800" : "text-slate-400"}`}>
          {shown}
        </p>
      )}
    </div>
  );
}

function Tick({ on, label }: { on: boolean; label: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium ${
        on ? "border-green-200 bg-green-50 text-green-800" : "border-slate-200 bg-white text-slate-400"
      }`}
    >
      {on ? <Check size={12} /> : <X size={12} />}
      {label}
    </span>
  );
}

/**
 * A private photograph, fetched on demand.
 *
 * The bucket is not public, so there is no URL until this component asks for a
 * signed one. Three states matter and all three are shown honestly: still
 * signing, signed, and refused — a broken image icon would leave staff unsure
 * whether the guest uploaded nothing or the link failed.
 */
function SignedPhoto({
  label,
  path,
  signed,
  optional = false,
}: {
  label: string;
  path: string | null;
  signed: Record<string, string | { error: string }>;
  optional?: boolean;
}) {
  const entry = path ? signed[path] : undefined;
  const url = typeof entry === "string" ? entry : null;
  const failed = entry && typeof entry === "object" ? entry.error : null;

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2">
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{label}</p>
        {url && (
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-[10px] font-semibold text-[var(--color-accent)] hover:underline"
          >
            Open <ExternalLink size={10} />
          </a>
        )}
      </div>

      {!path ? (
        <p className="px-3 py-6 text-center text-[11px] text-slate-400">
          {optional ? "Not provided" : "Missing"}
        </p>
      ) : failed ? (
        <p className="px-3 py-6 text-center text-[11px] text-red-600">{failed}</p>
      ) : !url ? (
        <p className="px-3 py-6 text-center text-[11px] text-slate-400">
          <Loader2 size={12} className="mr-1.5 inline animate-spin" />
          Opening…
        </p>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt={label} className="max-h-56 w-full bg-slate-50 object-contain" />
      )}
    </div>
  );
}
