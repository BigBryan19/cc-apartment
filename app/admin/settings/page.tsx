// app/admin/settings/page.tsx
"use client";

import { useEffect, useState } from "react";
import { createClient } from "../../utils/supabase";
import { KeyRound, Loader2, ShieldCheck } from "lucide-react";

export default function SettingsPage() {
  const [newPassword, setNewPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "" });

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

  return (
    <div className="max-w-4xl mx-auto animate-in fade-in duration-500">
      <div className="mb-10">
        <h1 className="text-3xl font-serif text-slate-900 mb-2">
          Admin Settings
        </h1>
        <p className="text-slate-500 text-sm">
          Manage your security preferences and account details.
        </p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden max-w-xl">
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
