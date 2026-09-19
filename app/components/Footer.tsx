"use client";

import React, { useState } from "react";
import {
  Facebook,
  Instagram,
  Twitter,
  Send,
  Phone,
  Mail,
  MapPin,
  Check,
} from "lucide-react";

const CONTACT = {
  phone: "+233 54 053 4870",
  phoneHref: "+233540534870",
  email: "officialcosycrestaparts@gmail.com",
  address: ["Cosy Crest Apartments", "Lakeside Estate", "Ghana"],
};

const Footer: React.FC = () => {
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [accepted, setAccepted] = useState(false);
  const [sent, setSent] = useState(false);

  // The site has no backend, so the enquiry is handed to the guest's mail
  // client with everything pre-filled — previously the button did nothing.
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const subject = `Enquiry from ${form.name || "the website"}`;
    const body = `Name: ${form.name}\nEmail: ${form.email}\n\n${form.message}`;
    window.location.href = `mailto:${CONTACT.email}?subject=${encodeURIComponent(
      subject,
    )}&body=${encodeURIComponent(body)}`;
    setSent(true);
  };

  const field =
    "w-full border-b border-[var(--color-line)] bg-transparent py-3 text-sm text-[var(--color-ink)] placeholder-[var(--color-faint)] outline-none transition-colors focus:border-[var(--color-ink)]";

  return (
    <footer id="contact" className="bg-[var(--color-canvas-warm)] pt-16 md:pt-20">
      <div className="shell">
        {/* ---------------- Contact card ---------------- */}
        <div className="grid overflow-hidden rounded-2xl bg-white shadow-[var(--shadow-raise)] lg:grid-cols-12">
          {/* Info panel */}
          <div className="bg-[var(--color-ink)] p-8 text-white md:p-10 lg:col-span-5">
            <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-white/50">
              Contact
            </span>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight md:text-3xl">
              Let&apos;s plan your stay
            </h2>

            <dl className="mt-8 space-y-6 text-sm">
              <div className="flex gap-4">
                <Phone size={17} className="mt-0.5 shrink-0 text-white/60" />
                <div>
                  <dt className="text-white/50">Phone / WhatsApp</dt>
                  <dd className="mt-0.5">
                    <a
                      href={`tel:${CONTACT.phoneHref}`}
                      className="transition-colors hover:text-white/80"
                    >
                      {CONTACT.phone}
                    </a>
                  </dd>
                </div>
              </div>

              <div className="flex gap-4">
                <Mail size={17} className="mt-0.5 shrink-0 text-white/60" />
                <div className="min-w-0">
                  <dt className="text-white/50">Email</dt>
                  <dd className="mt-0.5 break-all">
                    <a
                      href={`mailto:${CONTACT.email}`}
                      className="transition-colors hover:text-white/80"
                    >
                      {CONTACT.email}
                    </a>
                  </dd>
                </div>
              </div>

              <div className="flex gap-4">
                <MapPin size={17} className="mt-0.5 shrink-0 text-white/60" />
                <div>
                  <dt className="text-white/50">Address</dt>
                  <dd className="mt-0.5 leading-relaxed">
                    {CONTACT.address.map((line) => (
                      <span key={line} className="block">
                        {line}
                      </span>
                    ))}
                  </dd>
                </div>
              </div>
            </dl>

            <div className="mt-10 flex gap-3">
              {[Facebook, Instagram, Twitter].map((Icon, i) => (
                <span
                  key={i}
                  className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
                >
                  <Icon size={16} />
                </span>
              ))}
            </div>
          </div>

          {/* Form */}
          <div className="p-8 md:p-10 lg:col-span-7">
            <h3 className="text-lg font-semibold tracking-tight text-[var(--color-ink)]">
              Send us a message
            </h3>
            <p className="mt-1 text-sm text-[var(--color-muted)]">
              We usually reply within a few hours.
            </p>

            <form onSubmit={handleSubmit} className="mt-8 space-y-7">
              <div className="grid gap-7 sm:grid-cols-2">
                <div>
                  <label htmlFor="contact-name" className="eyebrow">
                    Your name
                  </label>
                  <input
                    id="contact-name"
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Jane Doe"
                    className={`mt-2 ${field}`}
                  />
                </div>
                <div>
                  <label htmlFor="contact-email" className="eyebrow">
                    Email
                  </label>
                  <input
                    id="contact-email"
                    type="email"
                    required
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="jane@example.com"
                    className={`mt-2 ${field}`}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="contact-message" className="eyebrow">
                  Message
                </label>
                <textarea
                  id="contact-message"
                  rows={3}
                  required
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  placeholder="Tell us your dates, guest count and anything else we should know…"
                  className={`mt-2 resize-none ${field}`}
                />
              </div>

              <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                <label className="flex cursor-pointer items-center gap-2.5 text-xs text-[var(--color-muted)]">
                  <input
                    type="checkbox"
                    required
                    checked={accepted}
                    onChange={(e) => setAccepted(e.target.checked)}
                    className="h-4 w-4 accent-[var(--color-ink)]"
                  />
                  I accept the terms and conditions
                </label>

                <button
                  type="submit"
                  className="btn-ink flex items-center justify-center gap-2 rounded-lg px-7 py-3.5 text-sm"
                >
                  {sent ? (
                    <>
                      <Check size={16} /> Opening mail app…
                    </>
                  ) : (
                    <>
                      Send message <Send size={15} />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* ---------------- Bottom bar ---------------- */}
        <div className="mt-14 grid gap-8 border-t border-[var(--color-line)] py-10 text-xs text-[var(--color-muted)] md:grid-cols-3 md:gap-12">
          <div>
            <img src="/cc-horinzontal.png" alt="Cosy Crest" className="mb-4 h-8 w-auto" />
            <p className="max-w-xs leading-relaxed">
              Fully serviced apartments in Accra and Aburi, delivered with
              hotel-grade housekeeping and 24/7 support.
            </p>
          </div>

          <nav className="flex flex-col gap-3 font-medium md:items-center md:justify-center">
            {["Terms & Conditions", "Privacy Notice", "Imprint"].map((item) => (
              <a
                key={item}
                href="#"
                className="transition-colors hover:text-[var(--color-ink)]"
              >
                {item}
              </a>
            ))}
          </nav>

          <div className="md:text-right">
            <p className="font-semibold uppercase tracking-wide text-[var(--color-ink)]">
              Connect with us
            </p>
            <div className="mt-3 flex gap-4 text-[var(--color-ink)] md:justify-end">
              {[Facebook, Instagram, Twitter].map((Icon, i) => (
                <Icon
                  key={i}
                  size={16}
                  className="cursor-pointer transition-colors hover:text-[var(--color-muted)]"
                />
              ))}
            </div>
            <p className="mt-4 text-[11px] text-[var(--color-faint)]">
              © {new Date().getFullYear()} Cosy Crest Apartments. All rights
              reserved.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
