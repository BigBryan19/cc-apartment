import React from "react";

const HostCTA: React.FC = () => {
  return (
    <section className="relative isolate min-h-[520px] overflow-hidden">
      <img
        src="/pool.png"
        alt="Poolside at a Cosy Crest residence"
        className="absolute inset-0 -z-10 h-full w-full object-cover"
      />
      <div className="absolute inset-0 -z-10 bg-black/45" />

      <div className="shell flex min-h-[520px] items-center justify-center py-20">
        <div className="w-full max-w-xl rounded-2xl bg-white/95 p-8 text-center shadow-[var(--shadow-card)] backdrop-blur-md md:p-12">
          <span className="eyebrow">Become a host</span>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-[var(--color-ink)] sm:text-4xl">
            List your property with us
          </h2>
          <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-[var(--color-muted)]">
            We handle guest vetting, housekeeping, maintenance and payments. You
            keep the asset — we run the operation.
          </p>
          <a
            href="#contact"
            className="btn-ink mt-8 inline-flex w-full items-center justify-center rounded-lg px-8 py-3.5 text-sm sm:w-auto"
          >
            Talk to our team
          </a>
        </div>
      </div>
    </section>
  );
};

export default HostCTA;
