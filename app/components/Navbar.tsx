"use client";

import React, { useState, useEffect } from "react";
import {
  Menu,
  X,
  Globe,
  Check,
  MapPin,
  ArrowRight,
  User,
  Phone,
  Mail,
  Calendar,
  MessageSquare,
  ChevronLeft,
  Loader2,
  CheckCircle2,
} from "lucide-react";

// --- PROPS ---
interface NavbarProps {
  currency: "GHS" | "USD";
  toggleCurrency: () => void;
}

// --- DATA ---
const availableVillas = [
  {
    id: 1,
    title: "Lakeside Serenity",
    location: "Greater Accra • Lakeside",
    price: 2000,
    image:
      "/Lake1.jpg",
  },
  {
    id: 2,
    title: "Aburi Mountain Retreat",
    location: "Eastern Region • Aburi",
    price: 600,
    image:
      "/Aburi1.jpeg",
  },

  {
    id: 3,
    title: "Adenta Mountain Retreat",
    location: "Greater Accra • Adenta",
    price: 600,
    image:
      "/Adenta1.jpg",
  },
];

const EXCHANGE_RATE = 15;

// --- COMPONENT: 1. APARTMENT LIST ---
const VillasListModal = ({
  onClose,
  onSelect,
  currency,
}: {
  onClose: () => void;
  onSelect: (villa: any) => void;
  currency: "GHS" | "USD";
}) => {
  const formatPrice = (amount: number) => {
    if (currency === "GHS") return `₵${amount.toLocaleString()}`;
    const usd = Math.round(amount / EXCHANGE_RATE);
    return `$${usd.toLocaleString()}`;
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-300 flex flex-col max-h-[85vh]">
        <div className="bg-slate-900 p-6 flex justify-between items-center shrink-0">
          <div>
            <h3 className="text-white font-serif text-xl">
              Select an Apartment
            </h3>
            <p className="text-white/60 text-xs mt-1">Choose a property</p>
          </div>
          <button
            onClick={onClose}
            className="text-white/70 hover:text-white transition p-1 bg-white/10 rounded-full"
          >
            <X size={20} />
          </button>
        </div>
        <div className="p-6 overflow-y-auto space-y-4">
          {availableVillas.map((villa) => (
            <div
              key={villa.id}
              className="group flex flex-col sm:flex-row gap-4 p-3 rounded-xl border border-gray-100 hover:border-slate-200 hover:shadow-md transition bg-white"
            >
              <div className="w-full sm:w-28 h-28 rounded-lg overflow-hidden shrink-0">
                <img
                  src={villa.image}
                  alt={villa.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                />
              </div>
              <div className="flex flex-col flex-grow justify-center">
                <div className="flex items-center gap-1 text-[10px] font-bold text-blue-500 uppercase tracking-widest mb-1">
                  <MapPin size={10} /> {villa.location}
                </div>
                <h4 className="font-serif text-slate-900 text-lg leading-tight mb-2">
                  {villa.title}
                </h4>
                <div className="text-sm font-medium text-slate-600 mb-3">
                  Starting from{" "}
                  <span className="text-slate-900 font-bold">
                    {formatPrice(villa.price)}
                  </span>
                  /night
                </div>
                <button
                  onClick={() => onSelect(villa)}
                  className="w-full sm:w-auto self-start bg-slate-900 text-white px-4 py-2 rounded-md text-xs font-bold uppercase tracking-wide flex items-center justify-center gap-2 hover:bg-slate-800 transition"
                >
                  Book Now <ArrowRight size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// --- COMPONENT: 2. BOOKING FORM ---
const BookingFormModal = ({
  villa,
  onClose,
  onBack,
  onSuccess,
}: {
  villa: any;
  onClose: () => void;
  onBack: () => void;
  onSuccess: () => void;
}) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    date: "",
    requests: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Simulate a "Behind the scenes" network request delay
    setTimeout(() => {
      // Prepare the WhatsApp URL but DO NOT open it yet.
      // In a real app with backend, you would trigger an API here.
      // For now, we will open it in the Success Modal as a "Confirmation" step.
      const phoneNumber = "233534770274";
      const receipt = `🧾 *BOOKING RECEIPT*
--------------------------------
*Status:* ⏳ Pending Confirmation
*Ref:* #${Math.floor(Math.random() * 10000)}

*PROPERTY DETAILS*
🏠 ${villa.title}
📍 ${villa.location}

*GUEST DETAILS*
👤 ${formData.name}
📞 ${formData.phone}
📧 ${formData.email}

*RESERVATION*
📅 Date: ${formData.date}
📝 Note: ${formData.requests || "N/A"}
--------------------------------
_Please confirm availability._`;

      // Store this message in localStorage or pass it up so the Success Modal can use it
      localStorage.setItem(
        "pendingBookingMessage",
        `https://wa.me/${phoneNumber}?text=${encodeURIComponent(receipt)}`,
      );

      setLoading(false);
      onSuccess(); // Trigger Success Modal
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-300 flex flex-col max-h-[90vh]">
        <div className="bg-slate-900 p-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="text-white/70 hover:text-white hover:bg-white/10 p-1.5 rounded-full transition"
            >
              <ChevronLeft size={20} />
            </button>
            <div>
              <h3 className="text-white font-serif text-lg">
                Complete Booking
              </h3>
              <p className="text-white/60 text-xs">Enter your details below</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/70 hover:text-white transition p-1 bg-white/10 rounded-full"
          >
            <X size={20} />
          </button>
        </div>
        <div className="bg-slate-50 border-b border-gray-200 p-4 flex items-center gap-4">
          <img
            src={villa.image}
            alt={villa.title}
            className="w-16 h-16 rounded-md object-cover"
          />
          <div>
            <h4 className="font-bold text-slate-800 text-sm">{villa.title}</h4>
            <div className="flex items-center gap-1 text-[10px] text-gray-500 uppercase tracking-wider mt-1">
              <MapPin size={10} /> {villa.location}
            </div>
          </div>
        </div>
        <div className="p-6 overflow-y-auto">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                Full Name
              </label>
              <div className="flex items-center gap-3 bg-white p-3 rounded-lg border border-gray-200 focus-within:border-slate-900 transition">
                <User size={16} className="text-gray-400" />
                <input
                  required
                  type="text"
                  placeholder="John Doe"
                  className="bg-transparent outline-none w-full text-sm"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                  Phone
                </label>
                <div className="flex items-center gap-3 bg-white p-3 rounded-lg border border-gray-200 focus-within:border-slate-900 transition">
                  <Phone size={16} className="text-gray-400" />
                  <input
                    required
                    type="tel"
                    placeholder="+233..."
                    className="bg-transparent outline-none w-full text-sm"
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                  Email
                </label>
                <div className="flex items-center gap-3 bg-white p-3 rounded-lg border border-gray-200 focus-within:border-slate-900 transition">
                  <Mail size={16} className="text-gray-400" />
                  <input
                    required
                    type="email"
                    placeholder="john@ex.com"
                    className="bg-transparent outline-none w-full text-sm"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                  />
                </div>
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                Check-in Date
              </label>
              <div className="flex items-center gap-3 bg-white p-3 rounded-lg border border-gray-200 focus-within:border-slate-900 transition">
                <Calendar size={16} className="text-gray-400" />
                <input
                  required
                  type="date"
                  className="bg-transparent outline-none w-full text-sm text-slate-600"
                  value={formData.date}
                  onChange={(e) =>
                    setFormData({ ...formData, date: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                Special Requests
              </label>
              <div className="flex gap-3 bg-white p-3 rounded-lg border border-gray-200 focus-within:border-slate-900 transition">
                <MessageSquare size={16} className="text-gray-400 mt-1" />
                <textarea
                  rows={2}
                  placeholder="Any specific requirements?"
                  className="bg-transparent outline-none w-full text-sm resize-none"
                  value={formData.requests}
                  onChange={(e) =>
                    setFormData({ ...formData, requests: e.target.value })
                  }
                />
              </div>
            </div>

            <button
              disabled={loading}
              type="submit"
              className="w-full bg-slate-900 text-white py-4 rounded-lg font-bold uppercase tracking-widest text-xs hover:bg-slate-800 transition shadow-lg mt-2 flex items-center justify-center gap-2"
            >
              {loading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                "Confirm Booking"
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

// --- COMPONENT: 3. SUCCESS MODAL ---
const SuccessModal = ({ onClose }: { onClose: () => void }) => {
  const handleSendToWhatsApp = () => {
    const url = localStorage.getItem("pendingBookingMessage");
    if (url) window.open(url, "_blank");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/90 backdrop-blur-md transition-opacity" />
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in duration-500 text-center p-8">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 size={40} className="text-green-600" />
        </div>
        <h3 className="text-2xl font-serif text-slate-900 mb-2">
          Booking Received!
        </h3>
        <p className="text-gray-500 text-sm mb-8 leading-relaxed">
          Thank you for choosing Cosy Crest. We have received your details.
          Please click below to send your docket to our agent for final
          confirmation.
        </p>
        <button
          onClick={handleSendToWhatsApp}
          className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold uppercase tracking-widest text-xs hover:bg-slate-800 transition shadow-xl mb-3"
        >
          Send Docket on WhatsApp
        </button>
        <button
          onClick={onClose}
          className="text-xs font-bold text-gray-400 hover:text-slate-900 transition uppercase tracking-wider"
        >
          Close Window
        </button>
      </div>
    </div>
  );
};

// --- MAIN NAVBAR ---
const Navbar: React.FC<NavbarProps> = ({ currency, toggleCurrency }) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Steps: "none" -> "list" -> "form" -> "success"
  const [currentStep, setCurrentStep] = useState<
    "none" | "list" | "form" | "success"
  >("none");
  const [selectedVilla, setSelectedVilla] = useState<any>(null);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleBookNowClick = () => {
    setIsMobileMenuOpen(false);
    setCurrentStep("list");
  };

  const handleVillaSelect = (villa: any) => {
    setSelectedVilla(villa);
    setCurrentStep("form");
  };

  return (
    <>
      <nav
        className={`fixed top-0 left-0 w-full z-50 transition-all duration-300 ${isScrolled ? "bg-slate-900/90 backdrop-blur-md py-4 shadow-lg" : "bg-transparent py-6"}`}
      >
        <div className="max-w-7xl mx-auto px-6 md:px-12 flex justify-between items-center">
          <div className="flex items-center gap-2 cursor-pointer z-50">
            <img
              src="/cc-horinzontal.png"
              alt="COSY CREST"
              className="h-8 md:h-10"
            />
          </div>

          <div className="hidden md:flex items-center gap-8 text-xs tracking-[0.2em] font-medium uppercase text-white">
            {["Villas", "About Us", "Contact"].map((item) => (
              <a
                key={item}
                href={`#${item.toLowerCase().replace(" ", "")}`}
                className="relative group hover:text-gray-300 transition-colors py-2"
              >
                {item}
                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-white transition-all duration-300 group-hover:w-full"></span>
              </a>
            ))}
            <button
              onClick={toggleCurrency}
              className="flex items-center gap-2 hover:text-gray-300 transition border border-white/20 px-3 py-1 rounded-full"
            >
              <Globe size={14} /> <span>{currency}</span>
            </button>
            <button
              onClick={handleBookNowClick}
              className="border border-white/30 px-5 py-2 hover:bg-white hover:text-slate-900 transition duration-300 rounded-sm"
            >
              Book Now
            </button>
          </div>

          <button
            className="md:hidden text-white z-50 p-2"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X size={28} /> : <Menu size={28} />}
          </button>

          <div
            className={`fixed inset-0 bg-slate-900/95 backdrop-blur-xl z-40 flex flex-col items-center justify-center gap-8 transition-transform duration-500 ease-in-out md:hidden ${isMobileMenuOpen ? "translate-x-0" : "translate-x-full"}`}
          >
            {["Villas", "About Us", "Contact"].map((item) => (
              <a
                key={item}
                href={`#${item.toLowerCase().replace(" ", "")}`}
                onClick={() => setIsMobileMenuOpen(false)}
                className="text-2xl font-serif text-white hover:text-gray-300 transition tracking-widest"
              >
                {item}
              </a>
            ))}
            <div className="flex gap-4 items-center mt-4">
              <button
                onClick={() => {
                  if (currency !== "GHS") toggleCurrency();
                }}
                className={`px-4 py-2 border rounded-full flex items-center gap-2 ${currency === "GHS" ? "bg-white text-slate-900" : "text-white border-white/30"}`}
              >
                {currency === "GHS" && <Check size={14} />} GHS
              </button>
              <button
                onClick={() => {
                  if (currency !== "USD") toggleCurrency();
                }}
                className={`px-4 py-2 border rounded-full flex items-center gap-2 ${currency === "USD" ? "bg-white text-slate-900" : "text-white border-white/30"}`}
              >
                {currency === "USD" && <Check size={14} />} USD
              </button>
            </div>
            <button
              onClick={handleBookNowClick}
              className="mt-4 border border-white px-8 py-3 text-white uppercase tracking-widest text-sm hover:bg-white hover:text-slate-900 transition"
            >
              Book Now
            </button>
          </div>
        </div>
      </nav>

      {/* --- MODAL ORCHESTRATION --- */}
      {currentStep === "list" && (
        <VillasListModal
          currency={currency}
          onSelect={handleVillaSelect}
          onClose={() => setCurrentStep("none")}
        />
      )}

      {currentStep === "form" && selectedVilla && (
        <BookingFormModal
          villa={selectedVilla}
          onBack={() => setCurrentStep("list")}
          onClose={() => setCurrentStep("none")}
          onSuccess={() => setCurrentStep("success")}
        />
      )}

      {currentStep === "success" && (
        <SuccessModal onClose={() => setCurrentStep("none")} />
      )}
    </>
  );
};

export default Navbar;
