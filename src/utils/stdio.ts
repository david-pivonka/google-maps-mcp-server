import { MCPRequest, MCPResponse, MCPError, MCPNotification } from '../types/mcp.js';

export class STDIOHandler {
  private buffer = '';
  private messageHandlers: Map<string, (params: any) => Promise<any>> = new Map();
  private notificationHandlers: Map<string, (params: any) => void> = new Map();

  constructor() {
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => {
      this.buffer += chunk;
      this.processBuffer();
    });

    process.stdin.on('end', () => {
      process.exit(0);
    });

    // Handle process termination gracefully
    process.on('SIGINT', () => process.exit(0));
    process.on('SIGTERM', () => process.exit(0));
  }

  private processBuffer(): void {
    while (true) {
      const contentLengthMatch = this.buffer.match(/^Content-Length: (\d+)\r?\n\r?\n/);
      if (!contentLengthMatch) {
        break;
      }

      const contentLength = parseInt(contentLengthMatch[1]);
      const headerLength = contentLengthMatch[0].length;
      
      if (this.buffer.length < headerLength + contentLength) {
        break; // Wait for more data
      }

      const messageJson = this.buffer.slice(headerLength, headerLength + contentLength);
      this.buffer = this.buffer.slice(headerLength + contentLength);

      try {
        const message = JSON.parse(messageJson);
        this.handleMessage(message);
      } catch (error) {
        this.sendError(null, -32700, 'Parse error', { originalMessage: messageJson });
      }
    }
  }

  private async handleMessage(message: any): Promise<void> {
    try {
      // Handle notifications (no id field)
      if (!('id' in message)) {
        const handler = this.notificationHandlers.get(message.method);
        if (handler) {
          handler(message.params);
        }
        return;
      }

      // Handle requests
      const handler = this.messageHandlers.get(message.method);
      if (!handler) {
        this.sendError(message.id, -32601, 'Method not found', { method: message.method });
        return;
      }

      try {
        const result = await handler(message.params);
        this.sendResponse(message.id, result);
      } catch (error) {
        let code = -32603; // Internal error
        let errorMessage = 'Internal error';
        let data: any = undefined;

        if (error instanceof Error) {
          errorMessage = error.message;
          
          // Check if it's a structured error
          if ('code' in error && typeof error.code === 'string') {
            code = -32000; // Server error
            data = {
              code: error.code,
              context: 'context' in error ? error.context : undefined
            };
          }
        }

        this.sendError(message.id, code, errorMessage, data);
      }
    } catch (error) {
      this.sendError('id' in message ? message.id : null, -32603, 'Internal error');
    }
  }

  private sendMessage(message: MCPResponse | MCPNotification): void {
    const messageJson = JSON.stringify(message);
    const contentLength = Buffer.byteLength(messageJson, 'utf8');
    const output = `Content-Length: ${contentLength}\r\n\r\n${messageJson}`;
    
    process.stdout.write(output);
  }

  private sendResponse(id: string | number, result: any): void {
    this.sendMessage({
      jsonrpc: '2.0',
      id,
      result
    });
  }

  private sendError(id: string | number | null, code: number, message: string, data?: any): void {
    this.sendMessage({
      jsonrpc: '2.0',
      id: id || 0,
      error: {
        code,
        message,
        data
      }
    });
  }

  public sendNotification(method: string, params?: any): void {
    this.sendMessage({
      jsonrpc: '2.0',
      method,
      params
    });
  }

  public onRequest(method: string, handler: (params: any) => Promise<any>): void {
    this.messageHandlers.set(method, handler);
  }

  public onNotification(method: string, handler: (params: any) => void): void {
    this.notificationHandlers.set(method, handler);
  }

  public start(): void {
    // STDIO is already listening, just need to resume stdin
    process.stdin.resume();
  }
}
