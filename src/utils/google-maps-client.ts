import { Client } from '@googlemaps/google-maps-services-js';
import axios, { AxiosInstance } from 'axios';
import { withRetry } from './retry.js';
import { handleGoogleMapsError } from './errors.js';
import { Cache } from './cache.js';

export class GoogleMapsClient {
  private client: Client;
  private axiosInstance: AxiosInstance;
  private cache: Cache;

  constructor(
    private apiKey: string,
    cache: Cache,
    private timeout: number = 10000
  ) {
    this.client = new Client({});
    this.cache = cache;
    
    // Create axios instance with timeout
    this.axiosInstance = axios.create({
      timeout: this.timeout,
      headers: {
        'User-Agent': 'google-maps-mcp-server/1.0.0'
      }
    });
  }

  // Geocoding API
  async geocode(params: {
    address: string;
    region?: string;
    language?: string;
  }) {
    const cacheKey = Cache.createKey('geocode', params);
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    const result = await withRetry(async () => {
      try {
        const response = await this.client.geocode({
          params: {
            address: params.address,
            key: this.apiKey,
            region: params.region,
            language: params.language as any
          }
        });
        return response.data;
      } catch (error) {
        handleGoogleMapsError(error, 'geocode');
      }
    });

    this.cache.set(cacheKey, result);
    return result;
  }

  async reverseGeocode(params: {
    latlng: string;
    language?: string;
  }) {
    const cacheKey = Cache.createKey('reverse_geocode', params);
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    const result = await withRetry(async () => {
      try {
        const response = await this.client.reverseGeocode({
          params: {
            latlng: params.latlng,
            key: this.apiKey,
            language: params.language as any
          }
        });
        return response.data;
      } catch (error) {
        handleGoogleMapsError(error, 'reverse_geocode');
      }
    });

    this.cache.set(cacheKey, result);
    return result;
  }

  // Places API (New) - using direct HTTP calls since the client library may not support all new features
  async placesSearchText(params: {
    textQuery: string;
    includedType?: string;
    excludedTypes?: string[];
    openNow?: boolean;
    priceLevels?: string[];
    minRating?: number;
    locationBias?: any;
    rankPreference?: string;
    languageCode?: string;
    regionCode?: string;
    maxResultCount?: number;
  }) {
    const cacheKey = Cache.createKey('places_search_text', params);
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    const result = await withRetry(async () => {
      try {
        const requestBody: any = {
          textQuery: params.textQuery
        };

        if (params.includedType) requestBody.includedType = params.includedType;
        if (params.excludedTypes) requestBody.excludedTypes = params.excludedTypes;
        if (params.openNow !== undefined) requestBody.openNow = params.openNow;
        if (params.priceLevels) requestBody.priceLevels = params.priceLevels;
        if (params.minRating) requestBody.minRating = params.minRating;
        if (params.locationBias) requestBody.locationBias = params.locationBias;
        if (params.rankPreference) requestBody.rankPreference = params.rankPreference;
        if (params.languageCode) requestBody.languageCode = params.languageCode;
        if (params.regionCode) requestBody.regionCode = params.regionCode;
        if (params.maxResultCount) requestBody.maxResultCount = params.maxResultCount;

        const response = await this.axiosInstance.post(
          'https://places.googleapis.com/v1/places:searchText',
          requestBody,
          {
            headers: {
              'Content-Type': 'application/json',
              'X-Goog-Api-Key': this.apiKey,
              'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.priceLevel,places.types,places.regularOpeningHours,places.photos'
            }
          }
        );
        return response.data;
      } catch (error) {
        handleGoogleMapsError(error, 'places_search_text');
      }
    });

    this.cache.set(cacheKey, result);
    return result;
  }

  async placesNearbySearch(params: {
    locationRestriction: {
      circle: {
        center: { latitude: number; longitude: number };
        radius: number;
      };
    };
    includedTypes?: string[];
    maxResultCount?: number;
    languageCode?: string;
    regionCode?: string;
  }) {
    const cacheKey = Cache.createKey('places_nearby', params);
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    const result = await withRetry(async () => {
      try {
        const requestBody: any = {
          locationRestriction: params.locationRestriction
        };

        if (params.includedTypes) requestBody.includedTypes = params.includedTypes;
        if (params.maxResultCount) requestBody.maxResultCount = params.maxResultCount;
        if (params.languageCode) requestBody.languageCode = params.languageCode;
        if (params.regionCode) requestBody.regionCode = params.regionCode;

        const response = await this.axiosInstance.post(
          'https://places.googleapis.com/v1/places:searchNearby',
          requestBody,
          {
            headers: {
              'Content-Type': 'application/json',
              'X-Goog-Api-Key': this.apiKey,
              'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.priceLevel,places.types,places.regularOpeningHours,places.photos'
            }
          }
        );
        return response.data;
      } catch (error) {
        handleGoogleMapsError(error, 'places_nearby');
      }
    });

    this.cache.set(cacheKey, result);
    return result;
  }

