/**
 * RinaWarp Terminal - Support System
 * Handles customer support tickets, knowledge base, and help requests
 */

import logger from '../utilities/logger.js';

class SupportSystem {
  constructor() {
    this.tickets = new Map();
    this.initialized = false;
    this.initialize();
  }

  initialize() {
    this.initialized = true;
    logger.info('🎫 Support System initialized');
  }

  /**
   * Create a new support ticket
   */
  async createTicket(ticketData) {
    try {
      const ticketId = this.generateTicketId();
      const ticket = {
        id: ticketId,
        ...ticketData,
        createdAt: new Date().toISOString(),
        status: 'open',
        priority: ticketData.priority || 'medium',
      };

      this.tickets.set(ticketId, ticket);
      logger.info(`[SUPPORT] New ticket created: ${ticketId} - ${ticketData.subject}`);

      return {
        success: true,
        ticketId,
        message: 'Support ticket created successfully',
      };
    } catch (error) {
      logger.error('Error creating support ticket:', error);
      return {
        success: false,
        error: 'Failed to create support ticket',
      };
    }
  }

  /**
   * Get ticket by ID
   */
  getTicket(ticketId) {
    return this.tickets.get(ticketId) || null;
  }

  /**
   * Get all tickets
   */
  getAllTickets() {
    return Array.from(this.tickets.values());
  }

  /**
   * Resolve a ticket
   */
  async resolveTicket(ticketId, resolutionData) {
    try {
      const ticket = this.tickets.get(ticketId);
      if (!ticket) {
        return {
          success: false,
          error: 'Ticket not found',
        };
      }

      ticket.status = 'resolved';
      ticket.resolvedAt = new Date().toISOString();
      ticket.resolution = resolutionData;

      this.tickets.set(ticketId, ticket);
      logger.info(`[SUPPORT] Ticket resolved: ${ticketId}`);

      return {
        success: true,
        message: 'Ticket resolved successfully',
      };
    } catch (error) {
      logger.error('Error resolving ticket:', error);
      return {
        success: false,
        error: 'Failed to resolve ticket',
      };
    }
  }

  /**
   * Search knowledge base (mock implementation)
   */
  async searchKnowledgeBase(query) {
    try {
      // Mock knowledge base search
      const mockResults = [
        {
          id: 'kb-1',
          title: 'Getting Started with RinaWarp Terminal',
          excerpt: 'Learn the basics of using RinaWarp Terminal...',
          relevance: 0.95,
        },
        {
          id: 'kb-2',
          title: 'Troubleshooting Connection Issues',
          excerpt: 'Common solutions for connection problems...',
          relevance: 0.87,
        },
      ];

      return mockResults.filter(
        result =>
          result.title.toLowerCase().includes(query.toLowerCase()) ||
          result.excerpt.toLowerCase().includes(query.toLowerCase())
      );
    } catch (error) {
      logger.error('Error searching knowledge base:', error);
      return [];
    }
  }

  /**
   * Get support statistics
   */
  async getSupportStats() {
    try {
      const tickets = this.getAllTickets();
      const now = Date.now();
      const day = 24 * 60 * 60 * 1000;
      const week = 7 * day;
      const month = 30 * day;

      // Count tickets by time period
      const todayTickets = tickets.filter(
        ticket => new Date(ticket.createdAt).getTime() > now - day
      ).length;

      const weekTickets = tickets.filter(
        ticket => new Date(ticket.createdAt).getTime() > now - week
      ).length;

      const monthTickets = tickets.filter(
        ticket => new Date(ticket.createdAt).getTime() > now - month
      ).length;

      // Count by status
      const statusStats = {};
      tickets.forEach(ticket => {
        const status = ticket.status || 'unknown';
        statusStats[status] = (statusStats[status] || 0) + 1;
      });

      // Count by priority
      const priorityStats = {};
      tickets.forEach(ticket => {
        const priority = ticket.priority || 'medium';
        priorityStats[priority] = (priorityStats[priority] || 0) + 1;
      });

      return {
        totalTickets: tickets.length,
        todayTickets,
        weekTickets,
        monthTickets,
        statusBreakdown: statusStats,
        priorityBreakdown: priorityStats,
        averagePerDay: tickets.length > 0 ? (tickets.length / 30).toFixed(1) : 0,
        lastTicket:
          tickets.length > 0
            ? Math.max(...tickets.map(t => new Date(t.createdAt).getTime()))
            : null,
      };
    } catch (error) {
      logger.error('Error getting support stats:', error);
      return {
        error: 'Failed to retrieve support statistics',
      };
    }
  }

  /**
   * Generate unique ticket ID
   */
  generateTicketId() {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 6);
    return `TICKET-${timestamp}-${random.toUpperCase()}`;
  }
}

export default new SupportSystem();
