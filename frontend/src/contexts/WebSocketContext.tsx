import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { websocketService } from '../services/websocket';
import { authService } from '../services/api';

interface WebSocketContextType {
  connected: boolean;
  subscribe: (type: string, handler: (data: any) => void) => () => void;
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

export function WebSocketProvider({ children }: { children: ReactNode }) {
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    // Connect to WebSocket when component mounts
    const token = authService.getToken();
    
    if (token) {
      websocketService.connect(token);

      // Listen for connection status
      const unsubscribe = websocketService.on('connection', (data) => {
        if (data.status === 'connected') {
          setConnected(true);
          console.log('✅ WebSocket connected, ready for real-time updates');
        }
      });

      return () => {
        unsubscribe();
        websocketService.disconnect();
        setConnected(false);
      };
    }
  }, []);

  const subscribe = (type: string, handler: (data: any) => void) => {
    return websocketService.on(type, handler);
  };

  return (
    <WebSocketContext.Provider value={{ connected, subscribe }}>
      {children}
    </WebSocketContext.Provider>
  );
}

export function useWebSocketContext() {
  const context = useContext(WebSocketContext);
  if (context === undefined) {
    throw new Error('useWebSocketContext must be used within a WebSocketProvider');
  }
  return context;
}

/**
 * Hook to subscribe to real-time updates for a specific entity type
 * @param type - Update type (quotation_update, approval_update, etc.)
 * @param callback - Function to call when update is received
 */
export function useRealtimeUpdates(
  type: string,
  callback: (data: any) => void
) {
  const { connected, subscribe } = useWebSocketContext();

  useEffect(() => {
    if (!connected) return;

    const unsubscribe = subscribe(type, callback);
    return unsubscribe;
  }, [connected, type, callback, subscribe]);
}

/**
 * Hook to display toast notifications from WebSocket
 */
export function useRealtimeNotifications(
  showNotification: (type: string, title: string, message: string) => void
) {
  const { connected, subscribe } = useWebSocketContext();

  useEffect(() => {
    if (!connected) return;

    const unsubscribe = subscribe('notification', (data) => {
      showNotification(data.notification_type, data.title, data.message);
    });

    return unsubscribe;
  }, [connected, showNotification, subscribe]);
}