  async placesAutocomplete(params: {
    input: string;
    sessionToken?: string;
    locationBias?: any;
    includedPrimaryTypes?: string[];
    languageCode?: string;
    regionCode?: string;
  }) {
    // Don't cache autocomplete as it's session-based
    return await withRetry(async () => {
      try {
        const requestBody: any = {
          input: params.input
        };

        if (params.sessionToken) requestBody.sessionToken = params.sessionToken;
        if (params.locationBias) requestBody.locationBias = params.locationBias;
        if (params.includedPrimaryTypes) requestBody.includedPrimaryTypes = params.includedPrimaryTypes;
        if (params.languageCode) requestBody.languageCode = params.languageCode;
        if (params.regionCode) requestBody.regionCode = params.regionCode;

        const response = await this.axiosInstance.post(
          'https://places.googleapis.com/v1/places:autocomplete',
          requestBody,
          {
            headers: {
              'Content-Type': 'application/json',
              'X-Goog-Api-Key': this.apiKey
            }
          }
        );
        return response.data;
      } catch (error) {
        handleGoogleMapsError(error, 'places_autocomplete');
      }
    });
  }

  async placesDetails(params: {
    placeId: string;
    fieldMask?: string;
    languageCode?: string;
    regionCode?: string;
    sessionToken?: string;
  }) {
    const cacheKey = Cache.createKey('places_details', { 
      placeId: params.placeId, 
      fieldMask: params.fieldMask,
      languageCode: params.languageCode,
      regionCode: params.regionCode
    });
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    const result = await withRetry(async () => {
      try {
        const url = `https://places.googleapis.com/v1/places/${params.placeId}`;
        const headers: any = {
          'X-Goog-Api-Key': this.apiKey
        };

        if (params.fieldMask) {
          headers['X-Goog-FieldMask'] = params.fieldMask;
        }

        const queryParams: any = {};
        if (params.languageCode) queryParams.languageCode = params.languageCode;
        if (params.regionCode) queryParams.regionCode = params.regionCode;
        if (params.sessionToken) queryParams.sessionToken = params.sessionToken;

        const response = await this.axiosInstance.get(url, {
          headers,
          params: queryParams
        });
        return response.data;
      } catch (error) {
        handleGoogleMapsError(error, 'places_details');
      }
    });

    this.cache.set(cacheKey, result);
    return result;
  }

  // Routes API v2
  async computeRoutes(params: {
    origin: any;
    destination: any;
    waypoints?: any[];
    travelMode?: string;
    routingPreference?: string;
    avoidTolls?: boolean;
    avoidHighways?: boolean;
    avoidFerries?: boolean;
    languageCode?: string;
    regionCode?: string;
    units?: string;
    departureTime?: string;
    arrivalTime?: string;
  }) {
    const cacheKey = Cache.createKey('compute_routes', params);
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    const result = await withRetry(async () => {
      try {
        const requestBody: any = {
          origin: params.origin,
          destination: params.destination
        };

        if (params.waypoints) requestBody.intermediates = params.waypoints;
        if (params.travelMode) requestBody.travelMode = params.travelMode;
        if (params.routingPreference) requestBody.routingPreference = params.routingPreference;
        if (params.languageCode) requestBody.languageCode = params.languageCode;
        if (params.regionCode) requestBody.regionCode = params.regionCode;
        if (params.units) requestBody.units = params.units;
        if (params.departureTime) requestBody.departureTime = params.departureTime;
        if (params.arrivalTime) requestBody.arrivalTime = params.arrivalTime;

        // Handle avoidances
        const routeModifiers: any = {};
        if (params.avoidTolls) routeModifiers.avoidTolls = true;
        if (params.avoidHighways) routeModifiers.avoidHighways = true;
        if (params.avoidFerries) routeModifiers.avoidFerries = true;
        if (Object.keys(routeModifiers).length > 0) {
          requestBody.routeModifiers = routeModifiers;
        }

        const response = await this.axiosInstance.post(
          'https://routes.googleapis.com/directions/v2:computeRoutes',
          requestBody,
          {
            headers: {
              'Content-Type': 'application/json',
              'X-Goog-Api-Key': this.apiKey,
              'X-Goog-FieldMask': 'routes.duration,routes.distanceMeters,routes.polyline,routes.legs,routes.travelAdvisory'
            }
          }
        );
        return response.data;
      } catch (error) {
        handleGoogleMapsError(error, 'compute_routes');
      }
    });

    this.cache.set(cacheKey, result);
    return result;
  }

