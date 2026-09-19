"use client";
import React from "react";
import {
  Heart,
  Gift,
  CarFront,
  ArrowRight,
  Sparkles,
  MessageSquareQuote,
} from "lucide-react";

const Packages: React.FC = () => {
  // WhatsApp Inquiry Handler
  const handlePackageInquiry = (pkgTitle: string) => {
    const phoneNumber = "2330540534870"; // The same number from your booking flow
    const message = `Hello! I was looking at the Cosy Crest website and I am very interested in the *${pkgTitle}* package. Can you provide more details?`;
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, "_blank");
  };

  const specialPackages = [
    {
      id: "honeymoon",
      title: "Honeymoon & Couples",
      price: "From GHS 500",
      shortDesc: "Romantic setups and ultimate privacy.",
      fullDesc:
        "Celebrate your love with our exclusive couples package. Includes romantic bedroom setups, champagne on arrival, flower decorations, and complete privacy for your special getaway.",
      icon: Heart,
      image:
        "https://images.unsplash.com/photo-1522771731478-44bf104f9954?q=80&w=2070&auto=format&fit=crop",
    },
    {
      id: "birthday",
      title: "Birthday Celebrations",
      price: "From GHS 5000",
      shortDesc: "Make your day unforgettable.",
      fullDesc:
        "Enjoy customized birthday decorations, cake arrangements, balloons, photoshoot corners, and spacious living areas perfect for intimate celebrations.",
      icon: Gift,
      image:
        "https://images.unsplash.com/photo-1530103862676-de889243ab6a?q=80&w=2070&auto=format&fit=crop",
    },
    {
      id: "car-rental",
      title: "Luxury Car Rental",
      price: "From GHS 350",
      shortDesc: "Travel in style and comfort.",
      fullDesc:
        "Add a premium vehicle to your booking. Enjoy reliable transportation, airport pickups, chauffeur options, and executive travel throughout your stay.",
      icon: CarFront,
      image:
        "https://images.unsplash.com/photo-1494976388531-d1058494cdd8?q=80&w=2070&auto=format&fit=crop",
    },
  ];

  return (
    <section
      className="py-24 bg-gradient-to-b from-white to-stone-50 px-4 md:px-12"
      id="packages"
    >
      <div className="max-w-7xl mx-auto">
        {/* --- Premium Header --- */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-slate-900 text-white px-5 py-2 rounded-full text-[10px] font-bold tracking-[0.2em] uppercase mb-6 shadow-md">
            <Sparkles size={14} className="text-amber-400" />
            Exclusive Experiences
          </div>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-serif text-slate-900 mb-6">
            Curated Special Packages
          </h2>
          <p className="text-gray-500 max-w-2xl mx-auto text-sm md:text-base leading-relaxed">
            Looking for honeymoon setups, birthday staycations, or premium car
            rentals? Elevate your stay at Cosy Crest with bespoke services
            tailored perfectly to your celebrations and travel needs.
          </p>
        </div>

        {/* --- Refined Minimalist Statistics --- */}
        <div className="flex flex-wrap justify-center items-center gap-8 md:gap-16 mb-20">
          <div className="text-center">
            <h3 className="text-4xl font-serif text-slate-900 mb-1">50+</h3>
            <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest">
              Birthdays
            </p>
          </div>
          <div className="hidden md:block w-px h-12 bg-slate-200"></div>
          <div className="text-center">
            <h3 className="text-4xl font-serif text-slate-900 mb-1">30+</h3>
            <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest">
              Honeymoons
            </p>
          </div>
          <div className="hidden md:block w-px h-12 bg-slate-200"></div>
          <div className="text-center">
            <h3 className="text-4xl font-serif text-slate-900 mb-1">100%</h3>
            <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest">
              Satisfaction
            </p>
          </div>
          <div className="hidden md:block w-px h-12 bg-slate-200"></div>
          <div className="text-center">
            <h3 className="text-4xl font-serif text-slate-900 mb-1">24/7</h3>
            <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest">
              Concierge
            </p>
          </div>
        </div>

        {/* --- Luxury Package Cards --- */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {specialPackages.map((pkg) => (
            <div
              key={pkg.id}
              className="group relative rounded-[2rem] overflow-hidden shadow-lg hover:shadow-2xl h-[550px] transition-all duration-500 transform hover:-translate-y-2"
            >
              {/* Background Image */}
              <img
                src={pkg.image}
                alt={pkg.title}
                className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000 ease-out"
              />

              {/* Refined Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900/95 via-slate-900/40 to-transparent opacity-90 group-hover:opacity-100 transition-opacity duration-500" />

              {/* Top Badge */}
              {pkg.id === "honeymoon" && (
                <div className="absolute top-6 left-6 z-20">
                  <span className="bg-white/90 backdrop-blur-sm text-slate-900 px-4 py-2 rounded-full text-[10px] uppercase tracking-widest font-bold shadow-sm">
                    Most Popular
                  </span>
                </div>
              )}

              {/* Content */}
              <div className="absolute inset-0 flex flex-col justify-end p-8 z-10">
                <div className="bg-white/10 backdrop-blur-md border border-white/20 w-14 h-14 rounded-full flex items-center justify-center mb-6 transform group-hover:scale-110 group-hover:bg-blue-600 group-hover:border-blue-500 transition-all duration-300">
                  <pkg.icon size={24} className="text-white" />
                </div>

                <h3 className="text-3xl font-serif text-white mb-2 leading-tight">
                  {pkg.title}
                </h3>

                <p className="text-white/70 text-sm mb-4 font-light tracking-wide">
                  {pkg.shortDesc}
                </p>

                <div className="flex items-center gap-3 mb-6">
                  <span className="text-xl font-serif font-bold text-white">
                    {pkg.price}
                  </span>
                  <span className="text-white/40 text-[10px] uppercase tracking-wider">
                    add-on
                  </span>
                </div>

                {/* Hidden description that expands gracefully on hover */}
                <div className="grid grid-rows-[0fr] group-hover:grid-rows-[1fr] transition-all duration-500 ease-in-out">
                  <div className="overflow-hidden">
                    <p className="text-xs text-white/60 leading-relaxed mb-6 font-light">
                      {pkg.fullDesc}
                    </p>

                    {/* Functional Action Button */}
                    <button
                      onClick={() => handlePackageInquiry(pkg.title)}
                      className="w-full bg-white text-slate-900 py-4 px-6 rounded-xl font-bold text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-slate-200 transition-colors shadow-lg active:scale-95"
                    >
                      Inquire About Package
                      <MessageSquareQuote size={14} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* --- Refined CTA Banner --- */}
        <div className="mt-20 relative overflow-hidden rounded-[2.5rem] bg-slate-900 text-white p-12 md:p-16 text-center shadow-2xl">
          {/* Decorative background element */}
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-white/5 rounded-full blur-3xl pointer-events-none"></div>
          <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>

          <div className="relative z-10">
            <h3 className="text-3xl md:text-5xl font-serif mb-6 leading-tight">
              Need More Than Accommodation?
            </h3>
            <p className="text-white/60 max-w-2xl mx-auto mb-10 text-sm md:text-base font-light">
              Our concierge team is ready to curate your perfect stay. Reach out
              to us with your specific requirements and we will make it happen.
            </p>
            <button
              onClick={() => handlePackageInquiry("Custom Concierge Services")}
              className="bg-white text-slate-900 px-10 py-4 rounded-full font-bold uppercase tracking-widest text-[10px] hover:bg-slate-100 hover:scale-105 transition-all duration-300 shadow-xl"
            >
              Contact Concierge
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Packages;
