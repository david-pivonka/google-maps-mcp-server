#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { GoogleMapsClient } from './google-maps-client.js';
import { GOOGLE_MAPS_RESOURCES, getResourceContent } from './resources.js';
import {
  ElevationGetSchema,
  GeocodeReverseSchema,
  GeocodeSearchSchema,
  GeolocationEstimateSchema,
  IpGeolocateSchema,
  Location,
  MCPError,
  NearbyFindSchema,
  PlacesAutocompleteSchema,
  PlacesDetailsSchema,
  PlacesNearbySchema,
  PlacesPhotosSchema,
  PlacesSearchTextSchema,
  RoadsNearestSchema,
  RoutesComputeSchema,
  RoutesMatrixSchema,
  TimezoneGetSchema
} from './types.js';

class GoogleMapsMCPServer {
  private server: Server;
  private googleMapsClient: GoogleMapsClient;
  private ipOverrideEnabled: boolean;

  constructor() {
    // Validate required environment variables
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      console.error('Error: GOOGLE_MAPS_API_KEY environment variable is required');
      process.exit(1);
    }

    this.googleMapsClient = new GoogleMapsClient(apiKey);
    this.ipOverrideEnabled = process.env.IP_OVERRIDE_ENABLED === 'true';

    this.server = new Server(
      {
        name: 'google-maps-mcp-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
          resources: {},
        },
      }
    );

    this.setupToolHandlers();
    this.setupResourceHandlers();
    this.setupErrorHandling();
  }

  private setupErrorHandling(): void {
    this.server.onerror = (error) => {
      console.error('[MCP Error]', error);
    };

    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  private setupToolHandlers(): void {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          // Geocoding tools
          {
            name: 'geocode_search',
            description: 'Convert addresses, place names, or landmarks into geographic coordinates (latitude/longitude). Supports region biasing and multiple languages for accurate global geocoding.',
            inputSchema: {
              type: 'object',
              properties: {
                query: { type: 'string', description: 'Address or place name to geocode' },
                region: { type: 'string', description: 'Region code for biasing results (optional)' },
                language: { type: 'string', description: 'Language code for results (optional)' }
              },
              required: ['query']
            }
          },
          {
            name: 'geocode_reverse',
            description: 'Convert geographic coordinates (latitude/longitude) into human-readable addresses with detailed address components. Useful for location-based services and mapping applications.',
            inputSchema: {
              type: 'object',
              properties: {
                lat: { type: 'number', description: 'Latitude' },
                lng: { type: 'number', description: 'Longitude' },
                language: { type: 'string', description: 'Language code for results (optional)' }
              },
              required: ['lat', 'lng']
            }
          },

          // Places tools
          {
            name: 'places_search_text',
            description: 'Search for places using natural language queries with advanced filtering options. Supports place type filtering, rating thresholds, price levels, location biasing, and real-time availability status.',
            inputSchema: {
              type: 'object',
              properties: {
                query: { type: 'string', description: 'Text search query' },
                included_types: { type: 'array', items: { type: 'string' }, description: 'Place types to include' },
                excluded_types: { type: 'array', items: { type: 'string' }, description: 'Place types to exclude' },
                open_now: { type: 'boolean', description: 'Filter for places open now' },
                price_levels: { type: 'array', items: { type: 'number' }, description: 'Price levels (0-4)' },
                min_rating: { type: 'number', description: 'Minimum rating filter' },
                location_bias: {
                  type: 'object',
                  properties: {
                    circle: {
                      type: 'object',
                      properties: {
                        center: {
                          type: 'object',
                          properties: {
                            lat: { type: 'number' },
                            lng: { type: 'number' }
                          },
                          required: ['lat', 'lng']
                        },
                        radius_meters: { type: 'number' }
                      },
                      required: ['center', 'radius_meters']
                    }
                  }
                },
                rank_preference: { type: 'string', enum: ['RELEVANCE', 'DISTANCE'] },
                language: { type: 'string' },
                region: { type: 'string' },
                max_results: { type: 'number', minimum: 1, maximum: 20 }
              },
              required: ['query']
            }
          },
          {
            name: 'places_nearby',
            description: 'Discover places within a specified radius of a geographic location. Perfect for finding restaurants, shops, services, and attractions near a specific point of interest.',
            inputSchema: {
              type: 'object',
              properties: {
                location: {
                  type: 'object',
                  properties: {
                    lat: { type: 'number' },
                    lng: { type: 'number' }
                  },
                  required: ['lat', 'lng']
                },
                radius_meters: { type: 'number', description: 'Search radius in meters' },
                included_types: { type: 'array', items: { type: 'string' } },
                max_results: { type: 'number', minimum: 1, maximum: 20 },
                language: { type: 'string' },
                region: { type: 'string' }
              },
              required: ['location', 'radius_meters']
            }
          },
          {
            name: 'places_autocomplete',
            description: 'Get place suggestions for autocomplete',
            inputSchema: {
              type: 'object',
              properties: {
                input: { type: 'string', description: 'Input text for autocomplete' },
                session_token: { type: 'string', description: 'Session token for billing' },
                location_bias: {
                  type: 'object',
                  properties: {
                    circle: {
                      type: 'object',
                      properties: {
                        center: {
                          type: 'object',
                          properties: {
                            lat: { type: 'number' },
                            lng: { type: 'number' }
                          },
                          required: ['lat', 'lng']
                        },
                        radius_meters: { type: 'number' }
                      },
                      required: ['center', 'radius_meters']
                    }
                  }
                },
                included_types: { type: 'array', items: { type: 'string' } },
                language: { type: 'string' },
                region: { type: 'string' }
              },
              required: ['input']
            }
          },
          {
            name: 'places_details',
            description: 'Get detailed information about a place',
            inputSchema: {
              type: 'object',
              properties: {
                place_id: { type: 'string', description: 'Place ID' },
                fields: { type: 'array', items: { type: 'string' }, description: 'Fields to return' },
                language: { type: 'string' },
                region: { type: 'string' },
                session_token: { type: 'string' }
              },
              required: ['place_id']
            }
          },
          {
            name: 'places_photos',
            description: 'Get signed photo URLs for a place',
            inputSchema: {
              type: 'object',
              properties: {
                photo_reference: { type: 'string', description: 'Photo reference from place details' },
                max_width: { type: 'number', description: 'Maximum width in pixels' },
                max_height: { type: 'number', description: 'Maximum height in pixels' }
              },
              required: ['photo_reference']
            }
          },

          // Routes tools
          {
            name: 'routes_compute',
            description: 'Calculate optimal routes between locations with real-time traffic data, toll information, and alternative route options. Supports multiple travel modes including driving, walking, cycling, and transit.',
            inputSchema: {
              type: 'object',
              properties: {
                origin: {
                  oneOf: [
                    {
                      type: 'object',
                      properties: {
                        lat: { type: 'number' },
                        lng: { type: 'number' }
                      },
                      required: ['lat', 'lng']
                    },
                    {
                      type: 'object',
                      properties: {
                        address: { type: 'string' }
                      },
                      required: ['address']
                    }
                  ]
                },
                destination: {
                  oneOf: [
                    {
                      type: 'object',
                      properties: {
                        lat: { type: 'number' },
                        lng: { type: 'number' }
                      },
                      required: ['lat', 'lng']
                    },
                    {
                      type: 'object',
                      properties: {
                        address: { type: 'string' }
                      },
                      required: ['address']
                    }
                  ]
                },
                waypoints: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      location: {
                        oneOf: [
                          {
                            type: 'object',
                            properties: {
                              lat: { type: 'number' },
                              lng: { type: 'number' }
                            },
                            required: ['lat', 'lng']
                          },
                          {
                            type: 'object',
                            properties: {
                              address: { type: 'string' }
                            },
                            required: ['address']
                          }
                        ]
                      },
                      via: { type: 'boolean' }
                    },
                    required: ['location']
                  }
                },
                travel_mode: { type: 'string', enum: ['DRIVE', 'WALK', 'BICYCLE', 'TRANSIT'] },
                routing_preference: { type: 'string', enum: ['TRAFFIC_UNAWARE', 'TRAFFIC_AWARE', 'TRAFFIC_AWARE_OPTIMAL'] },
                compute_alternative_routes: { type: 'boolean' },
                avoid_tolls: { type: 'boolean' },
                avoid_highways: { type: 'boolean' },
                avoid_ferries: { type: 'boolean' },
                language: { type: 'string' },
                region: { type: 'string' },
                units: { type: 'string', enum: ['METRIC', 'IMPERIAL'] }
              },
              required: ['origin', 'destination']
            }
          },
          {
            name: 'routes_matrix',
            description: 'Compute distance matrix between multiple origins and destinations',
            inputSchema: {
              type: 'object',
              properties: {
                origins: {
                  type: 'array',
                  items: {
                    oneOf: [
                      {
                        type: 'object',
                        properties: {
                          lat: { type: 'number' },
                          lng: { type: 'number' }
                        },
                        required: ['lat', 'lng']
                      },
                      {
                        type: 'object',
                        properties: {
                          address: { type: 'string' }
                        },
                        required: ['address']
                      }
                    ]
                  }
                },
                destinations: {
                  type: 'array',
                  items: {
                    oneOf: [
                      {
                        type: 'object',
                        properties: {
                          lat: { type: 'number' },
                          lng: { type: 'number' }
                        },
                        required: ['lat', 'lng']
                      },
                      {
                        type: 'object',
                        properties: {
                          address: { type: 'string' }
                        },
                        required: ['address']
                      }
                    ]
                  }
                },
                travel_mode: { type: 'string', enum: ['DRIVE', 'WALK', 'BICYCLE', 'TRANSIT'] },
                routing_preference: { type: 'string', enum: ['TRAFFIC_UNAWARE', 'TRAFFIC_AWARE', 'TRAFFIC_AWARE_OPTIMAL'] },
                language: { type: 'string' },
                region: { type: 'string' },
                units: { type: 'string', enum: ['METRIC', 'IMPERIAL'] }
              },
              required: ['origins', 'destinations']
            }
          },

          // Utility tools
          {
            name: 'elevation_get',
            description: 'Get elevation data for locations or along a path',
            inputSchema: {
              type: 'object',
              properties: {
                locations: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      lat: { type: 'number' },
                      lng: { type: 'number' }
                    },
                    required: ['lat', 'lng']
                  }
                },
                path: { type: 'string', description: 'Encoded polyline path' },
                samples: { type: 'number', description: 'Number of samples along path' }
              }
            }
          },
          {
            name: 'timezone_get',
            description: 'Get timezone information for a location',
            inputSchema: {
              type: 'object',
              properties: {
                lat: { type: 'number' },
                lng: { type: 'number' },
                timestamp: { type: 'number', description: 'Unix timestamp (optional)' },
                language: { type: 'string' }
              },
              required: ['lat', 'lng']
            }
          },
          {
            name: 'geolocation_estimate',
            description: 'Estimate location from WiFi/cell data using Google Geolocation API',
            inputSchema: {
              type: 'object',
              properties: {
                wifi_access_points: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      mac_address: { type: 'string' },
                      signal_strength: { type: 'number' },
                      age: { type: 'number' },
                      channel: { type: 'number' },
                      signal_to_noise: { type: 'number' }
                    },
                    required: ['mac_address']
                  }
                },
                cell_towers: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      cell_id: { type: 'number' },
                      location_area_code: { type: 'number' },
                      mobile_country_code: { type: 'number' },
                      mobile_network_code: { type: 'number' },
                      age: { type: 'number' },
                      signal_strength: { type: 'number' },
                      timing_advance: { type: 'number' }
                    },
                    required: ['cell_id', 'location_area_code', 'mobile_country_code', 'mobile_network_code']
                  }
                },
                consider_ip: { type: 'boolean' }
              }
            }
          },
          {
            name: 'roads_nearest',
            description: 'Find nearest roads to given points',
            inputSchema: {
              type: 'object',
              properties: {
                points: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      lat: { type: 'number' },
                      lng: { type: 'number' }
                    },
                    required: ['lat', 'lng']
                  }
                },
                travel_mode: { type: 'string', enum: ['DRIVING', 'WALKING', 'BICYCLING'] }
              },
              required: ['points']
            }
          },

          // Special tools
          {
            name: 'nearby_find',
            description: 'Discover nearby cities, towns, or points of interest from any location or address. Automatically calculates distances and sorts results by proximity. Supports both coordinate and address-based searches.',
            inputSchema: {
              type: 'object',
              properties: {
                origin: {
                  oneOf: [
                    {
                      type: 'object',
                      properties: {
                        lat: { type: 'number' },
                        lng: { type: 'number' }
                      },
                      required: ['lat', 'lng']
                    },
                    {
                      type: 'object',
                      properties: {
                        address: { type: 'string' }
                      },
                      required: ['address']
                    }
                  ]
                },
                what: { type: 'string', enum: ['cities', 'towns', 'pois', 'custom'] },
                included_types: { type: 'array', items: { type: 'string' } },
                radius_meters: { type: 'number', default: 30000 },
                max_results: { type: 'number', default: 20 },
                language: { type: 'string' },
                region: { type: 'string' }
              },
              required: ['origin', 'what']
            }
          },
          {
            name: 'ip_geolocate',
            description: 'Estimate geographic location using IP address through Google\'s Geolocation API. Provides approximate location with accuracy radius and optional reverse geocoding for address details.',
            inputSchema: {
              type: 'object',
              properties: {
                reverse_geocode: { type: 'boolean', description: 'Whether to reverse geocode the result' },
                language: { type: 'string' },
                region: { type: 'string' },
                ip_override: { type: 'string', description: 'IP address to override (best-effort, requires IP_OVERRIDE_ENABLED)' }
              }
            }
          }
        ] as Tool[]
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'geocode_search':
            return await this.handleGeocodeSearch(args);
          case 'geocode_reverse':
            return await this.handleGeocodeReverse(args);
          case 'places_search_text':
            return await this.handlePlacesSearchText(args);
          case 'places_nearby':
            return await this.handlePlacesNearby(args);
          case 'places_autocomplete':
            return await this.handlePlacesAutocomplete(args);
          case 'places_details':
            return await this.handlePlacesDetails(args);
          case 'places_photos':
            return await this.handlePlacesPhotos(args);
          case 'routes_compute':
            return await this.handleRoutesCompute(args);
          case 'routes_matrix':
            return await this.handleRoutesMatrix(args);
          case 'elevation_get':
            return await this.handleElevationGet(args);
          case 'timezone_get':
            return await this.handleTimezoneGet(args);
          case 'geolocation_estimate':
            return await this.handleGeolocationEstimate(args);
          case 'roads_nearest':
            return await this.handleRoadsNearest(args);
          case 'nearby_find':
            return await this.handleNearbyFind(args);
          case 'ip_geolocate':
            return await this.handleIpGeolocate(args);
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        const mcpError = error as MCPError;
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                error: {
                  code: mcpError.code || 'UNKNOWN_ERROR',
                  message: mcpError.message || 'An unknown error occurred',
                  context: mcpError.context || {}
                }
              }, null, 2)
            }
          ]
        };
      }
    });
  }

  private setupResourceHandlers(): void {
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => {
      return {
        resources: GOOGLE_MAPS_RESOURCES
      };
    });

    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      const { uri } = request.params;
      
      try {
        const content = getResourceContent(uri);
        const resource = GOOGLE_MAPS_RESOURCES.find(r => r.uri === uri);
        
        return {
          contents: [
            {
              uri,
              mimeType: resource?.mimeType || 'text/plain',
              text: content
            }
          ]
        };
      } catch (error) {
        throw new Error(`Resource not found: ${uri}`);
      }
    });
  }

  // Tool handlers
  private async handleGeocodeSearch(args: any) {
    const input = GeocodeSearchSchema.parse(args);
    const results = await this.googleMapsClient.geocodeSearch(input.query, input.region, input.language);
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ results }, null, 2)
        }
      ]
    };
  }

  private async handleGeocodeReverse(args: any) {
    const input = GeocodeReverseSchema.parse(args);
    const results = await this.googleMapsClient.geocodeReverse(input.lat, input.lng, input.language);
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ results }, null, 2)
        }
      ]
    };
  }

  private async handlePlacesSearchText(args: any) {
    const input = PlacesSearchTextSchema.parse(args);
    const results = await this.googleMapsClient.placesSearchText(input.query, {
      includedTypes: input.included_types,
      excludedTypes: input.excluded_types,
      openNow: input.open_now,
      priceLevels: input.price_levels,
      minRating: input.min_rating,
      locationBias: input.location_bias,
      rankPreference: input.rank_preference,
      language: input.language,
      region: input.region,
      maxResults: input.max_results
    });
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ results }, null, 2)
        }
      ]
    };
  }

  private async handlePlacesNearby(args: any) {
    const input = PlacesNearbySchema.parse(args);
    const results = await this.googleMapsClient.placesNearby(input.location, input.radius_meters, {
      includedTypes: input.included_types,
      maxResults: input.max_results,
      language: input.language,
      region: input.region
    });
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ results }, null, 2)
        }
      ]
    };
  }

  private async handlePlacesAutocomplete(args: any) {
    const input = PlacesAutocompleteSchema.parse(args);
    const results = await this.googleMapsClient.placesAutocomplete(input.input, {
      sessionToken: input.session_token,
      locationBias: input.location_bias,
      includedTypes: input.included_types,
      language: input.language,
      region: input.region
    });
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ predictions: results }, null, 2)
        }
      ]
    };
  }

  private async handlePlacesDetails(args: any) {
    const input = PlacesDetailsSchema.parse(args);
    const result = await this.googleMapsClient.placesDetails(input.place_id, {
      fields: input.fields,
      language: input.language,
      region: input.region,
      sessionToken: input.session_token
    });
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ result }, null, 2)
        }
      ]
    };
  }

  private async handlePlacesPhotos(args: any) {
    const input = PlacesPhotosSchema.parse(args);
    const url = await this.googleMapsClient.placesPhotos(
      input.photo_reference,
      input.max_width,
      input.max_height
    );
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ photo_url: url }, null, 2)
        }
      ]
    };
  }

  private async handleRoutesCompute(args: any) {
    const input = RoutesComputeSchema.parse(args);
    const result = await this.googleMapsClient.routesCompute(input.origin, input.destination, {
      waypoints: input.waypoints,
      travelMode: input.travel_mode,
      routingPreference: input.routing_preference,
      computeAlternativeRoutes: input.compute_alternative_routes,
      avoidTolls: input.avoid_tolls,
      avoidHighways: input.avoid_highways,
      avoidFerries: input.avoid_ferries,
      language: input.language,
      region: input.region,
      units: input.units
    });
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2)
        }
      ]
    };
  }

  private async handleRoutesMatrix(args: any) {
    const input = RoutesMatrixSchema.parse(args);
    const result = await this.googleMapsClient.routesMatrix(input.origins, input.destinations, {
      travelMode: input.travel_mode,
      routingPreference: input.routing_preference,
      language: input.language,
      region: input.region,
      units: input.units
    });
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2)
        }
      ]
    };
  }

  private async handleElevationGet(args: any) {
    const input = ElevationGetSchema.parse(args);
    const results = await this.googleMapsClient.elevationGet(
      input.locations,
      input.path,
      input.samples
    );
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ results }, null, 2)
        }
      ]
    };
  }

  private async handleTimezoneGet(args: any) {
    const input = TimezoneGetSchema.parse(args);
    const result = await this.googleMapsClient.timezoneGet(
      input.lat,
      input.lng,
      input.timestamp,
      input.language
    );
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2)
        }
      ]
    };
  }

  private async handleGeolocationEstimate(args: any) {
    const input = GeolocationEstimateSchema.parse(args);
    const result = await this.googleMapsClient.geolocationEstimate({
      wifiAccessPoints: input.wifi_access_points?.map(ap => ({
        macAddress: ap.mac_address,
        signalStrength: ap.signal_strength,
        age: ap.age,
        channel: ap.channel,
        signalToNoise: ap.signal_to_noise
      })),
      cellTowers: input.cell_towers?.map(ct => ({
        cellId: ct.cell_id,
        locationAreaCode: ct.location_area_code,
        mobileCountryCode: ct.mobile_country_code,
        mobileNetworkCode: ct.mobile_network_code,
        age: ct.age,
        signalStrength: ct.signal_strength,
        timingAdvance: ct.timing_advance
      })),
      considerIp: input.consider_ip
    });
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2)
        }
      ]
    };
  }

  private async handleRoadsNearest(args: any) {
    const input = RoadsNearestSchema.parse(args);
    const result = await this.googleMapsClient.roadsNearest(input.points, input.travel_mode);
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2)
        }
      ]
    };
  }

  private async handleNearbyFind(args: any) {
    const input = NearbyFindSchema.parse(args);
    
    // Resolve origin to coordinates if it's an address
    let originLocation: Location;
    if ('address' in input.origin) {
      const geocodeResults = await this.googleMapsClient.geocodeSearch(input.origin.address);
      if (geocodeResults.length === 0) {
        throw { code: 'GEOCODE_FAILED', message: 'Could not geocode origin address' };
      }
      originLocation = geocodeResults[0].location;
    } else {
      originLocation = input.origin;
    }

    let results: any[] = [];
    const radiusMeters = input.radius_meters || 30000;
    const maxResults = input.max_results || 20;

    if (input.what === 'cities' || input.what === 'towns') {
      // Use Places API with administrative area types
      const types = input.what === 'cities' ? ['locality', 'administrative_area_level_1'] : ['locality', 'administrative_area_level_3'];
      results = await this.googleMapsClient.placesNearby(originLocation, radiusMeters, {
        includedTypes: types,
        maxResults,
        language: input.language,
        region: input.region
      });
    } else if (input.what === 'pois' || input.what === 'custom') {
      // Use Places API with specified types
      results = await this.googleMapsClient.placesNearby(originLocation, radiusMeters, {
        includedTypes: input.included_types || ['point_of_interest'],
        maxResults,
        language: input.language,
        region: input.region
      });
    }

    // Calculate distances and format results
    const formattedResults = results.map(place => {
      const distance = place.location ? this.calculateDistance(originLocation, place.location) : 0;
      return {
        id: place.id,
        name: place.name,
        kind: place.types?.[0] || 'unknown',
        location: place.location,
        distance_meters: Math.round(distance),
        formatted_address: place.formatted_address
      };
    }).sort((a, b) => a.distance_meters - b.distance_meters);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            origin: originLocation,
            results: formattedResults,
            next_page_token: null // Implement pagination if needed
          }, null, 2)
        }
      ]
    };
  }

  private async handleIpGeolocate(args: any) {
    const input = IpGeolocateSchema.parse(args);
    
    // Validate IP override if provided
    if (input.ip_override && !this.ipOverrideEnabled) {
      throw { code: 'IP_OVERRIDE_DISABLED', message: 'IP override is not enabled on this server' };
    }

    if (input.ip_override && !this.isValidIP(input.ip_override)) {
      throw { code: 'INVALID_IP', message: 'Invalid IP address format' };
    }

    // Use Google Geolocation API with IP consideration
    const locationResult = await this.googleMapsClient.geolocationEstimate({
      considerIp: true
    });

    let normalizedAddress;
    if (input.reverse_geocode) {
      const geocodeResults = await this.googleMapsClient.geocodeReverse(
        locationResult.location.lat,
        locationResult.location.lng,
        input.language
      );
      if (geocodeResults.length > 0) {
        normalizedAddress = {
          formatted_address: geocodeResults[0].formatted_address,
          address_components: geocodeResults[0].address_components
        };
      }
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            method: 'geolocation_api_ip',
            approximate: true,
            location: {
              lat: locationResult.location.lat,
              lng: locationResult.location.lng,
              accuracy_radius_meters: locationResult.location.accuracy || 25000
            },
            normalized_address: normalizedAddress,
            source: {
              provider: 'google',
              reverse_geocode: !!input.reverse_geocode,
              ip_override_attempted: !!input.ip_override
            }
          }, null, 2)
        }
      ]
    };
  }

  // Helper methods
  private calculateDistance(point1: Location, point2: Location): number {
    const R = 6371000; // Earth's radius in meters
    const lat1Rad = point1.lat * Math.PI / 180;
    const lat2Rad = point2.lat * Math.PI / 180;
    const deltaLatRad = (point2.lat - point1.lat) * Math.PI / 180;
    const deltaLngRad = (point2.lng - point1.lng) * Math.PI / 180;

    const a = Math.sin(deltaLatRad / 2) * Math.sin(deltaLatRad / 2) +
              Math.cos(lat1Rad) * Math.cos(lat2Rad) *
              Math.sin(deltaLngRad / 2) * Math.sin(deltaLngRad / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  private isValidIP(ip: string): boolean {
    // Basic IPv4/IPv6 validation
    const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
    
    if (ipv4Regex.test(ip)) {
      // Check for private/reserved ranges
      const parts = ip.split('.').map(Number);
      if (parts[0] === 10) return false; // 10.0.0.0/8
      if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return false; // 172.16.0.0/12
      if (parts[0] === 192 && parts[1] === 168) return false; // 192.168.0.0/16
      if (parts[0] === 127) return false; // 127.0.0.0/8
      return true;
    }
    
    return ipv6Regex.test(ip);
  }

  async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Google Maps MCP Server running on stdio');
  }
}

// Start the server
const server = new GoogleMapsMCPServer();
server.run().catch(console.error);
