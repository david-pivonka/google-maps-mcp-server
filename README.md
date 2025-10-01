# Google Maps MCP Server

[![npm version](https://badge.fury.io/js/google-maps-mcp-server.svg)](https://badge.fury.io/js/google-maps-mcp-server)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A Model Context Protocol (MCP) server that provides comprehensive access to Google Maps Platform APIs. This server enables LLMs to perform geocoding, places search, routing, and other geospatial operations through a standardized interface.

## Features

- 🗺️ **Comprehensive Google Maps Integration** - Access to Places, Routes, Geocoding, and utility APIs
- 🔍 **Advanced Places Search** - Text search, nearby search, autocomplete, and detailed place information
- 🛣️ **Smart Routing** - Route computation with real-time traffic, tolls, and alternative routes
- 📍 **Precise Geocoding** - Forward and reverse geocoding with international support
- 🌐 **Geolocation Services** - IP-based and WiFi/cellular location estimation
- 📊 **Rich Resources** - Built-in documentation and examples accessible via MCP resources
- 🔒 **Security First** - Input validation, rate limiting, and secure API key handling

## Quick Start

### 1. Get Google Maps API Key

1. Visit the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the required APIs (see API requirements by tool below)
4. Create an API key and restrict it to the enabled APIs
5. **Important**: This server uses the **new** Google Maps Platform APIs (Places API (New) and Routes API), not the legacy versions

#### API Requirements by Tool

| Tool | Required Google Cloud Console API |
|------|-----------------------------------|
| `geocode_search`, `geocode_reverse` | Geocoding API |
| `places_search_text`, `places_nearby`, `places_autocomplete`, `places_details`, `places_photos` | Places API (New) |
| `routes_compute`, `routes_matrix` | Routes API |
| `elevation_get` | Elevation API |
| `timezone_get` | Time Zone API |
| `geolocation_estimate` | Geolocation API |
| `roads_nearest` | Roads API |
| `ip_geolocate`, `nearby_find` | Geolocation API + Places API (New) |

### 2. Configure MCP Client

Add the server to your MCP client configuration:

#### Cursor

Add to your Cursor MCP settings (`~/.cursor/mcp.json` or through Command Palette > Open MCP Settings > New MCP Server):

```json
{
  "mcpServers": {
    "google-maps": {
      "command": "npx",
      "args": ["-y", "google-maps-mcp-server"],
      "env": {
        "GOOGLE_MAPS_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

With custom rate limiting:

```json
{
  "mcpServers": {
    "google-maps": {
      "command": "npx",
      "args": ["-y", "google-maps-mcp-server"],
      "env": {
        "GOOGLE_MAPS_API_KEY": "your-api-key-here",
        "GOOGLE_MAPS_RATE_LIMIT_ENABLED": "true",
        "GOOGLE_MAPS_RATE_LIMIT_WINDOW_MS": "120000",
        "GOOGLE_MAPS_RATE_LIMIT_MAX_REQUESTS": "200"
      }
    }
  }
}
```

#### Claude Desktop

Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "google-maps": {
      "command": "npx",
      "args": ["google-maps-mcp-server"],
      "env": {
        "GOOGLE_MAPS_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

With rate limiting disabled:

```json
{
  "mcpServers": {
    "google-maps": {
      "command": "npx",
      "args": ["google-maps-mcp-server"],
      "env": {
        "GOOGLE_MAPS_API_KEY": "your-api-key-here",
        "GOOGLE_MAPS_RATE_LIMIT_ENABLED": "false"
      }
    }
  }
}
```

#### Other MCP Clients

```bash
# Set environment variable
export GOOGLE_MAPS_API_KEY="your-api-key-here"

# Run the server
npx google-maps-mcp-server
```

## Available Tools

### Geocoding
- **`geocode_search`** - Convert addresses to coordinates
- **`geocode_reverse`** - Convert coordinates to addresses

### Places
- **`places_search_text`** - Search places with natural language
- **`places_nearby`** - Find places within a radius
- **`places_autocomplete`** - Get place suggestions
- **`places_details`** - Get detailed place information
- **`places_photos`** - Get place photo URLs

### Routing
- **`routes_compute`** - Calculate optimal routes
- **`routes_matrix`** - Compute distance matrices

### Utilities
- **`elevation_get`** - Get elevation data
- **`timezone_get`** - Get timezone information
- **`geolocation_estimate`** - Estimate location from WiFi/cell data
- **`roads_nearest`** - Find nearest roads

### Special Tools
- **`nearby_find`** - Find nearby cities, towns, or POIs
- **`ip_geolocate`** - Geolocate using IP address

## Usage Examples

### Find Nearby Restaurants

```json
{
  "tool": "places_nearby",
  "arguments": {
    "location": {"lat": 37.7749, "lng": -122.4194},
    "radius_meters": 1000,
    "included_types": ["restaurant"],
    "max_results": 10
  }
}
```

### Get Driving Directions

```json
{
  "tool": "routes_compute",
  "arguments": {
    "origin": {"address": "San Francisco, CA"},
    "destination": {"address": "Los Angeles, CA"},
    "travel_mode": "DRIVE",
    "routing_preference": "TRAFFIC_AWARE"
  }
}
```

### Geocode an Address

```json
{
  "tool": "geocode_search",
  "arguments": {
    "query": "1600 Amphitheatre Parkway, Mountain View, CA",
    "language": "en"
  }
}
```

### Geolocate by IP Address

```json
{
  "tool": "ip_geolocate",
  "arguments": {
    "reverse_geocode": true
  }
}
```

The `ip_geolocate` tool also supports an optional `ip_override` parameter for testing with different IP addresses:

```json
{
  "tool": "ip_geolocate",
  "arguments": {
    "ip_override": "8.8.8.8",
    "reverse_geocode": true
  }
}
```

**Note:** The `ip_override` parameter accepts public IPv4 or IPv6 addresses. Private and reserved IP ranges (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16, 127.0.0.0/8) are rejected. The IP override is best-effort and Google's Geolocation API may not always honor the request.

## Configuration

### Environment Variables

- **`GOOGLE_MAPS_API_KEY`** (required) - Your Google Maps Platform API key

#### Rate Limiting Configuration

- **`GOOGLE_MAPS_RATE_LIMIT_ENABLED`** (optional, default: `true`) - Enable/disable rate limiting
  - Set to `false` to disable rate limiting entirely
- **`GOOGLE_MAPS_RATE_LIMIT_WINDOW_MS`** (optional, default: `60000`) - Rate limit window in milliseconds
  - Controls the time window for rate limiting (e.g., 60000 = 1 minute)
- **`GOOGLE_MAPS_RATE_LIMIT_MAX_REQUESTS`** (optional, default: `100`) - Maximum requests per window
  - Maximum number of requests allowed per endpoint within the time window

#### Example Rate Limiting Configurations

```bash
# Default rate limiting (100 requests per minute per endpoint)
GOOGLE_MAPS_API_KEY="your-api-key-here"

# Disable rate limiting entirely
GOOGLE_MAPS_API_KEY="your-api-key-here"
GOOGLE_MAPS_RATE_LIMIT_ENABLED=false

# Custom rate limiting (200 requests per 2 minutes per endpoint)
GOOGLE_MAPS_API_KEY="your-api-key-here"
GOOGLE_MAPS_RATE_LIMIT_WINDOW_MS=120000
GOOGLE_MAPS_RATE_LIMIT_MAX_REQUESTS=200

# Stricter rate limiting (50 requests per 30 seconds per endpoint)
GOOGLE_MAPS_API_KEY="your-api-key-here"
GOOGLE_MAPS_RATE_LIMIT_WINDOW_MS=30000
GOOGLE_MAPS_RATE_LIMIT_MAX_REQUESTS=50
```

### API Quotas and Billing

This server uses Google Maps Platform APIs which require billing to be enabled. Monitor your usage in the Google Cloud Console to avoid unexpected charges. Consider implementing usage limits in your application.

## Resources

The server provides built-in MCP resources with documentation and examples:

- `google-maps://docs/api-overview` - API overview and capabilities
- `google-maps://docs/place-types` - Complete place types reference
- `google-maps://docs/travel-modes` - Available travel modes
- `google-maps://docs/field-masks` - Places API field optimization
- `google-maps://examples/common-queries` - Example queries and patterns

Access these through your MCP client's resource interface.

## Development

### Building from Source

```bash
git clone <repository-url>
cd google-maps-mcp-server
npm install
npm run build
```

### Testing

```bash
npm test
```

### Using MCP Inspector

```bash
npm run build

GOOGLE_MAPS_API_KEY="your-api-key-here" npx @modelcontextprotocol/inspector ./dist/index.js
```

## Error Handling

The server returns structured errors with helpful context:

```json
{
  "error": {
    "code": "QUOTA_EXCEEDED",
    "message": "API quota exceeded",
    "context": {
      "endpoint": "/places/textsearch",
      "status": 429
    }
  }
}
```

Common error codes:
- `INVALID_REQUEST` - Invalid input parameters
- `API_KEY_INVALID` - Invalid or missing API key
- `QUOTA_EXCEEDED` - API quota exceeded
- `REQUEST_FAILED` - Network or API request failed

## Security

- API keys are never logged or exposed
- Input validation prevents injection attacks
- Rate limiting protects against abuse
- IP addresses are hashed in logs for privacy

## Contributing

Contributions are welcome! Please submit pull requests to our GitHub repository.

## License

MIT License - see [LICENSE](LICENSE) file for details.
