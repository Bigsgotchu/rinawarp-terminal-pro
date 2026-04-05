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

const GA_MEASUREMENT_ID = 'G-YGX1R0MEB6'

export const SEO_CONFIG: Record<string, SeoData> = {
  '/': {
    title: 'RinaWarp | Proof-First AI Workbench Platform',
    description:
      'RinaWarp is a proof-first AI workbench platform with Terminal Pro for serious execution and Companion for the fastest chat-first VS Code start.',
    canonical: 'https://rinawarptech.com/',
    ogImage: 'https://rinawarptech.com/assets/img/rinawarp-logo.png',
    keywords:
      'AI workbench, proof-first AI, terminal pro, VS Code companion chat, agent workflow, developer tools, trusted execution, run receipts',
  },
  '/agents': {
    title: 'RinaWarp Packs | Capability Packs for RinaWarp Terminal Pro',
    description:
      'Browse capability packs for RinaWarp Terminal Pro. Add focused workflows for deployment, diagnostics, security, and repeated developer tasks.',
    canonical: 'https://rinawarptech.com/agents',
    ogImage: 'https://rinawarptech.com/assets/img/rinawarp-logo.png',
    keywords: 'capability packs, AI agents, marketplace, RinaWarp, developer tools, automation',
  },
  '/pricing': {
    title: 'RinaWarp Pricing | Fix Your Broken Project Automatically',
    description:
      'See RinaWarp pricing for Free, Pro, Power, and one-fix checkout plans built around one promise: fix your broken project automatically with proof.',
    canonical: 'https://rinawarptech.com/pricing',
    ogImage: 'https://rinawarptech.com/assets/img/rinawarp-logo.png',
    keywords: 'pricing, fix project, developer tool pricing, RinaWarp, AI repair, proof-backed fixes',
  },
  '/download': {
    title: 'Download RinaWarp Terminal Pro | Verified AI Terminal Releases',
    description:
      'Download verified RinaWarp Terminal Pro releases for Linux and Windows, inspect the live manifest, and verify integrity with published checksums.',
    canonical: 'https://rinawarptech.com/download',
    ogImage: 'https://rinawarptech.com/assets/img/rinawarp-logo.png',
    keywords: 'download, RinaWarp, verified releases, checksums, AppImage, deb, exe',
  },
  '/feedback': {
    title: 'RinaWarp Support | Help, Feedback, and Contact',
    description:
      'Contact RinaWarp for product support, billing help, restore issues, feedback, launch questions, and capability requests.',
    canonical: 'https://rinawarptech.com/feedback',
    ogImage: 'https://rinawarptech.com/assets/img/rinawarp-logo.png',
    keywords: 'feedback, support, contact, RinaWarp, bug report, launch support',
  },
  '/docs': {
    title: 'RinaWarp Terminal Pro Docs | AI Terminal Guides',
    description:
      'Read RinaWarp Terminal Pro docs, setup guides, and proof-first AI terminal workflows for trusted execution, receipts, and recovery.',
    canonical: 'https://rinawarptech.com/docs',
    ogImage: 'https://rinawarptech.com/assets/img/rinawarp-logo.png',
    keywords: 'documentation, docs, RinaWarp, getting started, proof-backed execution, recovery',
  },
  '/early-access': {
    title: 'RinaWarp Early Access | Release and Restore Policy',
    description:
      'Understand the RinaWarp Early Access policy, including release safety, restore guidance, update expectations, and current platform limits.',
    canonical: 'https://rinawarptech.com/early-access',
    ogImage: 'https://rinawarptech.com/assets/img/rinawarp-logo.png',
    keywords: 'early access, RinaWarp, restore, release policy, proof-first AI terminal',
  },
  '/rinawarp-vs-warp': {
    title: 'RinaWarp vs Warp | Proof-First AI Terminal Comparison',
    description:
      'Compare RinaWarp and Warp across trust, proof, recovery, and AI terminal workflow design so developers can see where RinaWarp is intentionally different.',
    canonical: 'https://rinawarptech.com/rinawarp-vs-warp',
    ogImage: 'https://rinawarptech.com/assets/img/rinawarp-logo.png',
    keywords: 'RinaWarp vs Warp, AI terminal comparison, proof-first AI terminal, developer terminal tools',
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
  <meta property="og:site_name" content="RinaWarp">

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
  <link rel="preconnect" href="https://www.googletagmanager.com">
  <link rel="preconnect" href="https://www.google-analytics.com">

  <!-- Google tag (gtag.js) -->
  <script async src="https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', '${GA_MEASUREMENT_ID}');
  </script>

  <!-- Content Security Policy -->
  <meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://static.cloudflareinsights.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://www.google-analytics.com https://region1.google-analytics.com https://www.googletagmanager.com https://static.cloudflareinsights.com; font-src 'self';">
  
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

  if (path === '/rinawarp-vs-warp') {
    graph.push({
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: seo.title,
      description: seo.description,
      mainEntityOfPage: seo.canonical,
      author: {
        '@type': 'Organization',
        name: 'RinaWarp Technologies, LLC',
      },
      publisher: {
        '@type': 'Organization',
        name: 'RinaWarp Technologies, LLC',
        logo: {
          '@type': 'ImageObject',
          url: 'https://rinawarptech.com/assets/img/rinawarp-logo.png',
        },
      },
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
