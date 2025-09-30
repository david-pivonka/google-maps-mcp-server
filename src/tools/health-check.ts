import { MCPTool } from '../types/mcp.js';
import { GoogleMapsClient } from '../utils/google-maps-client.js';
import { HealthCheckResult } from '../types/google-maps.js';

export const healthCheckTool: MCPTool = {
  name: 'health_check',
  description: 'Check API key validity and service availability',
  inputSchema: {
    type: 'object',
    properties: {},
    required: []
  }
};

export function createHealthCheckHandler(client: GoogleMapsClient) {
  return async (args: any): Promise<HealthCheckResult> => {
    const timestamp = new Date().toISOString();
    const services: Record<string, any> = {};
    let apiKeyValid = true;
    let overallStatus: 'healthy' | 'unhealthy' = 'healthy';

    // Test Geocoding API (low cost, simple test)
    try {
      const startTime = Date.now();
      await client.geocode({
        address: 'Google',
        region: 'US'
      });
      const responseTime = Date.now() - startTime;
      
      services.geocoding = {
        status: 'ok',
        response_time_ms: responseTime
      };
    } catch (error: any) {
      services.geocoding = {
        status: 'error',
        error: error.message
      };
      
      if (error.message.includes('API key') || error.message.includes('403')) {
        apiKeyValid = false;
      }
      overallStatus = 'unhealthy';
    }

    // Test Places API (New)
    try {
      const startTime = Date.now();
      await client.placesSearchText({
        textQuery: 'restaurant',
        maxResultCount: 1,
        languageCode: 'en'
      });
      const responseTime = Date.now() - startTime;
      
      services.places = {
        status: 'ok',
        response_time_ms: responseTime
      };
    } catch (error: any) {
      services.places = {
        status: 'error',
        error: error.message
      };
      
      if (error.message.includes('API key') || error.message.includes('403')) {
        apiKeyValid = false;
      }
      overallStatus = 'unhealthy';
    }

    // Test Routes API
    try {
      const startTime = Date.now();
      await client.computeRoutes({
        origin: {
          location: {
            latLng: {
              latitude: 37.7749,
              longitude: -122.4194
            }
          }
        },
        destination: {
          location: {
            latLng: {
              latitude: 37.7849,
              longitude: -122.4094
            }
          }
        },
        travelMode: 'DRIVE'
      });
      const responseTime = Date.now() - startTime;
      
      services.routes = {
        status: 'ok',
        response_time_ms: responseTime
      };
    } catch (error: any) {
      services.routes = {
        status: 'error',
        error: error.message
      };
      
      if (error.message.includes('API key') || error.message.includes('403')) {
        apiKeyValid = false;
      }
      overallStatus = 'unhealthy';
    }

    // Test Elevation API
    try {
      const startTime = Date.now();
      await client.getElevation({
        locations: '39.7391536,-104.9847034'
      });
      const responseTime = Date.now() - startTime;
      
      services.elevation = {
        status: 'ok',
        response_time_ms: responseTime
      };
    } catch (error: any) {
      services.elevation = {
        status: 'error',
        error: error.message
      };
      
      if (error.message.includes('API key') || error.message.includes('403')) {
        apiKeyValid = false;
      }
      overallStatus = 'unhealthy';
    }

    // Test Timezone API
    try {
      const startTime = Date.now();
      await client.getTimezone({
        location: '39.6034810,-119.6822510',
        timestamp: Math.floor(Date.now() / 1000)
      });
      const responseTime = Date.now() - startTime;
      
      services.timezone = {
        status: 'ok',
        response_time_ms: responseTime
      };
    } catch (error: any) {
      services.timezone = {
        status: 'error',
        error: error.message
      };
      
      if (error.message.includes('API key') || error.message.includes('403')) {
        apiKeyValid = false;
      }
      overallStatus = 'unhealthy';
    }

    // Test Geolocation API
    try {
      const startTime = Date.now();
      await client.geolocate({
        considerIp: true
      });
      const responseTime = Date.now() - startTime;
      
      services.geolocation = {
        status: 'ok',
        response_time_ms: responseTime
      };
    } catch (error: any) {
      services.geolocation = {
        status: 'error',
        error: error.message
      };
      
      if (error.message.includes('API key') || error.message.includes('403')) {
        apiKeyValid = false;
      }
      overallStatus = 'unhealthy';
    }

    return {
      status: overallStatus,
      timestamp,
      api_key_valid: apiKeyValid,
      services
    };
  };
}
