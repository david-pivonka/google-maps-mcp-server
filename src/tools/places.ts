import { MCPTool } from '../types/mcp.js';
import { GoogleMapsClient } from '../utils/google-maps-client.js';
import {
  validateInput,
  PlacesSearchTextSchema,
  PlacesNearbySchema,
  PlacesAutocompleteSchema,
  PlacesDetailsSchema,
  PlacesPhotosSchema
} from '../utils/validation.js';

export const placesSearchTextTool: MCPTool = {
  name: 'places_search_text',
  description: 'Search for places using text query with filters',
  inputSchema: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'Text query to search for places'
      },
      included_types: {
        type: 'array',
        items: { type: 'string' },
        description: 'Types of places to include in results'
      },
      excluded_types: {
        type: 'array',
        items: { type: 'string' },
        description: 'Types of places to exclude from results'
      },
      open_now: {
        type: 'boolean',
        description: 'Only return places that are open now'
      },
      price_levels: {
        type: 'array',
        items: { type: 'number' },
        description: 'Price levels to include (0-4)'
      },
      min_rating: {
        type: 'number',
        description: 'Minimum rating (0-5)'
      },
      location_bias: {
        type: 'object',
        description: 'Location bias for results'
      },
      rank_preference: {
        type: 'string',
        enum: ['RELEVANCE', 'DISTANCE'],
        description: 'How to rank results'
      },
      language: {
        type: 'string',
        description: 'Language code (ISO 639-1)'
      },
      region: {
        type: 'string',
        description: 'Region code (ISO 3166-1 alpha-2)'
      },
      max_results: {
        type: 'number',
        description: 'Maximum number of results (1-20)'
      }
    },
    required: ['query']
  }
};

