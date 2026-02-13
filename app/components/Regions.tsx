import React from "react";

const Regions: React.FC = () => {
  return (
    <section className="py-24 bg-[#d8cdbf] px-4 md:px-12">
      <div className="text-center mb-16">
        <h2 className="text-4xl md:text-5xl font-serif text-slate-900 mb-6">
          OUR REGIONS
        </h2>
        <p className="text-slate-700 max-w-2xl mx-auto text-sm leading-relaxed opacity-70">
          Discover our carefully selected locations, each offering a unique
          blend of comfort, convenience, and unforgettable experiences tailored
          to your stay.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-10 max-w-6xl mx-auto">
        {/* Card 1: Rounded Top Right, Bottom Left */}
        <div className="relative h-[450px] group overflow-hidden rounded-tr-[100px] rounded-bl-[100px] shadow-2xl cursor-pointer">
          <img
            src="https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?q=80&w=2070&auto=format&fit=crop"
            alt="Eastern Region"
            className="w-full h-full object-cover group-hover:scale-110 transition duration-1000"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
          <div className="absolute bottom-10 left-10 text-white">
            <h3 className="text-4xl font-serif mb-2">Eastern Region</h3>
            <p className="text-sm opacity-80 font-light">
              Aburi - Aburi near Aburi Girls School
            </p>
          </div>
        </div>

        {/* Card 2: Rounded Top Left, Bottom Right */}
        <div className="relative h-[450px] group overflow-hidden rounded-tl-[100px] rounded-br-[100px] shadow-2xl cursor-pointer">
          <img
            src="https://images.unsplash.com/photo-1534008897995-27a23e859048?q=80&w=2070&auto=format&fit=crop"
            alt="Greater Accra"
            className="w-full h-full object-cover group-hover:scale-110 transition duration-1000"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
          <div className="absolute bottom-10 left-10 text-white">
            <h3 className="text-4xl font-serif mb-2">Greater Accra</h3>
            <p className="text-sm opacity-80 font-light">
              Accra - Lakeside Estate
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Regions;
