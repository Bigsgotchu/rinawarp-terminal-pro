export function isPremiumTierUnlocked(tier: unknown): boolean {
  const normalized = String(tier || 'free').trim().toLowerCase()
  return normalized !== 'free' && normalized !== 'starter'
}

