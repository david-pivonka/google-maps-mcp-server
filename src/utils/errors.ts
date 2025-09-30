export class MCPServerError extends Error {
  constructor(
    public code: string,
    message: string,
    public context?: Record<string, any>
  ) {
    super(message);
    this.name = 'MCPServerError';
  }

  toJSON() {
    return {
      code: this.code,
      message: this.message,
      context: this.context
    };
  }
}

export class GoogleMapsAPIError extends MCPServerError {
  constructor(
    message: string,
    public status?: number,
    public endpoint?: string,
    context?: Record<string, any>
  ) {
    super('GOOGLE_MAPS_API_ERROR', message, {
      ...context,
      endpoint,
      status
    });
  }
}

export class ValidationError extends MCPServerError {
  constructor(message: string, public field?: string) {
    super('VALIDATION_ERROR', message, { field });
  }
}

export class RateLimitError extends MCPServerError {
  constructor(message: string, public retryAfter?: number) {
    super('RATE_LIMIT_ERROR', message, { retryAfter });
  }
}

export class ConfigurationError extends MCPServerError {
  constructor(message: string) {
    super('CONFIGURATION_ERROR', message);
  }
}

export function handleGoogleMapsError(error: any, endpoint: string): never {
  if (error.response) {
    const status = error.response.status;
    const data = error.response.data;
    
    let message = `Google Maps API error: ${status}`;
    if (data?.error_message) {
      message += ` - ${data.error_message}`;
    } else if (data?.message) {
      message += ` - ${data.message}`;
    }

    if (status === 429) {
      const retryAfter = error.response.headers['retry-after'];
      throw new RateLimitError(message, retryAfter ? parseInt(retryAfter) : undefined);
    }

    throw new GoogleMapsAPIError(message, status, endpoint, {
      response_data: data
    });
  }

  if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
    throw new GoogleMapsAPIError(
      `Network error connecting to Google Maps API: ${error.message}`,
      undefined,
      endpoint
    );
  }

  throw new GoogleMapsAPIError(
    `Unexpected error: ${error.message}`,
    undefined,
    endpoint
  );
}
