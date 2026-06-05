// components/villas/villasData.ts
import { VillaProps } from "./types";

export const villasData: VillaProps[] = [
  {
    id: 1,
    title: "Lakeside Estate",
    location: "Greater Accra • Lakeside",
    coordinates: { lat: 5.683, lng: -0.136 },
    price: 2000,
    guests: 4,
    bedrooms: 3,
    hasPool: true,
    bathrooms: 5,
    image: "/lake1.jpg",
    images: ["/lake1.jpg", "/lake2.jpg", "/lake3.jpg", "/lake4.jpg"],
    video: "/lakeside.mp4",
    description:
      "Experience comfort, privacy, and elegance in this beautifully furnished apartment located in the serene and secure Lakeside Estate.",
    amenities: [
      "Free Wi-Fi",
      "Kitchen",
      "Pool",
      "Well-furnished hall",
      "Television in all rooms",
      "PS5 Gaming Console",
    ],
    rates: [
      { option: "One bedrooms", amount: 1500 },
      { option: "Two bedrooms", amount: 2000 },
      { option: "Monthly Rate (Whole apartment)", amount: 30000 },
      { option: "Whole apartment (4 bedrooms)", amount: 36000 },
    ],
  },

  {
    id: 2,
    title: "Aburi Mountain Retreat",
    location: "Eastern Region • Aburi",
    coordinates: { lat: 5.845, lng: -0.177 }, // Mock coordinates for Aburi
    price: 600,
    guests: 4,
    bedrooms: 4,
    hasPool: true,
    bathrooms: 5,
    image: "Aburi1.jpeg",
    images: ["Aburi1.jpeg", "Aburi2.jpeg", "Aburi3.jpeg", "Aburi4.jpeg"],
    video: "/aburi.mp4",
    description:
      "Nestled in the serene and refreshing environment of Aburi, this beautifully furnished apartment offers comfort.",
    amenities: [
      "Free Wi-Fi",
      "Kitchen",
      "Pool",
      "Well-furnished hall",
      "Television in all rooms",
      "PS5 Gaming Console",
    ],
    monthlyRate: [{ option: "Whole apartment", amount: 30000 }],
    rates: [
      { option: "Single bedroom", amount: 600 },
      { option: "Studio", amount: 800 },
      { option: "One bedrooms", amount: 1200 },
      { option: "Two bedrooms", amount: 2000 },
      { option: "Whole apartment (4 bedrooms)", amount: 3500 },
      { option: "Monthly Rate (Whole apartment)", amount: 30000 },
    ],
  },

  {
    id: 3,
    title: "Adenta Serenity",
    location: "Greater Accra • Adenta",
    coordinates: { lat: 5.845, lng: -0.177 },
    price: 600,
    guests: 4,
    bedrooms: 4,
    hasPool: true,
    bathrooms: 5,
    image: "Adenta1.jpg",
    images: ["Adenta1.jpg", "Adenta2.jpg", "Adenta3.jpg", "Adenta4.jpg"],
    // video: "/adenta.mp4",
    description:
      "Located in the heart of Adenta, this premium apartment combines luxury, comfort, and entertainment with modern furnishings, a grand piano, and a PS5 gaming console.",
    amenities: [
      "Free Wi-Fi",
      "Kitchen",
      "Pool",
      "Well-furnished hall",
      "Television in all rooms",
      "Grand Piano",
      "PS5 Gaming Console",
    ],
    rates: [
      { option: "Single bedroom", amount: 600 },
      { option: "Studio", amount: 800 },
      { option: "Two bedrooms", amount: 2000 },
      { option: "Monthly Rate (Whole apartment)", amount: 30000 },
      { option: "Whole apartment (4 bedrooms)", amount: 42000 },
    ],
  },
];
