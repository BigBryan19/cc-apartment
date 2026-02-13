import React from "react";
import {
  Facebook,
  Instagram,
  Twitter,
  Youtube,
  Send,
  Phone,
  Mail,
  MapPin,
} from "lucide-react";

const Footer: React.FC = () => {
  return (
    <footer className="relative pt-40 pb-10 bg-stone-100" id="contact">
      {/* Background Image Overlay */}
      <div className="absolute top-0 left-0 w-full h-2/3 overflow-hidden z-0 opacity-10 pointer-events-none">
        <img
          src="https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?q=80&w=2070&auto=format&fit=crop"
          alt="Footer Background"
          className="w-full h-full object-cover"
        />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-4">
        {/* Contact Form Container */}
        <div className="bg-white rounded-[40px] shadow-2xl overflow-hidden flex flex-col md:flex-row mb-24">
          {/* Left Side: Dark Info Panel */}
          <div className="bg-slate-900 text-white p-12 md:w-5/12 relative flex flex-col justify-between">
            <div>
              <h3 className="text-3xl font-serif mb-10">Let's connect</h3>

              <div className="space-y-8 text-sm text-gray-400">
                <div className="flex gap-4 items-start">
                  <Phone size={18} className="text-white mt-1" />
                  <div>
                    <span className="block font-bold text-white mb-1">
                      Phone
                    </span>
                    <span>+233 123 456 789</span>
                  </div>
                </div>
                <div className="flex gap-4 items-start">
                  <Mail size={18} className="text-white mt-1" />
                  <div>
                    <span className="block font-bold text-white mb-1">
                      Email
                    </span>
                    <span>email@cosycrest.com</span>
                  </div>
                </div>
                <div className="flex gap-4 items-start">
                  <MapPin size={18} className="text-white mt-1" />
                  <div>
                    <span className="block font-bold text-white mb-1">
                      Address
                    </span>
                    <span>
                      Cosy Crest Apartments
                      <br />
                      Lakeside
                      <br />
                      Ghana
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-6 mt-12">
              <div className="p-2 bg-white/10 rounded-full hover:bg-white/20 cursor-pointer transition">
                <Facebook size={18} />
              </div>
              <div className="p-2 bg-white/10 rounded-full hover:bg-white/20 cursor-pointer transition">
                <Youtube size={18} />
              </div>
              <div className="p-2 bg-white/10 rounded-full hover:bg-white/20 cursor-pointer transition">
                <Twitter size={18} />
              </div>
            </div>

            {/* Decorative Circle */}
            <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-white/5 rounded-full pointer-events-none"></div>
          </div>

          {/* Right Side: Form */}
          <div className="p-12 md:w-7/12 bg-white">
            <h3 className="text-3xl font-serif text-slate-900 mb-8">
              We’d love to hear from you
            </h3>
            <form className="space-y-8">
              <div className="grid md:grid-cols-2 gap-8">
                <div className="border-b border-gray-300 py-2">
                  <input
                    type="text"
                    placeholder="Your Name"
                    className="w-full outline-none text-sm placeholder-gray-400 text-slate-800"
                  />
                </div>
                <div className="border-b border-gray-300 py-2">
                  <input
                    type="email"
                    placeholder="Email"
                    className="w-full outline-none text-sm placeholder-gray-400 text-slate-800"
                  />
                </div>
              </div>
              <div className="border-b border-gray-300 py-2">
                <input
                  type="text"
                  placeholder="Message"
                  className="w-full outline-none text-sm placeholder-gray-400 text-slate-800"
                />
              </div>

              <div className="flex items-center gap-3 text-xs text-gray-500 mt-4">
                <input type="checkbox" className="accent-slate-800 w-4 h-4" />
                <span>I accept the Terms and conditions</span>
              </div>

              <button className="bg-slate-800 text-white px-10 py-4 text-xs font-bold uppercase tracking-widest hover:bg-slate-600 transition flex items-center gap-2">
                Send Message <Send size={14} />
              </button>
            </form>
          </div>
        </div>

        {/* Bottom Footer Links */}
        <div className="grid md:grid-cols-3 gap-12 text-xs text-gray-500 items-end border-t border-gray-200 pt-10">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <img src="/cc-real.png" alt="Logo" className="h-20" />
            </div>
            <p className="max-w-xs leading-relaxed">
              Cosy Crest Apartments delivers an elevated living experience
              tailored to your needs.
            </p>
          </div>

          <div className="flex flex-col md:flex-row gap-6 font-medium">
            <a href="#" className="hover:text-slate-900 transition">
              Terms & Conditions
            </a>
            <a href="#" className="hover:text-slate-900 transition">
              Privacy Notice
            </a>
            <a href="#" className="hover:text-slate-900 transition">
              Imprint
            </a>
          </div>

          <div className="md:text-right">
            <p className="font-bold text-slate-900 mb-2 uppercase tracking-wide">
              Connect with us
            </p>
            <div className="flex md:justify-end gap-4 mb-4 text-slate-800">
              <Facebook
                size={16}
                className="cursor-pointer hover:text-slate-500"
              />
              <Instagram
                size={16}
                className="cursor-pointer hover:text-slate-500"
              />
              <Twitter
                size={16}
                className="cursor-pointer hover:text-slate-500"
              />
            </div>
            <p className="text-[10px] text-gray-400">
              Cosy Crest Apartments | © All rights reserved 2026
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
