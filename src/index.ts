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

  constructor() {
    // Validate required environment variables
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      console.error('Error: GOOGLE_MAPS_API_KEY environment variable is required');
      process.exit(1);
    }

    this.googleMapsClient = new GoogleMapsClient(apiKey);

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
                query: { type: 'string', description: 'Address or place name to geocode. Examples: "1600 Amphitheatre Parkway, Mountain View, CA", "Eiffel Tower", "Tokyo, Japan"' },
                region: { type: 'string', description: 'Region code for biasing results (ISO 3166-1 alpha-2, e.g., "US", "GB", "DE")' },
                language: { type: 'string', description: 'Language code for results (ISO 639-1, e.g., "en", "es", "fr")' }
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
                language: { type: 'string', description: 'Language code for results (ISO 639-1, e.g., "en", "es", "fr")' }
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
                query: { type: 'string', description: 'Text search query for places. Examples: "pizza near me", "Italian restaurants in Rome", "gas stations", "Starbucks in Seattle"' },
                included_types: { type: 'array', items: { type: 'string' }, description: 'Place types to include' },
                excluded_types: { type: 'array', items: { type: 'string' }, description: 'Place types to exclude' },
                open_now: { type: 'boolean', description: 'Filter for places open now' },
                price_levels: { type: 'array', items: { type: 'number' }, description: 'Price levels to filter by (0=Free, 1=Inexpensive, 2=Moderate, 3=Expensive, 4=Very Expensive). Example: [1, 2] for inexpensive to moderate' },
                min_rating: { type: 'number', description: 'Minimum rating filter (1.0-5.0). Example: 4.0 for highly rated places only' },
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
                rank_preference: { type: 'string', enum: ['RELEVANCE', 'DISTANCE'], description: 'How to rank the results' },
                language: { type: 'string', description: 'Language code for results (ISO 639-1, e.g., "en", "es", "fr")' },
                region: { type: 'string', description: 'Region code for biasing results (ISO 3166-1 alpha-2, e.g., "US", "GB", "DE")' },
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
                  description: 'Geographic coordinates of the center point for the search. Provide as {"lat": 37.7749, "lng": -122.4194}',
                  properties: {
                    lat: { type: 'number', description: 'Latitude coordinate (e.g., 37.7749 for San Francisco)' },
                    lng: { type: 'number', description: 'Longitude coordinate (e.g., -122.4194 for San Francisco)' }
                  },
                  required: ['lat', 'lng']
                },
                radius_meters: { type: 'number', description: 'Search radius in meters' },
                included_types: { type: 'array', items: { type: 'string' }, description: 'Place types to include in search' },
                max_results: { type: 'number', minimum: 1, maximum: 20, description: 'Maximum number of results to return' },
                language: { type: 'string', description: 'Language code for results (ISO 639-1, e.g., "en", "es", "fr")' },
                region: { type: 'string', description: 'Region code for biasing results (ISO 3166-1 alpha-2, e.g., "US", "GB", "DE")' }
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
                input: { type: 'string', description: 'Input text for autocomplete suggestions. Examples: "pizza", "123 Main", "Eiffel Tow"' },
                session_token: { type: 'string', description: 'Session token for billing' },
                location_bias: {
                  type: 'object',
                  description: 'Geographic region to bias search results toward',
                  properties: {
                    circle: {
                      type: 'object',
                      description: 'Circular region defined by center point and radius',
                      properties: {
                        center: {
                          type: 'object',
                          description: 'Center coordinates of the bias circle',
                          properties: {
                            lat: { type: 'number', description: 'Latitude' },
                            lng: { type: 'number', description: 'Longitude' }
                          },
                          required: ['lat', 'lng']
                        },
                        radius_meters: { type: 'number', description: 'Radius in meters' }
                      },
                      required: ['center', 'radius_meters']
                    }
                  }
                },
                included_types: { type: 'array', items: { type: 'string' }, description: 'Place types to include in suggestions' },
                language: { type: 'string', description: 'Language code for results (ISO 639-1, e.g., "en", "es", "fr")' },
                region: { type: 'string', description: 'Region code for biasing results (ISO 3166-1 alpha-2, e.g., "US", "GB", "DE")' }
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
                fields: { type: 'array', items: { type: 'string' }, description: 'Specific fields to return from place details. Examples: ["name", "formatted_address", "opening_hours", "rating", "reviews"]' },
                language: { type: 'string', description: 'Language code for results (ISO 639-1, e.g., "en", "es", "fr")' },
                region: { type: 'string', description: 'Region code for biasing results (ISO 3166-1 alpha-2, e.g., "US", "GB", "DE")' },
                session_token: { type: 'string', description: 'Session token for billing (optional)' }
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
                  description: 'Starting location for the route. Provide either coordinates like {"lat": 37.7749, "lng": -122.4194} or an address like {"address": "123 Main St, San Francisco, CA"}',
                  oneOf: [
                    {
                      type: 'object',
                      description: 'Geographic coordinates',
                      properties: {
                        lat: { type: 'number', description: 'Latitude (e.g., 37.7749)' },
                        lng: { type: 'number', description: 'Longitude (e.g., -122.4194)' }
                      },
                      required: ['lat', 'lng']
                    },
                    {
                      type: 'object',
                      description: 'Text address',
                      properties: {
                        address: { type: 'string', description: 'Full address string (e.g., "123 Main St, San Francisco, CA")' }
                      },
                      required: ['address']
                    }
                  ]
                },
                destination: {
                  description: 'Ending location for the route. Provide either coordinates like {"lat": 40.7128, "lng": -74.0060} or an address like {"address": "456 Broadway, New York, NY"}',
                  oneOf: [
                    {
                      type: 'object',
                      description: 'Geographic coordinates',
                      properties: {
                        lat: { type: 'number', description: 'Latitude (e.g., 40.7128)' },
                        lng: { type: 'number', description: 'Longitude (e.g., -74.0060)' }
                      },
                      required: ['lat', 'lng']
                    },
                    {
                      type: 'object',
                      description: 'Text address',
                      properties: {
                        address: { type: 'string', description: 'Full address string (e.g., "456 Broadway, New York, NY")' }
                      },
                      required: ['address']
                    }
                  ]
                },
                waypoints: {
                  type: 'array',
                  description: 'Optional intermediate stops along the route. Each waypoint should have a "location" (coordinates or address) and optionally "via": true for pass-through points. Example: [{"location": {"lat": 38.0, "lng": -122.0}, "via": false}]',
                  items: {
                    type: 'object',
                    properties: {
                      location: {
                        description: 'Waypoint location - provide coordinates like {"lat": 38.0, "lng": -122.0} or address like {"address": "Waypoint City, State"}',
                        oneOf: [
                          {
                            type: 'object',
                            description: 'Geographic coordinates',
                            properties: {
                              lat: { type: 'number', description: 'Latitude (e.g., 38.0)' },
                              lng: { type: 'number', description: 'Longitude (e.g., -122.0)' }
                            },
                            required: ['lat', 'lng']
                          },
                          {
                            type: 'object',
                            description: 'Text address',
                            properties: {
                              address: { type: 'string', description: 'Full address string (e.g., "Waypoint City, State")' }
                            },
                            required: ['address']
                          }
                        ]
                      },
                      via: { type: 'boolean', description: 'Whether to treat as via point (true = pass through without stopping, false = stop at this location)' }
                    },
                    required: ['location']
                  }
                },
                travel_mode: { type: 'string', enum: ['DRIVE', 'WALK', 'BICYCLE', 'TRANSIT'], description: 'Transportation mode for the route' },
                routing_preference: { type: 'string', enum: ['TRAFFIC_UNAWARE', 'TRAFFIC_AWARE', 'TRAFFIC_AWARE_OPTIMAL'], description: 'Routing algorithm preference' },
                compute_alternative_routes: { type: 'boolean', description: 'Whether to compute alternative routes' },
                avoid_tolls: { type: 'boolean', description: 'Avoid toll roads' },
                avoid_highways: { type: 'boolean', description: 'Avoid highways' },
                avoid_ferries: { type: 'boolean', description: 'Avoid ferries' },
                language: { type: 'string', description: 'Language code for results (ISO 639-1, e.g., "en", "es", "fr")' },
                region: { type: 'string', description: 'Region code for biasing results (ISO 3166-1 alpha-2, e.g., "US", "GB", "DE")' },
                units: { type: 'string', enum: ['METRIC', 'IMPERIAL'], description: 'Unit system for distances' }
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
                  description: 'Array of starting locations for distance calculations. Each location should be either coordinates like {"lat": 37.7749, "lng": -122.4194} or an address like {"address": "San Francisco, CA"}',
                  items: {
                    description: 'Origin location - provide coordinates or address object',
                    oneOf: [
                      {
                        type: 'object',
                        description: 'Geographic coordinates',
                        properties: {
                          lat: { type: 'number', description: 'Latitude (e.g., 37.7749)' },
                          lng: { type: 'number', description: 'Longitude (e.g., -122.4194)' }
                        },
                        required: ['lat', 'lng']
                      },
                      {
                        type: 'object',
                        description: 'Text address',
                        properties: {
                          address: { type: 'string', description: 'Full address string (e.g., "San Francisco, CA")' }
                        },
                        required: ['address']
                      }
                    ]
                  }
                },
                destinations: {
                  type: 'array',
                  description: 'Array of destination locations for distance calculations. Each location should be either coordinates like {"lat": 40.7128, "lng": -74.0060} or an address like {"address": "New York, NY"}',
                  items: {
                    description: 'Destination location - provide coordinates or address object',
                    oneOf: [
                      {
                        type: 'object',
                        description: 'Geographic coordinates',
                        properties: {
                          lat: { type: 'number', description: 'Latitude (e.g., 40.7128)' },
                          lng: { type: 'number', description: 'Longitude (e.g., -74.0060)' }
                        },
                        required: ['lat', 'lng']
                      },
                      {
                        type: 'object',
                        description: 'Text address',
                        properties: {
                          address: { type: 'string', description: 'Full address string (e.g., "New York, NY")' }
                        },
                        required: ['address']
                      }
                    ]
                  }
                },
                travel_mode: { type: 'string', enum: ['DRIVE', 'WALK', 'BICYCLE', 'TRANSIT'], description: 'Transportation mode for distance calculations' },
                routing_preference: { type: 'string', enum: ['TRAFFIC_UNAWARE', 'TRAFFIC_AWARE', 'TRAFFIC_AWARE_OPTIMAL'], description: 'Routing algorithm preference' },
                language: { type: 'string', description: 'Language code for results (ISO 639-1, e.g., "en", "es", "fr")' },
                region: { type: 'string', description: 'Region code for biasing results (ISO 3166-1 alpha-2, e.g., "US", "GB", "DE")' },
                units: { type: 'string', enum: ['METRIC', 'IMPERIAL'], description: 'Unit system for distances' }
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
                  description: 'Array of coordinates to get elevation data for',
                  items: {
                    type: 'object',
                    description: 'Geographic coordinates',
                    properties: {
                      lat: { type: 'number', description: 'Latitude' },
                      lng: { type: 'number', description: 'Longitude' }
                    },
                    required: ['lat', 'lng']
                  }
                },
                path: { type: 'string', description: 'Encoded polyline path for elevation sampling. Use Google\'s polyline encoding format' },
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
                lat: { type: 'number', description: 'Latitude of the location' },
                lng: { type: 'number', description: 'Longitude of the location' },
                timestamp: { type: 'number', description: 'Unix timestamp (optional)' },
                language: { type: 'string', description: 'Language code for results (ISO 639-1, e.g., "en", "es", "fr")' }
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
                  description: 'Array of WiFi access points detected by the device',
                  items: {
                    type: 'object',
                    description: 'WiFi access point data',
                    properties: {
                      mac_address: { type: 'string', description: 'MAC address of the WiFi access point' },
                      signal_strength: { type: 'number', description: 'Signal strength in dBm' },
                      age: { type: 'number', description: 'Age of the measurement in milliseconds' },
                      channel: { type: 'number', description: 'WiFi channel number' },
                      signal_to_noise: { type: 'number', description: 'Signal-to-noise ratio' }
                    },
                    required: ['mac_address']
                  }
                },
                cell_towers: {
                  type: 'array',
                  description: 'Array of cell towers detected by the device',
                  items: {
                    type: 'object',
                    description: 'Cell tower data',
                    properties: {
                      cell_id: { type: 'number', description: 'Cell tower ID' },
                      location_area_code: { type: 'number', description: 'Location area code' },
                      mobile_country_code: { type: 'number', description: 'Mobile country code' },
                      mobile_network_code: { type: 'number', description: 'Mobile network code' },
                      age: { type: 'number', description: 'Age of the measurement in milliseconds' },
                      signal_strength: { type: 'number', description: 'Signal strength in dBm' },
                      timing_advance: { type: 'number', description: 'Timing advance value' }
                    },
                    required: ['cell_id', 'location_area_code', 'mobile_country_code', 'mobile_network_code']
                  }
                },
                consider_ip: { type: 'boolean', description: 'Whether to use IP address for location estimation' }
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
                  description: 'Array of geographic coordinates to find nearest roads for. Each point should be an object like {"lat": 40.7128, "lng": -74.0060}',
                  items: {
                    type: 'object',
                    description: 'Geographic coordinates for road lookup',
                    properties: {
                      lat: { type: 'number', description: 'Latitude coordinate (e.g., 40.7128 for NYC)' },
                      lng: { type: 'number', description: 'Longitude coordinate (e.g., -74.0060 for NYC)' }
                    },
                    required: ['lat', 'lng']
                  }
                },
                travel_mode: { type: 'string', enum: ['DRIVING', 'WALKING', 'BICYCLING'], description: 'Travel mode for road network' }
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
                  description: 'Starting location for the search. Provide either coordinates like {"lat": 37.7749, "lng": -122.4194} or an address like {"address": "San Francisco, CA"}',
                  oneOf: [
                    {
                      type: 'object',
                      description: 'Geographic coordinates',
                      properties: {
                        lat: { type: 'number', description: 'Latitude (e.g., 37.7749)' },
                        lng: { type: 'number', description: 'Longitude (e.g., -122.4194)' }
                      },
                      required: ['lat', 'lng']
                    },
                    {
                      type: 'object',
                      description: 'Text address',
                      properties: {
                        address: { type: 'string', description: 'Full address string (e.g., "San Francisco, CA")' }
                      },
                      required: ['address']
                    }
                  ]
                },
                what: { type: 'string', enum: ['cities', 'towns', 'pois', 'custom'], description: 'Type of places to search for: "cities" for major cities, "towns" for smaller localities, "pois" for points of interest, "custom" for specific types via included_types' },
                included_types: { type: 'array', items: { type: 'string' }, description: 'Specific place types to include (used with what=custom or pois). Example: ["restaurant", "gas_station", "tourist_attraction"]' },
                radius_meters: { type: 'number', default: 30000, description: 'Search radius in meters (default: 30000)' },
                max_results: { type: 'number', default: 20, description: 'Maximum number of results to return (default: 20)' },
                language: { type: 'string', description: 'Language code for results (ISO 639-1, e.g., "en", "es", "fr")' },
                region: { type: 'string', description: 'Region code for biasing results (ISO 3166-1 alpha-2, e.g., "US", "GB", "DE")' }
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
                language: { type: 'string', description: 'Language code for the reverse geocoded address (ISO 639-1, e.g., "en", "es", "fr"). Only used when reverse_geocode is true' },
                ip_override: { type: 'string', description: 'Optional IP address to override for testing (best-effort)' }
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
