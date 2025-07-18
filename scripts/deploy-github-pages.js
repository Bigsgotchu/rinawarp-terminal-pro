#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 RinaWarp Terminal - GitHub Pages Deployment');
console.log('===============================================');

function runCommand(command, description) {
    console.log(`\n📋 ${description}...`);
    try {
        const result = execSync(command, { 
            stdio: 'inherit',
            cwd: process.cwd()
        });
        console.log(`✅ ${description} completed successfully`);
        return result;
    } catch (error) {
        console.error(`❌ ${description} failed:`, error.message);
        throw error;
    }
}

function checkGitStatus() {
    console.log('\n🔍 Checking git status...');
    try {
        const status = execSync('git status --porcelain', { encoding: 'utf8' });
        if (status.trim()) {
            console.log('📝 Uncommitted changes found:');
            console.log(status);
            return false;
        }
        console.log('✅ Working directory is clean');
        return true;
    } catch (error) {
        console.error('❌ Git status check failed:', error.message);
        return false;
    }
}

function commitAndPush() {
    console.log('\n📦 Committing and pushing changes...');
    try {
        runCommand('git add .', 'Staging all changes');
        runCommand('git commit -m "deploy: update GitHub Pages deployment configuration"', 'Committing changes');
        runCommand('git push origin main', 'Pushing to main branch');
        console.log('✅ Changes committed and pushed successfully');
    } catch (error) {
        console.error('❌ Commit and push failed:', error.message);
        throw error;
    }
}

function buildProject() {
    console.log('\n🏗️  Building project for web deployment...');
    try {
        runCommand('npm run build:web', 'Building web assets');
        
        // Verify public directory exists and has content
        const publicDir = path.join(process.cwd(), 'public');
        if (!fs.existsSync(publicDir)) {
            throw new Error('Public directory not found after build');
        }
        
        const files = fs.readdirSync(publicDir);
        if (files.length === 0) {
            throw new Error('Public directory is empty after build');
        }
        
        console.log(`✅ Build completed - ${files.length} files ready for deployment`);
        return true;
    } catch (error) {
        console.error('❌ Build failed:', error.message);
        throw error;
    }
}

function triggerGitHubPagesDeployment() {
    console.log('\n🚀 Triggering GitHub Pages deployment...');
    try {
        // Check if we're on the main branch
        const currentBranch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim();
        if (currentBranch !== 'main') {
            console.log(`⚠️  Currently on branch: ${currentBranch}`);
            console.log('🔄 Switching to main branch...');
            runCommand('git checkout main', 'Switching to main branch');
        }
        
        // Trigger workflow dispatch
        console.log('🎯 Triggering GitHub Pages workflow...');
        runCommand('gh workflow run deploy-pages.yml', 'Triggering workflow');
        
        console.log('✅ GitHub Pages deployment triggered successfully');
        console.log('🔗 You can monitor the deployment at: https://github.com/Rinawarp-Terminal/rinawarp-terminal/actions');
        
        return true;
    } catch (error) {
        console.error('❌ GitHub Pages deployment trigger failed:', error.message);
        console.log('💡 You can manually trigger the deployment by visiting:');
        console.log('   https://github.com/Rinawarp-Terminal/rinawarp-terminal/actions');
        return false;
    }
}

function printDNSInstructions() {
    console.log('\n📋 DNS Configuration Instructions');
    console.log('=================================');
    console.log('');
    console.log('To point your custom domain to GitHub Pages:');
    console.log('');
    console.log('1. In your Cloudflare DNS settings, update the A record:');
    console.log('   - Type: A');
    console.log('   - Name: @ (root domain)');
    console.log('   - Value: 185.199.108.153');
    console.log('   - TTL: Auto');
    console.log('');
    console.log('2. Also add these additional A records for redundancy:');
    console.log('   - 185.199.109.153');
    console.log('   - 185.199.110.153');
    console.log('   - 185.199.111.153');
    console.log('');
    console.log('3. Keep your existing CNAME record for www:');
    console.log('   - Type: CNAME');
    console.log('   - Name: www');
    console.log('   - Value: rinawarptech.com');
    console.log('');
    console.log('4. In your GitHub repository settings:');
    console.log('   - Go to Settings > Pages');
    console.log('   - Set Source to "Deploy from a branch"');
    console.log('   - Set Branch to "main"');
    console.log('   - Set Custom domain to "rinawarptech.com"');
    console.log('   - Enable "Enforce HTTPS"');
    console.log('');
    console.log('🕐 DNS propagation may take 10-15 minutes');
}

async function main() {
    try {
        // Check git status
        const isClean = checkGitStatus();
        
        // Build the project
        buildProject();
        
        // Commit and push if there are changes
        if (!isClean) {
            commitAndPush();
        }
        
        // Trigger GitHub Pages deployment
        const _deploymentTriggered = triggerGitHubPagesDeployment();
        
        // Print DNS instructions
        printDNSInstructions();
        
        console.log('\n🎉 Deployment process completed!');
        console.log('');
        console.log('🔗 Your site will be available at:');
        console.log('   - https://rinawarp-terminal.github.io/rinawarp-terminal (GitHub Pages URL)');
        console.log('   - https://rinawarptech.com (custom domain, after DNS update)');
        console.log('');
        console.log('📊 Monitor deployment: https://github.com/Rinawarp-Terminal/rinawarp-terminal/actions');
        
    } catch (error) {
        console.error('\n❌ Deployment failed:', error.message);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}

module.exports = { main, buildProject, triggerGitHubPagesDeployment };
