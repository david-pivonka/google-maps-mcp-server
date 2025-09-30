// Common Types
export interface LatLng {
  lat: number;
  lng: number;
}

export interface Location {
  lat: number;
  lng: number;
  accuracy_radius_meters?: number;
}

export interface AddressComponent {
  long_name: string;
  short_name: string;
  types: string[];
}

export interface FormattedAddress {
  formatted_address: string;
  address_components: AddressComponent[];
}

// Geocoding Types
export interface GeocodeSearchInput {
  query: string;
  region?: string;
  language?: string;
}

export interface GeocodeReverseInput {
  lat: number;
  lng: number;
  language?: string;
}

// Places Types
export interface LocationBias {
  circle?: {
    center: LatLng;
    radius_meters: number;
  };
  rectangle?: {
    low: LatLng;
    high: LatLng;
  };
}

export interface PlacesSearchTextInput {
  query: string;
  included_types?: string[];
  excluded_types?: string[];
  open_now?: boolean;
  price_levels?: number[];
  min_rating?: number;
  location_bias?: LocationBias;
  rank_preference?: 'RELEVANCE' | 'DISTANCE';
  language?: string;
  region?: string;
  max_results?: number;
}

export interface PlacesNearbyInput {
  location: LatLng;
  radius_meters: number;
  included_types?: string[];
  max_results?: number;
  language?: string;
  region?: string;
}

export interface PlacesAutocompleteInput {
  input: string;
  session_token?: string;
  location_bias?: LocationBias;
  included_types?: string[];
  language?: string;
  region?: string;
}

export interface PlacesDetailsInput {
  place_id: string;
  fields?: string[];
  language?: string;
  region?: string;
  session_token?: string;
}

export interface PlacesPhotosInput {
  photo_reference: string;
  max_width?: number;
  max_height?: number;
}

export interface Place {
  id: string;
  name: string;
  kind?: string;
  location: LatLng;
  distance_meters?: number;
  formatted_address: string;
  rating?: number;
  price_level?: number;
  types?: string[];
  opening_hours?: {
    open_now?: boolean;
    periods?: any[];
  };
  photos?: string[];
}

// Routes Types
export interface RoutesComputeInput {
  origin: LatLng | { address: string };
  destination: LatLng | { address: string };
  waypoints?: Array<LatLng | { address: string }>;
  travel_mode?: 'DRIVE' | 'WALK' | 'BICYCLE' | 'TRANSIT';
  routing_preference?: 'TRAFFIC_UNAWARE' | 'TRAFFIC_AWARE' | 'TRAFFIC_AWARE_OPTIMAL';
  avoid?: ('tolls' | 'highways' | 'ferries')[];
  language?: string;
  region?: string;
  units?: 'metric' | 'imperial';
  departure_time?: string;
  arrival_time?: string;
}

export interface RoutesMatrixInput {
  origins: Array<LatLng | { address: string }>;
  destinations: Array<LatLng | { address: string }>;
  travel_mode?: 'DRIVE' | 'WALK' | 'BICYCLE' | 'TRANSIT';
  routing_preference?: 'TRAFFIC_UNAWARE' | 'TRAFFIC_AWARE' | 'TRAFFIC_AWARE_OPTIMAL';
  avoid?: ('tolls' | 'highways' | 'ferries')[];
  language?: string;
  region?: string;
  units?: 'metric' | 'imperial';
  departure_time?: string;
}

export interface Route {
  distance_meters: number;
  duration_seconds: number;
  duration_in_traffic_seconds?: number;
  polyline: string;
  tolls?: {
    currency: string;
    estimated: number;
  };
  legs: Array<{
    start: LatLng;
    end: LatLng;
    steps: number;
  }>;
}

// Utility Types
export interface ElevationGetInput {
  locations?: LatLng[];
  path?: string; // encoded polyline
}

export interface TimezoneGetInput {
  lat: number;
  lng: number;
  timestamp: number;
}

export interface GeolocationEstimateInput {
  wifi_access_points?: Array<{
    mac_address: string;
    signal_strength?: number;
    age?: number;
    channel?: number;
    signal_to_noise?: number;
  }>;
  cell_towers?: Array<{
    cell_id: number;
    location_area_code: number;
    mobile_country_code: number;
    mobile_network_code: number;
    age?: number;
    signal_strength?: number;
    timing_advance?: number;
  }>;
  consider_ip?: boolean;
}

// Nearby Find Types
export interface NearbyFindInput {
  origin: LatLng | { address: string };
  what: 'cities' | 'towns' | 'pois' | 'custom';
  included_types?: string[];
  radius_meters?: number;
  max_results?: number;
  language?: string;
  region?: string;
}

export interface NearbyFindResult {
  origin: LatLng;
  results: Place[];
  next_page_token?: string;
}

// IP Geolocation Types
export interface IpGeolocateInput {
  reverse_geocode?: boolean;
  language?: string;
  region?: string;
  ip_override?: string;
}

export interface IpGeolocateResult {
  method: string;
  approximate: boolean;
  location: Location;
  normalized_address?: FormattedAddress;
  source: {
    provider: string;
    reverse_geocode: boolean;
    ip_override_attempted: boolean;
  };
}

// Health Check Types
export interface HealthCheckResult {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  api_key_valid: boolean;
  services: Record<string, {
    status: 'ok' | 'error';
    response_time_ms?: number;
    error?: string;
  }>;
}
