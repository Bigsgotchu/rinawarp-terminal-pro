export type CreatePullRequestInput = {
  repoSlug: string // owner/repo
  head: string
  base: string
  title: string
  body?: string
  draft?: boolean
}

export type CreatePullRequestResult =
  | { ok: true; mode: 'dry_run'; payload: Record<string, unknown> }
  | { ok: true; mode: 'live'; number: number; url: string }
  | { ok: false; error: string }

export async function createPullRequest(
  input: CreatePullRequestInput,
  opts?: { dryRun?: boolean }
): Promise<CreatePullRequestResult> {
  const dryRun = opts?.dryRun !== false
  const payload = {
    title: input.title,
    head: input.head,
    base: input.base,
    body: input.body || '',
    draft: !!input.draft,
  }
  if (dryRun) return { ok: true, mode: 'dry_run', payload }

  const token = process.env.GITHUB_TOKEN || ''
  if (!token) return { ok: false, error: 'GITHUB_TOKEN is required for live PR creation' }
  if (!input.repoSlug.includes('/')) return { ok: false, error: 'repoSlug must be owner/repo' }

  const res = await fetch(`https://api.github.com/repos/${input.repoSlug}/pulls`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${token}`,
      'user-agent': 'rinawarp-agentd',
      accept: 'application/vnd.github+json',
    },
    body: JSON.stringify(payload),
  })
  const data = (await res.json()) as any
  if (!res.ok) {
    return { ok: false, error: data?.message || `GitHub API error (${res.status})` }
  }
  return {
    ok: true,
    mode: 'live',
    number: Number(data?.number || 0),
    url: String(data?.html_url || ''),
  }
}
