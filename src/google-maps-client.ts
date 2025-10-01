import { GeocodeResult, Location, MCPError, PlaceResult, RouteResult } from './types.js';

export class GoogleMapsClient {
  private apiKey: string;
  private baseUrl = 'https://maps.googleapis.com/maps/api';
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>();
  private rateLimiter = new Map<string, number[]>();

  // Rate limiting configuration
  private rateLimitEnabled: boolean;
  private rateLimitWindowMs: number;
  private rateLimitMaxRequests: number;

  constructor(apiKey: string) {
    this.apiKey = apiKey;

    // Configure rate limiting from environment variables
    this.rateLimitEnabled = process.env.GOOGLE_MAPS_RATE_LIMIT_ENABLED !== 'false';
    this.rateLimitWindowMs = parseInt(process.env.GOOGLE_MAPS_RATE_LIMIT_WINDOW_MS || '60000'); // Default: 1 minute
    this.rateLimitMaxRequests = parseInt(process.env.GOOGLE_MAPS_RATE_LIMIT_MAX_REQUESTS || '100'); // Default: 100 requests

    // Validate rate limit configuration
    if (this.rateLimitWindowMs <= 0) {
      console.warn('Invalid GOOGLE_MAPS_RATE_LIMIT_WINDOW_MS, using default: 60000ms');
      this.rateLimitWindowMs = 60000;
    }
    if (this.rateLimitMaxRequests <= 0) {
      console.warn('Invalid GOOGLE_MAPS_RATE_LIMIT_MAX_REQUESTS, using default: 100');
      this.rateLimitMaxRequests = 100;
    }
  }

  private async makeRequest(
    endpoint: string,
    params: Record<string, any> = {},
    method: 'GET' | 'POST' = 'GET',
    body?: any,
    cacheTtl?: number,
    customBaseUrl?: string,
    fieldMask?: string
  ): Promise<any> {
    const cacheKey = `${endpoint}:${JSON.stringify(params)}:${JSON.stringify(body)}`;

    // Check cache
    if (cacheTtl && this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey)!;
      if (Date.now() - cached.timestamp < cached.ttl) {
        return cached.data;
      }
      this.cache.delete(cacheKey);
    }

    // Rate limiting check
    if (this.rateLimitEnabled) {
      await this.checkRateLimit(endpoint);
    }

    const url = new URL(`${customBaseUrl || this.baseUrl}${endpoint}`);

    // Determine if this endpoint uses header-based authentication
    // Places API (New) and Routes API use X-Goog-Api-Key header
    // Standard APIs (Geocoding, Time Zone, Elevation, etc.) use query param
    const usesHeaderAuth = customBaseUrl && (
      customBaseUrl.includes('places.googleapis.com') ||
      customBaseUrl.includes('routes.googleapis.com')
    );

