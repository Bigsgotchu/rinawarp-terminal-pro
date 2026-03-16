/**
 * RinaWarp SEO Module
 * Dynamically injects SEO meta tags for all pages
 */

export interface SeoData {
  title: string;
  description: string;
  canonical: string;
  ogImage: string;
  keywords?: string;
}

export const SEO_CONFIG: Record<string, SeoData> = {
  "/": {
    title: "RinaWarp Terminal Pro",
    description: "The AI-powered terminal for developers. Manage agents, plugins, and tools efficiently. Automate workflows, run tests, and deploy apps.",
    canonical: "https://rinawarptech.com/",
    ogImage: "https://rinawarptech.com/assets/img/rinawarp-logo.png",
    keywords: "AI, terminal, developer tools, automation, AI agents, developer productivity, Linux, Windows, macOS",
  },
  "/agents": {
    title: "Agent Marketplace",
    description: "Browse and install AI agents for RinaWarp Terminal Pro. Free and premium agents available. Security audits, deployment helpers, and more.",
    canonical: "https://rinawarptech.com/agents",
    ogImage: "https://rinawarptech.com/assets/img/rinawarp-logo.png",
    keywords: "AI agents, marketplace, plugins, RinaWarp, developer tools, automation",
  },
  "/pricing": {
    title: "Pricing Plans",
    description: "Compare subscription plans for RinaWarp Terminal Pro. Pro, Creator, Team, and Lifetime options. Start free or upgrade for full features.",
    canonical: "https://rinawarptech.com/pricing",
    ogImage: "https://rinawarptech.com/assets/img/rinawarp-logo.png",
    keywords: "pricing, subscription, RinaWarp, plans, Pro, Creator, Team, lifetime",
  },
  "/download": {
    title: "Download",
    description: "Download RinaWarp Terminal Pro for macOS, Windows, and Linux. Verify downloads with SHA256 and GPG signatures for security.",
    canonical: "https://rinawarptech.com/download",
    ogImage: "https://rinawarptech.com/assets/img/rinawarp-logo.png",
    keywords: "download, RinaWarp, terminal, AI, developer tools, Linux, Windows, macOS, AppImage, deb, exe",
  },
  "/feedback": {
    title: "Feedback",
    description: "Send us feedback to improve RinaWarp Terminal Pro. Feature requests, bug reports, and suggestions welcome.",
    canonical: "https://rinawarptech.com/feedback",
    ogImage: "https://rinawarptech.com/assets/img/rinawarp-logo.png",
    keywords: "feedback, support, contact, RinaWarp, suggestions, bug report",
  },
  "/docs": {
    title: "Documentation",
    description: "Learn how to use RinaWarp Terminal Pro. Build, publish, and manage AI agents for your development workflow.",
    canonical: "https://rinawarptech.com/docs",
    ogImage: "https://rinawarptech.com/assets/img/rinawarp-logo.png",
    keywords: "documentation, docs, RinaWarp, guides, tutorials, AI agents, development",
  },
};

export function injectSeoTags(path: string): string {
  // Normalize path - remove trailing slash except for root
  const normalizedPath = path === "/" ? "/" : path.replace(/\/$/, "");
  
  const seo = SEO_CONFIG[normalizedPath] || SEO_CONFIG["/"];
  
  const metaTags = `
  <!-- Primary Meta Tags -->
  <title>${seo.title} - RinaWarp Terminal Pro</title>
  <meta name="description" content="${seo.description}">
  ${seo.keywords ? `<meta name="keywords" content="${seo.keywords}">` : ""}
  <meta name="author" content="RinaWarp Tech">

  <!-- Canonical URL -->
  <link rel="canonical" href="${seo.canonical}">

  <!-- Open Graph / Facebook -->
  <meta property="og:type" content="website">
  <meta property="og:title" content="${seo.title} - RinaWarp Terminal Pro">
  <meta property="og:description" content="${seo.description}">
  <meta property="og:url" content="${seo.canonical}">
  <meta property="og:image" content="${seo.ogImage}">
  <meta property="og:site_name" content="RinaWarp Terminal Pro">

  <!-- Twitter Cards -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${seo.title} - RinaWarp Terminal Pro">
  <meta name="twitter:description" content="${seo.description}">
  <meta name="twitter:image" content="${seo.ogImage}">
  <meta name="twitter:site" content="@RinaWarpTech">

  <!-- Favicon -->
  <link rel="icon" href="/assets/img/rinawarp-logo.png" type="image/png">
  <link rel="shortcut icon" href="/assets/img/rinawarp-logo.png" type="image/png">
  
  <!-- Preconnect to external domains for performance -->

  <!-- Content Security Policy -->
  <meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://static.cloudflareinsights.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self';">
  
  <!-- Base URL for relative links -->
  <base href="/">
`;

  return metaTags;
}

// Helper to inject SEO into existing HTML head
export function injectIntoHead(html: string, path: string): string {
  const seoTags = injectSeoTags(path);
  
  // Replace the existing head content with SEO tags
  // This regex matches <head>...</head> and replaces content inside
  return html.replace(
    /<head>([\s\S]*?)<\/head>/i,
    `<head>\n${seoTags}\n</head>`
  );
}

// Enhanced SEO injection with performance optimizations (lazy loading, etc.)
export function injectOptimizedSeo(path: string, html: string): string {
  const seoTags = injectSeoTags(path);
  
  // Inject SEO into head
  let result = html.replace(
    /<head>([\s\S]*?)<\/head>/i,
    `<head>\n${seoTags}\n</head>`
  );
  
  // Add loading="lazy" to img tags that don't already have it
  result = result.replace(
    /<img(?!.*loading=)(.*?)src="(.*?)"(.*?)>/gi,
    '<img$1 src="$2" loading="lazy"$3>'
  );
  
  return result;
}
