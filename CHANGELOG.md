# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-09-30

### Added
- Initial release of Google Maps MCP Server
- Support for Google Maps Platform APIs:
  - Places API (New) - text search, nearby search, autocomplete, details, photos
  - Routes API v2 - route computation and distance matrix
  - Geocoding API v1 - forward and reverse geocoding
  - Elevation API - elevation data for points and paths
  - Time Zone API - timezone information for coordinates
  - Geolocation API - WiFi/cell-based location estimation
  - Roads API - nearest roads functionality
- 18 comprehensive tools with snake_case naming
- MCP resources with built-in documentation and examples
- Robust error handling with structured error responses
- Input validation using Zod schemas
- Rate limiting and caching for optimal performance
- Security features: API key protection, input sanitization, IP validation
- TypeScript support with full type definitions
- Comprehensive test suite and validation scripts

### Features
- **geocode_search** - Convert addresses to coordinates
- **geocode_reverse** - Convert coordinates to addresses
- **places_search_text** - Advanced text-based place search
- **places_nearby** - Proximity-based place discovery
- **places_autocomplete** - Place suggestion service
- **places_details** - Detailed place information
- **places_photos** - Place photo URL generation
- **routes_compute** - Route calculation with traffic data
- **routes_matrix** - Distance matrix computation
- **elevation_get** - Elevation data retrieval
- **timezone_get** - Timezone information service
- **geolocation_estimate** - WiFi/cellular location estimation
- **roads_nearest** - Road network snapping
- **nearby_find** - Nearby cities/towns/POI finder
- **ip_geolocate** - IP-based geolocation
- **health_check** - API connectivity verification

### Technical
- STDIO-based MCP server implementation
- JSON-RPC transport with proper Content-Length framing
- Support for MCP protocol version 2024-11-05
- Node.js 18+ compatibility
- TypeScript compilation to ES2022
- Comprehensive error handling and logging
- Production-ready NPM package structure
