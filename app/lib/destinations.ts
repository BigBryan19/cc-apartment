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

function photo(dir: string, region: string, file: string, name: string): DestinationPhoto {
  return {
    src: `${dir}/${file}`,
    name,
    alt: `${name} in ${region}, Ghana`,
  };
}

const eastern = (file: string, name: string) =>
  photo("/media/destinations/eastern", "the Eastern Region", file, name);

const accra = (file: string, name: string) =>
  photo("/media/destinations/accra", "Greater Accra", file, name);

/**
 * Eastern Region, in the order the owner supplied them: each place has two
 * photographs, so the carousel moves through both before the next place.
 */
export const EASTERN_REGION_PHOTOS: DestinationPhoto[] = [
  eastern("atv-aburi-pipawini-1.jpg", "ATV Aburi Pipawini"),
  eastern("atv-aburi-pipawini-2.jpg", "ATV Aburi Pipawini"),
  eastern("asenema-waterfall-1.jpg", "Asenema Waterfall"),
  eastern("asenema-waterfall-2.jpg", "Asenema Waterfall"),
  eastern("aburi-botanical-gardens-1.jpg", "Aburi Botanical Gardens"),
  eastern("aburi-botanical-gardens-2.jpg", "Aburi Botanical Gardens"),
  eastern("aburi-craft-village-1.jpg", "Aburi Craft Village"),
  eastern("aburi-craft-village-2.jpg", "Aburi Craft Village"),
  eastern("bunso-eco-park-1.jpg", "Bunso Eco Park"),
  eastern("bunso-eco-park-2.jpg", "Bunso Eco Park"),
  eastern("tetteh-quarshie-cocoa-farm-1.jpg", "Tetteh Quarshie Cocoa Farm"),
  eastern("tetteh-quarshie-cocoa-farm-2.jpg", "Tetteh Quarshie Cocoa Farm"),
  eastern("umbrella-rock-boti-1.jpg", "Umbrella Rock Boti"),
  eastern("umbrella-rock-boti-2.jpg", "Umbrella Rock Boti"),
];

/**
 * Greater Accra, supplied 3 November 2026. Same rule: the caption is the name
 * the photograph was saved under, and nothing about distance, opening hours or
 * price is claimed.
 */
export const GREATER_ACCRA_PHOTOS: DestinationPhoto[] = [
  accra("potbelly-shack-adjiringanor-1.jpg", "Potbelly Shack, Adjiringanor"),
  accra("potbelly-shack-adjiringanor-2.jpg", "Potbelly Shack, Adjiringanor"),
  accra("l-accrasien-tea-room-east-legon-1.jpg", "L'Accrasien Tea Room, East Legon"),
  accra("l-accrasien-tea-room-east-legon-2.jpg", "L'Accrasien Tea Room, East Legon"),
  accra("lakeside-marina-park-1.jpg", "Lakeside Marina Park"),
  accra("lakeside-marina-park-2.jpg", "Lakeside Marina Park"),
  accra("rufus-green-parks-1.jpg", "Rufus Green Parks"),
  accra("rufus-green-parks-2.jpg", "Rufus Green Parks"),
  accra("elinesis-waterpark-1.jpg", "Elinesis Waterpark"),
  accra("elinesis-waterpark-2.jpg", "Elinesis Waterpark"),
  accra("oyarifa-mall-1.jpg", "Oyarifa Mall"),
  accra("oak-lounge-oyarifa-1.jpg", "Oak Lounge, Oyarifa"),
  accra("oak-lounge-oyarifa-2.jpg", "Oak Lounge, Oyarifa"),
];

/** How long each photograph is held before the next one fades in. */
export const DESTINATION_SLIDE_MS = 5000;
