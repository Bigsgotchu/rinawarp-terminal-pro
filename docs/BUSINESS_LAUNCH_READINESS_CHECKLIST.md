# Business Launch Readiness Checklist

Related operating docs:

- [COMPANY_OPERATING_SYSTEM.md](/home/karina/Documents/rinawarp-terminal-pro/docs/COMPANY_OPERATING_SYSTEM.md)
- [SUPPORT_OPERATING_MODEL.md](/home/karina/Documents/rinawarp-terminal-pro/docs/SUPPORT_OPERATING_MODEL.md)
- [GTM_OPERATING_PLAN.md](/home/karina/Documents/rinawarp-terminal-pro/docs/GTM_OPERATING_PLAN.md)
- [METRICS_SCOREBOARD.md](/home/karina/Documents/rinawarp-terminal-pro/docs/METRICS_SCOREBOARD.md)

This checklist is for the real business surface around **RinaWarp Terminal Pro** and **RinaWarp Technologies, LLC**, not just the app binary.

The goal is simple:

- a user can discover the product
- understand it
- buy it
- install it
- access what they paid for
- recover if something goes wrong
- get help without guessing

If any one of those is fake, unclear, or brittle, the business is not launch-ready.

## 1. Brand and Public Identity

- [ ] Product naming is consistent everywhere as `RinaWarp Terminal Pro`
- [ ] Company naming is consistent everywhere as `RinaWarp Technologies, LLC`
- [ ] Brand shorthand, if used, is controlled and consistent
- [ ] Logo assets are complete for:
  - website
  - app icon
  - social/avatar
  - print/business card
- [ ] Footer, legal pages, and contact pages all use the same company identity
- [ ] Public messaging matches the real product wedge:
  - proof
  - trust
  - recovery
  - conversational resilience

## 2. Website Readiness

- [ ] Homepage matches the actual product promise
- [ ] Download page matches actual supported platforms
- [ ] Pricing page matches live checkout behavior
- [ ] `Early Access` labeling is visible where appropriate
- [ ] Product screenshots are current
- [ ] Docs page exists and is not placeholder
- [ ] Support/contact page exists and is real
- [ ] Feedback form works end to end
- [ ] SEO basics are complete:
  - title tags
  - descriptions
  - Open Graph
  - favicon
  - logo asset

## 3. Accounts, Login, and Identity

Decide this explicitly before launch:

- [ ] We know whether MVP is:
  - no account system
  - email-based purchase/restore
  - full login/password system

If there is **no full login system** yet:

- [ ] site/app do not imply username-password login exists
- [ ] purchase/restore flow is clearly email-based
- [ ] entitlement recovery is understandable
- [ ] support can manually help recover access

If there **is** a login system:

- [ ] registration works
- [ ] login works
- [ ] logout works
- [ ] password reset works
- [ ] email verification works
- [ ] bad credential errors are clear and safe
- [ ] session persistence and expiry are acceptable

## 4. Billing and Entitlements

- [ ] pricing page matches live Stripe products and price IDs
- [ ] checkout works in production
- [ ] successful purchase grants the correct paid tier
- [ ] restore purchase works
- [ ] billing portal works
- [ ] failed checkout behavior is understandable
- [ ] cancellation flow is understood
- [ ] downgrade behavior is defined
- [ ] refund policy exists and is linked
- [ ] support can diagnose entitlement mismatch issues

## 5. Registration and Onboarding

- [ ] first visit makes the product understandable in under 2 minutes
- [ ] first install path is obvious
- [ ] onboarding copy matches the actual product behavior
- [ ] first-run empty state feels real and helpful
- [ ] post-purchase next step is obvious:
  - download
  - install
  - activate or restore
  - refresh entitlement if needed

## 6. Passwords, Secrets, and Security

- [ ] passwords, if used, are stored securely
- [ ] reset tokens expire correctly
- [ ] support/admin credentials are protected
- [ ] Stripe secrets are stored securely
- [ ] Cloudflare secrets are stored securely
- [ ] publish/admin routes are protected
- [ ] no dev auth paths remain reachable in production
- [ ] no fake checkout or mock billing path remains in production

## 7. Downloads, Installers, and Updates

