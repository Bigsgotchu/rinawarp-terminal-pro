#!/usr/bin/env node

/**
 * RinaWarp Support Ticket Review Tool
 * Quick CLI tool to review customer support tickets
 */

import fs from 'fs';
import path from 'path';

const SUPPORT_DATA_DIR = './data/support';
const TICKETS_FILE = path.join(SUPPORT_DATA_DIR, 'tickets.json');

// ANSI color codes for better output
const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m'
};

function colorize(text, color) {
  return `${colors[color]}${text}${colors.reset}`;
}

function loadTickets() {
  try {
    if (!fs.existsSync(TICKETS_FILE)) {
      console.log(colorize('❌ No tickets file found. Start the server first to initialize the support system.', 'red'));
      return [];
    }
        
    const data = fs.readFileSync(TICKETS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error(colorize('❌ Error loading tickets:', 'red'), error.message);
    return [];
  }
}

function formatDate(dateString) {
  return new Date(dateString).toLocaleString();
}

function getPriorityColor(priority) {
  const priorityColors = {
    urgent: 'red',
    high: 'yellow',
    medium: 'blue',
    low: 'green'
  };
  return priorityColors[priority] || 'white';
}

function getStatusColor(status) {
  const statusColors = {
    open: 'yellow',
    pending_customer: 'blue',
    resolved: 'green',
    closed: 'magenta'
  };
  return statusColors[status] || 'white';
}

function displayTicketSummary(tickets) {
  console.log(colorize('\n🎫 SUPPORT TICKETS SUMMARY', 'bold'));
  console.log('=' * 50);
    
  const stats = {
    total: tickets.length,
    open: tickets.filter(t => t.status === 'open').length,
    pending: tickets.filter(t => t.status === 'pending_customer').length,
    resolved: tickets.filter(t => t.status === 'resolved').length,
    closed: tickets.filter(t => t.status === 'closed').length
  };
    
  console.log(colorize(`📊 Total Tickets: ${stats.total}`, 'bold'));
  console.log(colorize(`🟡 Open: ${stats.open}`, 'yellow'));
  console.log(colorize(`🔵 Pending Customer: ${stats.pending}`, 'blue'));
  console.log(colorize(`🟢 Resolved: ${stats.resolved}`, 'green'));
  console.log(colorize(`🟣 Closed: ${stats.closed}`, 'magenta'));
  console.log();
}

function displayTicketList(tickets) {
  if (tickets.length === 0) {
    console.log(colorize('📭 No support tickets found.', 'yellow'));
    return;
  }
    
  console.log(colorize('📋 TICKET LIST', 'bold'));
  console.log('-'.repeat(100));
    
  tickets.forEach((ticket, index) => {
    const statusColor = getStatusColor(ticket.status);
    const priorityColor = getPriorityColor(ticket.priority);
        
    console.log(colorize(`${index + 1}. ${ticket.id}`, 'bold'));
    console.log(`   📧 ${ticket.customerEmail} (${ticket.customerName || 'No name'})`);
    console.log(`   📝 ${ticket.subject}`);
    console.log(`   📂 ${colorize(ticket.category.toUpperCase(), 'cyan')} | ⚡ ${colorize(ticket.priority.toUpperCase(), priorityColor)} | 🏷️ ${colorize(ticket.status.toUpperCase(), statusColor)}`);
    console.log(`   📅 Created: ${formatDate(ticket.createdAt)}`);
    console.log(`   💬 Responses: ${ticket.responses.length}`);
    if (ticket.resolvedAt) {
      console.log(`   ✅ Resolved: ${formatDate(ticket.resolvedAt)} by ${ticket.resolvedBy}`);
    }
    console.log();
  });
}

function displayTicketDetails(ticket) {
  console.log(colorize(`\n🎫 TICKET DETAILS: ${ticket.id}`, 'bold'));
  console.log('=' * 60);
    
  console.log(colorize('Customer Information:', 'bold'));
  console.log(`  📧 Email: ${ticket.customerEmail}`);
  console.log(`  👤 Name: ${ticket.customerName || 'Not provided'}`);
  console.log();
    
  console.log(colorize('Ticket Information:', 'bold'));
  console.log(`  📝 Subject: ${ticket.subject}`);
  console.log(`  📂 Category: ${colorize(ticket.category, 'cyan')}`);
  console.log(`  ⚡ Priority: ${colorize(ticket.priority, getPriorityColor(ticket.priority))}`);
  console.log(`  🏷️ Status: ${colorize(ticket.status, getStatusColor(ticket.status))}`);
  console.log(`  📅 Created: ${formatDate(ticket.createdAt)}`);
  console.log(`  📅 Updated: ${formatDate(ticket.updatedAt)}`);
  if (ticket.assignedTo) {
    console.log(`  👥 Assigned to: ${ticket.assignedTo}`);
  }
  console.log();
    
  console.log(colorize('Description:', 'bold'));
  console.log(`  ${ticket.description}`);
  console.log();
    
  if (ticket.tags && ticket.tags.length > 0) {
    console.log(colorize('Tags:', 'bold'));
    console.log(`  🏷️ ${ticket.tags.join(', ')}`);
    console.log();
  }
    
  if (ticket.responses && ticket.responses.length > 0) {
    console.log(colorize(`Responses (${ticket.responses.length}):`, 'bold'));
    ticket.responses.forEach((response, i) => {
      const authorColor = response.authorType === 'support' ? 'green' : 'blue';
      console.log(`  ${colorize(`${i + 1}. ${response.author} (${response.authorType})`, authorColor)} - ${formatDate(response.createdAt)}`);
      console.log(`     ${response.message}`);
      console.log();
    });
  }
    
  if (ticket.resolvedAt) {
    console.log(colorize('Resolution:', 'bold'));
    console.log(`  ✅ Resolved by: ${ticket.resolvedBy}`);
    console.log(`  📅 Resolved at: ${formatDate(ticket.resolvedAt)}`);
    console.log(`  📋 Summary: ${ticket.resolutionSummary}`);
    console.log();
  }
    
  if (ticket.metadata) {
    console.log(colorize('Metadata:', 'bold'));
    console.log(`  🌐 Source: ${ticket.metadata.source}`);
    console.log(`  🖥️ User Agent: ${ticket.metadata.userAgent}`);
    console.log(`  📡 IP: ${ticket.metadata.ip}`);
    if (ticket.metadata.version) {
      console.log(`  📦 Version: ${ticket.metadata.version}`);
    }
  }
}

function main() {
  const args = process.argv.slice(2);
  const command = args[0];
    
  console.log(colorize('🧜‍♀️ RinaWarp Support Ticket Review Tool', 'cyan'));
    
  const tickets = loadTickets();
    
  if (command === 'list' || !command) {
    displayTicketSummary(tickets);
    displayTicketList(tickets);
        
  } else if (command === 'show' && args[1]) {
    const ticketId = args[1];
    const ticket = tickets.find(t => t.id === ticketId);
        
    if (ticket) {
      displayTicketDetails(ticket);
    } else {
      console.log(colorize(`❌ Ticket ${ticketId} not found.`, 'red'));
    }
        
  } else if (command === 'stats') {
    displayTicketSummary(tickets);
        
  } else if (command === 'open') {
    const openTickets = tickets.filter(t => t.status === 'open');
    console.log(colorize(`\n🟡 OPEN TICKETS (${openTickets.length})`, 'bold'));
    displayTicketList(openTickets);
        
  } else if (command === 'pending') {
    const pendingTickets = tickets.filter(t => t.status === 'pending_customer');
    console.log(colorize(`\n🔵 PENDING CUSTOMER RESPONSE (${pendingTickets.length})`, 'bold'));
    displayTicketList(pendingTickets);
        
  } else if (command === 'resolved') {
    const resolvedTickets = tickets.filter(t => t.status === 'resolved');
    console.log(colorize(`\n🟢 RESOLVED TICKETS (${resolvedTickets.length})`, 'bold'));
    displayTicketList(resolvedTickets);
        
  } else {
    console.log(colorize('\n📖 Usage:', 'bold'));
    console.log('  node review-support.js [command] [options]');
    console.log();
    console.log(colorize('Commands:', 'bold'));
    console.log('  list, (default)    Show all tickets');
    console.log('  stats              Show statistics only');
    console.log('  open               Show only open tickets');
    console.log('  pending            Show tickets pending customer response');
    console.log('  resolved           Show resolved tickets');
    console.log('  show <ticket-id>   Show detailed view of specific ticket');
    console.log();
    console.log(colorize('Examples:', 'bold'));
    console.log('  node review-support.js');
    console.log('  node review-support.js open');
    console.log('  node review-support.js show TKT-MDJPJERP-SOG');
  }
}

main();
