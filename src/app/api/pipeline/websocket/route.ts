/**
 * WebSocket API for Real-time Pipeline Events
 * Handles WebSocket connections for real-time event streaming
 */

import { NextRequest } from 'next/server'
import { realtimeEventStream } from '@/lib/pipeline/realtime-stream'

// Note: Next.js doesn't have built-in WebSocket support in App Router
// This is a placeholder showing how the WebSocket integration would work
// In production, you'd typically use a separate WebSocket server or a service like Pusher

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const protocol = searchParams.get('protocol')

  // For development, we'll return Server-Sent Events instead of WebSocket
  if (protocol === 'sse') {
    return handleServerSentEvents(request)
  }

  // Return WebSocket connection instructions
  return Response.json({
    message: 'WebSocket endpoint for real-time pipeline events',
    instructions: {
      development: 'Use Server-Sent Events with ?protocol=sse',
      production: 'Implement with WebSocket server or service like Pusher',
      endpoints: {
        '/api/pipeline/websocket?protocol=sse': 'Server-Sent Events stream',
        '/api/pipeline/websocket?protocol=ws': 'WebSocket connection (requires WebSocket server)'
      }
    },
    example: {
      javascript: `
const eventSource = new EventSource('/api/pipeline/websocket?protocol=sse');
eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Pipeline event:', data);
};
      `,
      websocket: `
const ws = new WebSocket('ws://localhost:3001/pipeline');
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Pipeline event:', data);
};
      `
    }
  })
}

/**
 * Handle Server-Sent Events stream (development fallback)
 */
function handleServerSentEvents(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const filters = {
    type: searchParams.get('type'),
    categories: searchParams.get('categories')?.split(','),
    cities: searchParams.get('cities')?.split(',')
  }

  // Create readable stream for Server-Sent Events
  const stream = new ReadableStream({
    start(controller) {
      // Subscribe to real-time events
      const subscriptionId = realtimeEventStream.subscribe(
        filters.type || '*',
        (message) => {
          // Send Server-Sent Event
          const sseData = `data: ${JSON.stringify({
            id: message.id,
            type: message.type,
            action: message.action,
            timestamp: message.timestamp,
            data: message.data,
            metadata: message.metadata
          })}\n\n`
          
          controller.enqueue(new TextEncoder().encode(sseData))
        },
        filters
      )

      // Send initial connection message
      const welcomeMessage = `data: ${JSON.stringify({
        type: 'connection',
        message: 'Connected to SceneScout pipeline stream',
        subscriptionId,
        timestamp: new Date().toISOString()
      })}\n\n`
      
      controller.enqueue(new TextEncoder().encode(welcomeMessage))

      // Send heartbeat every 30 seconds
      const heartbeatInterval = setInterval(() => {
        const heartbeat = `data: ${JSON.stringify({
          type: 'heartbeat',
          timestamp: new Date().toISOString(),
          metrics: realtimeEventStream.getMetrics()
        })}\n\n`
        
        controller.enqueue(new TextEncoder().encode(heartbeat))
      }, 30000)

      // Cleanup on close
      request.signal.addEventListener('abort', () => {
        clearInterval(heartbeatInterval)
        realtimeEventStream.unsubscribe(subscriptionId)
        controller.close()
      })
    }
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control'
    }
  })
}

// WebSocket Server Implementation Example (for separate WebSocket server)
const WebSocketServerExample = `
// websocket-server.js - Separate WebSocket server for production
import { WebSocketServer } from 'ws';
import { realtimeEventStream } from './lib/pipeline/realtime-stream.js';

const wss = new WebSocketServer({ port: 3001 });

wss.on('connection', (ws, request) => {
  console.log('New WebSocket connection');
  
  const url = new URL(request.url, 'ws://localhost:3001');
  const filters = {
    type: url.searchParams.get('type'),
    categories: url.searchParams.get('categories')?.split(','),
    cities: url.searchParams.get('cities')?.split(',')
  };

  // Subscribe to real-time events
  const subscriptionId = realtimeEventStream.subscribe(
    filters.type || '*',
    (message) => {
      if (ws.readyState === ws.OPEN) {
        ws.send(JSON.stringify(message));
      }
    },
    filters
  );

  // Send welcome message
  ws.send(JSON.stringify({
    type: 'connection',
    message: 'Connected to SceneScout pipeline',
    subscriptionId,
    timestamp: new Date().toISOString()
  }));

  // Handle client messages
  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data.toString());
      
      switch (message.type) {
        case 'ping':
          ws.send(JSON.stringify({ type: 'pong', timestamp: new Date().toISOString() }));
          break;
        case 'subscribe':
          // Handle additional subscriptions
          break;
        case 'unsubscribe':
          // Handle unsubscriptions
          break;
      }
    } catch (error) {
      console.error('Invalid message:', error);
    }
  });

  // Cleanup on disconnect
  ws.on('close', () => {
    realtimeEventStream.unsubscribe(subscriptionId);
    console.log('WebSocket connection closed');
  });

  // Handle errors
  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
    realtimeEventStream.unsubscribe(subscriptionId);
  });
});

console.log('WebSocket server running on ws://localhost:3001');
`

// Pusher Integration Example
const PusherIntegrationExample = `
// pusher-integration.js - Using Pusher for real-time events
import Pusher from 'pusher';
import { realtimeEventStream } from './lib/pipeline/realtime-stream.js';

const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID,
  key: process.env.PUSHER_KEY,
  secret: process.env.PUSHER_SECRET,
  cluster: process.env.PUSHER_CLUSTER,
  useTLS: true
});

// Subscribe to pipeline events and forward to Pusher
realtimeEventStream.on('message', (message) => {
  // Send to appropriate Pusher channel based on message type
  const channel = \`pipeline-\${message.type}\`;
  
  pusher.trigger(channel, 'event', {
    id: message.id,
    type: message.type,
    action: message.action,
    data: message.data,
    timestamp: message.timestamp
  });
});

// Client-side usage:
// const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY, {
//   cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER
// });
// 
// const channel = pusher.subscribe('pipeline-event_update');
// channel.bind('event', (data) => {
//   console.log('Pipeline event:', data);
// });
`