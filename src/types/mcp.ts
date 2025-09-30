// MCP Protocol Types
export interface MCPRequest {
  jsonrpc: '2.0';
  id: string | number;
  method: string;
  params?: any;
}

export interface MCPResponse {
  jsonrpc: '2.0';
  id: string | number;
  result?: any;
  error?: MCPError;
}

export interface MCPError {
  code: number;
  message: string;
  data?: any;
}

export interface MCPNotification {
  jsonrpc: '2.0';
  method: string;
  params?: any;
}

// MCP Tool Types
export interface MCPTool {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
}

export interface MCPToolCall {
  name: string;
  arguments: Record<string, any>;
}

export interface MCPToolResult {
  content: Array<{
    type: 'text';
    text: string;
  }>;
  isError?: boolean;
}

// Initialize Request/Response
export interface InitializeRequest {
  protocolVersion: string;
  capabilities: {
    tools?: {};
  };
  clientInfo: {
    name: string;
    version: string;
  };
}

export interface InitializeResponse {
  protocolVersion: string;
  capabilities: {
    tools?: {
      listChanged?: boolean;
    };
  };
  serverInfo: {
    name: string;
    version: string;
  };
}
