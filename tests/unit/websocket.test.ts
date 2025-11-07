import { WebSocketManager } from '../../src/websocket/WebSocketManager';
import { OrderStatus } from '../../src/models/enums';
import { WebSocket } from '@fastify/websocket';
import { EventEmitter } from 'events';

// Mock WebSocket class
class MockWebSocket extends EventEmitter {
  public readyState = 1; // OPEN
  public static OPEN = 1;
  public static CLOSED = 3;

  public send = jest.fn();
  public close = jest.fn(() => {
    this.readyState = MockWebSocket.CLOSED;
    this.emit('close');
  });
}

// Set static OPEN property on mock
(MockWebSocket as any).OPEN = 1;

describe('WebSocketManager', () => {
  let wsManager: WebSocketManager;
  let mockWs1: MockWebSocket;
  let mockWs2: MockWebSocket;

  beforeEach(() => {
    wsManager = new WebSocketManager();
    mockWs1 = new MockWebSocket();
    mockWs2 = new MockWebSocket();
  });

  afterEach(() => {
    wsManager.closeAll();
    jest.clearAllMocks();
  });

  describe('Connection Management', () => {
    it('should register a WebSocket connection', () => {
      const orderId = 'test-order-1';
      
      wsManager.registerConnection(orderId, mockWs1 as unknown as WebSocket);
      
      expect(wsManager.getConnectionCount(orderId)).toBe(1);
      expect(wsManager.getConnectionCount()).toBe(1);
      expect(mockWs1.send).toHaveBeenCalledWith(
        expect.stringContaining('"type":"connected"')
      );
    });

    it('should support multiple connections for same order', () => {
      const orderId = 'test-order-1';
      
      wsManager.registerConnection(orderId, mockWs1 as unknown as WebSocket);
      wsManager.registerConnection(orderId, mockWs2 as unknown as WebSocket);
      
      expect(wsManager.getConnectionCount(orderId)).toBe(2);
      expect(wsManager.getConnectionCount()).toBe(2);
    });

    it('should remove connection on close event', () => {
      const orderId = 'test-order-1';
      
      wsManager.registerConnection(orderId, mockWs1 as unknown as WebSocket);
      expect(wsManager.getConnectionCount(orderId)).toBe(1);
      
      // Simulate close event
      mockWs1.emit('close');
      
      expect(wsManager.getConnectionCount(orderId)).toBe(0);
    });

    it('should handle connection errors', () => {
      const orderId = 'test-order-1';
      
      wsManager.registerConnection(orderId, mockWs1 as unknown as WebSocket);
      
      // Simulate error event
      mockWs1.emit('error', new Error('Connection error'));
      
      expect(wsManager.getConnectionCount(orderId)).toBe(0);
    });
  });

  describe('Status Broadcasting', () => {
    it('should broadcast status updates to connected clients', () => {
      const orderId = 'test-order-1';
      
      wsManager.registerConnection(orderId, mockWs1 as unknown as WebSocket);
      wsManager.registerConnection(orderId, mockWs2 as unknown as WebSocket);
      
      wsManager.broadcastStatusUpdate({
        orderId,
        status: OrderStatus.ROUTING,
        timestamp: new Date(),
        data: { message: 'Routing order' },
      });
      
      // Both connections should receive the update
      expect(mockWs1.send).toHaveBeenCalledWith(
        expect.stringContaining('"type":"status_update"')
      );
      expect(mockWs2.send).toHaveBeenCalledWith(
        expect.stringContaining('"type":"status_update"')
      );
      expect(mockWs1.send).toHaveBeenCalledWith(
        expect.stringContaining(OrderStatus.ROUTING)
      );
    });

    it('should not fail when broadcasting to order with no connections', () => {
      expect(() => {
        wsManager.broadcastStatusUpdate({
          orderId: 'non-existent-order',
          status: OrderStatus.ROUTING,
          timestamp: new Date(),
        });
      }).not.toThrow();
    });

    it('should skip closed connections when broadcasting', () => {
      const orderId = 'test-order-1';
      
      wsManager.registerConnection(orderId, mockWs1 as unknown as WebSocket);
      wsManager.registerConnection(orderId, mockWs2 as unknown as WebSocket);
      
      // Close first connection
      mockWs1.readyState = MockWebSocket.CLOSED;
      
      wsManager.broadcastStatusUpdate({
        orderId,
        status: OrderStatus.CONFIRMED,
        timestamp: new Date(),
      });
      
      // Only open connection should receive message
      expect(mockWs2.send).toHaveBeenCalledTimes(2); // connected + status update
      // mockWs1 gets 1 call from initial connection
      expect(mockWs1.send).toHaveBeenCalledTimes(1);
    });
  });

  describe('Order Connection Management', () => {
    it('should get active orders', () => {
      wsManager.registerConnection('order-1', mockWs1 as unknown as WebSocket);
      wsManager.registerConnection('order-2', mockWs2 as unknown as WebSocket);
      
      const activeOrders = wsManager.getActiveOrders();
      
      expect(activeOrders).toContain('order-1');
      expect(activeOrders).toContain('order-2');
      expect(activeOrders.length).toBe(2);
    });

    it('should close all connections for an order', () => {
      const orderId = 'test-order-1';
      
      wsManager.registerConnection(orderId, mockWs1 as unknown as WebSocket);
      wsManager.registerConnection(orderId, mockWs2 as unknown as WebSocket);
      
      wsManager.closeOrderConnections(orderId, 'Order completed');
      
      expect(mockWs1.close).toHaveBeenCalled();
      expect(mockWs2.close).toHaveBeenCalled();
      expect(wsManager.getConnectionCount(orderId)).toBe(0);
    });

    it('should close all connections on shutdown', () => {
      wsManager.registerConnection('order-1', mockWs1 as unknown as WebSocket);
      wsManager.registerConnection('order-2', mockWs2 as unknown as WebSocket);
      
      wsManager.closeAll();
      
      expect(mockWs1.close).toHaveBeenCalled();
      expect(mockWs2.close).toHaveBeenCalled();
      expect(wsManager.getConnectionCount()).toBe(0);
    });
  });

  describe('Statistics', () => {
    it('should provide accurate statistics', () => {
      wsManager.registerConnection('order-1', mockWs1 as unknown as WebSocket);
      wsManager.registerConnection('order-1', mockWs2 as unknown as WebSocket);
      
      const mockWs3 = new MockWebSocket();
      wsManager.registerConnection('order-2', mockWs3 as unknown as WebSocket);
      
      const stats = wsManager.getStats();
      
      expect(stats.totalConnections).toBe(3);
      expect(stats.activeOrders).toBe(2);
      expect(stats.ordersWithMultipleConnections).toBe(1);
    });
  });
});
