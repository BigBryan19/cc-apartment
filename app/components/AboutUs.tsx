import React from "react";

const AboutUs: React.FC = () => {
  return (
    <section
      className="py-32 px-4 md:px-12 bg-stone-50 overflow-hidden"
      id="aboutus"
    >
      <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-20 items-center">
        {/* Text Content */}
        <div className="order-2 md:order-1">
          <h2 className="text-5xl font-serif text-slate-900 mb-10">About Us</h2>
          <div className="space-y-8 text-gray-600 text-sm leading-relaxed font-light">
            <p>
              At Cosy Crest Apartments, we are committed to providing a refined,
              comfortable, and memorable stay experience. Located in carefully
              selected serene environments, our apartments are designed to
              combine modern luxury with the warmth of home.
              <br />
              <br />
              We pride ourselves on offering well-furnished spaces, premium
              amenities, and exceptional hospitality to ensure every guest
              enjoys comfort, privacy, and convenience. Whether you’re visiting
              for business, leisure, or a short getaway,
            </p>

            <p className="text-slate-800 font-medium">
              Cosy Crest Apartments delivers an elevated living experience
              tailored to your needs.
            </p>

            <div className="bg-slate-200/50 p-8 rounded-lg text-slate-700 italic border border-slate-200">
              We strive to offer you the best possible homes to stay.
            </div>
          </div>
        </div>

        {/* Image Collage */}
        <div className="order-1 md:order-2 relative h-[600px] w-full hidden md:block">
          {/* Image 1: Top Left */}
          <div className="absolute top-0 left-0 w-64 h-80 rounded-2xl shadow-2xl overflow-hidden z-20 border-[6px] border-stone-50 transform -rotate-3 hover:rotate-0 transition duration-500">
            <img
              src="/img1.jpg"
              className="w-full h-full object-cover"
              alt="Travelers"
            />
          </div>

          {/* Image 2: Right */}
          <div className="absolute top-24 right-0 w-72 h-96 rounded-2xl shadow-xl overflow-hidden z-10 opacity-90 grayscale hover:grayscale-0 transition duration-500">
            <img
              src="/img3.jpg"
              className="w-full h-full object-cover"
              alt="Resort View"
            />
          </div>

          {/* Image 3: Bottom Left */}
          <div className="absolute bottom-12 left-12 w-80 h-56 rounded-2xl shadow-2xl overflow-hidden z-30 border-[6px] border-stone-50 transform rotate-3 hover:rotate-0 transition duration-500">
            <img
              src="/img2.jpg"
              className="w-full h-full object-cover"
              alt="Relaxing"
            />
          </div>
        </div>
      </div>
    </section>
  );
};

export default AboutUs;
