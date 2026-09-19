import React from "react";
import { Dog, Dumbbell, Waves, CarFront, LucideIcon } from "lucide-react";

interface SpecialtyItem {
  title: string;
  sub: string;
  Icon: LucideIcon;
}

const SPECIALTIES: SpecialtyItem[] = [
  { title: "Private pool", sub: "Every residence", Icon: Waves },
  { title: "Pet friendly", sub: "Pets welcome", Icon: Dog },
  { title: "Fitness & gym", sub: "Train on site", Icon: Dumbbell },
  { title: "Secure parking", sub: "Gated compound", Icon: CarFront },
];

const Specialties: React.FC = () => {
  return (
    <section className="section-y bg-white">
      <div className="shell">
        <div className="max-w-2xl">
          <span className="eyebrow">What&apos;s included</span>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-[var(--color-ink)] sm:text-4xl">
            Every stay, fully taken care of
          </h2>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
          {SPECIALTIES.map((item) => (
            <div key={item.title} className="flex items-start gap-4">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--color-canvas)] text-[var(--color-ink)]">
                <item.Icon size={20} strokeWidth={1.6} />
              </span>
              <div className="min-w-0">
                <h3 className="text-[15px] font-semibold text-[var(--color-ink)]">
                  {item.title}
                </h3>
                <p className="mt-0.5 text-[13px] text-[var(--color-muted)]">
                  {item.sub}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Specialties;
