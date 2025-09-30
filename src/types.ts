import { z } from 'zod';

// Common types
export const LocationSchema = z.object({
  lat: z.number(),
  lng: z.number()
});

export const AddressSchema = z.object({
  formatted_address: z.string(),
  address_components: z.array(z.object({
    long_name: z.string(),
    short_name: z.string(),
    types: z.array(z.string())
  })).optional()
});

// Geocoding schemas
export const GeocodeSearchSchema = z.object({
  query: z.string(),
  region: z.string().optional(),
  language: z.string().optional()
});

export const GeocodeReverseSchema = z.object({
  lat: z.number(),
  lng: z.number(),
  language: z.string().optional()
});

// Places schemas
export const LocationBiasSchema = z.object({
  circle: z.object({
    center: LocationSchema,
    radius_meters: z.number()
  }).optional()
}).optional();

export const PlacesSearchTextSchema = z.object({
  query: z.string(),
  included_types: z.array(z.string()).optional(),
  excluded_types: z.array(z.string()).optional(),
  open_now: z.boolean().optional(),
  price_levels: z.array(z.number()).optional(),
  min_rating: z.number().optional(),
  location_bias: LocationBiasSchema,
  rank_preference: z.enum(['RELEVANCE', 'DISTANCE']).optional(),
  language: z.string().optional(),
  region: z.string().optional(),
  max_results: z.number().optional()
});

export const PlacesNearbySchema = z.object({
  location: LocationSchema,
  radius_meters: z.number(),
  included_types: z.array(z.string()).optional(),
  max_results: z.number().optional(),
  language: z.string().optional(),
  region: z.string().optional()
});

export const PlacesAutocompleteSchema = z.object({
  input: z.string(),
  session_token: z.string().optional(),
  location_bias: LocationBiasSchema,
  included_types: z.array(z.string()).optional(),
  language: z.string().optional(),
  region: z.string().optional()
});

export const PlacesDetailsSchema = z.object({
  place_id: z.string(),
  fields: z.array(z.string()).optional(),
  language: z.string().optional(),
  region: z.string().optional(),
  session_token: z.string().optional()
});

export const PlacesPhotosSchema = z.object({
  photo_reference: z.string(),
  max_width: z.number().optional(),
  max_height: z.number().optional()
});

// Routes schemas
export const WaypointSchema = z.object({
  location: z.union([LocationSchema, z.object({ address: z.string() })]),
  via: z.boolean().optional()
});

export const RoutesComputeSchema = z.object({
  origin: z.union([LocationSchema, z.object({ address: z.string() })]),
  destination: z.union([LocationSchema, z.object({ address: z.string() })]),
  waypoints: z.array(WaypointSchema).optional(),
  travel_mode: z.enum(['DRIVE', 'WALK', 'BICYCLE', 'TRANSIT']).optional(),
  routing_preference: z.enum(['TRAFFIC_UNAWARE', 'TRAFFIC_AWARE', 'TRAFFIC_AWARE_OPTIMAL']).optional(),
  compute_alternative_routes: z.boolean().optional(),
  avoid_tolls: z.boolean().optional(),
  avoid_highways: z.boolean().optional(),
  avoid_ferries: z.boolean().optional(),
  language: z.string().optional(),
  region: z.string().optional(),
  units: z.enum(['METRIC', 'IMPERIAL']).optional()
});

export const RoutesMatrixSchema = z.object({
  origins: z.array(z.union([LocationSchema, z.object({ address: z.string() })])),
  destinations: z.array(z.union([LocationSchema, z.object({ address: z.string() })])),
  travel_mode: z.enum(['DRIVE', 'WALK', 'BICYCLE', 'TRANSIT']).optional(),
  routing_preference: z.enum(['TRAFFIC_UNAWARE', 'TRAFFIC_AWARE', 'TRAFFIC_AWARE_OPTIMAL']).optional(),
  language: z.string().optional(),
  region: z.string().optional(),
  units: z.enum(['METRIC', 'IMPERIAL']).optional()
});

