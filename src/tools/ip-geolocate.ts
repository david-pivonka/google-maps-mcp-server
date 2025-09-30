import { ServerConfig } from '../server.js';
import { MCPTool } from '../types/mcp.js';
import { GoogleMapsClient } from '../utils/google-maps-client.js';
import { IpGeolocateSchema, validateInput } from '../utils/validation.js';

export const ipGeolocateTool: MCPTool = {
  name: 'ip_geolocate',
  description: 'Geolocate IP address using Google Geolocation API with optional reverse geocoding',
  inputSchema: {
    type: 'object',
    properties: {
      reverse_geocode: {
        type: 'boolean',
        description: 'Whether to reverse geocode the location to get address'
      },
      language: {
        type: 'string',
        description: 'Language code (ISO 639-1) for address results'
      },
      region: {
        type: 'string',
        description: 'Region code (ISO 3166-1 alpha-2) for address results'
      },
      ip_override: {
        type: 'string',
        description: 'IP address to override (best effort, requires server configuration)'
      }
    }
  }
};

export function createIpGeolocateHandler(client: GoogleMapsClient, config: ServerConfig) {
  return async (args: any) => {
    const input = validateInput(IpGeolocateSchema, args);
    
    let ipOverrideAttempted = false;
    let ipOverride: string | undefined;

    // Handle IP override if enabled and provided
    if (input.ip_override && config.ipOverrideEnabled) {
      ipOverride = input.ip_override;
      ipOverrideAttempted = true;
    } else if (input.ip_override && !config.ipOverrideEnabled) {
      // Log warning but don't fail
      process.stderr.write('Warning: IP override requested but not enabled in server configuration\n');
    }

    // Call Google Geolocation API with IP consideration
    const geolocationResponse = await client.geolocate({
      considerIp: true
    }, ipOverride);

    const location = {
      lat: geolocationResponse.location.lat,
      lng: geolocationResponse.location.lng,
      accuracy_radius_meters: geolocationResponse.accuracy
    };

    let normalizedAddress;

    // Reverse geocode if requested
    if (input.reverse_geocode) {
      try {
        const reverseResponse = await client.reverseGeocode({
          latlng: `${location.lat},${location.lng}`,
          language: input.language
        });

        if ((reverseResponse as any).results && (reverseResponse as any).results.length > 0) {
          const result = (reverseResponse as any).results[0];
          normalizedAddress = {
            formatted_address: result.formatted_address,
            address_components: (result.address_components || []).map((component: any) => ({
              long_name: component.long_name,
              short_name: component.short_name,
              types: component.types
            }))
          };
        }
      } catch (error) {
        // Don't fail the whole request if reverse geocoding fails
        process.stderr.write(`Warning: Reverse geocoding failed: ${error}\n`);
      }
    }

    return {
      method: 'geolocation_api_ip',
      approximate: true,
      location,
      normalized_address: normalizedAddress,
      source: {
        provider: 'google',
        reverse_geocode: input.reverse_geocode || false,
        ip_override_attempted: ipOverrideAttempted
      }
    };
  };
}
