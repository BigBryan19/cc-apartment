// app/lib/use-toast-message.ts
// ---------------------------------------------------------------------------
// Bridges the admin pages' existing message state to a toast.
//
// WHY A HOOK AND NOT CALL-SITE EDITS
//
//   Every admin page keeps a `message`/`error` string in state and paints it
//   into a coloured block. The state is worth keeping — it carries what the
//   page decided, and in several pages it also drives button states. What
//   changed is only where it is shown.
//
//   Mirroring the state into a toast leaves every setMessage() call alone, so a
//   page cannot end up announcing one thing while believing another. When the
//   state changes, the toast follows.
//
// Deliberately not a dependency of any server code.
"use client";

import { useEffect } from "react";
import { toast } from "sonner";

/**
 * For `{ text, type }` message states. Type "error" turns the toast red;
 * anything else is treated as success, which matches how these pages paint it.
 */
export function useMessageToast(
  message: { text?: string | null; type?: string | null } | null | undefined,
) {
  const text = (message?.text ?? "").trim();
  const type = message?.type ?? "";

  useEffect(() => {
    if (!text) return;
    if (type === "error") toast.error(text);
    else toast.success(text);
  }, [text, type]);
}

/**
 * For pages holding two plain strings: a failure and a confirmation.
 * Passing null for either is fine.
 */
export function useAlertToast(error?: string | null, success?: string | null) {
  const failure = (error ?? "").trim();
  const confirmation = (success ?? "").trim();

  useEffect(() => {
    if (!failure) return;
    toast.error(failure);
  }, [failure]);

  useEffect(() => {
    if (!confirmation) return;
    toast.success(confirmation);
  }, [confirmation]);
}
