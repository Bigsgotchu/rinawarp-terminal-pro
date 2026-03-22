// @ts-nocheck
export function createLicenseState(deps) {
    const { app, fs, verifyLicense, writeJsonFile, readJsonIfExists, entitlementFile } = deps;
    let currentLicenseTier = 'starter';
    let currentLicenseToken = null;
    let currentLicenseExpiresAt = null;
    let currentLicenseCustomerId = null;
    let currentLicenseStatus = 'unknown';
    const LIFETIME_TIERS = new Set(['founder', 'pioneer']);
    function mapApiTierToLicenseTier(apiTier) {
        const t = apiTier.trim().toLowerCase();
        if (t === 'pro')
            return 'pro';
        if (t === 'creator')
            return 'creator';
        if (t === 'pioneer')
            return 'pioneer';
        if (t === 'founder')
            return 'founder';
        if (t === 'enterprise')
            return 'enterprise';
        if (t === 'team')
            return 'enterprise';
        return 'starter';
    }
    function applyVerifiedLicense(data) {
        const tier = mapApiTierToLicenseTier(data.tier);
        currentLicenseTier = tier;
        currentLicenseToken = data.license_token ?? null;
        currentLicenseExpiresAt = Number.isFinite(data.expires_at) ? data.expires_at : null;
        currentLicenseCustomerId = data.customer_id ?? null;
        currentLicenseStatus = data.status ?? 'active';
        return tier;
    }
    function resetLicenseToStarter() {
        currentLicenseTier = 'starter';
        currentLicenseToken = null;
        currentLicenseExpiresAt = null;
        currentLicenseCustomerId = null;
    }
    function getLicenseState() {
        return {
            tier: currentLicenseTier,
            has_token: !!currentLicenseToken,
            expires_at: currentLicenseExpiresAt,
            customer_id: currentLicenseCustomerId,
            status: currentLicenseStatus,
        };
    }
    function getCurrentLicenseCustomerId() {
        return currentLicenseCustomerId;
    }
    function getLicenseTier() {
        return currentLicenseTier;
    }
    function getLicenseToken() {
        return currentLicenseToken;
    }
    async function refreshLicenseState() {
        if (!currentLicenseCustomerId) {
            return getLicenseState();
        }
        const data = await verifyLicense(currentLicenseCustomerId, { force: true });
        if (!data?.ok) {
            throw new Error('license refresh returned non-ok response');
        }
        applyVerifiedLicense(data);
        saveEntitlements();
        return getLicenseState();
    }
    function validateEntitlementExpiry(data) {
        const { tier, expiresAt } = data;
        if (LIFETIME_TIERS.has(tier)) {
            if (expiresAt === null)
                return { ok: true };
            if (!Number.isFinite(expiresAt)) {
                return { ok: false, reason: 'Lifetime tier has non-finite expiresAt' };
            }
            if (Date.now() > expiresAt * 1000) {
                return { ok: false, reason: 'Lifetime tier has expired' };
            }
            return { ok: true };
        }
        if (expiresAt === null) {
            return { ok: false, reason: 'Subscription tier missing expiresAt' };
        }
        if (!Number.isFinite(expiresAt)) {
            return { ok: false, reason: 'Subscription tier has non-finite expiresAt' };
        }
        if (Date.now() > expiresAt * 1000) {
            return { ok: false, reason: 'Subscription has expired' };
        }
        return { ok: true };
    }
    function isEntitlementStale(data) {
        if (!data.lastVerifiedAt)
            return true;
        const lastVerified = Date.parse(data.lastVerifiedAt);
        if (!Number.isFinite(lastVerified))
            return true;
        const hoursSinceVerify = (Date.now() - lastVerified) / (1000 * 60 * 60);
        return hoursSinceVerify > 24;
    }
    function saveEntitlements() {
        try {
            const data = {
                tier: currentLicenseTier,
                token: currentLicenseToken,
                expiresAt: currentLicenseExpiresAt,
                customerId: currentLicenseCustomerId,
                verifiedAt: new Date().toISOString(),
                lastVerifiedAt: new Date().toISOString(),
                status: currentLicenseStatus,
            };
            writeJsonFile(entitlementFile(), data);
            if (app.isPackaged) {
                console.log('[license] Entitlement saved for tier:', currentLicenseTier);
            }
            else {
                console.log('[license] Entitlement saved:', { tier: currentLicenseTier, status: currentLicenseStatus });
            }
        }
        catch (err) {
            console.warn('[license] Failed to save entitlements:', err);
        }
    }
    function loadEntitlements() {
        try {
            const data = readJsonIfExists(entitlementFile());
            if (!data)
                return null;
            const validation = validateEntitlementExpiry(data);
            if (!validation.ok) {
                console.log('[license] Stored entitlement invalid:', validation.reason);
                try {
                    fs.unlinkSync(entitlementFile());
                }
                catch {
                }
                return null;
            }
            return data;
        }
        catch (err) {
            console.warn('[license] Failed to load entitlements:', err);
            return null;
        }
    }
    function applyStoredEntitlement(data) {
        currentLicenseTier = data.tier;
        currentLicenseToken = data.token;
        currentLicenseExpiresAt = data.expiresAt;
        currentLicenseCustomerId = data.customerId;
        currentLicenseStatus = data.status || 'unknown';
    }
    return {
        applyVerifiedLicense,
        resetLicenseToStarter,
        getLicenseState,
        getCurrentLicenseCustomerId,
        getLicenseTier,
        getLicenseToken,
        refreshLicenseState,
        saveEntitlements,
        loadEntitlements,
        applyStoredEntitlement,
        isEntitlementStale,
    };
}
