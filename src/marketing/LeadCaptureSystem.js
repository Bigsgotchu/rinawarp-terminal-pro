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
        status: 'new',
      };

      this.leads.set(leadId, lead);
      logger.info(`[LEAD] Captured new lead: ${leadData.email} from ${lead.source}`);

      return {
        success: true,
        leadId,
        message: 'Lead captured successfully',
      };
    } catch (error) {
      logger.error('Error capturing lead:', error);
      return {
        success: false,
        error: 'Failed to capture lead',
      };
    }
  }

  /**
   * Get lead by email
   */
  getLeadByEmail(email) {
    for (const [_id, lead] of this.leads.entries()) {
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
   * Get lead statistics
   */
  async getLeadStats() {
    try {
      const leads = this.getAllLeads();
      const now = Date.now();
      const day = 24 * 60 * 60 * 1000;
      const week = 7 * day;
      const month = 30 * day;

      // Count leads by time period
      const todayLeads = leads.filter(
        lead => new Date(lead.capturedAt).getTime() > now - day
      ).length;

      const weekLeads = leads.filter(
        lead => new Date(lead.capturedAt).getTime() > now - week
      ).length;

      const monthLeads = leads.filter(
        lead => new Date(lead.capturedAt).getTime() > now - month
      ).length;

      // Count by source
      const sourceStats = {};
      leads.forEach(lead => {
        const source = lead.source || 'unknown';
        sourceStats[source] = (sourceStats[source] || 0) + 1;
      });

      return {
        totalLeads: leads.length,
        todayLeads,
        weekLeads,
        monthLeads,
        sourceBreakdown: sourceStats,
        averagePerDay: leads.length > 0 ? (leads.length / 30).toFixed(1) : 0,
        lastCaptured:
          leads.length > 0 ? Math.max(...leads.map(l => new Date(l.capturedAt).getTime())) : null,
      };
    } catch (error) {
      logger.error('Error getting lead stats:', error);
      throw error;
    }
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
