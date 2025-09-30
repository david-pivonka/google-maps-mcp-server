import { MCPTool } from '../types/mcp.js';
import { GoogleMapsClient } from '../utils/google-maps-client.js';
import { validateInput, GeocodeSearchSchema, GeocodeReverseSchema } from '../utils/validation.js';
import { GeocodeSearchInput, GeocodeReverseInput, LatLng, FormattedAddress } from '../types/google-maps.js';

export const geocodeSearchTool: MCPTool = {
  name: 'geocode_search',
  description: 'Forward geocoding - convert addresses to coordinates',
  inputSchema: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'Address or location to geocode'
      },
      region: {
        type: 'string',
        description: 'Region code (ISO 3166-1 alpha-2) for biasing results'
      },
      language: {
        type: 'string',
        description: 'Language code (ISO 639-1) for results'
      }
    },
    required: ['query']
  }
};

export const geocodeReverseTool: MCPTool = {
  name: 'geocode_reverse',
  description: 'Reverse geocoding - convert coordinates to addresses',
  inputSchema: {
    type: 'object',
    properties: {
      lat: {
        type: 'number',
        description: 'Latitude'
      },
      lng: {
        type: 'number',
        description: 'Longitude'
      },
      language: {
        type: 'string',
        description: 'Language code (ISO 639-1) for results'
      }
    },
    required: ['lat', 'lng']
  }
};

export function createGeocodeSearchHandler(client: GoogleMapsClient) {
  return async (args: any) => {
    const input = validateInput(GeocodeSearchSchema, args);
    
    const response = await client.geocode({
      address: input.query,
      region: input.region,
      language: input.language
    });

    const results = ((response as any).results || []).map((result: any) => ({
      formatted_address: result.formatted_address,
      location: {
        lat: result.geometry.location.lat,
        lng: result.geometry.location.lng
      },
      address_components: (result.address_components || []).map((component: any) => ({
        long_name: component.long_name,
        short_name: component.short_name,
        types: component.types
      })),
      place_id: result.place_id,
      types: result.types
    }));

    return {
      status: (response as any).status || 'OK',
      results
    };
  };
}

export function createGeocodeReverseHandler(client: GoogleMapsClient) {
  return async (args: any) => {
    const input = validateInput(GeocodeReverseSchema, args);
    
    const latlng = `${input.lat},${input.lng}`;
    const response = await client.reverseGeocode({
      latlng,
      language: input.language
    });

    const results = ((response as any).results || []).map((result: any) => ({
      formatted_address: result.formatted_address,
      location: {
        lat: result.geometry.location.lat,
        lng: result.geometry.location.lng
      },
      address_components: (result.address_components || []).map((component: any) => ({
        long_name: component.long_name,
        short_name: component.short_name,
        types: component.types
      })),
      place_id: result.place_id,
      types: result.types
    }));

    return {
      status: (response as any).status || 'OK',
      results
    };
  };
}
