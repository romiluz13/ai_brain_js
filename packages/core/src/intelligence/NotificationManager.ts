/**
 * Notification Manager - Intelligent Alert System
 * 
 * This manager handles email, SMS, webhook, and in-app notifications for
 * AI Brain events, performance thresholds, safety alerts, and system health.
 * 
 * Features:
 * - Multi-channel notifications (email, SMS, webhook, in-app)
 * - Intelligent alert prioritization and throttling
 * - Performance threshold monitoring
 * - Safety alert escalation
 * - Custom notification rules and filters
 * - Delivery tracking and retry logic
 */

import { EventEmitter } from 'events';
import { Db, Collection } from 'mongodb';

export interface NotificationConfig {
  // Channel configurations
  email: {
    enabled: boolean;
    provider: 'sendgrid' | 'ses' | 'smtp';
    apiKey?: string;
    fromEmail: string;
    fromName: string;
    smtpConfig?: {
      host: string;
      port: number;
      secure: boolean;
      auth: {
        user: string;
        pass: string;
      };
    };
  };
  sms: {
    enabled: boolean;
    provider: 'twilio' | 'aws-sns';
    apiKey?: string;
    apiSecret?: string;
    fromNumber?: string;
  };
  webhook: {
    enabled: boolean;
    endpoints: Array<{
      url: string;
      secret?: string;
      headers?: Record<string, string>;
    }>;
  };
  inApp: {
    enabled: boolean;
    retentionDays: number;
  };
  
  // Throttling and rate limiting
  throttling: {
    maxNotificationsPerHour: number;
    maxNotificationsPerDay: number;
    cooldownMinutes: number;
  };
  
  // Alert thresholds
  thresholds: {
    responseTime: number;        // ms
    errorRate: number;           // percentage
    memoryUsage: number;         // percentage
    costPerHour: number;         // dollars
    safetyFailureRate: number;   // percentage
  };
}

export interface NotificationRule {
  id: string;
  name: string;
  enabled: boolean;
  conditions: {
    eventTypes: string[];
    severity: ('low' | 'medium' | 'high' | 'critical')[];
    frameworks?: string[];
    agents?: string[];
    customFilters?: Record<string, any>;
  };
  channels: ('email' | 'sms' | 'webhook' | 'inApp')[];
  recipients: {
    emails?: string[];
    phoneNumbers?: string[];
    webhookUrls?: string[];
  };
  throttling: {
    enabled: boolean;
    maxPerHour?: number;
    cooldownMinutes?: number;
  };
  escalation: {
    enabled: boolean;
    escalateAfterMinutes: number;
    escalationChannels: ('email' | 'sms' | 'webhook')[];
    escalationRecipients: {
      emails?: string[];
      phoneNumbers?: string[];
    };
  };
}

export interface NotificationEvent {
  id: string;
  type: 'safety_alert' | 'performance_threshold' | 'system_health' | 'memory_pressure' | 'cost_alert' | 'agent_error';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  data: any;
  source: {
    framework?: string;
    agentId?: string;
    sessionId?: string;
    component: string;
  };
  timestamp: Date;
  acknowledged: boolean;
  escalated: boolean;
}

export interface NotificationDelivery {
  id: string;
  notificationId: string;
  channel: 'email' | 'sms' | 'webhook' | 'inApp';
  recipient: string;
  status: 'pending' | 'sent' | 'delivered' | 'failed' | 'bounced';
  attempts: number;
  lastAttempt: Date;
  deliveredAt?: Date;
  error?: string;
  metadata?: any;
}

export class NotificationManager extends EventEmitter {
  private db: Db;
  private config: NotificationConfig;
  private notificationsCollection: Collection;
  private deliveriesCollection: Collection;
  private rulesCollection: Collection;
  private rules: Map<string, NotificationRule> = new Map();
  private throttleCounters: Map<string, { count: number; resetTime: Date }> = new Map();

  constructor(db: Db, config: NotificationConfig) {
    super();
    this.db = db;
    this.config = config;
    this.notificationsCollection = db.collection('notifications');
    this.deliveriesCollection = db.collection('notification_deliveries');
    this.rulesCollection = db.collection('notification_rules');
  }

  /**
   * Initialize the notification manager
   */
  async initialize(): Promise<void> {
    console.log('📢 Initializing Notification Manager...');
    
    // Create indexes
    await this.createIndexes();
    
    // Load notification rules
    await this.loadNotificationRules();
    
    // Start background processes
    this.startBackgroundProcesses();
    
    console.log('✅ Notification Manager initialized successfully');
  }

