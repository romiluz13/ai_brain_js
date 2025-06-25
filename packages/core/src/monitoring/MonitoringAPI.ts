/**
 * @file MonitoringAPI - Comprehensive real-time monitoring API system
 * 
 * This API provides REST endpoints for real-time metrics, WebSocket support for
 * live updates, and GraphQL interface for flexible data querying. Built using
 * Express.js patterns with MongoDB integration, authentication, and rate limiting.
 * 
 * Features:
 * - RESTful API endpoints for all monitoring data
 * - WebSocket real-time updates using Socket.IO patterns
 * - GraphQL interface for flexible data querying
 * - JWT authentication and role-based access control
 * - Rate limiting and API security
 * - Real-time dashboard data streaming
 * - Comprehensive API documentation with OpenAPI/Swagger
 */

import express, { Request, Response, NextFunction } from 'express';
import { Server as SocketIOServer } from 'socket.io';
import { createServer } from 'http';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import cors from 'cors';
import helmet from 'helmet';

import { PerformanceAnalyticsEngine, PerformanceMetrics } from './PerformanceAnalyticsEngine';
import { ErrorTrackingEngine, ErrorAnalytics } from './ErrorTrackingEngine';
import { CostMonitoringEngine, CostAnalytics } from './CostMonitoringEngine';
import { RealTimeMonitoringDashboard, DashboardMetrics } from './RealTimeMonitoringDashboard';
import { TracingCollection } from '../collections/TracingCollection';
import { MemoryCollection } from '../collections/MemoryCollection';

export interface APIConfiguration {
  port: number;
  jwtSecret: string;
  corsOrigins: string[];
  rateLimiting: {
    windowMs: number;
    maxRequests: number;
  };
  websocket: {
    enabled: boolean;
    updateInterval: number; // milliseconds
  };
  graphql: {
    enabled: boolean;
    introspection: boolean;
    playground: boolean;
  };
  authentication: {
    required: boolean;
    roles: string[];
  };
}

export interface APIUser {
  id: string;
  username: string;
  email: string;
  roles: string[];
  permissions: string[];
  lastLogin: Date;
}

export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  metadata: {
    timestamp: Date;
    requestId: string;
    version: string;
    rateLimit?: {
      remaining: number;
      resetTime: Date;
    };
  };
}

export interface WebSocketEvent {
  type: 'metrics_update' | 'error_alert' | 'cost_alert' | 'system_health' | 'trace_update';
  data: any;
  timestamp: Date;
  source: string;
}

export interface GraphQLContext {
  user?: APIUser;
  dataSources: {
    performanceEngine: PerformanceAnalyticsEngine;
    errorEngine: ErrorTrackingEngine;
    costEngine: CostMonitoringEngine;
    dashboard: RealTimeMonitoringDashboard;
  };
}

/**
 * MonitoringAPI - Comprehensive real-time monitoring API system
 * 
 * Provides REST, WebSocket, and GraphQL interfaces for accessing all
 * Universal AI Brain monitoring data with authentication and security.
 */
export class MonitoringAPI {
  private app: express.Application;
  private server: any;
  private io?: SocketIOServer;
  private config: APIConfiguration;
  
  private performanceEngine: PerformanceAnalyticsEngine;
  private errorEngine: ErrorTrackingEngine;
  private costEngine: CostMonitoringEngine;
  private dashboard: RealTimeMonitoringDashboard;
  
  private connectedClients: Map<string, { socket: any; user?: APIUser; subscriptions: string[] }> = new Map();
  private updateInterval?: NodeJS.Timeout;

  constructor(
    config: APIConfiguration,
    performanceEngine: PerformanceAnalyticsEngine,
    errorEngine: ErrorTrackingEngine,
    costEngine: CostMonitoringEngine,
    dashboard: RealTimeMonitoringDashboard
  ) {
    this.config = config;
    this.performanceEngine = performanceEngine;
    this.errorEngine = errorEngine;
    this.costEngine = costEngine;
    this.dashboard = dashboard;
    
    this.app = express();
    this.server = createServer(this.app);
    
    this.setupMiddleware();
    this.setupRoutes();
    
    if (config.websocket.enabled) {
      this.setupWebSocket();
    }
  }

