const https = require('https');
const http = require('http');

const endpointDebugger = {
  testEndpoints: [
    'https://rinawarp-terminal.web.app/',
    'https://rinawarp-terminal.web.app/index.html',
    'https://rinawarp-terminal.web.app/pricing.html',
    'https://rinawarp-terminal.web.app/about.html',
    'https://rinawarp-terminal.web.app/contact.html',
    'https://rinawarp-terminal.web.app/features.html',
    'https://rinawarp-terminal.web.app/css/styles.css',
    'https://rinawarp-terminal.web.app/js/main.js'
  ],

  async testEndpoint(url) {
    return new Promise((resolve) => {
      const protocol = url.startsWith('https') ? https : http;
      const req = protocol.get(url, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
          resolve({
            url,
            status: res.statusCode,
            headers: res.headers,
            contentLength: data.length,
            contentType: res.headers['content-type'] || 'unknown'
          });
        });
      });
      
      req.on('error', (error) => {
        resolve({
          url,
          status: 'ERROR',
          error: error.message
        });
      });
      
      req.setTimeout(10000, () => {
        req.destroy();
        resolve({
          url,
          status: 'TIMEOUT',
          error: 'Request timed out'
        });
      });
    });
  },

  async runTests() {
    console.log('🔍 Testing Firebase hosting endpoints...\n');
    
    for (const url of this.testEndpoints) {
      const result = await this.testEndpoint(url);
      
      if (result.status === 200) {
        console.log(`✅ ${url}`);
        console.log(`   Status: ${result.status}`);
        console.log(`   Content-Type: ${result.contentType}`);
        console.log(`   Content-Length: ${result.contentLength} bytes`);
      } else {
        console.log(`❌ ${url}`);
        console.log(`   Status: ${result.status}`);
        if (result.error) {
          console.log(`   Error: ${result.error}`);
        }
      }
      console.log('');
    }
  }
};

endpointDebugger.runTests().catch(console.error);
