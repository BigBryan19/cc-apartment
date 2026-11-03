// app/admin/settings/page.tsx
"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient, isSupabaseConfigured } from "../../utils/supabase";
import { KeyRound, Loader2, ShieldCheck, Wallet } from "lucide-react";
import { SETTINGS_TABLE } from "../../lib/tables";
import {
  DEFAULT_DEPOSIT_POLICY,
  MIN_DEPOSIT_PERCENT,
  describeDepositPolicy,
  isDepositConfigured,
  parseDepositPolicy,
  type DepositMode,
  type DepositPolicy,
} from "../../lib/deposit";

interface DraftPolicy {
  enabled: boolean;
  mode: DepositMode;
  percent: string;
  fixedAmount: string;
  balanceDueDays: string;
  instructions: string;
}

const EMPTY_DRAFT: DraftPolicy = {
  enabled: false,
  mode: "percent",
  percent: "",
  fixedAmount: "",
  balanceDueDays: "",
  instructions: "",
};

function toDraft(policy: DepositPolicy): DraftPolicy {
  return {
    enabled: isDepositConfigured(policy),
    mode: policy.mode ?? "percent",
    percent: policy.minPercent !== null ? String(policy.minPercent) : "",
    fixedAmount: policy.fixedAmount !== null ? String(policy.fixedAmount) : "",
    balanceDueDays:
      policy.balanceDueDays !== null ? String(policy.balanceDueDays) : "",
    instructions: policy.instructions ?? "",
  };
}

