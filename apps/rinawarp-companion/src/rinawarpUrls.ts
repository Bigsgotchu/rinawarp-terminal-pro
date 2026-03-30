export interface CampaignContext {
  campaign: string;
  content: string;
  term?: string;
}

export function createAccountUrl(baseUrl: string, context: CampaignContext, callbackUri?: string): URL {
  const url = createTrackedUrl(`${baseUrl}/account/`, context);
  if (callbackUri) {
    url.searchParams.set('return_to', callbackUri);
  }
  return url;
}

export function createLoginUrl(baseUrl: string, context: CampaignContext, callbackUri?: string): URL {
  const url = createTrackedUrl(`${baseUrl}/login/`, context);
  if (callbackUri) {
    url.searchParams.set('return_to', callbackUri);
  }
  return url;
}

export function createBillingPortalUrl(baseUrl: string, context: CampaignContext): URL {
  return createTrackedUrl(`${baseUrl}/account/`, context);
}

export function createPacksUrl(baseUrl: string, context: CampaignContext): URL {
  return createTrackedUrl(`${baseUrl}/agents`, context);
}

export function createPackUrl(baseUrl: string, pack: string, context: CampaignContext): URL {
  const url = createTrackedUrl(`${baseUrl}/agents`, context);
  url.searchParams.set('agent', pack);
  return url;
}

export function createPricingUrl(baseUrl: string, context: CampaignContext): URL {
  return createTrackedUrl(`${baseUrl}/pricing/`, context);
}

export function createPurchaseVerificationUrl(baseUrl: string, context: CampaignContext, callbackUri?: string): URL {
  const url = createTrackedUrl(`${baseUrl}/verify/companion-purchase/`, context);
  if (callbackUri) {
    url.searchParams.set('return_to', callbackUri);
  }
  return url;
}

export function createPrivacyUrl(baseUrl: string, context: CampaignContext): URL {
  return createTrackedUrl(`${baseUrl}/privacy/`, context);
}

function createTrackedUrl(base: string, context: CampaignContext): URL {
  const url = new URL(base);
  url.searchParams.set('utm_source', 'vscode');
  url.searchParams.set('utm_medium', 'extension');
  url.searchParams.set('utm_campaign', context.campaign);
  url.searchParams.set('utm_content', context.content);
  if (context.term) {
    url.searchParams.set('utm_term', context.term);
  }
  return url;
}
