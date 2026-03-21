/**
 * Geocoding utility using OpenStreetMap Nominatim
 * Free tier with 1 req/sec rate limit
 */

export interface GeoPoint {
  type: 'Point';
  coordinates: [number, number]; // [lng, lat] per GeoJSON spec
}

export interface GeocodeResult {
  geo?: GeoPoint;
  formattedAddress?: string;
  city?: string;
  country?: string;
  error?: string;
}

// Cache to avoid re-geocoding same locations
const geocodeCache = new Map<string, GeocodeResult>();

// Rate limiter - Nominatim requires max 1 request per second
let lastRequestTime = 0;
const MIN_DELAY_MS = 1500; // 1.5 seconds to be safe

// User-Agent required by Nominatim ToS
const USER_AGENT = 'BuilderInsightsAdmin/1.0 (MongoDB builder event management)';

async function rateLimitedFetch(url: string, retries = 2): Promise<Response> {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  
  if (timeSinceLastRequest < MIN_DELAY_MS) {
    await new Promise((resolve) => setTimeout(resolve, MIN_DELAY_MS - timeSinceLastRequest));
  }
  
  lastRequestTime = Date.now();
  
  const res = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      'Accept': 'application/json',
    },
  });
  
  // Retry on 503 (rate limit) with exponential backoff
  if (res.status === 503 && retries > 0) {
    const backoff = (3 - retries) * 2000; // 2s, 4s
    await new Promise((resolve) => setTimeout(resolve, backoff));
    return rateLimitedFetch(url, retries - 1);
  }
  
  return res;
}

/**
 * Normalize location string for better geocoding results
 */
function normalizeLocation(location: string): string {
  let normalized = location.trim();
  
  // Remove common noise
  normalized = normalized
    .replace(/\(virtual\)/gi, '')
    .replace(/\(hybrid\)/gi, '')
    .replace(/\(on-?site\)/gi, '')
    .replace(/\(in-?person\)/gi, '')
    .replace(/customer\s*site/gi, '')
    .replace(/client\s*office/gi, '')
    .replace(/headquarters/gi, '')
    .replace(/HQ/gi, '')
    .replace(/office/gi, '')
    .replace(/^\s*-\s*/, '')
    .replace(/\s*-\s*$/, '')
    .trim();
  
  // Handle common abbreviations
  const abbrevs: Record<string, string> = {
    'NYC': 'New York City',
    'LA': 'Los Angeles',
    'SF': 'San Francisco',
    'DC': 'Washington DC',
    'UK': 'United Kingdom',
    'UAE': 'United Arab Emirates',
  };
  
  for (const [abbrev, full] of Object.entries(abbrevs)) {
    const regex = new RegExp(`\\b${abbrev}\\b`, 'gi');
    normalized = normalized.replace(regex, full);
  }
  
  return normalized;
}

/**
 * Geocode a location string to coordinates
 */
export async function geocodeLocation(location: string): Promise<GeocodeResult> {
  if (!location || location.toLowerCase() === 'virtual' || location.toLowerCase() === 'tbd') {
    return { error: 'Virtual or TBD location' };
  }
  
  const normalized = normalizeLocation(location);
  
  // Check cache
  const cached = geocodeCache.get(normalized.toLowerCase());
  if (cached) {
    return cached;
  }
  
  try {
    const encoded = encodeURIComponent(normalized);
    const url = `https://nominatim.openstreetmap.org/search?q=${encoded}&format=json&limit=1&addressdetails=1`;
    
    const res = await rateLimitedFetch(url);
    
    if (!res.ok) {
      const result: GeocodeResult = { error: `Geocoding failed: ${res.status}` };
      return result;
    }
    
    const data = await res.json();
    
    if (!data || data.length === 0) {
      const result: GeocodeResult = { error: 'No results found' };
      geocodeCache.set(normalized.toLowerCase(), result);
      return result;
    }
    
    const match = data[0];
    const result: GeocodeResult = {
      geo: {
        type: 'Point',
        coordinates: [parseFloat(match.lon), parseFloat(match.lat)],
      },
      formattedAddress: match.display_name,
      city: match.address?.city || match.address?.town || match.address?.village || match.address?.municipality,
      country: match.address?.country,
    };
    
    geocodeCache.set(normalized.toLowerCase(), result);
    return result;
  } catch (err) {
    return { error: `Geocoding error: ${err}` };
  }
}

/**
 * Batch geocode multiple locations with rate limiting
 */
export async function geocodeLocations(
  locations: Array<{ id: string; location: string }>
): Promise<Map<string, GeocodeResult>> {
  const results = new Map<string, GeocodeResult>();
  
  for (const { id, location } of locations) {
    const result = await geocodeLocation(location);
    results.set(id, result);
  }
  
  return results;
}
