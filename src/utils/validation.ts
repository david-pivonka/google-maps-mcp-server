import { z } from 'zod';
import { ValidationError } from './errors.js';

// Common schemas
export const LatLngSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180)
});

export const LocationBiasSchema = z.object({
  circle: z.object({
    center: LatLngSchema,
    radius_meters: z.number().positive()
  }).optional(),
  rectangle: z.object({
    low: LatLngSchema,
    high: LatLngSchema
  }).optional()
}).optional();

// IP validation
export const IPv4Schema = z.string().regex(
  /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/,
  'Invalid IPv4 address'
);

export const IPv6Schema = z.string().regex(
  /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^::1$|^::$/,
  'Invalid IPv6 address'
);

export const IPSchema = z.union([IPv4Schema, IPv6Schema]);

// Validation for private/reserved IP ranges
export function isPrivateOrReservedIP(ip: string): boolean {
  // IPv4 private ranges
  const ipv4PrivateRanges = [
    /^10\./,
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
    /^192\.168\./,
    /^127\./,
    /^169\.254\./,
    /^224\./,
    /^240\./
  ];

  // IPv6 private ranges
  const ipv6PrivateRanges = [
    /^::1$/,
    /^::/,
    /^fe80:/i,
    /^fc00:/i,
    /^fd00:/i
  ];

  if (IPv4Schema.safeParse(ip).success) {
    return ipv4PrivateRanges.some(range => range.test(ip));
  }

  if (IPv6Schema.safeParse(ip).success) {
    return ipv6PrivateRanges.some(range => range.test(ip));
  }

  return true; // If we can't parse it, consider it invalid
}

// Tool input schemas
export const GeocodeSearchSchema = z.object({
  query: z.string().min(1).max(500),
  region: z.string().length(2).optional(),
  language: z.string().length(2).optional()
});

export const GeocodeReverseSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  language: z.string().length(2).optional()
});

export const PlacesSearchTextSchema = z.object({
  query: z.string().min(1).max(500),
  included_types: z.array(z.string()).max(50).optional(),
  excluded_types: z.array(z.string()).max(50).optional(),
  open_now: z.boolean().optional(),
  price_levels: z.array(z.number().int().min(0).max(4)).max(5).optional(),
  min_rating: z.number().min(0).max(5).optional(),
  location_bias: LocationBiasSchema,
  rank_preference: z.enum(['RELEVANCE', 'DISTANCE']).optional(),
  language: z.string().length(2).optional(),
  region: z.string().length(2).optional(),
  max_results: z.number().int().min(1).max(20).optional()
});

export const PlacesNearbySchema = z.object({
  location: LatLngSchema,
  radius_meters: z.number().positive().max(50000),
  included_types: z.array(z.string()).max(50).optional(),
  max_results: z.number().int().min(1).max(20).optional(),
  language: z.string().length(2).optional(),
  region: z.string().length(2).optional()
});

export const PlacesAutocompleteSchema = z.object({
  input: z.string().min(1).max(500),
  session_token: z.string().optional(),
  location_bias: LocationBiasSchema,
  included_types: z.array(z.string()).max(50).optional(),
  language: z.string().length(2).optional(),
  region: z.string().length(2).optional()
});

export const PlacesDetailsSchema = z.object({
  place_id: z.string().min(1),
  fields: z.array(z.string()).optional(),
  language: z.string().length(2).optional(),
  region: z.string().length(2).optional(),
  session_token: z.string().optional()
});

export const PlacesPhotosSchema = z.object({
  photo_reference: z.string().min(1),
  max_width: z.number().int().positive().max(1600).optional(),
  max_height: z.number().int().positive().max(1600).optional()
});

export const RoutesComputeSchema = z.object({
  origin: z.union([LatLngSchema, z.object({ address: z.string().min(1) })]),
  destination: z.union([LatLngSchema, z.object({ address: z.string().min(1) })]),
  waypoints: z.array(z.union([LatLngSchema, z.object({ address: z.string().min(1) })])).max(25).optional(),
  travel_mode: z.enum(['DRIVE', 'WALK', 'BICYCLE', 'TRANSIT']).optional(),
  routing_preference: z.enum(['TRAFFIC_UNAWARE', 'TRAFFIC_AWARE', 'TRAFFIC_AWARE_OPTIMAL']).optional(),
  avoid: z.array(z.enum(['tolls', 'highways', 'ferries'])).optional(),
  language: z.string().length(2).optional(),
  region: z.string().length(2).optional(),
  units: z.enum(['metric', 'imperial']).optional(),
  departure_time: z.string().optional(),
  arrival_time: z.string().optional()
});

export const RoutesMatrixSchema = z.object({
  origins: z.array(z.union([LatLngSchema, z.object({ address: z.string().min(1) })])).min(1).max(25),
  destinations: z.array(z.union([LatLngSchema, z.object({ address: z.string().min(1) })])).min(1).max(25),
  travel_mode: z.enum(['DRIVE', 'WALK', 'BICYCLE', 'TRANSIT']).optional(),
  routing_preference: z.enum(['TRAFFIC_UNAWARE', 'TRAFFIC_AWARE', 'TRAFFIC_AWARE_OPTIMAL']).optional(),
  avoid: z.array(z.enum(['tolls', 'highways', 'ferries'])).optional(),
  language: z.string().length(2).optional(),
  region: z.string().length(2).optional(),
  units: z.enum(['metric', 'imperial']).optional(),
  departure_time: z.string().optional()
});

export const ElevationGetSchema = z.object({
  locations: z.array(LatLngSchema).max(512).optional(),
  path: z.string().optional()
}).refine(data => data.locations || data.path, {
  message: "Either 'locations' or 'path' must be provided"
});

export const TimezoneGetSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  timestamp: z.number().int().positive()
});

export const GeolocationEstimateSchema = z.object({
  wifi_access_points: z.array(z.object({
    mac_address: z.string(),
    signal_strength: z.number().optional(),
    age: z.number().optional(),
    channel: z.number().optional(),
    signal_to_noise: z.number().optional()
  })).optional(),
  cell_towers: z.array(z.object({
    cell_id: z.number(),
    location_area_code: z.number(),
    mobile_country_code: z.number(),
    mobile_network_code: z.number(),
    age: z.number().optional(),
    signal_strength: z.number().optional(),
    timing_advance: z.number().optional()
  })).optional(),
  consider_ip: z.boolean().optional()
});

export const NearbyFindSchema = z.object({
  origin: z.union([LatLngSchema, z.object({ address: z.string().min(1) })]),
  what: z.enum(['cities', 'towns', 'pois', 'custom']),
  included_types: z.array(z.string()).max(50).optional(),
  radius_meters: z.number().positive().max(50000).optional(),
  max_results: z.number().int().min(1).max(20).optional(),
  language: z.string().length(2).optional(),
  region: z.string().length(2).optional()
});

export const IpGeolocateSchema = z.object({
  reverse_geocode: z.boolean().optional(),
  language: z.string().length(2).optional(),
  region: z.string().length(2).optional(),
  ip_override: IPSchema.refine(ip => !isPrivateOrReservedIP(ip), {
    message: "IP override cannot be a private or reserved IP address"
  }).optional()
});

// Validation helper function
export function validateInput<T>(schema: z.ZodSchema<T>, input: unknown): T {
  try {
    return schema.parse(input);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstError = error.issues[0];
      throw new ValidationError(
        `Validation failed: ${firstError.message}`,
        firstError.path.join('.')
      );
    }
    throw error;
  }
}