- [ ] public download routes point to the current release
- [ ] checksums and release manifest are public
- [ ] Linux package guidance is honest
- [ ] Windows installer guidance is honest
- [ ] unsupported platforms are labeled clearly
- [ ] installed app can check for updates honestly
- [ ] updater claims match reality
- [ ] release channels are understood:
  - early access
  - stable
  - future beta/canary if applicable

## 8. Platform Support Boundaries

- [ ] supported platforms are listed plainly
- [ ] unsupported platforms are listed plainly
- [ ] Linux guidance is specific:
  - `.deb` recommended for Debian/Ubuntu desktop systems
  - AppImage is updater-oriented and assumes desktop runtime libraries
- [ ] macOS status is honest if not launched
- [ ] Windows status is honest if still under validation

## 9. Feedback and Support

- [ ] feedback form works
- [ ] support email is live
- [ ] contact page is real
- [ ] support/export diagnostics path exists
- [ ] users can report:
  - install issues
  - billing issues
  - product bugs
  - entitlement/access issues
- [ ] support response expectations are defined internally
- [ ] there is a standard triage path for launch issues

## 10. Legal and Policy Surface

- [ ] Terms of Service exists
- [ ] Privacy Policy exists
- [ ] Refund/cancellation policy exists
- [ ] support policy exists or is embedded in docs
- [ ] data/analytics disclosure is honest
- [ ] footer links are complete and working

## 11. Product-to-Business Consistency

- [ ] pricing language matches what Pro actually unlocks
- [ ] website claims match the current app
- [ ] app gating matches the pricing page
- [ ] marketplace/capability messaging does not overstate maturity
- [ ] trust/proof language matches actual product behavior

## 12. Analytics and Business Metrics

You should be able to answer:

- who visited
- who clicked download
- who started checkout
- who completed checkout
- who installed
- who activated Pro
- who hit repeated failure states

Checklist:

- [ ] website traffic is measurable
- [ ] download clicks are measurable
- [ ] checkout start is measurable
- [ ] checkout completion is measurable
- [ ] entitlement activation is measurable
- [ ] support volume is measurable
- [ ] failure patterns can be identified without guessing

## 12A. Companion Revenue Surface

- [ ] `RinaWarp Companion` messaging matches the actual shipped extension surface
- [ ] Companion chat, diagnostics, and telemetry validation are green via `npm run test:companion`
- [ ] Companion account-linking and entitlement-refresh flows are documented and supportable
- [ ] Companion upgrade links and pack links still land on the intended website surfaces
- [ ] Companion does not claim proof-backed execution depth beyond what the extension currently supports

## 13. Post-Purchase Customer Flow

- [ ] buyer knows what to do immediately after purchase
- [ ] post-purchase messaging exists
- [ ] restore purchase flow is documented
- [ ] support path for “I paid but it didn’t unlock” is documented
- [ ] release notes or changelog exists
- [ ] known issues are either documented or support-ready

## 14. Recovery and Customer Trust

- [ ] a customer can recover access if:
  - they switch devices
  - the app loses entitlement state
  - the installer breaks
  - billing state is out of sync
- [ ] support can identify a customer using:
  - purchase email
  - customer ID
  - app version
  - run IDs / diagnostics if needed

## 15. Founder/Ops Safety

- [ ] domain ownership is documented
- [ ] Stripe ownership/access is documented
- [ ] Cloudflare ownership/access is documented
- [ ] release artifacts are retained
- [ ] billing contacts are current
- [ ] renewal/billing reminders exist
- [ ] support inbox ownership is documented

## 16. Recommended MVP Identity Model

For this stage, the safest business model is:

- no full username/password product account unless truly necessary
- email-based purchase and entitlement restore first
- extremely clear restore/help flows

That keeps the launch simpler and reduces auth complexity while the product is still in Early Access.

## 17. Launch Decision Rule

Do not call the business launch-ready unless all of these are true:

- users can buy successfully
- users can access what they paid for
- users can restore access if something breaks
- users can reach support
- policies match actual behavior
- platform support boundaries are honest
- no core billing/auth/feedback flow is fake or partial

## 18. Current Likely Founder Misses

These are the things early products most often forget:

- password reset flow
- restore-purchase clarity
- refund/cancellation wording
- post-purchase onboarding
- support/export diagnostics instructions
- platform support boundaries
- updater claims that are stronger than reality
- stale pricing or old release references on the site

If those are not addressed, users experience the business as unfinished even if the product itself is good.
