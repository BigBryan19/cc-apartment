// app/admin/bookings/page.tsx
"use client";

import React, { useEffect, useState } from "react";
import { createClient } from "../../utils/supabase";
import {
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  ShieldCheck,
} from "lucide-react";

interface Booking {
  id: string;
  guest_name: string;
  guest_email: string;
  guest_phone: string;
  check_in_date: string;
  /** Present once supabase/schema.sql has been applied. */
  check_out_date?: string | null;
  nights?: number | null;
  total_amount: number;
  currency?: string | null;
  status: "pending" | "confirmed" | "cancelled";
  payment_status?: string | null;
  payment_reference?: string | null;
  created_at: string;
  villas: {
    title: string;
  };
}

export default function ManageBookings() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const supabase = createClient();

  const fetchBookings = async () => {
    setIsLoading(true);
    // Fetch bookings and join with the villas table to get the villa title
    const { data, error } = await supabase
      .from("bookings")
      .select("*, villas(title)")
      .order("created_at", { ascending: false });

    if (!error && data) {
      setBookings(data as unknown as Booking[]);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  const updateStatus = async (id: string, newStatus: string) => {
    const { error } = await supabase
      .from("bookings")
      .update({ status: newStatus })
      .eq("id", id);

    if (error) {
      alert("Error updating booking: " + error.message);
    } else {
      fetchBookings(); // Refresh the table
    }
  };

  // Helper to render status badges
  const renderStatus = (status: string) => {
    switch (status) {
      case "confirmed":
        return (
          <span className="flex items-center gap-1 text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-md">
            <CheckCircle size={14} /> Confirmed
          </span>
        );
      case "cancelled":
        return (
          <span className="flex items-center gap-1 text-xs font-bold text-red-600 bg-red-50 px-2 py-1 rounded-md">
            <XCircle size={14} /> Cancelled
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1 text-xs font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-md">
            <Clock size={14} /> Pending
          </span>
        );
    }
  };

  return (
    <div className="max-w-6xl mx-auto animate-in fade-in duration-500">
      <div className="mb-10">
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-ink)] mb-2">
          Manage Bookings
        </h1>
        <p className="text-slate-500 text-sm">
          Review incoming reservations and update their status.
        </p>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center py-24">
          <Loader2 className="animate-spin text-slate-900" size={40} />
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-[var(--color-line-soft)] shadow-[var(--shadow-raise)] overflow-hidden">
          <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-slate-400 text-xs font-bold uppercase tracking-wider">
                <th className="py-4 px-6">Guest Details</th>
                <th className="py-4 px-6">Property</th>
                <th className="py-4 px-6">Stay</th>
                <th className="py-4 px-6">Amount</th>
                <th className="py-4 px-6">Payment</th>
                <th className="py-4 px-6">Status</th>
                <th className="py-4 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
              {bookings.map((booking) => (
                <tr
                  key={booking.id}
                  className="hover:bg-slate-50/50 transition-colors"
                >
                  <td className="py-4 px-6">
                    <p className="font-bold text-slate-900">
                      {booking.guest_name}
                    </p>
                    <p className="text-xs text-slate-500">
                      {booking.guest_email}
                    </p>
                    <p className="text-xs text-slate-500">
                      {booking.guest_phone}
                    </p>
                  </td>
                  <td className="py-4 px-6 font-medium text-slate-900">
                    {booking.villas?.title || "Unknown Villa"}
                  </td>
                  <td className="py-4 px-6 text-slate-500 whitespace-nowrap">
                    {new Date(booking.check_in_date).toLocaleDateString()}
                    {booking.check_out_date && (
                      <span className="block text-xs text-slate-400">
                        out {new Date(booking.check_out_date).toLocaleDateString()}
                        {booking.nights ? ` · ${booking.nights}n` : ""}
                      </span>
                    )}
                  </td>
                  <td className="py-4 px-6 font-semibold text-slate-900 whitespace-nowrap">
                    {booking.currency ?? "GHS"} {booking.total_amount}
                  </td>
                  <td className="py-4 px-6">
                    {booking.payment_status === "paid" ? (
                      <span className="flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-md whitespace-nowrap">
                        <ShieldCheck size={14} /> Paid
                      </span>
                    ) : (
                      <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-md whitespace-nowrap">
                        Unpaid
                      </span>
                    )}
                    {booking.payment_reference && (
                      <span className="block mt-1 text-[10px] font-mono text-slate-400 break-all max-w-[160px]">
                        {booking.payment_reference}
                      </span>
                    )}
                  </td>
                  <td className="py-4 px-6">{renderStatus(booking.status)}</td>
                  <td className="py-4 px-6 text-right">
                    <div className="flex justify-end gap-2">
                      {booking.status !== "confirmed" && (
                        <button
                          onClick={() => updateStatus(booking.id, "confirmed")}
                          className="px-3 py-1.5 text-xs font-bold text-green-700 bg-green-100 hover:bg-green-200 rounded-lg transition-colors"
                        >
                          Confirm
                        </button>
                      )}
                      {booking.status !== "cancelled" && (
                        <button
                          onClick={() => updateStatus(booking.id, "cancelled")}
                          className="px-3 py-1.5 text-xs font-bold text-red-700 bg-red-100 hover:bg-red-200 rounded-lg transition-colors"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {bookings.length === 0 && (
                 <tr>
                   <td colSpan={7} className="py-12 text-center text-slate-400">
                     No bookings yet. They will appear here once customers start
                     checking out!
                   </td>
                 </tr>
               )}
             </tbody>
           </table>
           </div>
         </div>
       )}
    </div>
  );
}
