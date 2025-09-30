import { Resource } from '@modelcontextprotocol/sdk/types.js';

/**
 * MCP Resources for Google Maps server
 * These provide static information about Google Maps APIs and usage patterns
 */

export const GOOGLE_MAPS_RESOURCES: Resource[] = [
  {
    uri: 'google-maps://docs/api-overview',
    name: 'Google Maps Platform API Overview',
    description: 'Comprehensive overview of available Google Maps Platform APIs and their capabilities',
    mimeType: 'text/markdown'
  },
  {
    uri: 'google-maps://docs/place-types',
    name: 'Google Places API Types Reference',
    description: 'Complete list of place types supported by the Google Places API',
    mimeType: 'application/json'
  },
  {
    uri: 'google-maps://docs/travel-modes',
    name: 'Routing Travel Modes',
    description: 'Available travel modes for routing and directions',
    mimeType: 'application/json'
  },
  {
    uri: 'google-maps://docs/field-masks',
    name: 'Places API Field Masks',
    description: 'Field mask reference for optimizing Places API requests',
    mimeType: 'application/json'
  },
  {
    uri: 'google-maps://examples/common-queries',
    name: 'Common Query Examples',
    description: 'Examples of common geocoding and places search queries',
    mimeType: 'application/json'
  }
];

