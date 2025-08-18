#!/usr/bin/env node

/**
 * Deploy Google Analytics Configuration to Live Server
 * Updates rinawarptech.com with GA tracking
 */

const _fs = require('fs');
const { execSync } = require('child_process');

const SERVER_IP = '18.212.105.169';
const SERVER_USER = 'ubuntu';
const SERVER_PATH = '/home/ubuntu';

function deployGA() {
  console.log('🌊 Deploying Google Analytics to rinawarptech.com');
  console.log('================================================');
  console.log('');

  try {
    // Update production environment on server
    console.log('📤 Uploading environment configuration...');
    execSync(
      `scp -i ~/.ssh/rinawarp-key.pem production.env ${SERVER_USER}@${SERVER_IP}:${SERVER_PATH}/production.env`,
      { stdio: 'inherit' }
    );
    console.log('✅ Environment file uploaded');

    // Update the website HTML with GA tracking
    console.log('📄 Uploading updated website...');
    execSync(
      `scp -i ~/.ssh/rinawarp-key.pem -r public/* ${SERVER_USER}@${SERVER_IP}:${SERVER_PATH}/public/`,
      { stdio: 'inherit' }
    );
    console.log('✅ Website files uploaded');

    // Update the server configuration and restart
    console.log('🔄 Restarting server with new configuration...');
    const restartCommand = `
      cd ${SERVER_PATH} && 
      source production.env &&
      pm2 restart server.js --update-env &&
      sudo systemctl reload nginx
    `;

    execSync(`ssh -i ~/.ssh/rinawarp-key.pem ${SERVER_USER}@${SERVER_IP} "${restartCommand}"`, {
      stdio: 'inherit',
    });
    console.log('✅ Server restarted with new GA configuration');

    console.log('');
    console.log('🚀 Deployment complete!');
    console.log('');
    console.log('📊 Google Analytics is now configured on:');
    console.log('- https://rinawarptech.com (Marketing website)');
    console.log('- Backend API analytics tracking');
    console.log('- Environment variables updated');
    console.log('');
    console.log('🔍 Next steps:');
    console.log('1. Visit https://rinawarptech.com and check browser console');
    console.log('2. Create your real GA4 property');
    console.log('3. Replace G-G424CV5GGT with your real tracking ID');
    console.log('4. Monitor Real-Time reports in Google Analytics');
  } catch (error) {
    console.error('❌ Deployment failed:', error.message);
    console.log('');
    console.log('🔧 Manual steps:');
    console.log(`1. scp production.env ${SERVER_USER}@${SERVER_IP}:${SERVER_PATH}/`);
    console.log(`2. scp -r public/* ${SERVER_USER}@${SERVER_IP}:${SERVER_PATH}/public/`);
    console.log(`3. ssh ${SERVER_USER}@${SERVER_IP} "pm2 restart server.js"`);
  }
}

deployGA();