export default function SettingsPage() {
  const [newPassword, setNewPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "" });

  const [draft, setDraft] = useState<DraftPolicy>({
    ...EMPTY_DRAFT,
    enabled: true,
    percent: String(MIN_DEPOSIT_PERCENT),
  });
  const [policyLoading, setPolicyLoading] = useState(true);
  const [policySaving, setPolicySaving] = useState(false);
  const [policyMessage, setPolicyMessage] = useState({ text: "", type: "" });

  const configured = isSupabaseConfigured();

  const loadPolicy = useCallback(async () => {
    if (!configured) {
      setPolicyLoading(false);
      return;
    }
    setPolicyLoading(true);
    const { data, error } = await createClient()
      .from(SETTINGS_TABLE)
      .select("value")
      .eq("key", "deposit_policy")
      .maybeSingle();

    if (error) {
      setPolicyMessage({
        text: `Could not load the deposit policy: ${error.message}. Has the migration been run?`,
        type: "error",
      });
    } else if (data) {
      setDraft(toDraft(parseDepositPolicy((data as { value?: unknown }).value)));
    }
    setPolicyLoading(false);
  }, [configured]);

  useEffect(() => {
    loadPolicy();
  }, [loadPolicy]);

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      setMessage({
        text: "Password must be at least 6 characters.",
        type: "error",
      });
      return;
    }

    setIsLoading(true);
    setMessage({ text: "", type: "" });

    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    setIsLoading(false);

    if (error) {
      setMessage({ text: error.message, type: "error" });
    } else {
      setMessage({ text: "Password updated successfully!", type: "success" });
      setNewPassword("");
    }
  };

  const savePolicy = async (event: React.FormEvent) => {
    event.preventDefault();
    setPolicyMessage({ text: "", type: "" });

    if (!configured) {
      setPolicyMessage({ text: "Supabase is not configured.", type: "error" });
      return;
    }

    // Validate before saving. An invalid policy is stored as "unconfigured" by
    // the parser, which would silently switch the checkout back to pay-in-full
    // — the owner deserves to be told why instead.
    let payload: DepositPolicy = { ...DEFAULT_DEPOSIT_POLICY, enabled: false };

    if (draft.enabled) {
      const percent = Number(draft.percent);
      const fixed = Number(draft.fixedAmount);

      if (
        draft.mode === "percent" &&
        (!Number.isFinite(percent) || percent < MIN_DEPOSIT_PERCENT || percent >= 100)
      ) {
        setPolicyMessage({
          text: `The minimum part payment is ${MIN_DEPOSIT_PERCENT}% and it must be below 100%.`,
          type: "error",
        });
        return;
      }
      if (draft.mode === "fixed" && (!Number.isFinite(fixed) || fixed <= 0)) {
        setPolicyMessage({
          text: "Enter a fixed deposit amount greater than zero.",
          type: "error",
        });
        return;
      }

      payload = parseDepositPolicy({
        enabled: true,
        mode: draft.mode,
        minPercent: draft.mode === "percent" ? percent : MIN_DEPOSIT_PERCENT,
        fixedAmount: draft.mode === "fixed" ? fixed : null,
        balanceDueDays: draft.balanceDueDays === "" ? null : Number(draft.balanceDueDays),
        instructions: draft.instructions,
      });

      if (!isDepositConfigured(payload)) {
        setPolicyMessage({ text: "Those values are not valid.", type: "error" });
        return;
      }
    }

    setPolicySaving(true);
    const { error } = await createClient()
      .from(SETTINGS_TABLE)
      .upsert(
        {
          key: "deposit_policy",
          value: payload,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "key" },
      );
    setPolicySaving(false);

    if (error) {
      setPolicyMessage({ text: error.message, type: "error" });
      return;
    }
    setPolicyMessage({ text: "Deposit policy saved.", type: "success" });
  };

  return (
    <div className="max-w-4xl mx-auto animate-in fade-in duration-500">
      <div className="mb-10">
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-ink)] mb-2">
          Admin Settings
        </h1>
        <p className="text-slate-500 text-sm">
          Manage your security preferences, payment terms and account details.
        </p>
      </div>

      {/* ---------------- Deposit policy ---------------- */}
      <div className="bg-white rounded-2xl border border-[var(--color-line-soft)] shadow-[var(--shadow-raise)] overflow-hidden max-w-xl mb-8">
        <div className="p-6 border-b border-slate-100 bg-slate-50 flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-100 text-emerald-700 rounded-lg flex items-center justify-center">
            <Wallet size={20} />
          </div>
          <div>
            <h2 className="font-serif text-lg text-slate-900">Deposit policy</h2>
            <p className="text-xs text-slate-500">
              Controls the &quot;Pay a deposit&quot; option at checkout.
            </p>
          </div>
        </div>

        <form onSubmit={savePolicy} className="p-6 space-y-5">
          {policyLoading ? (
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Loader2 size={15} className="animate-spin" /> Loading policy…
            </div>
          ) : (
            <>
              {policyMessage.text && (
                <div
                  className={`p-4 rounded-xl text-sm ${
                    policyMessage.type === "error"
                      ? "bg-red-50 text-red-600 border border-red-100"
                      : "bg-green-50 text-green-700 border border-green-100"
                  }`}
                >
                  {policyMessage.text}
                </div>
              )}

              <label className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={draft.enabled}
                  onChange={(event) =>
                    setDraft({ ...draft, enabled: event.target.checked })
                  }
                  className="mt-1 h-4 w-4 accent-[var(--color-ink)]"
                />
                <span>
                  <span className="block text-sm font-semibold text-slate-900">
                    Offer part payment at checkout
                  </span>
                  <span className="mt-0.5 block text-xs leading-relaxed text-slate-500">
                    Guests can reserve by paying a share of the total now and the
                    rest before arrival. The share can never go below{" "}
                    {MIN_DEPOSIT_PERCENT}%. Switch this off to require payment in
                    full.
                  </span>
                </span>
              </label>

              {draft.enabled && (
                <div className="space-y-4 rounded-xl border border-slate-200 p-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Deposit type
                      <select
                        value={draft.mode}
                        onChange={(event) =>
                          setDraft({ ...draft, mode: event.target.value as DepositMode })
                        }
                        className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-normal normal-case tracking-normal text-slate-900"
                      >
                        <option value="percent">Guest chooses ({MIN_DEPOSIT_PERCENT}% minimum)</option>
                        <option value="fixed">One fixed amount (GHS)</option>
                      </select>
                    </label>

                    {draft.mode === "percent" ? (
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                        Minimum part payment (%)
                        <input
                          value={draft.percent}
                          onChange={(event) =>
                            setDraft({ ...draft, percent: event.target.value })
                          }
                          inputMode="decimal"
                          placeholder="20"
                          className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-normal normal-case tracking-normal text-slate-900"
                        />
                      </label>
                    ) : (
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                        Amount (GHS)
                        <input
                          value={draft.fixedAmount}
                          onChange={(event) =>
                            setDraft({ ...draft, fixedAmount: event.target.value })
                          }
                          inputMode="decimal"
                          placeholder="1000"
                          className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-normal normal-case tracking-normal text-slate-900"
                        />
                      </label>
                    )}
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Balance due (days before check-in)
                      <input
                        value={draft.balanceDueDays}
                        onChange={(event) =>
                          setDraft({ ...draft, balanceDueDays: event.target.value })
                        }
                        inputMode="numeric"
                        placeholder="7"
                        className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-normal normal-case tracking-normal text-slate-900"
                      />
                    </label>
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Balance instructions (optional)
                      <input
                        value={draft.instructions}
                        onChange={(event) =>
                          setDraft({ ...draft, instructions: event.target.value })
                        }
                        placeholder="We will send a payment link before arrival."
                        className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-normal normal-case tracking-normal text-slate-900"
                      />
                    </label>
                  </div>

                  <p className="text-[11px] leading-relaxed text-slate-500">
                    {describeDepositPolicy(
                      parseDepositPolicy({
                        mode: draft.mode,
                        percent: draft.percent,
                        fixedAmount: draft.fixedAmount,
                        balanceDueDays:
                          draft.balanceDueDays === "" ? null : draft.balanceDueDays,
                        instructions: draft.instructions,
                      }),
                    )}
                  </p>
                </div>
              )}

              <button
                type="submit"
                disabled={policySaving}
                className="bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 px-6 rounded-xl text-sm shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {policySaving ? <Loader2 size={16} className="animate-spin" /> : "Save deposit policy"}
              </button>
            </>
          )}
        </form>
      </div>

      {/* ---------------- Password ---------------- */}
      <div className="bg-white rounded-2xl border border-[var(--color-line-soft)] shadow-[var(--shadow-raise)] overflow-hidden max-w-xl">
        <div className="p-6 border-b border-slate-100 bg-slate-50 flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center">
            <KeyRound size={20} />
          </div>
          <div>
            <h2 className="font-serif text-lg text-slate-900">
              Change Password
            </h2>
            <p className="text-xs text-slate-500">
              Ensure your account uses a strong, secure password.
            </p>
          </div>
        </div>

        <form onSubmit={handlePasswordUpdate} className="p-6 space-y-6">
          {message.text && (
            <div
              className={`p-4 rounded-xl text-sm ${message.type === "error" ? "bg-red-50 text-red-600 border border-red-100" : "bg-green-50 text-green-600 border border-green-100 flex items-center gap-2"}`}
            >
              {message.type === "success" && <ShieldCheck size={16} />}
              {message.text}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
              New Password
            </label>
            <input
              type="password"
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-600 transition-colors"
              placeholder="Enter new password"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 px-6 rounded-xl text-sm shadow-md transition-all flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <Loader2 className="animate-spin" size={16} />
            ) : (
              "Update Password"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