export const RESOURCE_CONTENT: Record<string, any> = {
  'google-maps://docs/api-overview': `# Google Maps Platform APIs

This MCP server provides access to the following Google Maps Platform APIs:

## Places API (New)
- **Text Search**: Find places using natural language queries
- **Nearby Search**: Discover places within a specified area
- **Place Details**: Get comprehensive information about specific places
- **Autocomplete**: Provide search suggestions as users type
- **Photos**: Access place photos with signed URLs

## Routes API v2
- **Compute Routes**: Calculate optimal routes between locations
- **Distance Matrix**: Get travel times and distances for multiple origin-destination pairs
- **Traffic-aware routing**: Real-time traffic consideration
- **Alternative routes**: Multiple route options

## Geocoding API v1
- **Forward Geocoding**: Convert addresses to coordinates
- **Reverse Geocoding**: Convert coordinates to addresses
- **Component filtering**: Filter results by address components

## Utility APIs
- **Elevation API**: Get elevation data for locations or paths
- **Time Zone API**: Determine time zone information for coordinates
- **Geolocation API**: Estimate location from WiFi/cell tower data
- **Roads API**: Snap coordinates to road networks

## Key Features
- Real-time traffic data
- Comprehensive place information
- Multiple travel modes (driving, walking, cycling, transit)
- International coverage
- High accuracy and reliability`,

  'google-maps://docs/place-types': {
    "accounting": "Accounting services",
    "airport": "Airports",
    "amusement_park": "Amusement parks",
    "aquarium": "Aquariums",
    "art_gallery": "Art galleries",
    "atm": "ATMs",
    "bakery": "Bakeries",
    "bank": "Banks",
    "bar": "Bars and pubs",
    "beauty_salon": "Beauty salons",
    "bicycle_store": "Bicycle stores",
    "book_store": "Book stores",
    "bowling_alley": "Bowling alleys",
    "bus_station": "Bus stations",
    "cafe": "Cafes and coffee shops",
    "campground": "Campgrounds",
    "car_dealer": "Car dealerships",
    "car_rental": "Car rental agencies",
    "car_repair": "Car repair shops",
    "car_wash": "Car washes",
    "casino": "Casinos",
    "cemetery": "Cemeteries",
    "church": "Churches",
    "city_hall": "City halls",
    "clothing_store": "Clothing stores",
    "convenience_store": "Convenience stores",
    "courthouse": "Courthouses",
    "dentist": "Dentists",
    "department_store": "Department stores",
    "doctor": "Doctors and medical practices",
    "drugstore": "Drugstores and pharmacies",
    "electrician": "Electricians",
    "electronics_store": "Electronics stores",
    "embassy": "Embassies",
    "fire_station": "Fire stations",
    "florist": "Florists",
    "funeral_home": "Funeral homes",
    "furniture_store": "Furniture stores",
    "gas_station": "Gas stations",
    "gym": "Gyms and fitness centers",
    "hair_care": "Hair care services",
    "hardware_store": "Hardware stores",
    "hindu_temple": "Hindu temples",
    "home_goods_store": "Home goods stores",
    "hospital": "Hospitals",
    "insurance_agency": "Insurance agencies",
    "jewelry_store": "Jewelry stores",
    "laundry": "Laundromats",
    "lawyer": "Lawyers and law firms",
    "library": "Libraries",
    "light_rail_station": "Light rail stations",
    "liquor_store": "Liquor stores",
    "local_government_office": "Local government offices",
    "locksmith": "Locksmiths",
    "lodging": "Hotels and lodging",
    "meal_delivery": "Meal delivery services",
    "meal_takeaway": "Takeaway restaurants",
    "mosque": "Mosques",
    "movie_rental": "Movie rental stores",
    "movie_theater": "Movie theaters",
    "moving_company": "Moving companies",
    "museum": "Museums",
    "night_club": "Night clubs",
    "painter": "Painters",
    "park": "Parks",
    "parking": "Parking facilities",
    "pet_store": "Pet stores",
    "pharmacy": "Pharmacies",
    "physiotherapist": "Physiotherapists",
    "plumber": "Plumbers",
    "police": "Police stations",
    "post_office": "Post offices",
    "primary_school": "Primary schools",
    "real_estate_agency": "Real estate agencies",
    "restaurant": "Restaurants",
    "roofing_contractor": "Roofing contractors",
    "rv_park": "RV parks",
    "school": "Schools",
    "secondary_school": "Secondary schools",
    "shoe_store": "Shoe stores",
    "shopping_mall": "Shopping malls",
    "spa": "Spas",
    "stadium": "Stadiums",
    "storage": "Storage facilities",
    "store": "General stores",
    "subway_station": "Subway stations",
    "supermarket": "Supermarkets",
    "synagogue": "Synagogues",
    "taxi_stand": "Taxi stands",
    "tourist_attraction": "Tourist attractions",
    "train_station": "Train stations",
    "transit_station": "Transit stations",
    "travel_agency": "Travel agencies",
    "university": "Universities",
    "veterinary_care": "Veterinary care",
    "zoo": "Zoos"
  },

  'google-maps://docs/travel-modes': {
    "DRIVE": {
      "description": "Driving directions via roads",
      "supports_traffic": true,
      "supports_tolls": true,
      "supports_alternatives": true
    },
    "WALK": {
      "description": "Walking directions via pedestrian paths",
      "supports_traffic": false,
      "supports_tolls": false,
      "supports_alternatives": true
    },
    "BICYCLE": {
      "description": "Bicycling directions via bike paths and roads",
      "supports_traffic": false,
      "supports_tolls": false,
      "supports_alternatives": true
    },
    "TRANSIT": {
      "description": "Public transportation directions",
      "supports_traffic": true,
      "supports_tolls": false,
      "supports_alternatives": true,
      "note": "Requires transit data availability in the region"
    }
  },

  'google-maps://docs/field-masks': {
    "basic_fields": [
      "place_id",
      "name",
      "types",
      "formatted_address"
    ],
    "contact_fields": [
      "formatted_phone_number",
      "international_phone_number",
      "website"
    ],
    "atmosphere_fields": [
      "price_level",
      "rating",
      "user_ratings_total"
    ],
    "geometry_fields": [
      "geometry",
      "geometry/location",
      "geometry/viewport"
    ],
    "photo_fields": [
      "photos"
    ],
    "plus_code_fields": [
      "plus_code"
    ],
    "operational_fields": [
      "opening_hours",
      "current_opening_hours"
    ],
    "review_fields": [
      "reviews"
    ],
    "note": "Use field masks to optimize API costs by requesting only needed data"
  },

  'google-maps://examples/common-queries': {
    "geocoding": [
      {
        "description": "Geocode a full address",
        "query": "1600 Amphitheatre Parkway, Mountain View, CA"
      },
      {
        "description": "Geocode a landmark",
        "query": "Golden Gate Bridge, San Francisco"
      },
      {
        "description": "Geocode with region bias",
        "query": "Paris",
        "region": "FR"
      }
    ],
    "places_search": [
      {
        "description": "Find restaurants nearby",
        "query": "restaurants near Times Square",
        "types": ["restaurant"]
      },
      {
        "description": "Find coffee shops with high rating",
        "query": "coffee shops",
        "min_rating": 4.0,
        "types": ["cafe"]
      },
      {
        "description": "Find open gas stations",
        "query": "gas stations",
        "open_now": true,
        "types": ["gas_station"]
      }
    ],
    "routing": [
      {
        "description": "Driving route with traffic",
        "origin": "San Francisco, CA",
        "destination": "Los Angeles, CA",
        "travel_mode": "DRIVE",
        "routing_preference": "TRAFFIC_AWARE"
      },
      {
        "description": "Walking route",
        "origin": {"lat": 37.7749, "lng": -122.4194},
        "destination": {"lat": 37.7849, "lng": -122.4094},
        "travel_mode": "WALK"
      }
    ]
  }
};

export function getResourceContent(uri: string): string {
  const content = RESOURCE_CONTENT[uri];
  if (!content) {
    throw new Error(`Resource not found: ${uri}`);
  }
  
  if (typeof content === 'string') {
    return content;
  }
  
  return JSON.stringify(content, null, 2);
}
