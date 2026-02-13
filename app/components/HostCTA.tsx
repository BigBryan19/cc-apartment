import React from "react";

const HostCTA: React.FC = () => {
  return (
    <section className="relative h-[600px] flex items-center justify-center my-12">
      {/* Background with Parallax effect */}
      <div className="absolute inset-0 overflow-hidden">
        <img
          src="/pool.png"
          alt="Luxury Pool"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/20"></div>
      </div>

      {/* Floating Card */}
      <div className="relative z-10 bg-white/95 backdrop-blur-md p-12 md:p-16 max-w-2xl text-center rounded-tl-[80px] rounded-br-[80px] shadow-2xl mx-4 transform hover:-translate-y-2 transition duration-500">
        <p className="text-[10px] font-bold tracking-[0.2em] text-gray-400 uppercase mb-4">
          BECOME A HOST
        </p>
        <h2 className="text-4xl md:text-5xl font-serif text-slate-900 mb-6">
          Become a host
        </h2>
        <p className="text-slate-600 mb-10 leading-relaxed font-light">
          Join the elite league of hosts specializing in luxury villas and
          unlock a world of exclusive opportunities. We manage everything for
          you.
        </p>
        <button className="bg-slate-700 text-white px-10 py-4 text-xs font-bold uppercase tracking-widest hover:bg-slate-900 transition w-full md:w-auto shadow-lg">
          Join Today
        </button>
      </div>
    </section>
  );
};

export default HostCTA;