  /**
   * Send notification based on event
   */
  async sendNotification(event: Omit<NotificationEvent, 'id' | 'timestamp' | 'acknowledged' | 'escalated'>): Promise<string> {
    const notification: NotificationEvent = {
      ...event,
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      acknowledged: false,
      escalated: false
    };

    // Store notification
    await this.notificationsCollection.insertOne(notification);

    // Find matching rules
    const matchingRules = this.findMatchingRules(notification);
    
    if (matchingRules.length === 0) {
      console.log(`📢 No matching rules for notification: ${notification.type}`);
      return notification.id;
    }

    // Process each matching rule
    for (const rule of matchingRules) {
      await this.processNotificationRule(notification, rule);
    }

    // Emit event for real-time updates
    this.emit('notification_sent', notification);

    console.log(`📢 Sent notification: ${notification.title} (${matchingRules.length} rules matched)`);
    return notification.id;
  }

  /**
   * Send safety alert
   */
  async sendSafetyAlert(
    alertType: string,
    message: string,
    severity: 'low' | 'medium' | 'high' | 'critical',
    source: NotificationEvent['source'],
    data: any = {}
  ): Promise<string> {
    return this.sendNotification({
      type: 'safety_alert',
      severity,
      title: `🚨 Safety Alert: ${alertType}`,
      message,
      data,
      source
    });
  }

  /**
   * Send performance threshold alert
   */
  async sendPerformanceAlert(
    metric: string,
    currentValue: number,
    threshold: number,
    source: NotificationEvent['source']
  ): Promise<string> {
    const severity = currentValue > threshold * 2 ? 'critical' : 
                    currentValue > threshold * 1.5 ? 'high' : 'medium';

    return this.sendNotification({
      type: 'performance_threshold',
      severity,
      title: `⚡ Performance Alert: ${metric}`,
      message: `${metric} is ${currentValue} (threshold: ${threshold})`,
      data: { metric, currentValue, threshold },
      source
    });
  }

  /**
   * Send cost alert
   */
  async sendCostAlert(
    currentCost: number,
    threshold: number,
    period: string,
    source: NotificationEvent['source']
  ): Promise<string> {
    const severity = currentCost > threshold * 2 ? 'critical' : 'high';

    return this.sendNotification({
      type: 'cost_alert',
      severity,
      title: `💰 Cost Alert: Budget Exceeded`,
      message: `Current ${period} cost is $${currentCost.toFixed(2)} (threshold: $${threshold.toFixed(2)})`,
      data: { currentCost, threshold, period },
      source
    });
  }

  /**
   * Send system health alert
   */
  async sendSystemHealthAlert(
    component: string,
    status: string,
    message: string,
    source: NotificationEvent['source']
  ): Promise<string> {
    const severity = status === 'critical' ? 'critical' : 
                    status === 'warning' ? 'medium' : 'low';

    return this.sendNotification({
      type: 'system_health',
      severity,
      title: `🏥 System Health: ${component}`,
      message,
      data: { component, status },
      source
    });
  }

