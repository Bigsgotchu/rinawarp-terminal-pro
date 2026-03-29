# Support Inbox Workflow

Date: 2026-03-29

This is the founder-led support triage workflow for `RinaWarp Terminal Pro` during paid early access.

Goal:

- protect revenue
- rescue blocked customers fast
- turn repeated issues into product fixes

## Daily Inbox Pass

Run this twice per day at minimum:

1. morning pass
2. late afternoon pass

If launch volume spikes, add one midday pass.

## Triage Order

Always handle messages in this order:

1. paid customer cannot install
2. paid customer cannot unlock or restore
3. checkout/billing issue
4. launch-blocking product confusion
5. normal bug report
6. feature request

## Inbox Labels

Use one category label:

- `install`
- `billing`
- `unlock`
- `restore`
- `product`
- `feature`

Use one severity label:

- `sev1`
- `sev2`
- `sev3`

Use one state label:

- `new`
- `waiting-on-customer`
- `investigating`
- `resolved`
- `product-followup`

## First Response Checklist

Every first response should answer:

1. did we understand the problem?
2. what exact next step should the customer take?
3. what exact information do we need back?

Do not send a vague acknowledgment by itself.

## Intake Template

Copy this into the ticket or email draft:

```text
Version:
Platform:
Paid / trial / free:
Category:
Severity:
Problem summary:
What the customer expected:
What actually happened:
Screenshot attached:
Purchase email:
Customer ID:
Run ID / receipt ID:
```

## Fast Paths

### Install

Ask for:

- platform
- exact installer used
- screenshot or copy of error
- whether the app opened at all

Resolve with:

- correct download link
- supported-platform clarification
- reinstall or fresh-launch guidance

### Billing

Ask for:

- purchase email
- whether checkout opened
- whether checkout completed
- screenshot or copy of billing error

Resolve with:

- billing portal link
- checkout retry guidance
- manual confirmation of current paid status

### Unlock / Restore

Ask for:

- purchase email
- customer ID if available
- current app version
- screenshot of current tier state

Resolve with:

- restore purchase steps
- refresh entitlement steps
- manual entitlement verification if needed

## Escalation Rule

Escalate from support to product immediately if:

- the same issue appears three times
- a paid customer is blocked for more than one business day
- install failure affects a supported platform
- checkout succeeds but activation fails

When escalation happens, create a product follow-up note with:

- exact repro
- number of affected users
- revenue risk
- whether there is a workaround

## Founder Decision Rule

Until revenue is steadier, prioritize:

1. install rescue
2. unlock rescue
3. restore rescue
4. pricing and download clarity
5. first-run onboarding fixes

Do not spend founder time on lower-value polish before blocked-customer issues are handled.

## Signing Spend Rule

Windows and macOS signing are important, but they are not the first spend if:

- customers can still install and use supported current builds
- support can rescue install issues quickly
- billing and activation are the bigger revenue risk

Make signing the next funded release investment when:

- you have enough revenue to pay for certificates without stressing cash
- support sees repeated Windows trust or installer warnings
- install friction becomes a clearer revenue blocker than onboarding or billing

## End-of-Day Review

At the end of each day, write down:

- number of new issues
- number of paid-customer blockers
- top recurring issue
- one product fix candidate
- whether signing moved up or down in priority