// Utility schemas
export const ElevationGetSchema = z.object({
  locations: z.array(LocationSchema).optional(),
  path: z.string().optional(),
  samples: z.number().optional()
});

export const TimezoneGetSchema = z.object({
  lat: z.number(),
  lng: z.number(),
  timestamp: z.number().optional(),
  language: z.string().optional()
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

export const RoadsNearestSchema = z.object({
  points: z.array(LocationSchema),
  travel_mode: z.enum(['DRIVING', 'WALKING', 'BICYCLING']).optional()
});

// Nearby finder schema
export const NearbyFindSchema = z.object({
  origin: z.union([LocationSchema, z.object({ address: z.string() })]),
  what: z.enum(['cities', 'towns', 'pois', 'custom']),
  included_types: z.array(z.string()).optional(),
  radius_meters: z.number().optional(),
  max_results: z.number().optional(),
  language: z.string().optional(),
  region: z.string().optional()
});

// IP Geolocation schema
export const IpGeolocateSchema = z.object({
  reverse_geocode: z.boolean().optional(),
  language: z.string().optional(),
  region: z.string().optional(),
  ip_override: z.string().optional()
});


// Type exports
export type Location = z.infer<typeof LocationSchema>;
export type Address = z.infer<typeof AddressSchema>;
export type GeocodeSearchInput = z.infer<typeof GeocodeSearchSchema>;
export type GeocodeReverseInput = z.infer<typeof GeocodeReverseSchema>;
export type PlacesSearchTextInput = z.infer<typeof PlacesSearchTextSchema>;
export type PlacesNearbyInput = z.infer<typeof PlacesNearbySchema>;
export type PlacesAutocompleteInput = z.infer<typeof PlacesAutocompleteSchema>;
export type PlacesDetailsInput = z.infer<typeof PlacesDetailsSchema>;
export type PlacesPhotosInput = z.infer<typeof PlacesPhotosSchema>;
export type RoutesComputeInput = z.infer<typeof RoutesComputeSchema>;
export type RoutesMatrixInput = z.infer<typeof RoutesMatrixSchema>;
export type ElevationGetInput = z.infer<typeof ElevationGetSchema>;
export type TimezoneGetInput = z.infer<typeof TimezoneGetSchema>;
export type GeolocationEstimateInput = z.infer<typeof GeolocationEstimateSchema>;
export type RoadsNearestInput = z.infer<typeof RoadsNearestSchema>;
export type NearbyFindInput = z.infer<typeof NearbyFindSchema>;
export type IpGeolocateInput = z.infer<typeof IpGeolocateSchema>;

// Error types
export interface MCPError {
  code: string;
  message: string;
  context?: {
    endpoint?: string;
    status?: number;
    [key: string]: any;
  };
}

// Response types
export interface GeocodeResult {
  formatted_address: string;
  location: Location;
  address_components?: Array<{
    long_name: string;
    short_name: string;
    types: string[];
  }>;
  place_id?: string;
  types?: string[];
}

export interface PlaceResult {
  id: string;
  name: string;
  formatted_address?: string;
  location?: Location;
  rating?: number;
  price_level?: number;
  types?: string[];
  opening_hours?: {
    open_now?: boolean;
    periods?: Array<{
      open: { day: number; time: string };
      close?: { day: number; time: string };
    }>;
  };
  photos?: Array<{
    photo_reference: string;
    height: number;
    width: number;
  }>;
}

export interface RouteResult {
  distance_meters: number;
  duration_seconds: number;
  duration_in_traffic_seconds?: number;
  polyline: string;
  tolls?: {
    currency: string;
    estimated: number;
  };
  legs: Array<{
    start: Location;
    end: Location;
    steps: number;
    distance_meters: number;
    duration_seconds: number;
  }>;
}
