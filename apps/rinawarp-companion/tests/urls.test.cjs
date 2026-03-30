const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const distPath = (...parts) => path.join(__dirname, '..', 'dist', ...parts);

test('createPurchaseVerificationUrl preserves the callback return target', async () => {
  const urls = require(distPath('rinawarpUrls.js'));
  const url = urls.createPurchaseVerificationUrl(
    'https://rinawarptech.com',
    {
      campaign: 'rinawarp_vscode_launch_q2_2026',
      content: 'verify_purchase_return',
    },
    'vscode://RinawarpTech.rinawarp-companion/purchase-complete',
  );

  assert.equal(url.origin, 'https://rinawarptech.com');
  assert.equal(url.pathname, '/verify/companion-purchase/');
  assert.equal(url.searchParams.get('return_to'), 'vscode://RinawarpTech.rinawarp-companion/purchase-complete');
  assert.equal(url.searchParams.get('utm_content'), 'verify_purchase_return');
});
