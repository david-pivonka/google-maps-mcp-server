#!/usr/bin/env node

import { MCPServer, ServerConfig } from './server.js';
import { GoogleMapsClient } from './utils/google-maps-client.js';
import { ConfigurationError } from './utils/errors.js';

// Import all tools
import {
  geocodeSearchTool,
  geocodeReverseTool,
  createGeocodeSearchHandler,
  createGeocodeReverseHandler
} from './tools/geocoding.js';

import {
  placesSearchTextTool,
  placesNearbyTool,
  placesAutocompleteTool,
  placesDetailsTool,
  placesPhotosTool,
  createPlacesSearchTextHandler,
  createPlacesNearbyHandler,
  createPlacesAutocompleteHandler,
  createPlacesDetailsHandler,
  createPlacesPhotosHandler
} from './tools/places.js';

import {
  routesComputeTool,
  routesMatrixTool,
  createRoutesComputeHandler,
  createRoutesMatrixHandler
} from './tools/routes.js';

import {
  elevationGetTool,
  timezoneGetTool,
  geolocationEstimateTool,
  createElevationGetHandler,
  createTimezoneGetHandler,
  createGeolocationEstimateHandler
} from './tools/utilities.js';

import {
  nearbyFindTool,
  createNearbyFindHandler
} from './tools/nearby-find.js';

import {
  ipGeolocateTool,
  createIpGeolocateHandler
} from './tools/ip-geolocate.js';

import {
  healthCheckTool,
  createHealthCheckHandler
} from './tools/health-check.js';

function loadConfig(): ServerConfig {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    throw new ConfigurationError(
      'GOOGLE_MAPS_API_KEY environment variable is required'
    );
  }

  return {
    googleMapsApiKey: apiKey,
    ipOverrideEnabled: process.env.IP_OVERRIDE_ENABLED === 'true',
    cacheEnabled: process.env.CACHE_ENABLED !== 'false',
    cacheTtlMs: process.env.CACHE_TTL_MS ? parseInt(process.env.CACHE_TTL_MS) : undefined,
    rateLimitCapacity: process.env.RATE_LIMIT_CAPACITY ? parseInt(process.env.RATE_LIMIT_CAPACITY) : undefined,
    rateLimitRefillRate: process.env.RATE_LIMIT_REFILL_RATE ? parseInt(process.env.RATE_LIMIT_REFILL_RATE) : undefined
  };
}

function setupErrorHandling() {
  process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    process.exit(1);
  });

  process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
  });
}

async function main() {
  try {
    setupErrorHandling();

    const config = loadConfig();
    const server = new MCPServer(config);
    const client = new GoogleMapsClient(config.googleMapsApiKey, server.getCache());

    // Register geocoding tools
    server.registerTool(geocodeSearchTool, createGeocodeSearchHandler(client));
    server.registerTool(geocodeReverseTool, createGeocodeReverseHandler(client));

    // Register places tools
    server.registerTool(placesSearchTextTool, createPlacesSearchTextHandler(client));
    server.registerTool(placesNearbyTool, createPlacesNearbyHandler(client));
    server.registerTool(placesAutocompleteTool, createPlacesAutocompleteHandler(client));
    server.registerTool(placesDetailsTool, createPlacesDetailsHandler(client));
    server.registerTool(placesPhotosTool, createPlacesPhotosHandler(client));

    // Register routes tools
    server.registerTool(routesComputeTool, createRoutesComputeHandler(client));
    server.registerTool(routesMatrixTool, createRoutesMatrixHandler(client));

    // Register utility tools
    server.registerTool(elevationGetTool, createElevationGetHandler(client));
    server.registerTool(timezoneGetTool, createTimezoneGetHandler(client));
    server.registerTool(geolocationEstimateTool, createGeolocationEstimateHandler(client));

    // Register special tools
    server.registerTool(nearbyFindTool, createNearbyFindHandler(client));
    server.registerTool(ipGeolocateTool, createIpGeolocateHandler(client, config));
    server.registerTool(healthCheckTool, createHealthCheckHandler(client));

    // Start the server
    server.start();

    // Send a notification that the server is ready (optional)
    server.sendNotification('server/ready', {
      name: 'google-maps-mcp-server',
      version: '1.0.0',
      tools_count: 13
    });

  } catch (error) {
    if (error instanceof ConfigurationError) {
      console.error('Configuration Error:', error.message);
      process.exit(1);
    } else {
      console.error('Failed to start server:', error);
      process.exit(1);
    }
  }
}

// Only run if this file is executed directly
if (require.main === module) {
  main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { main };
