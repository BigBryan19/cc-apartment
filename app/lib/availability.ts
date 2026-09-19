// app/lib/availability.ts
// ---------------------------------------------------------------------------
// Availability data layer.
//
// Two sources of unavailable dates are merged:
//   1. `blocked_dates` — ranges an admin has explicitly closed off.
//   2. `bookings`      — ranges already reserved (any status except cancelled).
//
// Every reader degrades gracefully: if Supabase is unconfigured or the
// `blocked_dates` table has not been created yet, it resolves to an empty list
// rather than throwing, so the booking UI still works with static data.
// ---------------------------------------------------------------------------

"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "../utils/supabase";
import type { DateRange } from "./dates";

export const BLOCKED_DATES_TABLE = "blocked_dates";

/** Rows are stored per-property and may be a single day or a range. */
export interface BlockedDateRow {
  id?: string | number;
  villa_id: number;
  start_date: string;
  end_date: string;
  reason?: string | null;
}

export interface AvailabilityState {
  /** Admin-blocked ranges. */
  blocked: DateRange[];
  /** Ranges occupied by existing bookings. */
  booked: DateRange[];
  /** Both merged — the set the date picker must grey out. */
  all: DateRange[];
  isLoading: boolean;
  /** Set when the database could not be read (table missing, offline, ...). */
  error: string | null;
  refresh: () => void;
}

function normaliseRange(
  start?: string | null,
  end?: string | null,
  extra?: Partial<DateRange>,
): DateRange | null {
  if (!start) return null;
  // A single-day block is stored with end_date equal to start_date; treat a
  // missing end date as a one-night block too.
  return { start, end: end || start, ...extra };
}

/**
 * Loads blocked + booked ranges for one property.
 * Pass `null` to skip loading (e.g. the modal is closed).
 */
export function useVillaAvailability(villaId: number | null): AvailabilityState {
  const [blocked, setBlocked] = useState<DateRange[]>([]);
  const [booked, setBooked] = useState<DateRange[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  const refresh = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    if (villaId === null || Number.isNaN(villaId)) {
      setBlocked([]);
      setBooked([]);
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setError(null);

    const load = async () => {
      const supabase = createClient();

      try {
        const [blockedResult, bookedResult] = await Promise.all([
          supabase
            .from(BLOCKED_DATES_TABLE)
            .select("id, villa_id, start_date, end_date, reason")
            .eq("villa_id", villaId),
          supabase
            .from("bookings")
            .select("check_in_date, check_out_date, status")
            .eq("villa_id", villaId),
        ]);

        if (cancelled) return;

        if (blockedResult.error) {
          // Most commonly: the table has not been created yet. Not fatal.
          console.warn(
            "[availability] could not read blocked_dates:",
            blockedResult.error.message,
          );
          setError(blockedResult.error.message);
        } else {
          setBlocked(
            (blockedResult.data ?? [])
              .map((row) =>
                normaliseRange(row.start_date, row.end_date, {
                  id: row.id,
                  kind: "blocked",
                  reason: row.reason ?? undefined,
                }),
              )
              .filter((r): r is DateRange => r !== null),
          );
        }

        if (!bookedResult.error) {
          setBooked(
            (bookedResult.data ?? [])
              // Cancelled reservations release their dates.
              .filter((row) => row.status !== "cancelled")
              .map((row) =>
                normaliseRange(row.check_in_date, row.check_out_date, {
                  kind: "booked",
                }),
              )
              .filter((r): r is DateRange => r !== null),
          );
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Unknown error");
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [villaId, nonce]);

  return { blocked, booked, all: [...blocked, ...booked], isLoading, error, refresh };
}

/** Admin helper: create a blocked range for a property. */
export async function createBlockedRange(row: BlockedDateRow): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from(BLOCKED_DATES_TABLE)
    .insert([{ villa_id: row.villa_id, start_date: row.start_date, end_date: row.end_date, reason: row.reason ?? null }]);
  if (error) throw new Error(error.message);
}

/** Admin helper: remove a blocked range. */
export async function deleteBlockedRange(id: string | number): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from(BLOCKED_DATES_TABLE)
    .delete()
    .eq("id", id);
  if (error) throw new Error(error.message);
}