    // Add API key and other params
    if (!usesHeaderAuth) {
      // Standard APIs: API key in query params
      const allParams = { ...params, key: this.apiKey };
      Object.entries(allParams).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value));
        }
      });
    } else {
      // Places API (New) and Routes API: API key in header, params in query string
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value));
        }
      });
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'google-maps-mcp-server/1.0.0'
    };

    // Places API (New) and Routes API use header-based authentication
    if (usesHeaderAuth) {
      headers['X-Goog-Api-Key'] = this.apiKey;
      headers['X-Goog-FieldMask'] = fieldMask || '*'; // Request all fields or custom mask
    }

    const requestOptions: RequestInit = {
      method,
      headers,
      signal: AbortSignal.timeout(30000)
    };

    if (body && method === 'POST') {
      requestOptions.body = JSON.stringify(body);
    }

    let retries = 3;
    while (retries > 0) {
      try {
        const response = await fetch(url.toString(), requestOptions);

        if (response.status === 429) {
          const retryAfter = response.headers.get('Retry-After');
          const delay = retryAfter ? parseInt(retryAfter) * 1000 : Math.pow(2, 4 - retries) * 1000;
          await this.sleep(delay);
          retries--;
          continue;
        }

        if (!response.ok) {
          let errorDetails = '';
          try {
            const errorBody = await response.json();
            errorDetails = JSON.stringify(errorBody);
          } catch (e) {
            // If response is not JSON, just use status text
          }
          throw new Error(`HTTP ${response.status}: ${response.statusText}${errorDetails ? ' - ' + errorDetails : ''}`);
        }

        const data = await response.json();

        if (data.status && data.status !== 'OK') {
          throw this.createMCPError(data.status, data.error_message || 'API request failed', {
            endpoint,
            status: response.status,
            apiStatus: data.status,
            apiError: data.error_message
          });
        }

        // Cache successful response
        if (cacheTtl) {
          this.cache.set(cacheKey, {
            data,
            timestamp: Date.now(),
            ttl: cacheTtl
          });
        }

        return data;
      } catch (error) {
        if (retries === 1) {
          const message = error instanceof Error ? error.message : 'Unknown error';
          const context: any = { endpoint, url: url.toString() };

          // Add more context if it's an MCP error
          if (typeof error === 'object' && error !== null && 'context' in error) {
            Object.assign(context, (error as any).context);
          }

          throw this.createMCPError(
            typeof error === 'object' && error !== null && 'code' in error ? (error as any).code : 'REQUEST_FAILED',
            message,
            context
          );
        }
        retries--;
        await this.sleep(Math.pow(2, 4 - retries) * 1000);
      }
    }
  }

  private async checkRateLimit(endpoint: string): Promise<void> {
    const now = Date.now();

    if (!this.rateLimiter.has(endpoint)) {
      this.rateLimiter.set(endpoint, []);
    }

    const requests = this.rateLimiter.get(endpoint)!;

    // Remove old requests outside the window
    while (requests.length > 0 && now - requests[0] > this.rateLimitWindowMs) {
      requests.shift();
    }

    if (requests.length >= this.rateLimitMaxRequests) {
      const oldestRequest = requests[0];
      const waitTime = this.rateLimitWindowMs - (now - oldestRequest);
      await this.sleep(waitTime);
      return this.checkRateLimit(endpoint);
    }

    requests.push(now);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private createMCPError(code: string, message: string, context?: any): MCPError {
    return { code, message, context };
  }

  // Geocoding API methods
  async geocodeSearch(query: string, region?: string, language?: string): Promise<GeocodeResult[]> {
    const params: any = { address: query };
    if (region) params.region = region;
    if (language) params.language = language;

    const data = await this.makeRequest('/geocode/json', params, 'GET', undefined, 300000); // 5 min cache

    return data.results.map((result: any) => ({
      formatted_address: result.formatted_address,
      location: {
        lat: result.geometry.location.lat,
        lng: result.geometry.location.lng
      },
      address_components: result.address_components,
      place_id: result.place_id,
      types: result.types
    }));
  }

  async geocodeReverse(lat: number, lng: number, language?: string): Promise<GeocodeResult[]> {
    const params: any = { latlng: `${lat},${lng}` };
    if (language) params.language = language;

    const data = await this.makeRequest('/geocode/json', params, 'GET', undefined, 300000);

    return data.results.map((result: any) => ({
      formatted_address: result.formatted_address,
      location: { lat, lng },
      address_components: result.address_components,
      place_id: result.place_id,
      types: result.types
    }));
  }

  // Places API (New) methods
  async placesSearchText(
    query: string,
    options: {
      includedTypes?: string[];
      excludedTypes?: string[];
      openNow?: boolean;
      priceLevels?: number[];
      minRating?: number;
      locationBias?: any;
      rankPreference?: string;
      language?: string;
      region?: string;
      maxResults?: number;
    } = {}
  ): Promise<PlaceResult[]> {
    const body: any = {
      textQuery: query
    };

    if (options.includedTypes?.length) body.includedTypes = options.includedTypes;
    if (options.excludedTypes?.length) body.excludedTypes = options.excludedTypes;
    if (options.openNow !== undefined) body.openNow = options.openNow;
    if (options.priceLevels?.length) body.priceLevels = options.priceLevels;
    if (options.minRating) body.minRating = options.minRating;
    if (options.locationBias) body.locationBias = options.locationBias;
    if (options.rankPreference) body.rankPreference = options.rankPreference;
    if (options.language) body.languageCode = options.language;
    if (options.region) body.regionCode = options.region;

    const data = await this.makeRequest('/v1/places:searchText', {}, 'POST', body, 60000, 'https://places.googleapis.com');

    return this.formatPlaceResults(data.places || []);
  }

  async placesNearby(
    location: Location,
    radiusMeters: number,
    options: {
      includedTypes?: string[];
      maxResults?: number;
      language?: string;
      region?: string;
    } = {}
  ): Promise<PlaceResult[]> {
    const body: any = {
      locationRestriction: {
        circle: {
          center: {
            latitude: location.lat,
            longitude: location.lng
          },
          radius: radiusMeters
        }
      }
    };

    if (options.includedTypes?.length) body.includedTypes = options.includedTypes;
    if (options.maxResults) body.maxResultCount = options.maxResults;
    if (options.language) body.languageCode = options.language;
    if (options.region) body.regionCode = options.region;

    const data = await this.makeRequest('/v1/places:searchNearby', {}, 'POST', body, 60000, 'https://places.googleapis.com');

    return this.formatPlaceResults(data.places || []);
  }

  async placesAutocomplete(
    input: string,
    options: {
      sessionToken?: string;
      locationBias?: any;
      includedTypes?: string[];
      language?: string;
      region?: string;
    } = {}
  ): Promise<any[]> {
    const body: any = { input };

    if (options.sessionToken) body.sessionToken = options.sessionToken;
    if (options.locationBias) body.locationBias = options.locationBias;
    if (options.includedTypes?.length) body.includedTypes = options.includedTypes;
    if (options.language) body.languageCode = options.language;
    if (options.region) body.regionCode = options.region;

    const data = await this.makeRequest('/v1/places:autocomplete', {}, 'POST', body, undefined, 'https://places.googleapis.com');

    return data.suggestions || [];
  }

  async placesDetails(
    placeId: string,
    options: {
      fields?: string[];
      language?: string;
      region?: string;
      sessionToken?: string;
    } = {}
  ): Promise<PlaceResult> {
    const body: any = {};

    if (options.language) body.languageCode = options.language;
    if (options.region) body.regionCode = options.region;
    if (options.sessionToken) body.sessionToken = options.sessionToken;

    const data = await this.makeRequest(`/v1/places/${placeId}`, {}, 'GET', undefined, 300000, 'https://places.googleapis.com');

    return this.formatPlaceResult(data);
  }

  async placesPhotos(photoReference: string, maxWidth?: number, maxHeight?: number): Promise<string> {
    const params: any = { photoreference: photoReference };
    if (maxWidth) params.maxwidth = maxWidth;
    if (maxHeight) params.maxheight = maxHeight;

    const url = new URL(`${this.baseUrl}/place/photo`);
    Object.entries({ ...params, key: this.apiKey }).forEach(([key, value]) => {
      url.searchParams.append(key, String(value));
    });

    return url.toString();
  }

  // Routes API v2 methods
  async routesCompute(
    origin: Location | { address: string },
    destination: Location | { address: string },
    options: {
      waypoints?: Array<{ location: Location | { address: string }; via?: boolean }>;
      travelMode?: string;
      routingPreference?: string;
      computeAlternativeRoutes?: boolean;
      avoidTolls?: boolean;
      avoidHighways?: boolean;
      avoidFerries?: boolean;
      language?: string;
      region?: string;
      units?: string;
    } = {}
  ): Promise<{ routes: RouteResult[] }> {
    const body: any = {
      origin: this.formatLocationForRoutes(origin),
      destination: this.formatLocationForRoutes(destination),
      travelMode: options.travelMode || 'DRIVE',
      routingPreference: options.routingPreference || 'TRAFFIC_AWARE'
    };

    if (options.waypoints?.length) {
      body.intermediates = options.waypoints.map(wp => this.formatLocationForRoutes(wp.location));
    }

    if (options.computeAlternativeRoutes) body.computeAlternativeRoutes = true;

    const routeModifiers: any = {};
    if (options.avoidTolls) routeModifiers.avoidTolls = true;
    if (options.avoidHighways) routeModifiers.avoidHighways = true;
    if (options.avoidFerries) routeModifiers.avoidFerries = true;
    if (Object.keys(routeModifiers).length > 0) body.routeModifiers = routeModifiers;

    if (options.language) body.languageCode = options.language;
    if (options.region) body.regionCode = options.region;
    if (options.units) body.units = options.units;

    const data = await this.makeRequest(
      '/directions/v2:computeRoutes',
      {},
      'POST',
      body,
      undefined,
      'https://routes.googleapis.com',
      'routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline,routes.legs'
    );

    return {
      routes: (data.routes || []).map((route: any) => this.formatRouteResult(route))
    };
  }

  async routesMatrix(
    origins: Array<Location | { address: string }>,
    destinations: Array<Location | { address: string }>,
    options: {
      travelMode?: string;
      routingPreference?: string;
      language?: string;
      region?: string;
      units?: string;
    } = {}
  ): Promise<any> {
    const body: any = {
      origins: origins.map(o => ({ waypoint: this.formatLocationForRoutes(o) })),
      destinations: destinations.map(d => ({ waypoint: this.formatLocationForRoutes(d) })),
      travelMode: options.travelMode || 'DRIVE',
      routingPreference: options.routingPreference || 'TRAFFIC_AWARE'
    };

    if (options.language) body.languageCode = options.language;
    if (options.region) body.regionCode = options.region;
    if (options.units) body.units = options.units;

    const data = await this.makeRequest(
      '/distanceMatrix/v2:computeRouteMatrix',
      {},
      'POST',
      body,
      undefined,
      'https://routes.googleapis.com',
      '*'
    );

    return data;
  }

  // Utility API methods
  async elevationGet(
    locations?: Location[],
    path?: string,
    samples?: number
  ): Promise<Array<{ elevation: number; location: Location; resolution: number }>> {
    const params: any = {};

    if (locations?.length) {
      params.locations = locations.map(l => `${l.lat},${l.lng}`).join('|');
    } else if (path) {
      params.path = path;
      if (samples) params.samples = samples;
    }

    const data = await this.makeRequest('/elevation/json', params, 'GET', undefined, 300000);

    return data.results || [];
  }

  async timezoneGet(lat: number, lng: number, timestamp?: number, language?: string): Promise<any> {
    const params: any = {
      location: `${lat},${lng}`,
      timestamp: timestamp || Math.floor(Date.now() / 1000)
    };
    if (language) params.language = language;

    const data = await this.makeRequest('/timezone/json', params, 'GET', undefined, 3600000); // 1 hour cache

    return data;
  }

  async geolocationEstimate(options: {
    wifiAccessPoints?: Array<{
      macAddress: string;
      signalStrength?: number;
      age?: number;
      channel?: number;
      signalToNoise?: number;
    }>;
    cellTowers?: Array<{
      cellId: number;
      locationAreaCode: number;
      mobileCountryCode: number;
      mobileNetworkCode: number;
      age?: number;
      signalStrength?: number;
      timingAdvance?: number;
    }>;
    considerIp?: boolean;
  } = {}): Promise<{ location: Location & { accuracy: number } }> {
    const body: any = {
      considerIp: options.considerIp !== false
    };

    if (options.wifiAccessPoints?.length) {
      body.wifiAccessPoints = options.wifiAccessPoints;
    }
    if (options.cellTowers?.length) {
      body.cellTowers = options.cellTowers;
    }

    // Google Geolocation API uses a different base URL
    const data = await this.makeRequest('/geolocation/v1/geolocate', {}, 'POST', body, undefined, 'https://www.googleapis.com');

    return data;
  }

  async roadsNearest(points: Location[], travelMode?: string): Promise<any> {
    const params: any = {
      points: points.map(p => `${p.lat},${p.lng}`).join('|')
    };
    if (travelMode) params.travelMode = travelMode;

    const data = await this.makeRequest('/v1/nearestRoads', params, 'GET', undefined, undefined, 'https://roads.googleapis.com');

    return data;
  }

  // Helper methods
  private formatLocationForRoutes(location: Location | { address: string }): any {
    if ('address' in location) {
      return { location: { address: location.address } };
    }
    return { location: { latLng: { latitude: location.lat, longitude: location.lng } } };
  }

  private formatPlaceResults(places: any[]): PlaceResult[] {
    return places.map(place => this.formatPlaceResult(place));
  }

  private formatPlaceResult(place: any): PlaceResult {
    const result: PlaceResult = {
      id: place.place_id || place.id,
      name: place.name || place.displayName?.text || 'Unknown'
    };

    if (place.formatted_address) result.formatted_address = place.formatted_address;
    if (place.geometry?.location) {
      result.location = {
        lat: place.geometry.location.lat,
        lng: place.geometry.location.lng
      };
    } else if (place.location) {
      result.location = {
        lat: place.location.latitude || place.location.lat,
        lng: place.location.longitude || place.location.lng
      };
    }
    if (place.rating) result.rating = place.rating;
    if (place.price_level !== undefined) result.price_level = place.price_level;
    if (place.types) result.types = place.types;
    if (place.opening_hours) result.opening_hours = place.opening_hours;
    if (place.photos) result.photos = place.photos;

    return result;
  }

  private formatRouteResult(route: any): RouteResult {
    const result: RouteResult = {
      distance_meters: route.distanceMeters || 0,
      duration_seconds: parseInt(route.duration?.replace('s', '') || '0'),
      polyline: route.polyline?.encodedPolyline || '',
      legs: []
    };

    if (route.staticDuration) {
      result.duration_in_traffic_seconds = parseInt(route.staticDuration.replace('s', '') || '0');
    }

    if (route.travelAdvisory?.tollInfo) {
      result.tolls = {
        currency: 'USD', // Default, should be extracted from actual response
        estimated: 0 // Should be calculated from toll info
      };
    }

    if (route.legs) {
      result.legs = route.legs.map((leg: any) => ({
        start: {
          lat: leg.startLocation?.latLng?.latitude || 0,
          lng: leg.startLocation?.latLng?.longitude || 0
        },
        end: {
          lat: leg.endLocation?.latLng?.latitude || 0,
          lng: leg.endLocation?.latLng?.longitude || 0
        },
        steps: leg.steps?.length || 0,
        distance_meters: leg.distanceMeters || 0,
        duration_seconds: parseInt(leg.duration?.replace('s', '') || '0')
      }));
    }

    return result;
  }

  private formatDirectionsRoute(route: any): RouteResult {
    let totalDistance = 0;
    let totalDuration = 0;
    let totalDurationInTraffic = 0;

    const legs = (route.legs || []).map((leg: any) => {
      totalDistance += leg.distance?.value || 0;
      totalDuration += leg.duration?.value || 0;
      if (leg.duration_in_traffic?.value) {
        totalDurationInTraffic += leg.duration_in_traffic.value;
      }

      return {
        start: {
          lat: leg.start_location?.lat || 0,
          lng: leg.start_location?.lng || 0
        },
        end: {
          lat: leg.end_location?.lat || 0,
          lng: leg.end_location?.lng || 0
        },
        steps: leg.steps?.length || 0,
        distance_meters: leg.distance?.value || 0,
        duration_seconds: leg.duration?.value || 0
      };
    });

    const result: RouteResult = {
      distance_meters: totalDistance,
      duration_seconds: totalDuration,
      polyline: route.overview_polyline?.points || '',
      legs
    };

    if (totalDurationInTraffic > 0) {
      result.duration_in_traffic_seconds = totalDurationInTraffic;
    }

    return result;
  }
}
