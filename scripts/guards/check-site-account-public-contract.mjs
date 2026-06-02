import { readFileSync } from "node:fs";

function extractBetween(source, startMarker, endMarker, label) {
  const start = source.indexOf(startMarker);
  if (start < 0) {
    throw new Error(`Missing ${label} start marker: ${startMarker}`);
  }
  const end = source.indexOf(endMarker, start + startMarker.length);
  if (end < 0) {
    throw new Error(`Missing ${label} end marker: ${endMarker}`);
  }
  return source.slice(start, end);
}

const router = readFileSync("website/workers/router.ts", "utf8");
const staticBuilder = readFileSync("scripts/build/build-pages-site.mjs", "utf8");

const accountSurfaces = [
  {
    label: "worker account route",
    body: extractBetween(router, "function renderAccount(", "\nexport default", "worker account route"),
  },
  {
    label: "static account page",
    body: extractBetween(staticBuilder, 'route: "account"', 'route: "success"', "static account page"),
  },
];

const homeSurfaces = [
  {
    label: "worker homepage",
    body: extractBetween(router, "function renderHomepage(", "\nfunction renderProducts", "worker homepage"),
  },
  {
    label: "static homepage",
    body: extractBetween(staticBuilder, 'route: ""', 'route: "products"', "static homepage"),
  },
];

const required = [
  "Manage your RinaWarp account",
  "Your account",
  "No paid subscription found",
  "Restore purchase",
  "Download Terminal Pro",
  "Upgrade to Pro",
  "Restore access",
  "Referral link",
  "Manage billing",
];

const forbidden = [
  "Referral lookup",
  "Support can look up",
  "Owner email",
  "Lookup referral",
  "Sign in to your account",
  "Sign In",
  "Create Account",
  "Early Access Policy",
  "Loading your account",
  "Open billing portal",
  "Restore Pro access",
  "Check restore status",
  "support boundaries",
  "loop is real",
  "hand-wavy",
];

let failed = false;

for (const surface of accountSurfaces) {
  for (const needle of required) {
    if (!surface.body.includes(needle)) {
      console.error(`[site-account-contract] ${surface.label} missing required text: ${needle}`);
      failed = true;
    }
  }

  for (const needle of forbidden) {
    if (surface.body.includes(needle)) {
      console.error(`[site-account-contract] ${surface.label} contains forbidden public account text: ${needle}`);
      failed = true;
    }
  }
}

const homeRequired = [
  "Your project is broken. RinaWarp fixes it.",
  "What RinaWarp Can Do",
  "Analyze Repositories",
  "Repair Broken Builds",
  "Verify Results",
  "Explain Changes",
  "Three Steps",
  "Built for Developers",
  "Real Terminal Pro Interface",
  "Ready to stop debugging and start shipping?",
];

const homeForbidden = [
  "Your AI copilot for real computer work",
  "Terminal Pro observes, plans, and executes across your development environment",
  "What Terminal Pro Can Do",
  "Fix your broken project automatically.",
  "Simple pricing",
  "Start free, pay when the workflow proves itself",
  "Explore the product line",
];

for (const surface of homeSurfaces) {
  for (const needle of homeRequired) {
    if (!surface.body.includes(needle)) {
      console.error(`[site-account-contract] ${surface.label} missing required text: ${needle}`);
      failed = true;
    }
  }

  for (const needle of homeForbidden) {
    if (surface.body.includes(needle)) {
      console.error(`[site-account-contract] ${surface.label} contains forbidden homepage text: ${needle}`);
      failed = true;
    }
  }
}

if (failed) {
  process.exit(1);
}

console.log("[site-account-contract] public account surfaces match the customer dashboard contract");
