/**
 * RinaWarp SEO Module
 * Dynamically injects SEO meta tags for all pages
 */

export interface SeoData {
  title: string
  description: string
  canonical: string
  ogImage: string
  keywords?: string
}

export const SEO_CONFIG: Record<string, SeoData> = {
  '/': {
    title: 'RinaWarp Terminal Pro | Proof-First AI Workbench',
    description:
      'Talk to Rina naturally in RinaWarp Terminal Pro, let her act through one trusted path, and keep proof, receipts, and recovery attached to the work.',
    canonical: 'https://rinawarptech.com/',
    ogImage: 'https://rinawarptech.com/assets/img/rinawarp-logo.png',
    keywords:
      'AI workbench, proof-first AI, agent workflow, developer tools, trusted execution, run receipts, developer productivity',
  },
  '/agents': {
    title: 'RinaWarp Terminal Pro Marketplace | Capability Packs',
    description:
      'Browse capability packs and curated agents for RinaWarp. Install focused tooling for deployment, diagnostics, security, and repeated workflows.',
    canonical: 'https://rinawarptech.com/agents',
    ogImage: 'https://rinawarptech.com/assets/img/rinawarp-logo.png',
    keywords: 'capability packs, AI agents, marketplace, RinaWarp, developer tools, automation',
  },
  '/pricing': {
    title: 'RinaWarp Terminal Pro Pricing | Trust, Recovery, and Execution',
    description:
      'Choose the RinaWarp plan that fits your workflow. Pay for proof-backed execution, recovery, and an agent-first desktop experience that stays understandable.',
    canonical: 'https://rinawarptech.com/pricing',
    ogImage: 'https://rinawarptech.com/assets/img/rinawarp-logo.png',
    keywords: 'pricing, subscription, RinaWarp, plans, proof-backed AI, agent workbench',
  },
  '/download': {
    title: 'Download RinaWarp Terminal Pro | Verified Releases',
    description:
      'Download verified RinaWarp releases for Linux and Windows, inspect the live manifest, and verify integrity with published checksums.',
    canonical: 'https://rinawarptech.com/download',
    ogImage: 'https://rinawarptech.com/assets/img/rinawarp-logo.png',
    keywords: 'download, RinaWarp, verified releases, checksums, AppImage, deb, exe',
  },
  '/feedback': {
    title: 'Support & Feedback | RinaWarp Terminal Pro',
    description:
      'Reach the RinaWarp team with product feedback, support requests, launch questions, and capability requests.',
    canonical: 'https://rinawarptech.com/feedback',
    ogImage: 'https://rinawarptech.com/assets/img/rinawarp-logo.png',
    keywords: 'feedback, support, contact, RinaWarp, bug report, launch support',
  },
  '/docs': {
    title: 'RinaWarp Terminal Pro Docs | Getting Started',
    description:
      'Learn how to use RinaWarp: start from the Agent surface, inspect proof, recover work, and understand what Rina actually did.',
    canonical: 'https://rinawarptech.com/docs',
    ogImage: 'https://rinawarptech.com/assets/img/rinawarp-logo.png',
    keywords: 'documentation, docs, RinaWarp, getting started, proof-backed execution, recovery',
  },
  '/early-access': {
    title: 'Early Access Policy | RinaWarp Terminal Pro',
    description:
      'Understand what Early Access means for RinaWarp Terminal Pro, including release safety, restore guidance, and current platform limits.',
    canonical: 'https://rinawarptech.com/early-access',
    ogImage: 'https://rinawarptech.com/assets/img/rinawarp-logo.png',
    keywords: 'early access, RinaWarp, restore, release policy, proof-first AI terminal',
  },
}

export function injectSeoTags(path: string): string {
  // Normalize path - remove trailing slash except for root
  const normalizedPath = path === '/' ? '/' : path.replace(/\/$/, '')

  const seo = SEO_CONFIG[normalizedPath] || SEO_CONFIG['/']
  const structuredData = buildStructuredData(normalizedPath, seo)

  const metaTags = `
  <!-- Primary Meta Tags -->
  <title>${seo.title}</title>
  <meta name="description" content="${seo.description}">
  ${seo.keywords ? `<meta name="keywords" content="${seo.keywords}">` : ''}
  <meta name="author" content="RinaWarp Technologies, LLC">

  <!-- Canonical URL -->
  <link rel="canonical" href="${seo.canonical}">

  <!-- Open Graph / Facebook -->
  <meta property="og:type" content="website">
  <meta property="og:title" content="${seo.title}">
  <meta property="og:description" content="${seo.description}">
  <meta property="og:url" content="${seo.canonical}">
  <meta property="og:image" content="${seo.ogImage}">
  <meta property="og:site_name" content="RinaWarp Terminal Pro">

  <!-- Twitter Cards -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${seo.title}">
  <meta name="twitter:description" content="${seo.description}">
  <meta name="twitter:image" content="${seo.ogImage}">
  <meta name="twitter:site" content="@RinaWarpTech">

  <!-- Favicon -->
  <link rel="icon" href="/assets/img/icon.png" type="image/png">
  <link rel="shortcut icon" href="/assets/img/icon.png" type="image/png">
  <link rel="apple-touch-icon" href="/assets/img/icon.png">
  <script type="application/ld+json">${structuredData}</script>
  
  <!-- Preconnect to external domains for performance -->

  <!-- Content Security Policy -->
  <meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://static.cloudflareinsights.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self';">
  
  <!-- Base URL for relative links -->
  <base href="/">
`

  return metaTags
}

function buildStructuredData(path: string, seo: SeoData): string {
  const graph: Array<Record<string, unknown>> = [
    {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: 'RinaWarp Technologies, LLC',
      url: 'https://rinawarptech.com',
      logo: 'https://rinawarptech.com/assets/img/rinawarp-logo.png',
    },
    {
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      name: 'RinaWarp Terminal Pro',
      applicationCategory: 'DeveloperApplication',
      operatingSystem: 'Windows, Linux',
      url: seo.canonical,
      description: seo.description,
      publisher: {
        '@type': 'Organization',
        name: 'RinaWarp Technologies, LLC',
      },
    },
  ]

  if (path === '/pricing' || path === '/early-access') {
    graph.push({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: 'What is RinaWarp Terminal Pro?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'RinaWarp Terminal Pro is a proof-first AI workbench for build, test, deploy, and recovery workflows.',
          },
        },
        {
          '@type': 'Question',
          name: 'How do restore and updates work?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'The canonical release surface is rinawarptech.com/releases, and paid access can be recovered through the billing-email restore path.',
          },
        },
      ],
    })
  }

  return JSON.stringify(graph)
}

// Helper to inject SEO into existing HTML head
export function injectIntoHead(html: string, path: string): string {
  const seoTags = injectSeoTags(path)

  // Replace the existing head content with SEO tags
  // This regex matches <head>...</head> and replaces content inside
  return html.replace(/<head>([\s\S]*?)<\/head>/i, `<head>\n${seoTags}\n</head>`)
}

// Enhanced SEO injection with performance optimizations (lazy loading, etc.)
export function injectOptimizedSeo(path: string, html: string): string {
  const seoTags = injectSeoTags(path)

  // Inject SEO into head
  let result = html.replace(/<head>([\s\S]*?)<\/head>/i, `<head>\n${seoTags}\n</head>`)

  // Add loading="lazy" to img tags that don't already have it
  result = result.replace(/<img(?!.*loading=)(.*?)src="(.*?)"(.*?)>/gi, '<img$1 src="$2" loading="lazy"$3>')

  return result
}