  async computeRouteMatrix(params: {
    origins: any[];
    destinations: any[];
    travelMode?: string;
    routingPreference?: string;
    avoidTolls?: boolean;
    avoidHighways?: boolean;
    avoidFerries?: boolean;
    languageCode?: string;
    regionCode?: string;
    units?: string;
    departureTime?: string;
  }) {
    const cacheKey = Cache.createKey('compute_route_matrix', params);
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    const result = await withRetry(async () => {
      try {
        const requestBody: any = {
          origins: params.origins,
          destinations: params.destinations
        };

        if (params.travelMode) requestBody.travelMode = params.travelMode;
        if (params.routingPreference) requestBody.routingPreference = params.routingPreference;
        if (params.languageCode) requestBody.languageCode = params.languageCode;
        if (params.regionCode) requestBody.regionCode = params.regionCode;
        if (params.units) requestBody.units = params.units;
        if (params.departureTime) requestBody.departureTime = params.departureTime;

        // Handle avoidances
        const routeModifiers: any = {};
        if (params.avoidTolls) routeModifiers.avoidTolls = true;
        if (params.avoidHighways) routeModifiers.avoidHighways = true;
        if (params.avoidFerries) routeModifiers.avoidFerries = true;
        if (Object.keys(routeModifiers).length > 0) {
          requestBody.routeModifiers = routeModifiers;
        }

        const response = await this.axiosInstance.post(
          'https://routes.googleapis.com/distanceMatrix/v2:computeRouteMatrix',
          requestBody,
          {
            headers: {
              'Content-Type': 'application/json',
              'X-Goog-Api-Key': this.apiKey
            }
          }
        );
        return response.data;
      } catch (error) {
        handleGoogleMapsError(error, 'compute_route_matrix');
      }
    });

    this.cache.set(cacheKey, result);
    return result;
  }

  // Elevation API
  async getElevation(params: {
    locations?: string;
    path?: string;
  }) {
    const cacheKey = Cache.createKey('elevation', params);
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    const result = await withRetry(async () => {
      try {
        const response = await this.client.elevation({
          params: {
            locations: params.locations as any,
            path: params.path as any,
            key: this.apiKey
          }
        });
        return response.data;
      } catch (error) {
        handleGoogleMapsError(error, 'elevation');
      }
    });

    this.cache.set(cacheKey, result);
    return result;
  }

  // Timezone API
  async getTimezone(params: {
    location: string;
    timestamp: number;
    language?: string;
  }) {
    const cacheKey = Cache.createKey('timezone', params);
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    const result = await withRetry(async () => {
      try {
        const response = await this.client.timezone({
          params: {
            location: params.location,
            timestamp: params.timestamp,
            key: this.apiKey,
            language: params.language as any
          }
        });
        return response.data;
      } catch (error) {
        handleGoogleMapsError(error, 'timezone');
      }
    });

    this.cache.set(cacheKey, result);
    return result;
  }

  // Geolocation API
  async geolocate(params: {
    considerIp?: boolean;
    wifiAccessPoints?: any[];
    cellTowers?: any[];
  }, ipOverride?: string) {
    // Don't cache geolocation as it's context-dependent
    return await withRetry(async () => {
      try {
        const requestBody: any = {};
        
        if (params.considerIp !== undefined) requestBody.considerIp = params.considerIp;
        if (params.wifiAccessPoints) requestBody.wifiAccessPoints = params.wifiAccessPoints;
        if (params.cellTowers) requestBody.cellTowers = params.cellTowers;

        const headers: any = {
          'Content-Type': 'application/json'
        };

        // Add IP override header if provided (best effort)
        if (ipOverride) {
          headers['X-Forwarded-For'] = ipOverride;
        }

        const response = await this.axiosInstance.post(
          `https://www.googleapis.com/geolocation/v1/geolocate?key=${this.apiKey}`,
          requestBody,
          { headers }
        );
        return response.data;
      } catch (error) {
        handleGoogleMapsError(error, 'geolocate');
      }
    });
  }

  // Street View Static API
  getStreetViewUrl(params: {
    location?: string;
    pano?: string;
    size: string;
    heading?: number;
    fov?: number;
    pitch?: number;
  }): string {
    const baseUrl = 'https://maps.googleapis.com/maps/api/streetview';
    const searchParams = new URLSearchParams({
      key: this.apiKey,
      size: params.size
    });

    if (params.location) searchParams.set('location', params.location);
    if (params.pano) searchParams.set('pano', params.pano);
    if (params.heading !== undefined) searchParams.set('heading', params.heading.toString());
    if (params.fov !== undefined) searchParams.set('fov', params.fov.toString());
    if (params.pitch !== undefined) searchParams.set('pitch', params.pitch.toString());

    return `${baseUrl}?${searchParams.toString()}`;
  }

  // Photo URL generation for Places API
  getPlacePhotoUrl(photoReference: string, maxWidth?: number, maxHeight?: number): string {
    const baseUrl = 'https://maps.googleapis.com/maps/api/place/photo';
    const searchParams = new URLSearchParams({
      key: this.apiKey,
      photo_reference: photoReference
    });

    if (maxWidth) searchParams.set('maxwidth', maxWidth.toString());
    if (maxHeight) searchParams.set('maxheight', maxHeight.toString());

    return `${baseUrl}?${searchParams.toString()}`;
  }
}
