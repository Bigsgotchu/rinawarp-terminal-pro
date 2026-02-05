"use strict";
Object.defineProperty(exports, "__esModule", { value: true });

let mod;
async function load() {
  if (!mod) mod = await import("./index.js");
  return mod;
}

exports.createApiClient = (...args) => load().then(m => m.createApiClient(...args));
exports.APIError = (...args) => load().then(m => m.APIError(...args));
