import { MCPTool } from '../types/mcp.js';
import { GoogleMapsClient } from '../utils/google-maps-client.js';
import {
  validateInput,
  ElevationGetSchema,
  TimezoneGetSchema,
  GeolocationEstimateSchema
} from '../utils/validation.js';

export const elevationGetTool: MCPTool = {
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
        },
        description: 'Array of locations to get elevation for'
      },
      path: {
        type: 'string',
        description: 'Encoded polyline path to get elevation along'
      }
    }
  }
};

export const timezoneGetTool: MCPTool = {
  name: 'timezone_get',
  description: 'Get timezone information for a location at a specific time',
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
      timestamp: {
        type: 'number',
        description: 'Unix timestamp'
      }
    },
    required: ['lat', 'lng', 'timestamp']
  }
};

export const geolocationEstimateTool: MCPTool = {
  name: 'geolocation_estimate',
  description: 'Estimate device location from Wi-Fi and cell tower data',
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
        },
        description: 'Wi-Fi access points detected by device'
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
        },
        description: 'Cell towers detected by device'
      },
      consider_ip: {
        type: 'boolean',
        description: 'Whether to consider IP address for location'
      }
    }
  }
};

export function createElevationGetHandler(client: GoogleMapsClient) {
  return async (args: any) => {
    const input = validateInput(ElevationGetSchema, args);
    
    let locations: string | undefined;
    let path: string | undefined;

    if (input.locations) {
      locations = input.locations.map((loc: any) => `${loc.lat},${loc.lng}`).join('|');
    }

    if (input.path) {
      path = input.path;
    }

    const response = await client.getElevation({
      locations,
      path
    });

    return {
      status: (response as any).status || 'OK',
      results: ((response as any).results || []).map((result: any) => ({
        elevation: result.elevation,
        location: {
          lat: result.location.lat,
          lng: result.location.lng
        },
        resolution: result.resolution
      }))
    };
  };
}

export function createTimezoneGetHandler(client: GoogleMapsClient) {
  return async (args: any) => {
    const input = validateInput(TimezoneGetSchema, args);
    
    const location = `${input.lat},${input.lng}`;
    const response = await client.getTimezone({
      location,
      timestamp: input.timestamp
    });

    return {
      status: (response as any).status || 'OK',
      timezone_id: (response as any).timeZoneId,
      timezone_name: (response as any).timeZoneName,
      dst_offset: (response as any).dstOffset,
      raw_offset: (response as any).rawOffset
    };
  };
}

export function createGeolocationEstimateHandler(client: GoogleMapsClient) {
  return async (args: any) => {
    const input = validateInput(GeolocationEstimateSchema, args);
    
    const params: any = {
      considerIp: input.consider_ip !== false // Default to true
    };

    if (input.wifi_access_points) {
      params.wifiAccessPoints = input.wifi_access_points.map((ap: any) => ({
        macAddress: ap.mac_address,
        signalStrength: ap.signal_strength,
        age: ap.age,
        channel: ap.channel,
        signalToNoiseRatio: ap.signal_to_noise
      }));
    }

    if (input.cell_towers) {
      params.cellTowers = input.cell_towers.map((tower: any) => ({
        cellId: tower.cell_id,
        locationAreaCode: tower.location_area_code,
        mobileCountryCode: tower.mobile_country_code,
        mobileNetworkCode: tower.mobile_network_code,
        age: tower.age,
        signalStrength: tower.signal_strength,
        timingAdvance: tower.timing_advance
      }));
    }

    const response = await client.geolocate(params);

    return {
      location: {
        lat: response.location.lat,
        lng: response.location.lng,
        accuracy_radius_meters: response.accuracy
      }
    };
  };
}
