#!/usr/bin/env node

/**
 * Manual Sales Processing Script
 * Use this when automated systems are down
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class ManualSalesProcessor {
    constructor() {
        this.salesDir = path.join(__dirname, '..', 'manual-sales');
        this.ensureDirectoryExists();
    }

    ensureDirectoryExists() {
        if (!fs.existsSync(this.salesDir)) {
            fs.mkdirSync(this.salesDir, { recursive: true });
        }
    }

    generateLicenseKey(plan, email) {
        const timestamp = Date.now();
        const random = crypto.randomBytes(4).toString('hex');
        const planCode = {
            personal: 'PER',
            professional: 'PRO', 
            team: 'TEAM'
        }[plan] || 'UNK';
        
        return `RWT-${planCode}-${timestamp.toString(36).toUpperCase()}-${random.toUpperCase()}`;
    }

    recordSale(customerData) {
        const saleId = crypto.randomUUID();
        const licenseKey = this.generateLicenseKey(customerData.plan, customerData.email);
        
        const saleRecord = {
            id: saleId,
            timestamp: new Date().toISOString(),
            customer: customerData,
            licenseKey,
            status: 'pending_payment',
            downloadUrl: this.generateDownloadUrl(licenseKey),
            notes: []
        };

        const filename = path.join(this.salesDir, `sale-${saleId}.json`);
        fs.writeFileSync(filename, JSON.stringify(saleRecord, null, 2));
        
        return { saleRecord, filename };
    }

    generateDownloadUrl(licenseKey) {
        // Generate a secure download URL
        const token = crypto.createHash('sha256').update(licenseKey + Date.now()).digest('hex');
        return `https://your-secure-cdn.com/downloads/${token}`;
    }

    generateEmailTemplate(saleRecord) {
        const { customer, licenseKey, downloadUrl } = saleRecord;
        
        return `
Subject: RinaWarp Terminal - Your License Key & Download

Dear ${customer.name},

Thank you for purchasing RinaWarp Terminal (${customer.plan.toUpperCase()} plan)!

🔑 Your License Key: ${licenseKey}

📥 Download Links:
- Windows: ${downloadUrl}/RinaWarp-Terminal-Setup.exe
- macOS: ${downloadUrl}/RinaWarp-Terminal-macOS.dmg  
- Linux: ${downloadUrl}/RinaWarp-Terminal-Linux.AppImage

📋 Installation Instructions:
1. Download the appropriate version for your OS
2. Install the application
3. Enter your license key: ${licenseKey}
4. Enjoy your AI-powered terminal experience!

🆘 Need Help?
- Documentation: https://github.com/Rinawarp-Terminal/rinawarp-terminal
- Support: rinawarptechnologies25@gmail.com

Best regards,
The RinaWarp Team

---
Order ID: ${saleRecord.id}
Purchase Date: ${new Date(saleRecord.timestamp).toLocaleDateString()}
        `.trim();
    }

    processManualSale() {
        console.log('🚀 RinaWarp Terminal - Manual Sales Processor\n');
        
        // Get customer info
        const customerData = this.getCustomerInfo();
        
        // Record the sale
        const { saleRecord, filename } = this.recordSale(customerData);
        
        console.log(`\n✅ Sale recorded: ${saleRecord.id}`);
        console.log(`📄 File saved: ${filename}`);
        console.log(`🔑 License Key: ${saleRecord.licenseKey}`);
        
        // Generate email template
        const emailTemplate = this.generateEmailTemplate(saleRecord);
        const emailFile = filename.replace('.json', '-email.txt');
        fs.writeFileSync(emailFile, emailTemplate);
        
        console.log(`\n📧 Email template saved: ${emailFile}`);
        console.log('\n📋 Next Steps:');
        console.log('1. Process payment via Stripe dashboard or PayPal');
        console.log('2. Send the email template to customer');
        console.log('3. Update sale status to "completed"');
        console.log(`4. Mark sale as completed: node scripts/manual-sales.js complete ${saleRecord.id}`);
        
        return saleRecord;
    }

    getCustomerInfo() {
        const readline = require('readline').createInterface({
            input: process.stdin,
            output: process.stdout
        });

        return new Promise((resolve) => {
            const customerData = {};
            
            readline.question('Customer Name: ', (name) => {
                customerData.name = name;
                
                readline.question('Customer Email: ', (email) => {
                    customerData.email = email;
                    
                    readline.question('Plan (personal/professional/team): ', (plan) => {
                        customerData.plan = plan.toLowerCase();
                        
                        readline.question('Payment Method (stripe/paypal/other): ', (method) => {
                            customerData.paymentMethod = method;
                            
                            readline.question('Amount Paid: $', (amount) => {
                                customerData.amount = parseFloat(amount);
                                
                                readline.close();
                                resolve(customerData);
                            });
                        });
                    });
                });
            });
        });
    }

    completeSale(saleId) {
        const filename = path.join(this.salesDir, `sale-${saleId}.json`);
        
        if (!fs.existsSync(filename)) {
            console.error(`❌ Sale ${saleId} not found`);
            return;
        }

        const saleRecord = JSON.parse(fs.readFileSync(filename, 'utf8'));
        saleRecord.status = 'completed';
        saleRecord.completedAt = new Date().toISOString();
        
        fs.writeFileSync(filename, JSON.stringify(saleRecord, null, 2));
        console.log(`✅ Sale ${saleId} marked as completed`);
    }

    listSales() {
        const files = fs.readdirSync(this.salesDir).filter(f => f.endsWith('.json'));
        
        console.log('📊 Recent Sales:\n');
        
        files.forEach(filename => {
            const saleRecord = JSON.parse(fs.readFileSync(path.join(this.salesDir, filename), 'utf8'));
            const date = new Date(saleRecord.timestamp).toLocaleDateString();
            const status = saleRecord.status.toUpperCase();
            
            console.log(`${saleRecord.id} | ${date} | ${saleRecord.customer.name} | ${saleRecord.customer.plan.toUpperCase()} | ${status}`);
        });
    }
}

// CLI Interface
const processor = new ManualSalesProcessor();
const command = process.argv[2];
const param = process.argv[3];

switch (command) {
    case 'new':
        processor.processManualSale();
        break;
    case 'complete':
        if (!param) {
            console.error('❌ Please provide sale ID');
            process.exit(1);
        }
        processor.completeSale(param);
        break;
    case 'list':
        processor.listSales();
        break;
    default:
        console.log(`
🚀 RinaWarp Terminal - Manual Sales Processor

Usage:
  npm run manual-sales new      - Process a new manual sale
  npm run manual-sales list     - List all sales
  npm run manual-sales complete <sale-id> - Mark sale as completed

Examples:
  npm run manual-sales new
  npm run manual-sales complete abc123-def456-789
        `);
}

export default ManualSalesProcessor;
