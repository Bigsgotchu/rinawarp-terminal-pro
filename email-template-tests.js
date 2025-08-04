/*
 * 🧜‍♀️ This file has been automatically modernized by RinaWarp Terminal
 * 1 deprecated pattern(s) replaced with modern alternatives
 * Please review and test the changes
 */

const { readFile } = require('fs/promises');
const path = require('node:path');
const nodemailer = require('nodemailer');
const puppeteer = require('puppeteer');

// Configure the email transporter (for testing, use ethereal)
async function createTestTransporter() {
  const testAccount = await nodemailer.createTestAccount();
  return nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    secure: false,
    auth: {
      user: testAccount.user,
      pass: testAccount.pass,
    },
  });
}

async function renderTemplate(filePath, data = {}) {
  const rawContent = await readFile(filePath, 'utf8');
  // Here we might use a templating engine, but for simplicity replace placeholders
  let content = rawContent;
  for (const [key, value] of Object.entries(data)) {
    content = content.replace(new RegExp(`{{${key}}}`, 'g'), value);
  }
  return content;
}

async function validateRendering(templatePath, data) {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  const content = await renderTemplate(templatePath, data);

  await page.setContent(content);
  const screenshot = await page.screenshot();

  await browser.close();
  return screenshot;
}

function runTests() {
  // Define test cases for each template
  const emailTemplates = [
    'beta-campaign/footer.html',
    'beta-campaign/header.html',
    'templates/reminder/reminder-email.html',
    'templates/update/update-email.html',
    'templates/welcome/welcome-email.html',
  ];

  emailTemplates.forEach(async template => {
    test(`Render ${template}`, async () => {
      const templatePath = path.join(__dirname, 'email-templates', template);
      const data = {
        username: 'TestUser',
        updateUrl: 'http://example.com/update',
      };

      const screenshot = await validateRendering(templatePath, data);
      expect(screenshot).toBeTruthy();
    });
  });

  // Example send email test
  test('Send test email', async () => {
    const transporter = await createTestTransporter();

    const info = await transporter.sendMail({
      from: 'sender@example.com',
      to: 'receiver@example.com',
      subject: 'Test Email',
      text: 'This is a test email',
      html: '<b>This is a test email</b>',
    });

    expect(info).toHaveProperty('messageId');
  });
}

runTests();