export const placesNearbyTool: MCPTool = {
  name: 'places_nearby',
  description: 'Search for places near a specific location',
  inputSchema: {
    type: 'object',
    properties: {
      location: {
        type: 'object',
        properties: {
          lat: { type: 'number' },
          lng: { type: 'number' }
        },
        required: ['lat', 'lng'],
        description: 'Center location for search'
      },
      radius_meters: {
        type: 'number',
        description: 'Search radius in meters'
      },
      included_types: {
        type: 'array',
        items: { type: 'string' },
        description: 'Types of places to include'
      },
      max_results: {
        type: 'number',
        description: 'Maximum number of results (1-20)'
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
    required: ['location', 'radius_meters']
  }
};

export const placesAutocompleteTool: MCPTool = {
  name: 'places_autocomplete',
  description: 'Get place suggestions for autocomplete',
  inputSchema: {
    type: 'object',
    properties: {
      input: {
        type: 'string',
        description: 'Input text for autocomplete'
      },
      session_token: {
        type: 'string',
        description: 'Session token for billing optimization'
      },
      location_bias: {
        type: 'object',
        description: 'Location bias for suggestions'
      },
      included_types: {
        type: 'array',
        items: { type: 'string' },
        description: 'Types of places to include'
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
    required: ['input']
  }
};

export const placesDetailsTool: MCPTool = {
  name: 'places_details',
  description: 'Get detailed information about a place',
  inputSchema: {
    type: 'object',
    properties: {
      place_id: {
        type: 'string',
        description: 'Place ID to get details for'
      },
      fields: {
        type: 'array',
        items: { type: 'string' },
        description: 'Fields to include in response'
      },
      language: {
        type: 'string',
        description: 'Language code (ISO 639-1)'
      },
      region: {
        type: 'string',
        description: 'Region code (ISO 3166-1 alpha-2)'
      },
      session_token: {
        type: 'string',
        description: 'Session token from autocomplete'
      }
    },
    required: ['place_id']
  }
};

export const placesPhotosTool: MCPTool = {
  name: 'places_photos',
  description: 'Get signed URLs for place photos',
  inputSchema: {
    type: 'object',
    properties: {
      photo_reference: {
        type: 'string',
        description: 'Photo reference from place details'
      },
      max_width: {
        type: 'number',
        description: 'Maximum width in pixels'
      },
      max_height: {
        type: 'number',
        description: 'Maximum height in pixels'
      }
    },
    required: ['photo_reference']
  }
};

function transformPlace(place: any): any {
  return {
    id: place.id,
    name: place.displayName?.text || place.name,
    location: {
      lat: place.location?.latitude,
      lng: place.location?.longitude
    },
    formatted_address: place.formattedAddress,
    rating: place.rating,
    price_level: place.priceLevel,
    types: place.types,
    opening_hours: place.regularOpeningHours ? {
      open_now: place.regularOpeningHours.openNow,
      periods: place.regularOpeningHours.periods
    } : undefined,
    photos: place.photos?.map((photo: any) => photo.name) || []
  };
}

export function createPlacesSearchTextHandler(client: GoogleMapsClient) {
  return async (args: any) => {
    const input = validateInput(PlacesSearchTextSchema, args);
    
    const params: any = {
      textQuery: input.query,
      languageCode: input.language,
      regionCode: input.region,
      maxResultCount: input.max_results || 20
    };

    if (input.included_types && input.included_types.length > 0) {
      params.includedType = input.included_types[0]; // API only supports one included type
    }

    if (input.excluded_types) {
      params.excludedTypes = input.excluded_types;
    }

    if (input.open_now !== undefined) {
      params.openNow = input.open_now;
    }

    if (input.price_levels) {
      params.priceLevels = input.price_levels.map((level: number) => {
        switch (level) {
          case 0: return 'PRICE_LEVEL_FREE';
          case 1: return 'PRICE_LEVEL_INEXPENSIVE';
          case 2: return 'PRICE_LEVEL_MODERATE';
          case 3: return 'PRICE_LEVEL_EXPENSIVE';
          case 4: return 'PRICE_LEVEL_VERY_EXPENSIVE';
          default: return 'PRICE_LEVEL_UNSPECIFIED';
        }
      });
    }

    if (input.min_rating) {
      params.minRating = input.min_rating;
    }

    if (input.location_bias) {
      if (input.location_bias.circle) {
        params.locationBias = {
          circle: {
            center: {
              latitude: input.location_bias.circle.center.lat,
              longitude: input.location_bias.circle.center.lng
            },
            radius: input.location_bias.circle.radius_meters
          }
        };
      }
    }

    if (input.rank_preference) {
      params.rankPreference = input.rank_preference;
    }

    const response = await client.placesSearchText(params);

    return {
      places: response.places?.map(transformPlace) || [],
      next_page_token: response.nextPageToken
    };
  };
}

export function createPlacesNearbyHandler(client: GoogleMapsClient) {
  return async (args: any) => {
    const input = validateInput(PlacesNearbySchema, args);
    
    const params = {
      locationRestriction: {
        circle: {
          center: {
            latitude: input.location.lat,
            longitude: input.location.lng
          },
          radius: input.radius_meters
        }
      },
      includedTypes: input.included_types,
      maxResultCount: input.max_results || 20,
      languageCode: input.language,
      regionCode: input.region
    };

    const response = await client.placesNearbySearch(params);

    return {
      places: response.places?.map(transformPlace) || []
    };
  };
}

export function createPlacesAutocompleteHandler(client: GoogleMapsClient) {
  return async (args: any) => {
    const input = validateInput(PlacesAutocompleteSchema, args);
    
    const params: any = {
      input: input.input,
      sessionToken: input.session_token,
      languageCode: input.language,
      regionCode: input.region
    };

    if (input.location_bias) {
      if (input.location_bias.circle) {
        params.locationBias = {
          circle: {
            center: {
              latitude: input.location_bias.circle.center.lat,
              longitude: input.location_bias.circle.center.lng
            },
            radius: input.location_bias.circle.radius_meters
          }
        };
      }
    }

    if (input.included_types) {
      params.includedPrimaryTypes = input.included_types;
    }

    const response = await client.placesAutocomplete(params);

    return {
      suggestions: response.suggestions?.map((suggestion: any) => ({
        place_id: suggestion.placePrediction?.placeId,
        description: suggestion.placePrediction?.text?.text,
        structured_formatting: {
          main_text: suggestion.placePrediction?.structuredFormat?.mainText?.text,
          secondary_text: suggestion.placePrediction?.structuredFormat?.secondaryText?.text
        },
        types: suggestion.placePrediction?.types
      })) || []
    };
  };
}

export function createPlacesDetailsHandler(client: GoogleMapsClient) {
  return async (args: any) => {
    const input = validateInput(PlacesDetailsSchema, args);
    
    const fieldMask = input.fields ? input.fields.join(',') : 
      'id,displayName,formattedAddress,location,rating,priceLevel,types,regularOpeningHours,photos,reviews,website,phoneNumber';

    const response = await client.placesDetails({
      placeId: input.place_id,
      fieldMask,
      languageCode: input.language,
      regionCode: input.region,
      sessionToken: input.session_token
    });

    return transformPlace(response);
  };
}

export function createPlacesPhotosHandler(client: GoogleMapsClient) {
  return async (args: any) => {
    const input = validateInput(PlacesPhotosSchema, args);
    
    const photoUrl = client.getPlacePhotoUrl(
      input.photo_reference,
      input.max_width,
      input.max_height
    );

    return {
      photo_url: photoUrl,
      photo_reference: input.photo_reference,
      max_width: input.max_width,
      max_height: input.max_height
    };
  };
}
