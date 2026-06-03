/**
 * Generate LinkedIn, Reddit, and DM copy for RinaWarp Terminal Pro v1.8.2-beta
 * This is an outreach preparation tool - NOT an auto-poster
 * Run: node scripts/founder/beta-outreach/generate-posts.mjs
 */

const BETA_VERSION = '1.8.2-beta';
const BETA_GUIDE_URL = 'https://www.rinawarptech.com/beta/';
const DOWNLOAD_URL = 'https://www.rinawarptech.com/download/';
const FEEDBACK_URL = 'https://www.rinawarptech.com/beta-feedback/';

const POSTS = {
  linkedin: `🚀 RinaWarp Terminal Pro v${BETA_VERSION} is ready for private beta testing!

I'm opening Round 1 with Linux-first testing. 

What is RinaWarp Terminal Pro?
A natural-language AI copilot for real computer work. It safely observes, plans, executes, verifies, and attaches proof to meaningful actions across your development environment.

Linux is the recommended first test platform with verified AppImage and .deb builds.

macOS and Windows builds are unsigned beta previews. They may show Gatekeeper or SmartScreen warnings - only test if you're comfortable with unsigned beta software.

Test flow:
1. Install/open the app
2. Select a test project folder
3. Ask Rina: "Build this project and tell me what fails"
4. Confirm Proof appears
5. Export and verify persistence
6. Submit feedback

Use a test project first, not sensitive production repos.

Beta guide: ${BETA_GUIDE_URL}
Download: ${DOWNLOAD_URL}
Feedback: ${FEEDBACK_URL}

#AI #DeveloperTools #BetaTesting #Linux #macOS #Windows`,

  reddit: `[Beta Test] RinaWarp Terminal Pro v${BETA_VERSION} - Natural-language AI copilot for developer work

**TL;DR:** I'm looking for Linux testers for RinaWarp Terminal Pro v1.8.2-beta. It's a natural-language AI copilot that observes, plans, executes, and verifies build/test workflows with proof attached.

**What it does:**
- Runs in your terminal with Agent Thread UI
- Plans safe fixes with approval workflow
- Generates verification proof for every meaningful run
- Works with Node, TypeScript, Next.js, React, Docker, and more

**Platform status:**
- ✅ Linux: Verified AppImage + .deb builds
- ⚠️ macOS/Windows: Unsigned beta previews (may require Gatekeeper/SmartScreen bypass)

**Test flow:**
1. Install from https://www.rinawarptech.com/download/
2. Open a test project (not production repos)
3. Ask: "Build this project and tell me what fails"
4. Verify Proof appears
5. Export proof and confirm persistence
6. Submit feedback at https://www.rinawarptech.com/beta-feedback/

**Beta guide:** https://www.rinawarptech.com/beta/

Looking for 1-2 Linux testers to start. Message me if interested!`,

  dm: `Hi! I'm testing RinaWarp Terminal Pro v${BETA_VERSION} - a natural-language AI copilot for developer workflows. 

Linux builds are verified. macOS/Windows are unsigned beta (Gatekeeper/SmartScreen warnings).

If you're interested in testing: https://www.rinawarptech.com/download/
Beta guide: https://www.rinawarptech.com/beta/
Feedback: https://www.rinawarptech.com/beta-feedback/

Use a test project, not production repos. Let me know if you'd like to join Round 1!`,

  followup: `Hi! Following up on Round 1 beta testing for RinaWarp Terminal Pro v${BETA_VERSION}. 

Still looking for Linux testers to validate the install → first proof flow. 

Key points:
- Linux: Verified AppImage/.deb
- macOS/Windows: Unsigned beta (warnings expected)
- Test project only, not production repos

If interested: https://www.rinawarptech.com/download/

Thanks!`,

  linuxTester: `Hi! I'm reaching out because you're a Linux developer and I'd like to invite you to Round 1 private beta testing for RinaWarp Terminal Pro v${BETA_VERSION}.

It's a natural-language AI copilot for developer workflows - it plans, executes, and verifies build/test commands with proof attached.

Linux builds are verified (AppImage + .deb). The test flow is:
1. Install from ${DOWNLOAD_URL}
2. Open a test project
3. Ask: "Build this project and tell me what fails"
4. Confirm Proof appears
5. Export and verify persistence
6. Submit feedback at ${FEEDBACK_URL}

Would you be interested in joining? I can send more details.`,

  macosWindowsWarning: `macOS/Windows Beta Warning:

Builds for macOS and Windows in v${BETA_VERSION} are unsigned beta previews.

Expected behavior:
- macOS: Gatekeeper will show "Apple cannot check app for malicious software"
- Windows: SmartScreen will show "Windows protected your PC"

To proceed:
- macOS: Right-click app → Open → Click "Open" in dialog
- Windows: Click "More info" → "Run anyway"

Production builds will be signed and notarized before full public release. Only test if you're comfortable with unsigned beta software.`
};

function main() {
  console.log('=== RinaWarp Terminal Pro Beta Outreach Copy ===\n');
  console.log('--- LinkedIn Post ---');
  console.log(POSTS.linkedin);
  console.log('\n--- Reddit Post ---');
  console.log(POSTS.reddit);
  console.log('\n--- DM Template ---');
  console.log(POSTS.dm);
  console.log('\n--- Follow-up DM ---');
  console.log(POSTS.followup);
  console.log('\n--- Linux Tester Invite ---');
  console.log(POSTS.linuxTester);
  console.log('\n--- macOS/Windows Warning ---');
  console.log(POSTS.macosWindowsWarning);
  console.log('\n=== Copy generated. Review and send manually. ===');
}

main();