// app/admin/villas/page.tsx
"use client";

import React, { useEffect, useState } from "react";
import { createClient } from "../../utils/supabase";
import {
  Plus,
  Trash2,
  Edit,
  Loader2,
  X,
  DollarSign,
  MapPin,
  Users,
} from "lucide-react";

interface Villa {
  id: number;
  title: string;
  location: string;
  price: number;
  guests: number;
  bedrooms: number;
  bathrooms: number;
  image: string;
}

export default function ManageVillas() {
  const [villas, setVillas] = useState<Villa[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    title: "",
    location: "",
    price: "",
    guests: "2",
    bedrooms: "1",
    bathrooms: "1",
    image: "/lake1.jpg", // Temporary default image string path
    description: "",
  });

  const supabase = createClient();

  // Fetch villas from Supabase
  const fetchVillas = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("villas")
      .select("id, title, location, price, guests, bedrooms, bathrooms, image")
      .order("id", { ascending: false });

    if (!error && data) {
      setVillas(data as unknown as Villa[]);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchVillas();
  }, []);

  // Handle Form Submission (Add Villa)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const { error } = await supabase.from("villas").insert([
      {
        title: formData.title,
        location: formData.location,
        price: parseFloat(formData.price),
        guests: parseInt(formData.guests),
        bedrooms: parseInt(formData.bedrooms),
        bathrooms: parseInt(formData.bathrooms),
        image: formData.image,
        description: formData.description,
        images: [formData.image], // Matching structure
        amenities: ["Free Wi-Fi", "Kitchen"], // Basic defaults for now
      },
    ]);

    if (error) {
      alert("Error adding villa: " + error.message);
    } else {
      setIsModalOpen(false);
      // Reset form
      setFormData({
        title: "",
        location: "",
        price: "",
        guests: "2",
        bedrooms: "1",
        bathrooms: "1",
        image: "/lake1.jpg",
        description: "",
      });
      fetchVillas(); // Refresh table
    }
    setIsSubmitting(false);
  };

  // Handle Delete Villa
  const handleDelete = async (id: number) => {
    if (
      confirm(
        "Are you sure you want to delete this property? This cannot be undone.",
      )
    ) {
      const { error } = await supabase.from("villas").delete().eq("id", id);
      if (error) {
        alert("Error deleting villa: " + error.message);
      } else {
        fetchVillas(); // Refresh table
      }
    }
  };

  return (
    <div className="max-w-6xl mx-auto animate-in fade-in duration-500">
      {/* Header section */}
      <div className="flex justify-between items-center mb-10">
        <div>
          <h1 className="text-3xl font-serif text-slate-900 mb-2">
            Manage Villas
          </h1>
          <p className="text-slate-500 text-sm">
            Add, view, or remove properties from your application.
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-slate-700 hover:bg-slate-800 text-white px-5 py-3 rounded-xl text-sm font-bold shadow-md transition-all active:scale-95"
        >
          <Plus size={18} /> Add New Villa
        </button>
      </div>

      {/* Main data view */}
      {isLoading ? (
        <div className="flex justify-center items-center py-24">
          <Loader2 className="animate-spin text-slate-900" size={40} />
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-slate-400 text-xs font-bold uppercase tracking-wider">
                <th className="py-4 px-6">Property</th>
                <th className="py-4 px-6">Location</th>
                <th className="py-4 px-6">Nightly Rate</th>
                <th className="py-4 px-6">Capacity</th>
                <th className="py-4 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
              {villas.map((villa) => (
                <tr
                  key={villa.id}
                  className="hover:bg-slate-50/50 transition-colors"
                >
                  <td className="py-4 px-6 font-medium text-slate-900">
                    {villa.title}
                  </td>
                  <td className="py-4 px-6 text-slate-500">{villa.location}</td>
                  <td className="py-4 px-6 font-semibold text-slate-900">
                    ₵{villa.price}
                  </td>
                  <td className="py-4 px-6 text-slate-500">
                    {villa.bedrooms}B / {villa.bathrooms}BA • {villa.guests}{" "}
                    Guests
                  </td>
                  <td className="py-4 px-6 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => handleDelete(villa.id)}
                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete Property"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {villas.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    No villas found in the database.
                  </td>
                 </tr>
               )}
             </tbody>
           </table>
           </div>
         </div>
       )}

      {/* Add New Villa Slide-out / Modal Overlay */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex justify-end animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-lg h-full p-8 shadow-2xl flex flex-col justify-between overflow-y-auto animate-in slide-in-from-right duration-300">
            <div>
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-2xl font-serif text-slate-900">
                  Add New Property
                </h2>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <form
                id="add-villa-form"
                onSubmit={handleSubmit}
                className="space-y-6"
              >
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                    Villa Title
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Airport Residential Suite"
                    value={formData.title}
                    onChange={(e) =>
                      setFormData({ ...formData, title: e.target.value })
                    }
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-600 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                    Location Detail
                  </label>
                  <div className="relative">
                    <MapPin
                      className="absolute left-4 top-3.5 text-slate-400"
                      size={16}
                    />
                    <input
                      type="text"
                      required
                      placeholder="e.g. Greater Accra • Airport Residential"
                      value={formData.location}
                      onChange={(e) =>
                        setFormData({ ...formData, location: e.target.value })
                      }
                      className="w-full border border-slate-200 rounded-xl pl-11 pr-4 py-3 text-sm focus:outline-none focus:border-blue-600 transition-colors"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                      Price Per Night (₵)
                    </label>
                    <div className="relative">
                      <DollarSign
                        className="absolute left-4 top-3.5 text-slate-400"
                        size={16}
                      />
                      <input
                        type="number"
                        required
                        placeholder="2500"
                        value={formData.price}
                        onChange={(e) =>
                          setFormData({ ...formData, price: e.target.value })
                        }
                        className="w-full border border-slate-200 rounded-xl pl-11 pr-4 py-3 text-sm focus:outline-none focus:border-blue-600 transition-colors"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                      Max Guests
                    </label>
                    <input
                      type="number"
                      required
                      value={formData.guests}
                      onChange={(e) =>
                        setFormData({ ...formData, guests: e.target.value })
                      }
                      className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-600 transition-colors"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                      Bedrooms
                    </label>
                    <input
                      type="number"
                      required
                      value={formData.bedrooms}
                      onChange={(e) =>
                        setFormData({ ...formData, bedrooms: e.target.value })
                      }
                      className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-600 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                      Bathrooms
                    </label>
                    <input
                      type="number"
                      required
                      value={formData.bathrooms}
                      onChange={(e) =>
                        setFormData({ ...formData, bathrooms: e.target.value })
                      }
                      className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-600 transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                    Description
                  </label>
                  <textarea
                    rows={4}
                    placeholder="Describe the aesthetic, security details, and convenience..."
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-600 transition-colors resize-none"
                  />
                </div>
              </form>
            </div>

            <div className="border-t border-slate-100 pt-6 mt-8 flex gap-4">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="w-1/3 border border-slate-200 text-slate-500 font-bold py-3.5 rounded-xl text-sm hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="add-villa-form"
                disabled={isSubmitting}
                className="w-2/3 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl text-sm shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="animate-spin" size={16} /> Saving...
                  </>
                ) : (
                  "Save Property"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
