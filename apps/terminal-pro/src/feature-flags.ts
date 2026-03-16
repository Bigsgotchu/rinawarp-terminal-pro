function envFlag(name: string, fallback: boolean): boolean {
  const raw = process.env[name]
  if (raw == null || raw.trim() === '') return fallback
  return /^(1|true|yes|on)$/i.test(raw.trim())
}

export const featureFlags = {
  structuredSessionV1: envFlag('RINAWARP_FEATURE_STRUCTURED_SESSION_V1', true),
  warpChatUi: envFlag('RINAWARP_FEATURE_WARP_CHAT_UI', true),
  agentAutorun: envFlag('RINAWARP_FEATURE_AGENT_AUTORUN', true),
}
