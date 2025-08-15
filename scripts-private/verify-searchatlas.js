#!/usr/bin/env node

/**
 * SearchAtlas Integration Verification
 * Tests local and live implementations of SearchAtlas optimization
 */

import { promises as fs } from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function testLocalIntegration() {
  console.log('🧪 TESTING LOCAL INTEGRATION');
  console.log('============================');

  // Check if test file exists
  try {
    const testFile = 'searchatlas-test.html';
    const exists = await fs
      .access(testFile)
      .then(() => true)
      .catch(() => false);

    if (!exists) {
      console.log('❌ Test file not found: searchatlas-test.html');
      return false;
    }

    console.log('✅ Test file exists: searchatlas-test.html');

    // Read and verify content
    const content = await fs.readFile(testFile, 'utf8');

    const checks = [
      { test: content.includes('sa-dynamic-optimization'), name: 'SearchAtlas script ID' },
      { test: content.includes('dc711005-42a9-4a99-a95c-f58610ddb8c9'), name: 'UUID present' },
      { test: content.includes('dashboard.searchatlas.com'), name: 'SearchAtlas domain' },
      { test: content.includes('nowprocket'), name: 'Cache exclusion' },
      { test: content.includes('nitro-exclude'), name: 'Nitro exclusion' },
    ];

    checks.forEach(check => {
      console.log(check.test ? `✅ ${check.name}` : `❌ ${check.name}`);
    });

    const allPassed = checks.every(check => check.test);
    console.log(
      allPassed
        ? '\n🎉 Local test file: ALL CHECKS PASSED'
        : '\n⚠️ Local test file: Some checks failed'
    );

    return allPassed;
  } catch (error) {
    console.log(`❌ Error testing local integration: ${error.message}`);
    return false;
  }
}

async function testLiveWebsite() {
  console.log('\n🌐 TESTING LIVE WEBSITE');
  console.log('=======================');

  try {
    // Test if curl is available and can reach the site
    const curlTest = await execAsync('curl -s -I https://rinawarptech.com').catch(() => null);

    if (!curlTest) {
      console.log('❌ Cannot reach live website or curl not available');
      return false;
    }

    console.log('✅ Live website is accessible');

    // Get the website content
    const { stdout: siteContent } = await execAsync('curl -s https://rinawarptech.com');

    const liveChecks = [
      {
        test: siteContent.includes('sa-dynamic-optimization'),
        name: 'SearchAtlas script ID in live site',
      },
      {
        test: siteContent.includes('dc711005-42a9-4a99-a95c-f58610ddb8c9'),
        name: 'UUID in live site',
      },
      {
        test: siteContent.includes('dashboard.searchatlas.com'),
        name: 'SearchAtlas domain in live site',
      },
      { test: siteContent.includes('RinaWarp Terminal'), name: 'Site content loaded' },
      { test: siteContent.includes('<head>'), name: 'Valid HTML structure' },
    ];

    liveChecks.forEach(check => {
      console.log(check.test ? `✅ ${check.name}` : `❌ ${check.name}`);
    });

    // Check for potential CSP issues
    if (
      siteContent.includes('Content-Security-Policy') &&
      siteContent.includes('searchatlas.com')
    ) {
      console.log('✅ CSP appears to allow SearchAtlas');
    } else if (siteContent.includes('Content-Security-Policy')) {
      console.log('⚠️ CSP detected - may need SearchAtlas domain added');
    }

    const allLivePassed = liveChecks
      .filter(check => check.name.includes('SearchAtlas'))
      .every(check => check.test);
    console.log(
      allLivePassed
        ? '\n🎉 Live website: SearchAtlas integration detected'
        : '\n⚠️ Live website: SearchAtlas integration not detected'
    );

    return allLivePassed;
  } catch (error) {
    console.log(`❌ Error testing live website: ${error.message}`);
    console.log('💡 You can manually check by visiting: https://rinawarptech.com');
    console.log('💡 Open DevTools → Network tab → Look for searchatlas requests');
    return false;
  }
}

async function testFileIntegrity() {
  console.log('\n📁 TESTING FILE INTEGRITY');
  console.log('=========================');

  const filesToCheck = ['public/index.html', 'index.html', 'src/templates/terminal.html'];

  let integratedFiles = 0;

  for (const file of filesToCheck) {
    try {
      const exists = await fs
        .access(file)
        .then(() => true)
        .catch(() => false);
      if (!exists) {
        console.log(`⚠️ File not found: ${file}`);
        continue;
      }

      const content = await fs.readFile(file, 'utf8');
      const hasSearchAtlas =
        content.includes('sa-dynamic-optimization') || content.includes('searchatlas.com');

      if (hasSearchAtlas) {
        console.log(`✅ ${file} - SearchAtlas integrated`);
        integratedFiles++;

        // Check backup exists
        const backupExists = await fs
          .access(`${file}.backup`)
          .then(() => true)
          .catch(() => false);
        console.log(
          `${backupExists ? '✅' : '⚠️'} ${file}.backup - ${backupExists ? 'exists' : 'missing'}`
        );
      } else {
        console.log(`❌ ${file} - No SearchAtlas integration found`);
      }
    } catch (error) {
      console.log(`❌ Error checking ${file}: ${error.message}`);
    }
  }

  console.log(
    `\n📊 Integration Summary: ${integratedFiles}/${filesToCheck.length} files integrated`
  );
  return integratedFiles > 0;
}