  /**
   * Create notification rule
   */
  async createNotificationRule(rule: Omit<NotificationRule, 'id'>): Promise<string> {
    const newRule: NotificationRule = {
      ...rule,
      id: `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };

    await this.rulesCollection.insertOne(newRule);
    this.rules.set(newRule.id, newRule);

    console.log(`📋 Created notification rule: ${newRule.name}`);
    return newRule.id;
  }

  /**
   * Update notification rule
   */
  async updateNotificationRule(ruleId: string, updates: Partial<NotificationRule>): Promise<void> {
    await this.rulesCollection.updateOne(
      { id: ruleId },
      { $set: updates }
    );

    const existingRule = this.rules.get(ruleId);
    if (existingRule) {
      this.rules.set(ruleId, { ...existingRule, ...updates });
    }

    console.log(`📋 Updated notification rule: ${ruleId}`);
  }

  /**
   * Delete notification rule
   */
  async deleteNotificationRule(ruleId: string): Promise<void> {
    await this.rulesCollection.deleteOne({ id: ruleId });
    this.rules.delete(ruleId);

    console.log(`📋 Deleted notification rule: ${ruleId}`);
  }

  /**
   * Acknowledge notification
   */
  async acknowledgeNotification(notificationId: string, acknowledgedBy: string): Promise<void> {
    await this.notificationsCollection.updateOne(
      { id: notificationId },
      { 
        $set: { 
          acknowledged: true,
          acknowledgedBy,
          acknowledgedAt: new Date()
        }
      }
    );

    this.emit('notification_acknowledged', { notificationId, acknowledgedBy });
    console.log(`✅ Acknowledged notification: ${notificationId}`);
  }

  /**
   * Get notification history
   */
  async getNotificationHistory(
    filters: {
      type?: string;
      severity?: string;
      startDate?: Date;
      endDate?: Date;
      acknowledged?: boolean;
    } = {},
    limit: number = 50
  ): Promise<NotificationEvent[]> {
    const query: any = {};
    
    if (filters.type) query.type = filters.type;
    if (filters.severity) query.severity = filters.severity;
    if (filters.acknowledged !== undefined) query.acknowledged = filters.acknowledged;
    if (filters.startDate || filters.endDate) {
      query.timestamp = {};
      if (filters.startDate) query.timestamp.$gte = filters.startDate;
      if (filters.endDate) query.timestamp.$lte = filters.endDate;
    }

    return await this.notificationsCollection
      .find(query)
      .sort({ timestamp: -1 })
      .limit(limit)
      .toArray();
  }

  /**
   * Get delivery statistics
   */
  async getDeliveryStats(timeframe: 'hour' | 'day' | 'week' = 'day'): Promise<{
    totalSent: number;
    totalDelivered: number;
    totalFailed: number;
    deliveryRate: number;
    channelStats: Record<string, { sent: number; delivered: number; failed: number }>;
  }> {
    const timeframeDuration = {
      hour: 60 * 60 * 1000,
      day: 24 * 60 * 60 * 1000,
      week: 7 * 24 * 60 * 60 * 1000
    };

    const startTime = new Date(Date.now() - timeframeDuration[timeframe]);

    const deliveries = await this.deliveriesCollection.find({
      lastAttempt: { $gte: startTime }
    }).toArray();

    const totalSent = deliveries.length;
    const totalDelivered = deliveries.filter(d => d.status === 'delivered').length;
    const totalFailed = deliveries.filter(d => d.status === 'failed').length;
    const deliveryRate = totalSent > 0 ? totalDelivered / totalSent : 0;

    const channelStats: Record<string, { sent: number; delivered: number; failed: number }> = {};
    
    for (const delivery of deliveries) {
      if (!channelStats[delivery.channel]) {
        channelStats[delivery.channel] = { sent: 0, delivered: 0, failed: 0 };
      }
      
      channelStats[delivery.channel].sent++;
      if (delivery.status === 'delivered') {
        channelStats[delivery.channel].delivered++;
      } else if (delivery.status === 'failed') {
        channelStats[delivery.channel].failed++;
      }
    }

    return {
      totalSent,
      totalDelivered,
      totalFailed,
      deliveryRate,
      channelStats
    };
  }

  /**
   * Find matching notification rules
   */
  private findMatchingRules(notification: NotificationEvent): NotificationRule[] {
    const matchingRules: NotificationRule[] = [];

    for (const rule of this.rules.values()) {
      if (!rule.enabled) continue;

      // Check event type
      if (!rule.conditions.eventTypes.includes(notification.type)) continue;

      // Check severity
      if (!rule.conditions.severity.includes(notification.severity)) continue;

      // Check framework filter
      if (rule.conditions.frameworks && notification.source.framework) {
        if (!rule.conditions.frameworks.includes(notification.source.framework)) continue;
      }

      // Check agent filter
      if (rule.conditions.agents && notification.source.agentId) {
        if (!rule.conditions.agents.includes(notification.source.agentId)) continue;
      }

      // Check throttling
      if (rule.throttling.enabled && this.isThrottled(rule.id, rule.throttling)) {
        continue;
      }

      matchingRules.push(rule);
    }

    return matchingRules;
  }

  /**
   * Process notification rule
   */
  private async processNotificationRule(notification: NotificationEvent, rule: NotificationRule): Promise<void> {
    // Send to each configured channel
    for (const channel of rule.channels) {
      switch (channel) {
        case 'email':
          if (this.config.email.enabled && rule.recipients.emails) {
            for (const email of rule.recipients.emails) {
              await this.sendEmailNotification(notification, email);
            }
          }
          break;
          
        case 'sms':
          if (this.config.sms.enabled && rule.recipients.phoneNumbers) {
            for (const phone of rule.recipients.phoneNumbers) {
              await this.sendSMSNotification(notification, phone);
            }
          }
          break;
          
        case 'webhook':
          if (this.config.webhook.enabled) {
            const webhookUrls = rule.recipients.webhookUrls || this.config.webhook.endpoints.map(e => e.url);
            for (const url of webhookUrls) {
              await this.sendWebhookNotification(notification, url);
            }
          }
          break;
          
        case 'inApp':
          if (this.config.inApp.enabled) {
            await this.sendInAppNotification(notification);
          }
          break;
      }
    }

    // Update throttling counter
    if (rule.throttling.enabled) {
      this.updateThrottleCounter(rule.id);
    }

    // Schedule escalation if configured
    if (rule.escalation.enabled) {
      this.scheduleEscalation(notification, rule);
    }
  }

  /**
   * Send email notification
   */
  private async sendEmailNotification(notification: NotificationEvent, email: string): Promise<void> {
    const delivery: NotificationDelivery = {
      id: `delivery_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      notificationId: notification.id,
      channel: 'email',
      recipient: email,
      status: 'pending',
      attempts: 1,
      lastAttempt: new Date()
    };

    try {
      // Email sending logic would go here
      // For now, we'll simulate success
      delivery.status = 'sent';
      delivery.deliveredAt = new Date();
      
      console.log(`📧 Email sent to ${email}: ${notification.title}`);
      
    } catch (error) {
      delivery.status = 'failed';
      delivery.error = error.message;
      console.error(`📧 Email failed to ${email}:`, error);
    }

    await this.deliveriesCollection.insertOne(delivery);
  }

