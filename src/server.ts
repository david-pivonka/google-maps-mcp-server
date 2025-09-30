import { STDIOHandler } from './utils/stdio.js';
import { MCPTool, InitializeRequest, InitializeResponse } from './types/mcp.js';
import { RateLimiter } from './utils/rate-limiter.js';
import { Cache } from './utils/cache.js';
import { ConfigurationError } from './utils/errors.js';

export interface ServerConfig {
  googleMapsApiKey: string;
  ipOverrideEnabled?: boolean;
  cacheEnabled?: boolean;
  cacheTtlMs?: number;
  rateLimitCapacity?: number;
  rateLimitRefillRate?: number;
}

export class MCPServer {
  private stdio: STDIOHandler;
  private rateLimiter: RateLimiter;
  private cache: Cache;
  private tools: Map<string, MCPTool> = new Map();
  private toolHandlers: Map<string, (args: any) => Promise<any>> = new Map();

  constructor(private config: ServerConfig) {
    this.validateConfig();
    
    this.stdio = new STDIOHandler();
    this.rateLimiter = new RateLimiter(
      config.rateLimitCapacity || 100,
      config.rateLimitRefillRate || 10
    );
    this.cache = new Cache({
      enabled: config.cacheEnabled !== false,
      ttlMs: config.cacheTtlMs || 5 * 60 * 1000
    });

    this.setupHandlers();
  }

  private validateConfig(): void {
    if (!this.config.googleMapsApiKey) {
      throw new ConfigurationError('GOOGLE_MAPS_API_KEY is required');
    }
  }

  private setupHandlers(): void {
    this.stdio.onRequest('initialize', this.handleInitialize.bind(this));
    this.stdio.onRequest('list_tools', this.handleListTools.bind(this));
    this.stdio.onRequest('call_tool', this.handleCallTool.bind(this));
    
    // Optional: Handle notifications for logging
    this.stdio.onNotification('notifications/initialized', () => {
      // Server is ready
    });
  }

  private async handleInitialize(params: InitializeRequest): Promise<InitializeResponse> {
    return {
      protocolVersion: '2024-11-05',
      capabilities: {
        tools: {
          listChanged: false
        }
      },
      serverInfo: {
        name: 'google-maps-mcp-server',
        version: '1.0.0'
      }
    };
  }

  private async handleListTools(): Promise<{ tools: MCPTool[] }> {
    return {
      tools: Array.from(this.tools.values())
    };
  }

  private async handleCallTool(params: { name: string; arguments: any }): Promise<any> {
    const { name, arguments: args } = params;
    
    const handler = this.toolHandlers.get(name);
    if (!handler) {
      throw new Error(`Unknown tool: ${name}`);
    }

    // Apply rate limiting
    await this.rateLimiter.checkLimit(`tool:${name}`);

    // Call the tool handler
    const result = await handler(args);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2)
        }
      ]
    };
  }

  public registerTool(tool: MCPTool, handler: (args: any) => Promise<any>): void {
    this.tools.set(tool.name, tool);
    this.toolHandlers.set(tool.name, handler);
  }

  public getCache(): Cache {
    return this.cache;
  }

  public getConfig(): ServerConfig {
    return this.config;
  }

  public start(): void {
    this.stdio.start();
  }

  public sendNotification(method: string, params?: any): void {
    this.stdio.sendNotification(method, params);
  }
}