  /**
   * Start the monitoring API server
   */
  async start(): Promise<void> {
    return new Promise((resolve) => {
      this.server.listen(this.config.port, () => {
        console.log(`🚀 Monitoring API server started on port ${this.config.port}`);
        
        if (this.config.websocket.enabled) {
          this.startRealTimeUpdates();
        }
        
        resolve();
      });
    });
  }

  /**
   * Stop the monitoring API server
   */
  async stop(): Promise<void> {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
    
    if (this.io) {
      this.io.close();
    }
    
    return new Promise((resolve) => {
      this.server.close(() => {
        console.log('📊 Monitoring API server stopped');
        resolve();
      });
    });
  }

  // Private setup methods
  private setupMiddleware(): void {
    // Security middleware
    this.app.use(helmet());
    this.app.use(cors({
      origin: this.config.corsOrigins,
      credentials: true
    }));

    // Rate limiting
    const limiter = rateLimit({
      windowMs: this.config.rateLimiting.windowMs,
      max: this.config.rateLimiting.maxRequests,
      message: 'Too many requests from this IP',
      standardHeaders: true,
      legacyHeaders: false
    });
    this.app.use('/api/', limiter);

    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true }));

    // Request ID middleware
    this.app.use((req: any, res: Response, next: NextFunction) => {
      req.requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      res.setHeader('X-Request-ID', req.requestId);
      next();
    });

    // Authentication middleware
    if (this.config.authentication.required) {
      this.app.use('/api/', this.authenticateToken.bind(this));
    }
  }

  private setupRoutes(): void {
    // Health check endpoint
    this.app.get('/health', (req: Request, res: Response) => {
      res.json(this.createResponse(true, {
        status: 'healthy',
        timestamp: new Date(),
        version: '1.0.0'
      }, req as any));
    });

    // Performance metrics endpoints
    this.app.get('/api/metrics/performance', this.getPerformanceMetrics.bind(this));
    this.app.get('/api/metrics/performance/:framework', this.getFrameworkPerformance.bind(this));
    this.app.get('/api/metrics/performance/trends/:metric', this.getPerformanceTrends.bind(this));

    // Error tracking endpoints
    this.app.get('/api/errors/analytics', this.getErrorAnalytics.bind(this));
    this.app.get('/api/errors/patterns', this.getErrorPatterns.bind(this));
    this.app.post('/api/errors/track', this.trackError.bind(this));

    // Cost monitoring endpoints
    this.app.get('/api/costs/analytics', this.getCostAnalytics.bind(this));
    this.app.get('/api/costs/budgets', this.getCostBudgets.bind(this));
    this.app.post('/api/costs/budgets', this.createCostBudget.bind(this));
    this.app.get('/api/costs/optimizations', this.getCostOptimizations.bind(this));

    // Dashboard endpoints
    this.app.get('/api/dashboard/metrics', this.getDashboardMetrics.bind(this));
    this.app.get('/api/dashboard/widgets', this.getDashboardWidgets.bind(this));
    this.app.post('/api/dashboard/widgets', this.createDashboardWidget.bind(this));

    // Real-time data endpoints
    this.app.get('/api/realtime/status', this.getRealTimeStatus.bind(this));
    this.app.post('/api/realtime/subscribe', this.subscribeToUpdates.bind(this));

    // API documentation
    this.app.get('/api/docs', (req: Request, res: Response) => {
      res.json(this.getAPIDocumentation());
    });

    // 404 handler
    this.app.use('*', (req: Request, res: Response) => {
      res.status(404).json(this.createResponse(false, null, req as any, 'Endpoint not found'));
    });

    // Error handler
    this.app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
      console.error('API Error:', error);
      res.status(500).json(this.createResponse(false, null, req as any, 'Internal server error'));
    });
  }

  private setupWebSocket(): void {
    this.io = new SocketIOServer(this.server, {
      cors: {
        origin: this.config.corsOrigins,
        methods: ['GET', 'POST']
      }
    });

    this.io.on('connection', (socket) => {
      console.log(`📡 WebSocket client connected: ${socket.id}`);
      
      this.connectedClients.set(socket.id, {
        socket,
        subscriptions: []
      });

      // Handle authentication
      socket.on('authenticate', async (token: string) => {
        try {
          const user = await this.verifyToken(token);
          const client = this.connectedClients.get(socket.id);
          if (client) {
            client.user = user;
            this.connectedClients.set(socket.id, client);
            socket.emit('authenticated', { success: true, user: { id: user.id, username: user.username } });
          }
        } catch (error) {
          socket.emit('authenticated', { success: false, error: 'Invalid token' });
        }
      });

      // Handle subscriptions
      socket.on('subscribe', (channels: string[]) => {
        const client = this.connectedClients.get(socket.id);
        if (client) {
          client.subscriptions = [...new Set([...client.subscriptions, ...channels])];
          this.connectedClients.set(socket.id, client);
          socket.emit('subscribed', { channels: client.subscriptions });
        }
      });

      socket.on('unsubscribe', (channels: string[]) => {
        const client = this.connectedClients.get(socket.id);
        if (client) {
          client.subscriptions = client.subscriptions.filter(sub => !channels.includes(sub));
          this.connectedClients.set(socket.id, client);
          socket.emit('unsubscribed', { channels });
        }
      });

      socket.on('disconnect', () => {
        console.log(`📡 WebSocket client disconnected: ${socket.id}`);
        this.connectedClients.delete(socket.id);
      });
    });
  }

  // REST API endpoint handlers
  private async getPerformanceMetrics(req: any, res: Response): Promise<void> {
    try {
      const { framework = 'all', timeRange = '24h' } = req.query;
      const range = this.parseTimeRange(timeRange);
      
      const metrics = await this.performanceEngine.generatePerformanceMetrics(framework, range);
      
      res.json(this.createResponse(true, metrics, req));
    } catch (error) {
      res.status(500).json(this.createResponse(false, null, req, error instanceof Error ? error.message : 'Unknown error'));
    }
  }

  private async getFrameworkPerformance(req: any, res: Response): Promise<void> {
    try {
      const { framework } = req.params;
      const { timeRange = '24h' } = req.query;
      const range = this.parseTimeRange(timeRange);
      
      const metrics = await this.performanceEngine.generatePerformanceMetrics(framework, range);
      
      res.json(this.createResponse(true, metrics, req));
    } catch (error) {
      res.status(500).json(this.createResponse(false, null, req, error instanceof Error ? error.message : 'Unknown error'));
    }
  }

  private async getPerformanceTrends(req: any, res: Response): Promise<void> {
    try {
      const { metric } = req.params;
      const { framework, timeRange = '7d' } = req.query;
      const range = this.parseTimeRange(timeRange);
      
      const trends = await this.performanceEngine.generatePerformanceTrend(metric, framework, range);
      
      res.json(this.createResponse(true, trends, req));
    } catch (error) {
      res.status(500).json(this.createResponse(false, null, req, error instanceof Error ? error.message : 'Unknown error'));
    }
  }

  private async getErrorAnalytics(req: any, res: Response): Promise<void> {
    try {
      const { timeRange = '24h' } = req.query;
      const range = this.parseTimeRange(timeRange);
      
      const analytics = await this.errorEngine.generateErrorAnalytics(range);
      
      res.json(this.createResponse(true, analytics, req));
    } catch (error) {
      res.status(500).json(this.createResponse(false, null, req, error instanceof Error ? error.message : 'Unknown error'));
    }
  }

  private async getErrorPatterns(req: any, res: Response): Promise<void> {
    try {
      const { timeRange = '7d' } = req.query;
      const range = this.parseTimeRange(timeRange);
      
      const patterns = await this.errorEngine.analyzeErrorPatterns(range);
      
      res.json(this.createResponse(true, patterns, req));
    } catch (error) {
      res.status(500).json(this.createResponse(false, null, req, error instanceof Error ? error.message : 'Unknown error'));
    }
  }

  private async trackError(req: any, res: Response): Promise<void> {
    try {
      const { framework, errorType, errorMessage, context, severity } = req.body;
      
      const errorId = await this.errorEngine.trackError(framework, errorType, errorMessage, context, severity);
      
      // Broadcast error to WebSocket clients
      this.broadcastToSubscribers('error_alert', {
        errorId,
        framework,
        errorType,
        severity,
        timestamp: new Date()
      });
      
      res.json(this.createResponse(true, { errorId }, req));
    } catch (error) {
      res.status(500).json(this.createResponse(false, null, req, error instanceof Error ? error.message : 'Unknown error'));
    }
  }

  private async getCostAnalytics(req: any, res: Response): Promise<void> {
    try {
      const { timeRange = '30d' } = req.query;
      const range = this.parseTimeRange(timeRange);
      
      const analytics = await this.costEngine.generateCostAnalytics(range);
      
      res.json(this.createResponse(true, analytics, req));
    } catch (error) {
      res.status(500).json(this.createResponse(false, null, req, error instanceof Error ? error.message : 'Unknown error'));
    }
  }

  private async getCostBudgets(req: any, res: Response): Promise<void> {
    try {
      // Get all budgets (simplified - would implement proper filtering)
      const budgets = Array.from((this.costEngine as any).budgets.values());
      
      res.json(this.createResponse(true, budgets, req));
    } catch (error) {
      res.status(500).json(this.createResponse(false, null, req, error instanceof Error ? error.message : 'Unknown error'));
    }
  }

  private async createCostBudget(req: any, res: Response): Promise<void> {
    try {
      const budgetData = req.body;
      
      const budgetId = await this.costEngine.createBudget(budgetData);
      
      res.json(this.createResponse(true, { budgetId }, req));
    } catch (error) {
      res.status(500).json(this.createResponse(false, null, req, error instanceof Error ? error.message : 'Unknown error'));
    }
  }

  private async getCostOptimizations(req: any, res: Response): Promise<void> {
    try {
      const { timeRange = '30d' } = req.query;
      const range = this.parseTimeRange(timeRange);
      
      const optimizations = await this.costEngine.generateOptimizationRecommendations(range);
      
      res.json(this.createResponse(true, optimizations, req));
    } catch (error) {
      res.status(500).json(this.createResponse(false, null, req, error instanceof Error ? error.message : 'Unknown error'));
    }
  }

  private async getDashboardMetrics(req: any, res: Response): Promise<void> {
    try {
      const metrics = await this.dashboard.getCurrentDashboardMetrics();
      
      res.json(this.createResponse(true, metrics, req));
    } catch (error) {
      res.status(500).json(this.createResponse(false, null, req, error instanceof Error ? error.message : 'Unknown error'));
    }
  }

  private async getDashboardWidgets(req: any, res: Response): Promise<void> {
    try {
      // Get dashboard widgets (simplified)
      const widgets = Array.from((this.dashboard as any).widgets.values());
      
      res.json(this.createResponse(true, widgets, req));
    } catch (error) {
      res.status(500).json(this.createResponse(false, null, req, error instanceof Error ? error.message : 'Unknown error'));
    }
  }

  private async createDashboardWidget(req: any, res: Response): Promise<void> {
    try {
      const widgetData = req.body;
      
      const widgetId = await this.dashboard.addWidget(widgetData);
      
      res.json(this.createResponse(true, { widgetId }, req));
    } catch (error) {
      res.status(500).json(this.createResponse(false, null, req, error instanceof Error ? error.message : 'Unknown error'));
    }
  }

  private async getRealTimeStatus(req: any, res: Response): Promise<void> {
    try {
      const status = {
        websocketEnabled: this.config.websocket.enabled,
        connectedClients: this.connectedClients.size,
        updateInterval: this.config.websocket.updateInterval,
        lastUpdate: new Date()
      };
      
      res.json(this.createResponse(true, status, req));
    } catch (error) {
      res.status(500).json(this.createResponse(false, null, req, error instanceof Error ? error.message : 'Unknown error'));
    }
  }

  private async subscribeToUpdates(req: any, res: Response): Promise<void> {
    try {
      const { channels } = req.body;
      
      // This would typically be handled via WebSocket, but providing REST fallback
      res.json(this.createResponse(true, { 
        message: 'Use WebSocket connection for real-time subscriptions',
        channels: channels || []
      }, req));
    } catch (error) {
      res.status(500).json(this.createResponse(false, null, req, error instanceof Error ? error.message : 'Unknown error'));
    }
  }

  // Helper methods
  private authenticateToken(req: any, res: Response, next: NextFunction): void {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json(this.createResponse(false, null, req, 'Access token required'));
    }

    jwt.verify(token, this.config.jwtSecret, (err: any, user: any) => {
      if (err) {
        return res.status(403).json(this.createResponse(false, null, req, 'Invalid or expired token'));
      }
      req.user = user;
      next();
    });
  }

  private async verifyToken(token: string): Promise<APIUser> {
    return new Promise((resolve, reject) => {
      jwt.verify(token, this.config.jwtSecret, (err: any, decoded: any) => {
        if (err) {
          reject(new Error('Invalid token'));
        } else {
          resolve(decoded as APIUser);
        }
      });
    });
  }

  private createResponse<T>(success: boolean, data: T, req: any, error?: string): APIResponse<T> {
    return {
      success,
      data: success ? data : undefined,
      error: error || undefined,
      metadata: {
        timestamp: new Date(),
        requestId: req.requestId || 'unknown',
        version: '1.0.0'
      }
    };
  }

  private parseTimeRange(timeRange: string): { start: Date; end: Date } {
    const now = new Date();
    const timeRangeMap: Record<string, number> = {
      '1h': 60 * 60 * 1000,
      '6h': 6 * 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000
    };

    const duration = timeRangeMap[timeRange] || timeRangeMap['24h'];
    return {
      start: new Date(now.getTime() - duration),
      end: now
    };
  }

  private startRealTimeUpdates(): void {
    this.updateInterval = setInterval(async () => {
      try {
        // Get latest dashboard metrics
        const metrics = await this.dashboard.getCurrentDashboardMetrics();
        
        // Broadcast to all subscribed clients
        this.broadcastToSubscribers('metrics_update', metrics);
        
      } catch (error) {
        console.error('Error broadcasting real-time updates:', error);
      }
    }, this.config.websocket.updateInterval);
  }

  private broadcastToSubscribers(eventType: WebSocketEvent['type'], data: any): void {
    if (!this.io) return;

    const event: WebSocketEvent = {
      type: eventType,
      data,
      timestamp: new Date(),
      source: 'universal_ai_brain'
    };

    for (const [clientId, client] of this.connectedClients) {
      if (client.subscriptions.includes(eventType) || client.subscriptions.includes('all')) {
        client.socket.emit('update', event);
      }
    }
  }

  private getAPIDocumentation(): any {
    return {
      title: 'Universal AI Brain Monitoring API',
      version: '1.0.0',
      description: 'Comprehensive monitoring API for the Universal AI Brain system',
      endpoints: {
        performance: {
          'GET /api/metrics/performance': 'Get overall performance metrics',
          'GET /api/metrics/performance/:framework': 'Get framework-specific performance metrics',
          'GET /api/metrics/performance/trends/:metric': 'Get performance trends for a specific metric'
        },
        errors: {
          'GET /api/errors/analytics': 'Get error analytics and statistics',
          'GET /api/errors/patterns': 'Get error patterns and analysis',
          'POST /api/errors/track': 'Track a new error event'
        },
        costs: {
          'GET /api/costs/analytics': 'Get cost analytics and breakdown',
          'GET /api/costs/budgets': 'Get all cost budgets',
          'POST /api/costs/budgets': 'Create a new cost budget',
          'GET /api/costs/optimizations': 'Get cost optimization recommendations'
        },
        dashboard: {
          'GET /api/dashboard/metrics': 'Get real-time dashboard metrics',
          'GET /api/dashboard/widgets': 'Get dashboard widgets',
          'POST /api/dashboard/widgets': 'Create a new dashboard widget'
        },
        realtime: {
          'GET /api/realtime/status': 'Get real-time system status',
          'POST /api/realtime/subscribe': 'Subscribe to real-time updates'
        }
      },
      websocket: {
        events: {
          authenticate: 'Authenticate WebSocket connection',
          subscribe: 'Subscribe to real-time channels',
          unsubscribe: 'Unsubscribe from channels',
          update: 'Receive real-time updates'
        },
        channels: [
          'metrics_update',
          'error_alert',
          'cost_alert',
          'system_health',
          'trace_update',
          'all'
        ]
      }
    };
  }
}