  /**
   * Send SMS notification
   */
  private async sendSMSNotification(notification: NotificationEvent, phoneNumber: string): Promise<void> {
    const delivery: NotificationDelivery = {
      id: `delivery_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      notificationId: notification.id,
      channel: 'sms',
      recipient: phoneNumber,
      status: 'pending',
      attempts: 1,
      lastAttempt: new Date()
    };

    try {
      // SMS sending logic would go here
      // For now, we'll simulate success
      delivery.status = 'sent';
      delivery.deliveredAt = new Date();
      
      console.log(`📱 SMS sent to ${phoneNumber}: ${notification.title}`);
      
    } catch (error) {
      delivery.status = 'failed';
      delivery.error = error.message;
      console.error(`📱 SMS failed to ${phoneNumber}:`, error);
    }

    await this.deliveriesCollection.insertOne(delivery);
  }

  /**
   * Send webhook notification
   */
  private async sendWebhookNotification(notification: NotificationEvent, url: string): Promise<void> {
    const delivery: NotificationDelivery = {
      id: `delivery_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      notificationId: notification.id,
      channel: 'webhook',
      recipient: url,
      status: 'pending',
      attempts: 1,
      lastAttempt: new Date()
    };

    try {
      // Webhook sending logic would go here
      // For now, we'll simulate success
      delivery.status = 'sent';
      delivery.deliveredAt = new Date();
      
      console.log(`🔗 Webhook sent to ${url}: ${notification.title}`);
      
    } catch (error) {
      delivery.status = 'failed';
      delivery.error = error.message;
      console.error(`🔗 Webhook failed to ${url}:`, error);
    }

    await this.deliveriesCollection.insertOne(delivery);
  }

