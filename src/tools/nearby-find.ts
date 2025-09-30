import { MCPTool } from '../types/mcp.js';
import { GoogleMapsClient } from '../utils/google-maps-client.js';
import { validateInput, NearbyFindSchema } from '../utils/validation.js';
import { LatLng } from '../types/google-maps.js';

export const nearbyFindTool: MCPTool = {
  name: 'nearby_find',
  description: 'Find nearby cities, towns, POIs, or custom places from a location or address',
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
        description: 'Origin location (coordinates or address)'
      },
      what: {
        type: 'string',
        enum: ['cities', 'towns', 'pois', 'custom'],
        description: 'Type of places to find'
      },
      included_types: {
        type: 'array',
        items: { type: 'string' },
        description: 'Specific place types to include (for custom searches)'
      },
      radius_meters: {
        type: 'number',
        description: 'Search radius in meters (default: 30000)'
      },
      max_results: {
        type: 'number',
        description: 'Maximum number of results (default: 20)'
      },
      language: {
        type: 'string',
        description: 'Language code (ISO 639-1)'
      },
      region: {
        type: 'string',
        description: 'Region code (ISO 3166-1 alpha-2)'
      }
    },
    required: ['origin', 'what']
  }
};

function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000; // Earth's radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function getTypesForCategory(what: string): string[] {
  switch (what) {
    case 'cities':
      return ['locality', 'administrative_area_level_3', 'administrative_area_level_2'];
    case 'towns':
      return ['locality', 'sublocality', 'administrative_area_level_3'];
    case 'pois':
      return ['tourist_attraction', 'point_of_interest', 'establishment'];
    default:
      return [];
  }
}

export function createNearbyFindHandler(client: GoogleMapsClient) {
  return async (args: any) => {
    const input = validateInput(NearbyFindSchema, args);
    
    let originLocation: LatLng;

    // Geocode address if needed
    if ('address' in input.origin) {
      const geocodeResponse = await client.geocode({
        address: input.origin.address,
        language: input.language,
        region: input.region
      });

      if (!(geocodeResponse as any).results || (geocodeResponse as any).results.length === 0) {
        throw new Error(`Could not geocode address: ${input.origin.address}`);
      }

      const result = (geocodeResponse as any).results[0];
      originLocation = {
        lat: result.geometry.location.lat,
        lng: result.geometry.location.lng
      };
    } else {
      originLocation = input.origin as LatLng;
    }

    const radiusMeters = input.radius_meters || 30000;
    const maxResults = input.max_results || 20;

    let results: any[] = [];

    if (input.what === 'cities' || input.what === 'towns') {
      // Use Places Text Search with location bias for cities/towns
      const types = getTypesForCategory(input.what);
      const query = input.what === 'cities' ? 'city' : 'town';

      const searchResponse = await client.placesSearchText({
        textQuery: query,
        locationBias: {
          circle: {
            center: {
              latitude: originLocation.lat,
              longitude: originLocation.lng
            },
            radius: radiusMeters
          }
        },
        rankPreference: 'DISTANCE',
        maxResultCount: maxResults,
        languageCode: input.language,
        regionCode: input.region
      });

      results = searchResponse.places?.map((place: any) => {
        const placeLocation = {
          lat: place.location?.latitude || 0,
          lng: place.location?.longitude || 0
        };

        const distance = calculateDistance(
          originLocation.lat,
          originLocation.lng,
          placeLocation.lat,
          placeLocation.lng
        );

        return {
          id: place.id,
          name: place.displayName?.text || place.name,
          kind: input.what === 'cities' ? 'locality' : 'town',
          location: placeLocation,
          distance_meters: Math.round(distance),
          formatted_address: place.formattedAddress
        };
      }).filter((place: any) => place.distance_meters <= radiusMeters) || [];

    } else if (input.what === 'pois' || input.what === 'custom') {
      // Use Places Nearby Search for POIs and custom types
      const includedTypes = input.included_types || getTypesForCategory(input.what);

      const nearbyResponse = await client.placesNearbySearch({
        locationRestriction: {
          circle: {
            center: {
              latitude: originLocation.lat,
              longitude: originLocation.lng
            },
            radius: radiusMeters
          }
        },
        includedTypes,
        maxResultCount: maxResults,
        languageCode: input.language,
        regionCode: input.region
      });

      results = nearbyResponse.places?.map((place: any) => {
        const placeLocation = {
          lat: place.location?.latitude || 0,
          lng: place.location?.longitude || 0
        };

        const distance = calculateDistance(
          originLocation.lat,
          originLocation.lng,
          placeLocation.lat,
          placeLocation.lng
        );

        return {
          id: place.id,
          name: place.displayName?.text || place.name,
          kind: place.types?.[0] || 'place',
          location: placeLocation,
          distance_meters: Math.round(distance),
          formatted_address: place.formattedAddress,
          rating: place.rating,
          price_level: place.priceLevel
        };
      }) || [];
    }

    // Sort by distance
    results.sort((a, b) => a.distance_meters - b.distance_meters);

    return {
      origin: originLocation,
      results: results.slice(0, maxResults),
      search_params: {
        what: input.what,
        radius_meters: radiusMeters,
        included_types: input.included_types
      }
    };
  };
}
