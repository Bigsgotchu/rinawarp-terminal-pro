/**
 * RinaWarp Terminal - Lead Capture System
 * Handles lead generation, email collection, and marketing automation
 */

import logger from '../utilities/logger.js';

class LeadCaptureSystem {
  constructor() {
    this.leads = new Map();
    this.initialized = false;
    this.initialize();
  }

  initialize() {
    this.initialized = true;
    logger.info('🎯 Lead Capture System initialized');
  }

  /**
   * Capture a new lead
   */
  async captureLead(leadData) {
    try {
      const leadId = this.generateLeadId();
      const lead = {
        id: leadId,
        ...leadData,
        capturedAt: new Date().toISOString(),
        source: leadData.source || 'website',
        status: 'new'
      };

      this.leads.set(leadId, lead);
      logger.info(`[LEAD] Captured new lead: ${leadData.email} from ${lead.source}`);

      return {
        success: true,
        leadId,
        message: 'Lead captured successfully'
      };
    } catch (error) {
      logger.error('Error capturing lead:', error);
      return {
        success: false,
        error: 'Failed to capture lead'
      };
    }
  }

  /**
   * Get lead by email
   */
  getLeadByEmail(email) {
    for (const [id, lead] of this.leads.entries()) {
      if (lead.email === email) {
        return lead;
      }
    }
    return null;
  }

  /**
   * Get all leads
   */
  getAllLeads() {
    return Array.from(this.leads.values());
  }

  /**
   * Generate unique lead ID
   */
  generateLeadId() {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `LEAD-${timestamp}-${random.toUpperCase()}`;
  }
}

export default new LeadCaptureSystem();
