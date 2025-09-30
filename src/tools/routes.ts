import { MCPTool } from '../types/mcp.js';
import { GoogleMapsClient } from '../utils/google-maps-client.js';
import { validateInput, RoutesComputeSchema, RoutesMatrixSchema } from '../utils/validation.js';

export const routesComputeTool: MCPTool = {
  name: 'routes_compute',
  description: 'Compute routes between locations with traffic, tolls, and avoidances',
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
        ],
        description: 'Starting location'
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
        ],
        description: 'Ending location'
      },
      waypoints: {
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
        },
        description: 'Intermediate waypoints'
      },
      travel_mode: {
        type: 'string',
        enum: ['DRIVE', 'WALK', 'BICYCLE', 'TRANSIT'],
        description: 'Mode of transportation'
      },
      routing_preference: {
        type: 'string',
        enum: ['TRAFFIC_UNAWARE', 'TRAFFIC_AWARE', 'TRAFFIC_AWARE_OPTIMAL'],
        description: 'Routing preference for traffic'
      },
      avoid: {
        type: 'array',
        items: {
          type: 'string',
          enum: ['tolls', 'highways', 'ferries']
        },
        description: 'Features to avoid'
      },
      language: {
        type: 'string',
        description: 'Language code (ISO 639-1)'
      },
      region: {
        type: 'string',
        description: 'Region code (ISO 3166-1 alpha-2)'
      },
      units: {
        type: 'string',
        enum: ['metric', 'imperial'],
        description: 'Unit system for results'
      },
      departure_time: {
        type: 'string',
        description: 'Departure time (ISO 8601)'
      },
      arrival_time: {
        type: 'string',
        description: 'Arrival time (ISO 8601)'
      }
    },
    required: ['origin', 'destination']
  }
};

export const routesMatrixTool: MCPTool = {
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
        },
        description: 'Origin locations'
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
        },
        description: 'Destination locations'
      },
      travel_mode: {
        type: 'string',
        enum: ['DRIVE', 'WALK', 'BICYCLE', 'TRANSIT'],
        description: 'Mode of transportation'
      },
      routing_preference: {
        type: 'string',
        enum: ['TRAFFIC_UNAWARE', 'TRAFFIC_AWARE', 'TRAFFIC_AWARE_OPTIMAL'],
        description: 'Routing preference for traffic'
      },
      avoid: {
        type: 'array',
        items: {
          type: 'string',
          enum: ['tolls', 'highways', 'ferries']
        },
        description: 'Features to avoid'
      },
      language: {
        type: 'string',
        description: 'Language code (ISO 639-1)'
      },
      region: {
        type: 'string',
        description: 'Region code (ISO 3166-1 alpha-2)'
      },
      units: {
        type: 'string',
        enum: ['metric', 'imperial'],
        description: 'Unit system for results'
      },
      departure_time: {
        type: 'string',
        description: 'Departure time (ISO 8601)'
      }
    },
    required: ['origins', 'destinations']
  }
};

function transformWaypoint(waypoint: any): any {
  if ('lat' in waypoint && 'lng' in waypoint) {
    return {
      location: {
        latLng: {
          latitude: waypoint.lat,
          longitude: waypoint.lng
        }
      }
    };
  } else {
    return {
      address: waypoint.address
    };
  }
}

function extractLocationFromResponse(location: any): { lat: number; lng: number } {
  if (location.latLng) {
    return {
      lat: location.latLng.latitude,
      lng: location.latLng.longitude
    };
  }
  return location;
}

export function createRoutesComputeHandler(client: GoogleMapsClient) {
  return async (args: any) => {
    const input = validateInput(RoutesComputeSchema, args);
    
    const params: any = {
      origin: transformWaypoint(input.origin),
      destination: transformWaypoint(input.destination),
      travelMode: input.travel_mode || 'DRIVE',
      routingPreference: input.routing_preference || 'TRAFFIC_AWARE',
      languageCode: input.language,
      regionCode: input.region,
      units: input.units?.toUpperCase() || 'METRIC'
    };

    if (input.waypoints && input.waypoints.length > 0) {
      params.waypoints = input.waypoints.map(transformWaypoint);
    }

    if (input.avoid) {
      params.avoidTolls = input.avoid.includes('tolls');
      params.avoidHighways = input.avoid.includes('highways');
      params.avoidFerries = input.avoid.includes('ferries');
    }

    if (input.departure_time) {
      params.departureTime = input.departure_time;
    }

    if (input.arrival_time) {
      params.arrivalTime = input.arrival_time;
    }

    const response = await client.computeRoutes(params);

    const routes = response.routes?.map((route: any) => {
      const legs = route.legs?.map((leg: any) => ({
        start: extractLocationFromResponse(leg.startLocation),
        end: extractLocationFromResponse(leg.endLocation),
        steps: leg.steps?.length || 0,
        distance_meters: leg.distanceMeters,
        duration_seconds: parseInt(leg.duration?.replace('s', '') || '0')
      })) || [];

      return {
        distance_meters: route.distanceMeters,
        duration_seconds: parseInt(route.duration?.replace('s', '') || '0'),
        duration_in_traffic_seconds: route.travelAdvisory?.durationInTraffic ? 
          parseInt(route.travelAdvisory.durationInTraffic.replace('s', '')) : undefined,
        polyline: route.polyline?.encodedPolyline,
        tolls: route.travelAdvisory?.tollInfo ? {
          currency: route.travelAdvisory.tollInfo.estimatedPrice?.[0]?.currencyCode,
          estimated: parseFloat(route.travelAdvisory.tollInfo.estimatedPrice?.[0]?.units || '0')
        } : undefined,
        legs
      };
    }) || [];

    return { routes };
  };
}

export function createRoutesMatrixHandler(client: GoogleMapsClient) {
  return async (args: any) => {
    const input = validateInput(RoutesMatrixSchema, args);
    
    const params: any = {
      origins: input.origins.map(transformWaypoint),
      destinations: input.destinations.map(transformWaypoint),
      travelMode: input.travel_mode || 'DRIVE',
      routingPreference: input.routing_preference || 'TRAFFIC_AWARE',
      languageCode: input.language,
      regionCode: input.region,
      units: input.units?.toUpperCase() || 'METRIC'
    };

    if (input.avoid) {
      params.avoidTolls = input.avoid.includes('tolls');
      params.avoidHighways = input.avoid.includes('highways');
      params.avoidFerries = input.avoid.includes('ferries');
    }

    if (input.departure_time) {
      params.departureTime = input.departure_time;
    }

    const response = await client.computeRouteMatrix(params);

    return {
      origin_addresses: response.originAddresses || [],
      destination_addresses: response.destinationAddresses || [],
      rows: response.rows?.map((row: any) => ({
        elements: row.elements?.map((element: any) => ({
          status: element.status,
          distance_meters: element.distanceMeters,
          duration_seconds: element.duration ? parseInt(element.duration.replace('s', '')) : undefined,
          duration_in_traffic_seconds: element.durationInTraffic ? 
            parseInt(element.durationInTraffic.replace('s', '')) : undefined
        })) || []
      })) || []
    };
  };
}
