export interface VillaProps {
  id: number;
  image: string;
  images: string[];
  video?: string;
  price: number; // Base price in GHS
  title: string;
  location: string;
  coordinates: { lat: number; lng: number };
  guests: number;
  bedrooms: number;
  hasPool: boolean;
  bathrooms: number;
  description: string;
  amenities?: string[];
  rates?: { option: string; amount: number }[];
  monthlyRate?: { option: string; amount: number }[];
}

// Make sure to export your SearchFilters interface from wherever it currently lives,
// or define it here if it's specific to this module.
export interface SearchFilters {
  location: string;
  guests: number;
  maxPrice: number;
}
