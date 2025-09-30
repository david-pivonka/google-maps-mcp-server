#!/usr/bin/env node

import { MCPServer, ServerConfig } from './server.js';
import { ConfigurationError } from './utils/errors.js';
import { GoogleMapsClient } from './utils/google-maps-client.js';

// Import all tools
import {
    createGeocodeReverseHandler,
    createGeocodeSearchHandler,
    geocodeReverseTool,
    geocodeSearchTool
} from './tools/geocoding.js';

import {
    createPlacesAutocompleteHandler,
    createPlacesDetailsHandler,
    createPlacesNearbyHandler,
    createPlacesPhotosHandler,
    createPlacesSearchTextHandler,
    placesAutocompleteTool,
    placesDetailsTool,
    placesNearbyTool,
    placesPhotosTool,
    placesSearchTextTool
} from './tools/places.js';

import {
    createRoutesComputeHandler,
    createRoutesMatrixHandler,
    routesComputeTool,
    routesMatrixTool
} from './tools/routes.js';

import {
    createElevationGetHandler,
    createGeolocationEstimateHandler,
    createTimezoneGetHandler,
    elevationGetTool,
    geolocationEstimateTool,
    timezoneGetTool
} from './tools/utilities.js';

import {
    createNearbyFindHandler,
    nearbyFindTool
} from './tools/nearby-find.js';

import {
    createIpGeolocateHandler,
    ipGeolocateTool
} from './tools/ip-geolocate.js';

import {
    createHealthCheckHandler,
    healthCheckTool
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
    process.stderr.write(`Uncaught Exception: ${error}\n`);
    process.exit(1);
  });

  process.on('unhandledRejection', (reason, promise) => {
    process.stderr.write(`Unhandled Rejection: ${reason}\n`);
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

  } catch (error) {
    if (error instanceof ConfigurationError) {
      process.stderr.write(`Configuration Error: ${error.message}\n`);
      process.exit(1);
    } else {
      process.stderr.write(`Failed to start server: ${error}\n`);
      process.exit(1);
    }
  }
}

// Only run if this file is executed directly
if (require.main === module) {
  main().catch((error) => {
    process.stderr.write(`Fatal error: ${error}\n`);
    process.exit(1);
  });
}

export { main };
