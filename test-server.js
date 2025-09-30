#!/usr/bin/env node

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Test configuration
const TEST_API_KEY = process.env.GOOGLE_MAPS_API_KEY || 'test-key';

// Test messages
const testMessages = [
  {
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: {
      protocolVersion: '2024-11-05',
      capabilities: { tools: {} },
      clientInfo: { name: 'test-client', version: '1.0.0' }
    }
  },
  {
    jsonrpc: '2.0',
    id: 2,
    method: 'list_tools',
    params: {}
  }
];

function sendMessage(child, message) {
  const messageJson = JSON.stringify(message);
  const contentLength = Buffer.byteLength(messageJson, 'utf8');
  const output = `Content-Length: ${contentLength}\r\n\r\n${messageJson}`;
  
  console.log('Sending:', message.method);
  child.stdin.write(output);
}

function testServer() {
  console.log('Testing Google Maps MCP Server...\n');

  // Check if built files exist
  const indexPath = path.join(__dirname, 'dist', 'index.js');
  if (!fs.existsSync(indexPath)) {
    console.error('Error: dist/index.js not found. Please run "npm run build" first.');
    process.exit(1);
  }

  // Spawn the server process
  const child = spawn('node', [indexPath], {
    env: {
      ...process.env,
      GOOGLE_MAPS_API_KEY: TEST_API_KEY
    },
    stdio: ['pipe', 'pipe', 'pipe']
  });

  let buffer = '';
  let messageCount = 0;

  child.stdout.on('data', (chunk) => {
    buffer += chunk.toString();
    
    // Process complete messages
    while (true) {
      const contentLengthMatch = buffer.match(/^Content-Length: (\d+)\r?\n\r?\n/);
      if (!contentLengthMatch) break;

      const contentLength = parseInt(contentLengthMatch[1]);
      const headerLength = contentLengthMatch[0].length;
      
      if (buffer.length < headerLength + contentLength) break;

      const messageJson = buffer.slice(headerLength, headerLength + contentLength);
      buffer = buffer.slice(headerLength + contentLength);

      try {
        const message = JSON.parse(messageJson);
        console.log('Received response:', JSON.stringify(message, null, 2));
        messageCount++;

        // Send next test message
        if (messageCount < testMessages.length) {
          setTimeout(() => {
            sendMessage(child, testMessages[messageCount]);
          }, 100);
        } else {
          console.log('\n✅ Server test completed successfully!');
          child.kill();
          process.exit(0);
        }
      } catch (error) {
        console.error('Failed to parse message:', messageJson);
      }
    }
  });

  child.stderr.on('data', (chunk) => {
    console.error('Server error:', chunk.toString());
  });

  child.on('error', (error) => {
    console.error('Failed to start server:', error);
    process.exit(1);
  });

  child.on('exit', (code) => {
    if (code !== 0) {
      console.error(`Server exited with code ${code}`);
      process.exit(1);
    }
  });

  // Start the test
  setTimeout(() => {
    sendMessage(child, testMessages[0]);
  }, 1000);

  // Timeout after 10 seconds
  setTimeout(() => {
    console.error('Test timeout - server may not be responding');
    child.kill();
    process.exit(1);
  }, 10000);
}

if (require.main === module) {
  testServer();
}
