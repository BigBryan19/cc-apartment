// app/lib/destinations.ts
// ---------------------------------------------------------------------------
// Destination photography for the "Where you'll be staying" section.
//
// THESE ARE PLACES, NOT APARTMENTS
//
//   The Eastern Region card used to show a photograph of the Aburi apartment,
//   which made a property photograph stand in for a whole region. The owner
//   supplied photographs of the places guests actually ask about, so the card now
//   shows the region's attractions and the caption names each one.
//
// NAMES COME FROM THE FILES
//
//   Each caption is the name the owner saved the photograph under, cleaned up
//   ("1-ATV-Aburi-Pipawini.jpg" → "ATV Aburi Pipawini"). Nothing is invented and
//   no travel time, distance or fee is attached to any of them.
// ---------------------------------------------------------------------------

export interface DestinationPhoto {
  /** Full path to the photograph. */
  src: string;
  /** Place name, taken from the supplied filename. */
  name: string;
  alt: string;
}

const easternDir = "/media/destinations/eastern";

function photo(file: string, name: string): DestinationPhoto {
  return {
    src: `${easternDir}/${file}`,
    name,
    alt: `${name} in the Eastern Region of Ghana`,
  };
}

/**
 * Eastern Region, in the order the owner supplied them: each place has two
 * photographs, so the carousel moves through both before the next place.
 */
export const EASTERN_REGION_PHOTOS: DestinationPhoto[] = [
  photo("atv-aburi-pipawini-1.jpg", "ATV Aburi Pipawini"),
  photo("atv-aburi-pipawini-2.jpg", "ATV Aburi Pipawini"),
  photo("asenema-waterfall-1.jpg", "Asenema Waterfall"),
  photo("asenema-waterfall-2.jpg", "Asenema Waterfall"),
  photo("aburi-botanical-gardens-1.jpg", "Aburi Botanical Gardens"),
  photo("aburi-botanical-gardens-2.jpg", "Aburi Botanical Gardens"),
  photo("aburi-craft-village-1.jpg", "Aburi Craft Village"),
  photo("aburi-craft-village-2.jpg", "Aburi Craft Village"),
  photo("bunso-eco-park-1.jpg", "Bunso Eco Park"),
  photo("bunso-eco-park-2.jpg", "Bunso Eco Park"),
  photo("tetteh-quarshie-cocoa-farm-1.jpg", "Tetteh Quarshie Cocoa Farm"),
  photo("tetteh-quarshie-cocoa-farm-2.jpg", "Tetteh Quarshie Cocoa Farm"),
  photo("umbrella-rock-boti-1.jpg", "Umbrella Rock Boti"),
  photo("umbrella-rock-boti-2.jpg", "Umbrella Rock Boti"),
];

/** How long each photograph is held before the next one fades in. */
export const DESTINATION_SLIDE_MS = 5000;