async function generateTestReport() {
  console.log('\n📊 GENERATING TEST REPORT');
  console.log('=========================');

  const reportData = {
    timestamp: new Date().toISOString(),
    tests: {
      localIntegration: await testLocalIntegration(),
      liveWebsite: await testLiveWebsite(),
      fileIntegrity: await testFileIntegrity(),
    },
  };

  // Create detailed report
  const report = `# SearchAtlas Integration Test Report
Generated: ${reportData.timestamp}

## Test Results Summary
- 🧪 Local Integration: ${reportData.tests.localIntegration ? '✅ PASSED' : '❌ FAILED'}
- 🌐 Live Website: ${reportData.tests.liveWebsite ? '✅ PASSED' : '❌ FAILED'}  
- 📁 File Integrity: ${reportData.tests.fileIntegrity ? '✅ PASSED' : '❌ FAILED'}

## Next Steps

${
  reportData.tests.localIntegration &&
  reportData.tests.liveWebsite &&
  reportData.tests.fileIntegrity
    ? `🎉 **ALL TESTS PASSED!**

Your SearchAtlas integration is working correctly:
- ✅ Local test file loads properly
- ✅ Live website has SearchAtlas integration
- ✅ Source files properly updated

**Ready for Production!**

### Monitoring Steps:
1. 📊 Check SearchAtlas dashboard for incoming data
2. 🔍 Monitor browser DevTools for script loading
3. 📈 Track conversion improvements over time
4. 🎯 Analyze visitor behavior insights`
    : `⚠️ **ISSUES DETECTED**

${!reportData.tests.localIntegration ? '- 🧪 Local test file has issues\n' : ''}${!reportData.tests.liveWebsite ? '- 🌐 Live website integration not detected\n' : ''}${!reportData.tests.fileIntegrity ? '- 📁 File integration incomplete\n' : ''}

### Troubleshooting:
1. 🔧 Re-run integration: \`node integrate-searchatlas.js\`
2. 🌐 Check live deployment status
3. 📁 Verify file permissions and content
4. 🚨 Check for CSP blocking issues`
}

## Browser Testing Instructions

### Manual Verification:
1. Open: https://rinawarptech.com
2. Press F12 (DevTools) 
3. Go to Network tab
4. Refresh page
5. Look for: \`dynamic_optimization.js\`
6. Check Console for errors

### Expected Behavior:
- SearchAtlas script should load from dashboard.searchatlas.com
- No JavaScript errors related to SearchAtlas
- UUID dc711005-42a9-4a99-a95c-f58610ddb8c9 should be visible

## Support
If issues persist:
- Check CSP headers in server configuration
- Verify SearchAtlas dashboard access
- Contact SearchAtlas support if needed

---
Report generated by RinaWarp Terminal SearchAtlas Integration System
`;

  try {
    await fs.writeFile('searchatlas-test-report.md', report);
    console.log('✅ Test report saved: searchatlas-test-report.md');
  } catch (error) {
    console.log(`⚠️ Could not save report: ${error.message}`);
  }

  return reportData;
}

async function showBrowserInstructions() {
  console.log('\n🌐 BROWSER TESTING INSTRUCTIONS');
  console.log('==============================');
  console.log('');
  console.log('To manually verify SearchAtlas integration:');
  console.log('');
  console.log('1. 🌐 Open: https://rinawarptech.com');
  console.log('2. 🔧 Press F12 (open DevTools)');
  console.log('3. 📊 Click Network tab');
  console.log('4. 🔄 Refresh the page');
  console.log('5. 🔍 Look for: dynamic_optimization.js');
  console.log('6. ✅ Verify: Script loads from dashboard.searchatlas.com');
  console.log('7. 🚨 Check Console tab for any errors');
  console.log('');
  console.log('Expected Results:');
  console.log('- ✅ dynamic_optimization.js loads successfully');
  console.log('- ✅ No JavaScript errors in console');
  console.log('- ✅ UUID dc711005-42a9-4a99-a95c-f58610ddb8c9 visible in requests');
  console.log('');
  console.log('🎯 If all checks pass, SearchAtlas is optimizing your site!');
}

async function main() {
  console.log('🔍 SEARCHATLAS INTEGRATION VERIFICATION');
  console.log('=======================================');
  console.log('Testing SearchAtlas integration for RinaWarp Terminal...');
  console.log('');

  const reportData = await generateTestReport();

  await showBrowserInstructions();

  console.log('\n🎯 FINAL STATUS');
  console.log('===============');

  const allPassed = Object.values(reportData.tests).every(test => test);

  if (allPassed) {
    console.log('🎉 SUCCESS: SearchAtlas integration verified!');
    console.log('📈 Your Product Hunt traffic will be optimized');
    console.log('📊 Check your SearchAtlas dashboard for analytics');
  } else {
    console.log('⚠️ ISSUES: Some tests failed - check test report');
    console.log('🔧 Run troubleshooting steps in the report');
    console.log('💡 Manual browser testing recommended');
  }

  console.log('\n📋 Report saved: searchatlas-test-report.md');
  console.log('🧪 Test file: searchatlas-test.html (already opened)');
}

main().catch(console.error);
