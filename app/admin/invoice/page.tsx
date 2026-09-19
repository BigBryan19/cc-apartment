// app/admin/invoice/page.tsx
"use client";

import { useEffect, useState } from "react";
import { Printer, MessageCircle, Mail } from "lucide-react";

export default function CreateInvoicePage() {
  const [invoiceData, setInvoiceData] = useState({
    invoiceNumber: `JUN-${Math.floor(Math.random() * 10000)}`,
    issueDate: new Date().toISOString().split("T")[0],
    dueDate: "",
    guestName: "",
    guestEmail: "", // Added guest email for the mailto link
    guestPhone: "", // Added guest phone for WhatsApp
    serviceTitle: "Apartment Booking",
    serviceDesc: "Nights booking at Adenta...",
    qty: "1",
    days: 0,
    price: 0,
    paid: 0,
    tax: 0,
  });

  // Auto-calculate the amounts
  const subtotal = Number(invoiceData.price) || 0;
  const paid = Number(invoiceData.paid) || 0;
  const tax = Number(invoiceData.tax) || 0;
  const amountDue = subtotal + tax - paid;

  const formatNum = (num: number) => {
    return num.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const handlePrint = () => {
    // This opens the browser print dialog where you can select "Save as PDF"
    window.print();
  };

  const handleWhatsApp = () => {
    if (!invoiceData.guestName)
      return alert("Please enter a guest name first.");

    // Create a pre-filled WhatsApp message
    const message = `Hello ${invoiceData.guestName},%0A%0AThank you for choosing Cosy Crest Apartments.%0A%0AYour invoice (#${invoiceData.invoiceNumber}) for your ${invoiceData.days}-night stay is ready.%0A*Amount Due: ${invoiceData.price === 0 ? "" : "₵"}${formatNum(amountDue)}*%0A%0A(I will attach the PDF document to this chat).%0A%0APlease let us know if you have any questions!`;

    // If you have their number, it opens their specific chat. If not, it just opens WhatsApp for you to pick the contact.
    const url = invoiceData.guestPhone
      ? `https://wa.me/${invoiceData.guestPhone.replace(/[^0-9]/g, "")}?text=${message}`
      : `https://wa.me/?text=${message}`;

    window.open(url, "_blank");
  };

  const handleEmail = () => {
    if (!invoiceData.guestEmail)
      return alert("Please enter the guest's email address first.");

    const subject = `Invoice #${invoiceData.invoiceNumber} from Cosy Crest Apartments`;
    const body = `Hello ${invoiceData.guestName},%0D%0A%0D%0AThank you for your business.%0D%0A%0D%0APlease find attached your invoice for ${invoiceData.serviceTitle}. The total amount due is ₵${formatNum(amountDue)}.%0D%0A%0D%0ABest regards,%0D%0ACosy Crest Management`;

    window.location.href = `mailto:${invoiceData.guestEmail}?subject=${subject}&body=${body}`;
  };

  return (
    <div className="max-w-7xl mx-auto animate-in fade-in duration-500 font-sans">
      {/* Page Header - Hidden when printing */}
      <div className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-4 print:hidden">
        <div>
          <h1 className="text-3xl font-serif text-slate-900 mb-2">
            Create Invoice
          </h1>
          <p className="text-slate-500 text-sm">
            Step 1: Save as PDF. Step 2: Share with guest.
          </p>
        </div>

        <div className="flex gap-2 w-full md:w-auto">
          <button
            onClick={handleWhatsApp}
            className="flex-1 md:flex-none bg-green-500 hover:bg-green-600 text-white px-4 py-3 rounded-xl text-sm font-bold shadow-sm transition-all flex items-center justify-center gap-2"
          >
            <MessageCircle size={18} /> WhatsApp
          </button>

          <button
            onClick={handleEmail}
            className="flex-1 md:flex-none bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-3 rounded-xl text-sm font-bold shadow-sm transition-all flex items-center justify-center gap-2"
          >
            <Mail size={18} /> Email
          </button>

          <button
            onClick={handlePrint}
            className="flex-1 md:flex-none bg-slate-900 hover:bg-slate-800 text-white px-5 py-3 rounded-xl text-sm font-bold shadow-md transition-all flex items-center justify-center gap-2"
          >
            <Printer size={18} /> Save as PDF
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
        {/* LEFT COLUMN: Input Form */}
        <div className="xl:col-span-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100 print:hidden space-y-6 sticky top-6">
          <h2 className="font-serif text-lg text-slate-900 border-b border-slate-100 pb-4">
            Invoice Data
          </h2>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Invoice #
              </label>
              <input
                type="text"
                value={invoiceData.invoiceNumber}
                onChange={(e) =>
                  setInvoiceData({
                    ...invoiceData,
                    invoiceNumber: e.target.value,
                  })
                }
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-slate-900 outline-none"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Guest Name
              </label>
              <input
                type="text"
                value={invoiceData.guestName}
                onChange={(e) =>
                  setInvoiceData({ ...invoiceData, guestName: e.target.value })
                }
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-slate-900 outline-none"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Guest Email
              </label>
              <input
                type="email"
                value={invoiceData.guestEmail}
                onChange={(e) =>
                  setInvoiceData({ ...invoiceData, guestEmail: e.target.value })
                }
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-slate-900 outline-none"
                placeholder="For email button"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Guest Phone
              </label>
              <input
                type="tel"
                value={invoiceData.guestPhone}
                onChange={(e) =>
                  setInvoiceData({ ...invoiceData, guestPhone: e.target.value })
                }
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-slate-900 outline-none"
                placeholder="+233..."
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Issue Date
              </label>
              <input
                type="date"
                value={invoiceData.issueDate}
                onChange={(e) =>
                  setInvoiceData({ ...invoiceData, issueDate: e.target.value })
                }
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-slate-900 outline-none"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Due Date
              </label>
              <input
                type="date"
                value={invoiceData.dueDate}
                onChange={(e) =>
                  setInvoiceData({ ...invoiceData, dueDate: e.target.value })
                }
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-slate-900 outline-none"
              />
            </div>
          </div>

          <div className="border-t border-slate-100 pt-4">
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Service Title
            </label>
            <input
              type="text"
              value={invoiceData.serviceTitle}
              onChange={(e) =>
                setInvoiceData({ ...invoiceData, serviceTitle: e.target.value })
              }
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-slate-900 outline-none mb-4"
            />

            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Service Description
            </label>
            <textarea
              rows={2}
              value={invoiceData.serviceDesc}
              onChange={(e) =>
                setInvoiceData({ ...invoiceData, serviceDesc: e.target.value })
              }
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-slate-900 outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Total Days
              </label>
              <input
                type="number"
                value={invoiceData.days}
                onChange={(e) =>
                  setInvoiceData({
                    ...invoiceData,
                    days: Number(e.target.value),
                  })
                }
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-slate-900 outline-none"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Base Price (₵)
              </label>
              <input
                type="number"
                value={invoiceData.price}
                onChange={(e) =>
                  setInvoiceData({
                    ...invoiceData,
                    price: Number(e.target.value),
                  })
                }
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-slate-900 outline-none"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Amount Paid (₵)
              </label>
              <input
                type="number"
                value={invoiceData.paid}
                onChange={(e) =>
                  setInvoiceData({
                    ...invoiceData,
                    paid: Number(e.target.value),
                  })
                }
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-slate-900 outline-none"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Tax Amount (₵)
              </label>
              <input
                type="number"
                value={invoiceData.tax}
                onChange={(e) =>
                  setInvoiceData({
                    ...invoiceData,
                    tax: Number(e.target.value),
                  })
                }
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-slate-900 outline-none"
              />
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: The Invoice Document */}
        <div className="xl:col-span-8 bg-white print:m-0 print:p-0 print:shadow-none print:border-none rounded-sm shadow-xl border border-slate-200 min-h-[1056px] w-full max-w-[816px] mx-auto flex flex-col justify-between relative bg-slate-50/30">
          <div className="p-12 md:p-16 flex-1">
            {/* Header: Title & Logo */}
            <div className="flex justify-between items-start mb-12">
              <div>
                <h1 className="text-[42px] font-bold text-slate-800 tracking-tight leading-none mb-2">
                  INVOICE
                </h1>
                <p className="text-slate-500 font-medium">
                  #{invoiceData.invoiceNumber}
                </p>
              </div>

              <div className="flex flex-col items-end">
                {/* Logo Here */}

                <img
                  src="/cc-real.png"
                  alt="COSY CREST"
                  className="h-22 md:h-22"
                />
              </div>
            </div>

            {/* Grid Info: Issued, Billed To, From */}
            <div className="grid grid-cols-3 gap-8 py-8 border-y border-slate-200 mb-12 text-sm">
              <div className="space-y-4">
                <div>
                  <p className="font-bold text-slate-800 mb-1">Issued</p>
                  <p className="text-slate-600 font-medium">
                    {invoiceData.issueDate
                      ? new Date(invoiceData.issueDate).toLocaleDateString(
                          "en-GB",
                        )
                      : "DD/MM/YYYY"}
                  </p>
                </div>
                <div>
                  <p className="font-bold text-slate-800 mb-1">Due</p>
                  <p className="text-slate-600 font-medium">
                    {invoiceData.dueDate
                      ? new Date(invoiceData.dueDate).toLocaleDateString(
                          "en-GB",
                        )
                      : "DD/MM/YYYY"}
                  </p>
                </div>
              </div>

              <div>
                <p className="font-bold text-slate-800 mb-1">Billed to</p>
                <p className="text-slate-600 font-medium">
                  {invoiceData.guestName || "Guest Name"}
                </p>
                <p className="text-slate-500 font-medium text-[13px]">
                  {invoiceData.guestPhone || "Guest Phone"}
                </p>

                <p className="text-slate-500 font-medium text-[13px]">
                  {invoiceData.guestEmail || "Guest Email"}
                </p>
              </div>

              <div>
                <p className="font-bold text-slate-800 mb-1">From</p>
                <p className="text-slate-600 font-medium">
                  Cosy Crest Apartments
                </p>
                <p className="text-slate-500">Adenta, Greater Accra</p>
                <p className="text-slate-500">Ghana</p>
              </div>
            </div>

            {/* Table Header */}
            <div className="grid grid-cols-[3fr_1fr_1fr_1.5fr] text-sm font-bold text-slate-800 border-b border-slate-200 pb-3 mb-4">
              <div>Service</div>
              <div>Qty</div>
              <div>Days</div>
              <div className="text-right">Price</div>
            </div>

            {/* Table Body */}
            <div className="grid grid-cols-[3fr_1fr_1fr_1.5fr] text-sm mb-8 pb-8 border-b border-slate-200">
              <div className="pr-4">
                <p className="font-bold text-slate-800">
                  {invoiceData.serviceTitle}
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  {invoiceData.serviceDesc}
                </p>
              </div>
              <div className="text-slate-600">{invoiceData.qty}</div>
              <div className="text-slate-600">{invoiceData.days || 0}</div>
              <div className="text-right text-slate-600">
                ₵ {formatNum(invoiceData.price)}
              </div>
            </div>

            {/* Totals Section */}
            <div className="flex justify-end text-sm">
              <div className="w-[300px] space-y-4">
                <div className="flex justify-between font-bold text-slate-800">
                  <span>Subtotal</span>
                  <span className="text-slate-600 font-normal">
                    ₵ {formatNum(subtotal)}
                  </span>
                </div>
                <div className="flex justify-between font-bold text-slate-800">
                  <span>Paid</span>
                  <span className="text-slate-600 font-normal">
                    ₵ {formatNum(paid)}
                  </span>
                </div>
                <div className="flex justify-between font-bold text-slate-800 pb-4 border-b border-slate-200">
                  <span>Tax (0%)</span>
                  <span className="text-slate-600 font-normal">
                    ₵ {formatNum(tax)}
                  </span>
                </div>
                <div className="flex justify-between font-bold text-slate-800 pb-4 border-b border-slate-900">
                  <span>Total</span>
                  <span>₵ {formatNum(subtotal + tax)}</span>
                </div>
                <div className="flex justify-between font-bold text-blue-500 pt-2 pb-2">
                  <span>Amount due</span>
                  <span>GH₵ {formatNum(amountDue)}</span>
                </div>
                <div className="border-b border-blue-500"></div>
                <p className="text-[9px] text-blue-400 text-right mt-2">
                  Due Amount is to be paid on the{" "}
                  {invoiceData.dueDate
                    ? new Date(invoiceData.dueDate).toLocaleDateString("en-GB")
                    : "specified date"}
                </p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="p-12 md:p-16 pt-0">
            <p className="font-bold text-slate-800 text-sm mb-8">
              Thank you for the business!
            </p>
            <div className="flex justify-between items-center text-sm text-slate-600 border-t border-slate-200 pt-6">
              <span>Cosy Crest Apartment</span>
              <span>+233 54 053 4870</span>
              <span>officialcosycrestaparts@gmail.com</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
