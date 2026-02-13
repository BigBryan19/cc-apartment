import React from "react";
import {
  ArrowRight,
  Waves,
  Dog,
  Zap,
  Dumbbell,
  Anchor,
  LucideIcon,
} from "lucide-react";

interface SpecialtyItem {
  title: string;
  sub: string;
  Icon: LucideIcon;
}

const Specialties: React.FC = () => {
  const specs: SpecialtyItem[] = [
    // { title: "Seafront", sub: "have a look", Icon: Waves },
    { title: "Pet friendly", sub: "pets allowed", Icon: Dog },
    // { title: "Electric car", sub: "charge your car", Icon: Zap },
    { title: "Fitness/Gym", sub: "work out", Icon: Dumbbell },
    // { title: "Boat mooring", sub: "take a trip", Icon: Anchor },
  ];

  return (
    <section className="py-24 bg-stone-50">
      <div className="text-center mb-20">
        <h2 className="text-4xl md:text-5xl font-serif text-slate-900">
          Our properties specialities
        </h2>
      </div>

      <div className="flex flex-wrap justify-center gap-16 md:gap-24 px-4 max-w-7xl mx-auto">
        {specs.map((item, idx) => (
          <div
            key={idx}
            className="flex flex-col items-center md:items-start group cursor-pointer w-40"
          >
            <div className="w-16 h-16 border border-slate-300 rounded-full flex items-center justify-center mb-6 text-slate-700 group-hover:bg-slate-800 group-hover:text-white transition duration-300">
              <item.Icon size={28} strokeWidth={1.5} />
            </div>
            <h4 className="font-serif text-xl text-slate-900 mb-2">
              {item.title}
            </h4>
            <div className="flex items-center gap-2 text-[10px] font-bold tracking-widest text-gray-400 uppercase mt-1 group-hover:text-slate-600 group-hover:gap-3 transition-all">
              {item.sub} <ArrowRight size={12} />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default Specialties;
