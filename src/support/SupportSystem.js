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
   * Generate unique ticket ID
   */
  generateTicketId() {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 6);
    return `TICKET-${timestamp}-${random.toUpperCase()}`;
  }
}

export default new SupportSystem();
