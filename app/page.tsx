import React from "react";
import Hero from "./components/Hero";
import Villas from "./components/Villas";
import Regions from "./components/Regions";
import Specialties from "./components/Specialties";
import HostCTA from "./components/HostCTA";
import AboutUs from "./components/AboutUs";
import Footer from "./components/Footer";

const App: React.FC = () => {
  return (
    <div className="font-sans text-slate-800 bg-stone-50 overflow-x-hidden">
      <Hero />
      <Villas />
      <Regions />
      <Specialties />
      {/* <HostCTA /> */}
      <AboutUs />
      <Footer />
    </div>
  );
};

export default App;
