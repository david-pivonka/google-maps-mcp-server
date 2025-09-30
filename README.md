# Google Maps MCP Server

[![npm version](https://badge.fury.io/js/google-maps-mcp-server.svg)](https://www.npmjs.com/package/google-maps-mcp-server)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org/)

A **STDIO-based** Model Context Protocol (MCP) server that provides comprehensive access to Google Maps Platform APIs. This server implements all major Google Maps services using only current (non-legacy) APIs with proper error handling, rate limiting, caching, and validation.

## Table of Contents

- [Features](#features)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Configuration](#configuration)
- [Available Tools](#available-tools)
- [Usage Examples](#usage-examples)
- [Development](#development)
- [Contributing](#contributing)
- [Security](#security)
- [License](#license)
- [Support](#support)

## Features

### Complete Google Maps Platform Integration
- **Geocoding API** - Forward and reverse geocoding
- **Places API (New)** - Search, nearby, autocomplete, details, photos
- **Routes API v2** - Routing and distance matrix with traffic
- **Elevation API** - Elevation data for locations
- **Timezone API** - Timezone information
- **Geolocation API** - Device location estimation
- **Street View Static API** - Street View imagery

### Advanced Functionality
- `nearby_find` - Find cities, towns, POIs near any location
- `ip_geolocate` - IP-based geolocation via Google's API
- `health_check` - API key validation and service status

### Production Ready
- ✅ Exponential backoff retry with jitter
- ✅ Token bucket rate limiting
- ✅ LRU cache with TTL
- ✅ Input validation with Zod
- ✅ Structured error handling
- ✅ Request timeouts
- ✅ TypeScript support

## Installation

### Via NPM (Recommended)

```bash
npm install -g google-maps-mcp-server
```

### Via NPX (No Installation)

```bash
npx google-maps-mcp-server
```

### From Source

```bash
git clone https://github.com/david-pivonka/google-maps-mcp-server.git
cd google-maps-mcp-server
npm install
npm run build
```

## Quick Start

### Prerequisites

- **Node.js 18+** - [Download](https://nodejs.org/)
- **Google Maps API Key** - [Get API Key](https://developers.google.com/maps/documentation/javascript/get-api-key)
- **MCP Client** - Such as [Claude Desktop](https://claude.ai/download)

### Google Maps Platform Setup

1. **Create a Google Cloud Project**:
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select existing one
   - Enable billing (required for API access)

2. **Enable Required APIs**:
   - Geocoding API
   - Places API (New)
   - Routes API
   - Elevation API
   - Time Zone API
   - Geolocation API

3. **Create API Key**:
   - Navigate to **APIs & Services → Credentials**
   - Click **Create Credentials → API Key**
   - **Restrict the key** (recommended):
     - Application restrictions (HTTP referrers or IP addresses)
     - API restrictions (select only the APIs listed above)

### MCP Client Configuration

#### Claude Desktop

Add to your `claude_desktop_config.json`:

**Using NPX (easiest):**
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

**Using Global Install:**
```json
{
  "mcpServers": {
    "google-maps": {
      "command": "google-maps-mcp-server",
      "env": {
        "GOOGLE_MAPS_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

**Using Local Build:**
```json
{
  "mcpServers": {
    "google-maps": {
      "command": "node",
      "args": ["/path/to/google-maps-mcp-server/dist/index.js"],
      "env": {
        "GOOGLE_MAPS_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

#### Other MCP Clients

The server communicates via STDIO using JSON-RPC with `Content-Length` framing:

```bash
export GOOGLE_MAPS_API_KEY="your-api-key-here"
google-maps-mcp-server
```

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `GOOGLE_MAPS_API_KEY` | *required* | Google Maps Platform API key |
| `IP_OVERRIDE_ENABLED` | `false` | Allow IP override via headers (best effort) |
| `CACHE_ENABLED` | `true` | Enable response caching |
| `CACHE_TTL_MS` | `300000` | Cache TTL in milliseconds (5 minutes) |
| `RATE_LIMIT_CAPACITY` | `100` | Rate limit token bucket capacity |
| `RATE_LIMIT_REFILL_RATE` | `10` | Rate limit refill rate (tokens/second) |

### Example Configuration

```bash
export GOOGLE_MAPS_API_KEY="your-api-key"
export CACHE_ENABLED="true"
export CACHE_TTL_MS="600000"  # 10 minutes
export RATE_LIMIT_CAPACITY="200"
google-maps-mcp-server
```

## Available Tools

### Geocoding Tools
- **`geocode_search`** - Convert addresses to coordinates
- **`geocode_reverse`** - Convert coordinates to addresses

### Places Tools (New API)
- **`places_search_text`** - Text-based place search with filters
- **`places_nearby`** - Find places near a location
- **`places_autocomplete`** - Get place suggestions as you type
- **`places_details`** - Detailed place information
- **`places_photos`** - Get signed photo URLs

### Routes Tools (v2 API)
- **`routes_compute`** - Calculate routes with traffic and tolls
- **`routes_matrix`** - Distance matrix between multiple points

### Utility Tools
- **`elevation_get`** - Get elevation data for points or paths
- **`timezone_get`** - Get timezone information for coordinates
- **`geolocation_estimate`** - Estimate location from Wi-Fi/cell data

### Special Tools
- **`nearby_find`** - Find nearby cities, towns, or POIs
- **`ip_geolocate`** - IP-based geolocation with reverse geocoding
- **`health_check`** - Verify API key and check service status

## Usage Examples

### Basic Geocoding

```json
{
  "method": "call_tool",
  "params": {
    "name": "geocode_search",
    "arguments": {
      "query": "1600 Amphitheatre Parkway, Mountain View, CA",
      "language": "en"
    }
  }
}
```

### Find Nearby Cities

```json
{
  "method": "call_tool",
  "params": {
    "name": "nearby_find",
    "arguments": {
      "origin": { "lat": 50.087, "lng": 14.421 },
      "what": "cities",
      "radius_meters": 50000,
      "max_results": 10
    }
  }
}
```

### Route with Traffic

```json
{
  "method": "call_tool",
  "params": {
    "name": "routes_compute",
    "arguments": {
      "origin": { "address": "San Francisco, CA" },
      "destination": { "address": "Los Angeles, CA" },
      "travel_mode": "DRIVE",
      "routing_preference": "TRAFFIC_AWARE",
      "avoid": ["tolls"]
    }
  }
}
```

### Search for Restaurants

```json
{
  "method": "call_tool",
  "params": {
    "name": "places_search_text",
    "arguments": {
      "query": "pizza restaurants in New York",
      "max_results": 10,
      "open_now": true
    }
  }
}
```

### IP Geolocation

```json
{
  "method": "call_tool",
  "params": {
    "name": "ip_geolocate",
    "arguments": {
      "reverse_geocode": true,
      "language": "en"
    }
  }
}
```

### Get Elevation

```json
{
  "method": "call_tool",
  "params": {
    "name": "elevation_get",
    "arguments": {
      "locations": [
        { "lat": 39.7391536, "lng": -104.9847034 }
      ]
    }
  }
}
```

## Development

### Setup Development Environment

```bash
# Clone the repository
git clone https://github.com/david-pivonka/google-maps-mcp-server.git
cd google-maps-mcp-server

# Install dependencies
npm install

# Set up environment variables
export GOOGLE_MAPS_API_KEY="your-api-key"

# Build the project
npm run build

# Run in development mode
npm run dev

# Or run the built version
npm start
```

### Project Structure

```
google-maps-mcp-server/
├── src/
│   ├── index.ts              # Main entry point
│   ├── server.ts             # MCP server implementation
│   ├── types/                # TypeScript type definitions
│   │   ├── google-maps.ts    # Google Maps API types
│   │   └── mcp.ts            # MCP protocol types
│   ├── utils/                # Utility modules
│   │   ├── cache.ts          # LRU cache implementation
│   │   ├── errors.ts         # Error handling
│   │   ├── google-maps-client.ts  # Google Maps API client
│   │   ├── rate-limiter.ts   # Rate limiting
│   │   ├── retry.ts          # Retry logic
│   │   ├── stdio.ts          # STDIO handler
│   │   └── validation.ts     # Input validation schemas
│   └── tools/                # Tool implementations
│       ├── geocoding.ts      # Geocoding tools
│       ├── places.ts         # Places API tools
│       ├── routes.ts         # Routes API tools
│       ├── utilities.ts      # Utility tools
│       ├── nearby-find.ts    # Nearby search tool
│       ├── ip-geolocate.ts   # IP geolocation tool
│       └── health-check.ts   # Health check tool
├── dist/                     # Compiled JavaScript (generated)
├── examples/                 # Example requests
├── package.json
├── tsconfig.json
├── LICENSE
└── README.md
```

### Building

```bash
npm run build
```

### Testing

```bash
# Test with example requests
node test-server.js

# Or test manually
echo '{"method":"initialize","params":{}}' | node dist/index.js
```

### Scripts

- `npm run build` - Compile TypeScript to JavaScript
- `npm run dev` - Run in development mode with ts-node
- `npm start` - Run the compiled server
- `npm run prepublishOnly` - Runs automatically before publishing

## Contributing

We welcome contributions! Please follow these guidelines:

### How to Contribute

1. **Fork the repository**
   ```bash
   git clone https://github.com/david-pivonka/google-maps-mcp-server.git
   cd google-maps-mcp-server
   ```

2. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **Make your changes**
   - Write clean, documented code
   - Follow existing code style
   - Add TypeScript types for all new code
   - Include input validation for new tools

4. **Test your changes**
   ```bash
   npm run build
   npm start  # Test manually
   ```

5. **Commit your changes**
   ```bash
   git add .
   git commit -m "Add: description of your changes"
   ```

6. **Push to your fork**
   ```bash
   git push origin feature/your-feature-name
   ```

7. **Submit a Pull Request**
   - Go to the original repository
   - Click "New Pull Request"
   - Select your feature branch
   - Describe your changes

### Contribution Guidelines

- **Code Quality**: Follow TypeScript best practices
- **Documentation**: Update README if adding new features
- **Error Handling**: Include proper error handling and validation
- **Testing**: Test all changes before submitting
- **Commit Messages**: Use clear, descriptive commit messages
- **Dependencies**: Minimize new dependencies; justify if needed

### Adding New Tools

When adding a new tool:

1. Create tool definition in appropriate file under `src/tools/`
2. Add Zod validation schema in `src/utils/validation.ts`
3. Implement handler function
4. Register tool in `src/index.ts`
5. Add documentation to README
6. Include usage examples

Example:
```typescript
export const myNewTool: MCPTool = {
  name: 'my_new_tool',
  description: 'Description of what the tool does',
  inputSchema: { /* JSON schema */ }
};

export function createMyNewToolHandler(client: GoogleMapsClient) {
  return async (args: any) => {
    const input = validateInput(MyNewToolSchema, args);
    // Implementation
  };
}
```

### Code Style

- Use TypeScript strict mode
- Use async/await over callbacks
- Include JSDoc comments for public functions
- Use meaningful variable names
- Keep functions focused and small

## Security

### Security Best Practices

- **API Key Protection**: Never commit API keys to the repository
- **Environment Variables**: Always use environment variables for sensitive data
- **API Key Restrictions**: Restrict your Google Maps API key in Cloud Console
- **Input Validation**: All inputs are validated using Zod schemas
- **Rate Limiting**: Built-in rate limiting prevents abuse
- **Error Handling**: No sensitive data exposed in error messages

### Reporting Security Issues

If you discover a security vulnerability, please email the maintainer directly. Do not create a public GitHub issue.

Include:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

### Security Features

- ✅ No hardcoded secrets
- ✅ Input validation with Zod
- ✅ Rate limiting (token bucket)
- ✅ Request timeouts
- ✅ Retry logic with exponential backoff
- ✅ IP validation (rejects private/reserved IPs)
- ✅ Structured error handling
- ✅ Dependencies audited (0 vulnerabilities)

## Error Handling

The server provides structured error responses:

```json
{
  "error": {
    "code": -32000,
    "message": "Google Maps API error: 400 - Invalid request",
    "data": {
      "code": "GOOGLE_MAPS_API_ERROR",
      "context": {
        "endpoint": "places_search_text",
        "status": 400
      }
    }
  }
}
```

### Common Error Codes

- `VALIDATION_ERROR` - Invalid input parameters
- `GOOGLE_MAPS_API_ERROR` - Google Maps API errors
- `RATE_LIMIT_ERROR` - Rate limit exceeded
- `CONFIGURATION_ERROR` - Server configuration issues

## Limitations

- **IP Override**: The `ip_override` parameter is best-effort only
- **API Quotas**: Respect Google Maps Platform quotas and billing limits
- **Rate Limiting**: Default limits may need adjustment for your use case
- **Caching**: Autocomplete and geolocation are not cached due to their dynamic nature

## Troubleshooting

### Common Issues

**"GOOGLE_MAPS_API_KEY environment variable is required"**
- Set the environment variable: `export GOOGLE_MAPS_API_KEY="your-key"`

**"API key not valid" or "REQUEST_DENIED"**
- Enable required APIs in Google Cloud Console
- Check API key restrictions
- Verify billing is enabled

**Rate limit errors**
- Increase `RATE_LIMIT_CAPACITY` environment variable
- Check Google Maps API quotas in Cloud Console

**Connection timeouts**
- Check internet connectivity
- Verify Google Maps API status

## License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

## Support

### Documentation

- [Google Maps Platform Documentation](https://developers.google.com/maps)
- [Model Context Protocol Specification](https://modelcontextprotocol.io/)

### Getting Help

- **Issues**: [GitHub Issues](https://github.com/david-pivonka/google-maps-mcp-server/issues)
- **Discussions**: [GitHub Discussions](https://github.com/david-pivonka/google-maps-mcp-server/discussions)
- **Google Maps API**: [Google Maps Support](https://developers.google.com/maps/support)

### Related Projects

- [MCP Specification](https://github.com/modelcontextprotocol/specification)
- [Claude Desktop](https://claude.ai/download)
- [Google Maps Platform](https://developers.google.com/maps)

## Acknowledgments

- Built with [Google Maps Services JS](https://github.com/googlemaps/google-maps-services-js)
- Uses [Zod](https://github.com/colinhacks/zod) for validation
- Implements [Model Context Protocol](https://modelcontextprotocol.io/)

## Changelog

### Version 1.0.0 (Initial Release)
- Complete Google Maps Platform integration
- 13 tools covering geocoding, places, routes, and utilities
- Production-ready features (rate limiting, caching, validation)
- TypeScript support with full type definitions
- Comprehensive error handling
- STDIO-based MCP implementation

---

**Made with ❤️ by David Pivonka**

For the latest updates, visit the [GitHub repository](https://github.com/david-pivonka/google-maps-mcp-server).