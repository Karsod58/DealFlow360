/**
 * WebSocket Service for Real-Time Updates
 * Connects to backend WebSocket endpoint and handles real-time notifications
 */

type MessageHandler = (data: any) => void;

interface WebSocketMessage {
  type: string;
  action?: string;
  timestamp: string;
  data?: any;
  [key: string]: any;
}

class WebSocketService {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 3000; // 3 seconds
  private reconnectTimer: number | null = null;
  private messageHandlers: Map<string, MessageHandler[]> = new Map();
  private pingInterval: number | null = null;
  private isConnecting = false;

  /**
   * Connect to WebSocket server
   */
  connect(token: string) {
    if (this.ws?.readyState === WebSocket.OPEN || this.isConnecting) {
      console.log('WebSocket already connected or connecting');
      return;
    }

    this.isConnecting = true;
    const wsUrl = `ws://localhost:8000/api/ws?token=${token}`;
    
    try {
      console.log('Connecting to WebSocket...');
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('✅ WebSocket connected');
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        this.startPingInterval();
      };

      this.ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          this.handleMessage(message);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.isConnecting = false;
      };

      this.ws.onclose = () => {
        console.log('WebSocket disconnected');
        this.isConnecting = false;
        this.stopPingInterval();
        this.attemptReconnect(token);
      };

    } catch (error) {
      console.error('Failed to connect to WebSocket:', error);
      this.isConnecting = false;
      this.attemptReconnect(token);
    }
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect() {
    this.reconnectAttempts = this.maxReconnectAttempts; // Prevent reconnection
    this.stopPingInterval();
    
    if (this.reconnectTimer !== null) {
      window.clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  /**
   * Attempt to reconnect with exponential backoff
   */
  private attemptReconnect(token: string) {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      return;
    }

    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts);
    console.log(`Attempting to reconnect in ${delay / 1000}s... (attempt ${this.reconnectAttempts + 1}/${this.maxReconnectAttempts})`);
    
    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectAttempts++;
      this.connect(token);
    }, delay);
  }

  /**
   * Start sending periodic ping messages to keep connection alive
   */
  private startPingInterval() {
    this.pingInterval = window.setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send('ping');
      }
    }, 30000); // Ping every 30 seconds
  }

  /**
   * Stop ping interval
   */
  private stopPingInterval() {
    if (this.pingInterval !== null) {
      window.clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  /**
   * Handle incoming WebSocket message
   */
  private handleMessage(message: WebSocketMessage) {
    const { type } = message;

    // Log all messages for debugging
    console.log('📩 WebSocket message:', message);

    // Call registered handlers for this message type
    const handlers = this.messageHandlers.get(type);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(message);
        } catch (error) {
          console.error(`Error in ${type} handler:`, error);
        }
      });
    }

    // Also call wildcard handlers
    const wildcardHandlers = this.messageHandlers.get('*');
    if (wildcardHandlers) {
      wildcardHandlers.forEach(handler => {
        try {
          handler(message);
        } catch (error) {
          console.error('Error in wildcard handler:', error);
        }
      });
    }
  }

  /**
   * Subscribe to specific message types
   * @param type - Message type to listen for (e.g., 'quotation_update', 'approval_update')
   * @param handler - Callback function to handle the message
   * @returns Unsubscribe function
   */
  on(type: string, handler: MessageHandler): () => void {
    if (!this.messageHandlers.has(type)) {
      this.messageHandlers.set(type, []);
    }
    
    this.messageHandlers.get(type)!.push(handler);

    // Return unsubscribe function
    return () => {
      const handlers = this.messageHandlers.get(type);
      if (handlers) {
        const index = handlers.indexOf(handler);
        if (index > -1) {
          handlers.splice(index, 1);
        }
      }
    };
  }

  /**
   * Remove all handlers for a specific message type
   */
  off(type: string) {
    this.messageHandlers.delete(type);
  }

  /**
   * Check if WebSocket is connected
   */
  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}

// Export singleton instance
export const websocketService = new WebSocketService();

// Export hook for easy use in React components
export function useWebSocket() {
  return websocketService;
}
