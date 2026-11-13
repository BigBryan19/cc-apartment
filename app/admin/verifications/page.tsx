// app/admin/verifications/page.tsx
// ---------------------------------------------------------------------------
// The route wrapper, and nothing else.
//
// It exists because of `?open=<id>`: the office alert links straight at a record
// so staff do not have to hunt for it in the queue. `searchParams` is only
// readable on the server in the App Router, and reading it here means the queue
// renders with that row already open instead of opening it a moment later and
// shifting the page under the reader.
//
// Everything else — the table, the signed photographs, the actions — is in
// VerificationsQueue.tsx.
// ---------------------------------------------------------------------------

import VerificationsQueue from "./VerificationsQueue";

export const dynamic = "force-dynamic";

export default async function AdminVerificationsPage({
  searchParams,
}: {
  searchParams: Promise<{ open?: string | string[] }>;
}) {
  const params = await searchParams;
  const raw = Array.isArray(params.open) ? params.open[0] : params.open;

  // Only ever compared against row ids; length-capped so a pasted essay cannot
  // become a query parameter.
  const initialOpenId = typeof raw === "string" && raw.length > 0 && raw.length <= 64 ? raw : null;

  return <VerificationsQueue initialOpenId={initialOpenId} />;
}
