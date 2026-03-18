# Final Launch Signoff

Date: __________
Verifier run: `npm run verify:prelaunch:full`
Result: `ready`
Owner: __________

## Hard Launch Gates

- [ ] Stripe test checkout completed successfully with a real test card.
- [ ] Stripe webhook upgraded the license in the desktop app after checkout.
- [ ] Free users are blocked from Pro-only agents and Pro-only auto-fix actions.
- [ ] Pro badges are visibly present in the marketplace UI.
- [ ] Analytics shows the expected conversion and usage events after a real flow.

Do not launch publicly until every hard gate above is checked.

## UX Signoff

- [ ] Electron app opens cleanly from the built app without crashing.
- [ ] Terminal input is responsive and command output streams live.
- [ ] Workspace detection correctly identifies an opened project.
- [ ] A failing command surfaces the AI/pro upgrade experience clearly.
- [ ] Upgrade modal shows the correct price and value framing.
- [ ] Marketplace install flow feels clear for both free and blocked Pro agents.

## Revenue Flow

- [ ] `upgrade_clicked` recorded.
- [ ] `checkout_started` recorded.
- [ ] `checkout_completed` recorded.
- [ ] License verification or unlock event recorded.
- [ ] Subscription cancellation or downgrade behavior is understood and acceptable.

Notes:

____________________________________________________________

____________________________________________________________

## Installer Confidence

- [ ] Linux installer tested from a fresh install path.
- [ ] macOS installer tested, if shipping macOS at launch.
- [ ] Windows installer tested, if shipping Windows at launch.
- [ ] Installed app launches successfully after install.
- [ ] Checksums or release artifacts match what you intend to publish.

## Demo And Marketing

- [ ] Demo video reflects the current product behavior.
- [ ] Demo includes marketplace and upgrade flow if those are central to launch messaging.
- [ ] Pricing and product claims match the app and checkout flow.
- [ ] Launch post / landing page copy matches the actual shipped experience.

## Final Decision

- [ ] Approved for public launch
- [ ] Approved for limited/beta launch only
- [ ] Not approved yet

Decision notes:

____________________________________________________________

____________________________________________________________