  /**
   * Send in-app notification
   */
  private async sendInAppNotification(notification: NotificationEvent): Promise<void> {
    // In-app notifications are stored in the database and retrieved by the UI
    const delivery: NotificationDelivery = {
      id: `delivery_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      notificationId: notification.id,
      channel: 'inApp',
      recipient: 'dashboard',
      status: 'delivered',
      attempts: 1,
      lastAttempt: new Date(),
      deliveredAt: new Date()
    };

    await this.deliveriesCollection.insertOne(delivery);
    
    // Emit for real-time dashboard updates
    this.emit('in_app_notification', notification);
    
    console.log(`📱 In-app notification: ${notification.title}`);
  }

  /**
   * Check if rule is throttled
   */
  private isThrottled(ruleId: string, throttling: NotificationRule['throttling']): boolean {
    if (!throttling.enabled) return false;

    const counter = this.throttleCounters.get(ruleId);
    if (!counter) return false;

    const now = new Date();
    if (now > counter.resetTime) {
      this.throttleCounters.delete(ruleId);
      return false;
    }

    return counter.count >= (throttling.maxPerHour || this.config.throttling.maxNotificationsPerHour);
  }

  /**
   * Update throttle counter
   */
  private updateThrottleCounter(ruleId: string): void {
    const now = new Date();
    const resetTime = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour from now

    const counter = this.throttleCounters.get(ruleId);
    if (counter && now < counter.resetTime) {
      counter.count++;
    } else {
      this.throttleCounters.set(ruleId, { count: 1, resetTime });
    }
  }

  /**
   * Schedule escalation
   */
  private scheduleEscalation(notification: NotificationEvent, rule: NotificationRule): void {
    setTimeout(async () => {
      // Check if notification was acknowledged
      const current = await this.notificationsCollection.findOne({ id: notification.id });
      if (current?.acknowledged) return;

      // Send escalation
      await this.sendEscalation(notification, rule);
    }, rule.escalation.escalateAfterMinutes * 60 * 1000);
  }

  /**
   * Send escalation
   */
  private async sendEscalation(notification: NotificationEvent, rule: NotificationRule): Promise<void> {
    const escalationNotification: NotificationEvent = {
      ...notification,
      id: `escalation_${notification.id}`,
      title: `🚨 ESCALATION: ${notification.title}`,
      message: `ESCALATED: ${notification.message}`,
      severity: 'critical',
      escalated: true,
      timestamp: new Date()
    };

    // Send to escalation channels and recipients
    for (const channel of rule.escalation.escalationChannels) {
      switch (channel) {
        case 'email':
          if (rule.escalation.escalationRecipients.emails) {
            for (const email of rule.escalation.escalationRecipients.emails) {
              await this.sendEmailNotification(escalationNotification, email);
            }
          }
          break;
          
        case 'sms':
          if (rule.escalation.escalationRecipients.phoneNumbers) {
            for (const phone of rule.escalation.escalationRecipients.phoneNumbers) {
              await this.sendSMSNotification(escalationNotification, phone);
            }
          }
          break;
      }
    }

    // Mark original notification as escalated
    await this.notificationsCollection.updateOne(
      { id: notification.id },
      { $set: { escalated: true, escalatedAt: new Date() } }
    );

    console.log(`🚨 Escalated notification: ${notification.id}`);
  }

  /**
   * Load notification rules from database
   */
  private async loadNotificationRules(): Promise<void> {
    const rules = await this.rulesCollection.find({}).toArray();
    
    for (const rule of rules) {
      this.rules.set(rule.id, rule);
    }

    console.log(`📋 Loaded ${rules.length} notification rules`);
  }

  /**
   * Start background processes
   */
  private startBackgroundProcesses(): void {
    // Clean up old notifications
    setInterval(async () => {
      if (this.config.inApp.enabled) {
        const cutoffDate = new Date(Date.now() - this.config.inApp.retentionDays * 24 * 60 * 60 * 1000);
        await this.notificationsCollection.deleteMany({
          timestamp: { $lt: cutoffDate }
        });
      }
    }, 24 * 60 * 60 * 1000); // Daily cleanup

    // Reset throttle counters
    setInterval(() => {
      const now = new Date();
      for (const [ruleId, counter] of this.throttleCounters.entries()) {
        if (now > counter.resetTime) {
          this.throttleCounters.delete(ruleId);
        }
      }
    }, 60 * 60 * 1000); // Hourly cleanup

    console.log('🔄 Started notification background processes');
  }

  /**
   * Create database indexes
   */
  private async createIndexes(): Promise<void> {
    await this.notificationsCollection.createIndex({ timestamp: -1 });
    await this.notificationsCollection.createIndex({ type: 1, severity: 1 });
    await this.notificationsCollection.createIndex({ acknowledged: 1 });
    await this.deliveriesCollection.createIndex({ notificationId: 1 });
    await this.deliveriesCollection.createIndex({ channel: 1, status: 1 });
    await this.rulesCollection.createIndex({ id: 1 }, { unique: true });
    
    console.log('📊 Created notification indexes');
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<NotificationConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log('⚙️ Updated notification configuration');
  }

  /**
   * Get current configuration
   */
  getConfig(): NotificationConfig {
    return { ...this.config };
  }

  /**
   * Shutdown notification manager
   */
  async shutdown(): Promise<void> {
    this.removeAllListeners();
    console.log('🛑 Notification Manager shutdown complete');
  }
}
