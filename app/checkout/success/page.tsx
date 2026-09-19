// app/checkout/success/page.tsx
// ---------------------------------------------------------------------------
// Paystack callback target.
//
// Paystack redirects the guest here after checkout with ?reference=... .
// Webhooks can lag, so we confirm the transaction against Paystack directly
// and only then show the success state.
// ---------------------------------------------------------------------------

"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  CheckCircle2,
  XCircle,
  Loader2,
  ShieldCheck,
  ArrowLeft,
} from "lucide-react";

type VerifyState = "verifying" | "success" | "failed";

interface VerifyResponse {
  successful?: boolean;
  status?: string;
  reference?: string;
  amount?: number;
  currency?: string;
  email?: string;
  error?: string;
}

function SuccessContent() {
  const searchParams = useSearchParams();
  const reference = searchParams.get("reference") || searchParams.get("trxref");

  const [verifyState, setVerifyState] = useState<VerifyState>("verifying");
  const [details, setDetails] = useState<VerifyResponse | null>(null);
  const [error, setError] = useState("");

  // Derived rather than stored, so the missing-reference case needs no
  // setState inside the effect (which would cascade an extra render).
  const state: VerifyState = reference ? verifyState : "failed";
  const displayError = reference
    ? error
    : "No transaction reference was supplied.";

  useEffect(() => {
    if (!reference) return;

    let cancelled = false;

    const verify = async () => {
      try {
        const response = await fetch(
          `/api/payments/paystack/verify?reference=${encodeURIComponent(reference)}`,
        );
        const payload = (await response.json()) as VerifyResponse;
        if (cancelled) return;

        if (response.ok && payload.successful) {
          setDetails(payload);
          setVerifyState("success");
        } else {
          setError(payload.error || "The payment could not be verified.");
          setVerifyState("failed");
        }
      } catch {
        if (!cancelled) {
          setError("We could not reach the payment server.");
          setVerifyState("failed");
        }
      }
    };

    verify();
    return () => {
      cancelled = true;
    };
  }, [reference]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-50 px-4 py-16 font-sans">
      <div className="bg-white p-8 md:p-12 rounded-3xl shadow-lg text-center max-w-lg w-full">
        {state === "verifying" && (
          <>
            <div className="w-20 h-20 bg-slate-100 text-slate-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <Loader2 size={36} className="animate-spin" />
            </div>
            <h2 className="text-2xl font-serif text-slate-900 mb-3">
              Confirming your payment
            </h2>
            <p className="text-slate-500 text-sm leading-relaxed">
              Please wait while we verify this transaction with Paystack. Do not
              close this page.
            </p>
          </>
        )}

        {state === "success" && (
          <>
            <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 size={40} />
            </div>
            <h2 className="text-3xl font-serif text-slate-900 mb-3">
              Payment Confirmed
            </h2>
            <p className="text-slate-500 mb-8 leading-relaxed">
              Thank you! Your booking is confirmed and a receipt has been sent to
              your email address.
            </p>

            <dl className="text-left bg-slate-50 border border-slate-100 rounded-2xl p-5 space-y-3 text-sm mb-8">
              {details?.reference && (
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-500">Reference</dt>
                  <dd className="font-mono text-xs font-semibold text-slate-900 break-all text-right">
                    {details.reference}
                  </dd>
                </div>
              )}
              {typeof details?.amount === "number" && (
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-500">Amount paid</dt>
                  <dd className="font-semibold text-slate-900">
                    {details.currency} {details.amount.toLocaleString()}
                  </dd>
                </div>
              )}
              {details?.email && (
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-500">Paid by</dt>
                  <dd className="font-semibold text-slate-900 break-all text-right">
                    {details.email}
                  </dd>
                </div>
              )}
            </dl>
          </>
        )}

        {state === "failed" && (
          <>
            <div className="w-20 h-20 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <XCircle size={40} />
            </div>
            <h2 className="text-3xl font-serif text-slate-900 mb-3">
              Payment not confirmed
            </h2>
            <p className="text-slate-500 mb-8 leading-relaxed">
              {displayError ||
                "We could not confirm this payment. If you were charged, please contact us and we will resolve it."}
            </p>
          </>
        )}

        <Link
          href="/"
          className="inline-flex items-center gap-2 bg-slate-900 text-white py-3.5 px-7 rounded-xl font-bold uppercase tracking-widest text-xs hover:bg-slate-800 transition shadow-lg"
        >
          <ArrowLeft size={15} /> Back to Home
        </Link>

        <div className="flex items-center justify-center gap-2 mt-6 text-xs text-slate-400 font-medium">
          <ShieldCheck size={14} /> Secured by Paystack
        </div>
      </div>
    </div>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-stone-50">
          <Loader2 className="animate-spin text-slate-400" size={32} />
        </div>
      }
    >
      <SuccessContent />
    </Suspense>
  );
}
