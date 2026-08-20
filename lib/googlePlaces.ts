export function isGooglePlacesConfigured(): boolean {
  return Boolean(process.env.GOOGLE_PLACES_API_KEY);
}

export interface VenueSuggestion {
  placeId: string;
  mainText: string;
  secondaryText: string;
}

export async function autocompleteVenues(input: string): Promise<VenueSuggestion[]> {
  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key) return [];

  const url = new URL('https://maps.googleapis.com/maps/api/place/autocomplete/json');
  url.searchParams.set('input', input);
  url.searchParams.set('key', key);
  // Bias toward venues/points of interest rather than street addresses.
  url.searchParams.set('types', 'establishment');

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`Google Places autocomplete failed: ${res.status}`);
  const data = await res.json();
  if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
    throw new Error(`Google Places autocomplete error: ${data.status} ${data.error_message ?? ''}`.trim());
  }

  return (data.predictions || []).map((p: any) => ({
    placeId: p.place_id,
    mainText: p.structured_formatting?.main_text || p.description,
    secondaryText: p.structured_formatting?.secondary_text || '',
  }));
}

export interface VenueDetails {
  name: string;
  city: string | null;
  country: string | null;
}

export async function getVenueDetails(placeId: string): Promise<VenueDetails> {
  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key) throw new Error('GOOGLE_PLACES_API_KEY is not set.');

  const url = new URL('https://maps.googleapis.com/maps/api/place/details/json');
  url.searchParams.set('place_id', placeId);
  url.searchParams.set('key', key);
  url.searchParams.set('fields', 'name,address_component');

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`Google Places details failed: ${res.status}`);
  const data = await res.json();
  if (data.status !== 'OK') {
    throw new Error(`Google Places details error: ${data.status} ${data.error_message ?? ''}`.trim());
  }

  const components: { long_name: string; types: string[] }[] = data.result?.address_components || [];
  const city =
    components.find((c) => c.types.includes('locality'))?.long_name ||
    components.find((c) => c.types.includes('postal_town'))?.long_name ||
    components.find((c) => c.types.includes('administrative_area_level_2'))?.long_name ||
    null;
  const country = components.find((c) => c.types.includes('country'))?.long_name || null;

  return { name: data.result?.name || '', city, country };
}
