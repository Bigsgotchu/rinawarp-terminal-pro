#!/usr/bin/env node
import { runExternalVerifier } from "./attestationVerifier.js";

async function main(): Promise<void> {
  const strict = String(process.env.RINAWARP_VERIFIER_STRICT || "true").trim().toLowerCase() !== "false";
  const out = await runExternalVerifier();
  process.stdout.write(`${JSON.stringify(out)}\n`);
  if (!out.ok && strict) process.exitCode = 2;
}

void main();
