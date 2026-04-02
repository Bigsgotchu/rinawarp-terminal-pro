// @ts-nocheck
import type {
  AnalyticsSessionInitializerDeps,
  AuthBootstrapDeps,
  DaemonAutoStarterDeps,
  EntitlementRestoreDeps,
} from './runtimeTypes.js'

export function createAuthBootstrap(deps: AuthBootstrapDeps) {
    const {
        app,
        fs,
        path,
        readJsonIfExists,
        setAuthConfig,
        setCachedToken,
        getOrCreateDeviceId,
        authApiUrl,
    } = deps;
    return async function bootstrapAuth() {
        setAuthConfig({
            apiBaseUrl: authApiUrl,
            deviceId: getOrCreateDeviceId(),
        });
        try {
            const tokenFile = path.join(app.getPath('userData'), 'auth-token.json');
            const tokenData = readJsonIfExists(fs, tokenFile);
            if (tokenData?.token) {
                setCachedToken(tokenData.token);
            }
        }
        catch {
            // Ignore cached auth token read failures during boot.
        }
    };
}

export function createEntitlementRestore(deps: EntitlementRestoreDeps) {
    const {
        loadEntitlements,
        applyStoredEntitlement,
        isEntitlementStale,
        verifyLicense,
        applyVerifiedLicense,
        saveEntitlements,
        getLicenseTier,
        isE2E,
        logger = console,
    } = deps;
    return async function restoreEntitlements() {
        const storedEntitlement = loadEntitlements();
        if (isE2E) {
            logger.log('[boot] entitlements restored', !!storedEntitlement);
        }
        if (!storedEntitlement) {
            return null;
        }
        applyStoredEntitlement(storedEntitlement);
        logger.log(`[license] Restored ${storedEntitlement.tier} tier from persisted entitlement`);
        if (isEntitlementStale(storedEntitlement) && storedEntitlement.customerId) {
            logger.log('[license] Entitlement stale (>24h), attempting soft refresh...');
            verifyLicense(storedEntitlement.customerId)
                .then((data) => {
                if (data?.ok) {
                    applyVerifiedLicense(data);
                    saveEntitlements();
                    logger.log(`[license] Soft refresh successful: ${getLicenseTier()}`);
                }
            })
                .catch((error) => {
                logger.warn('[license] Soft refresh failed (offline?):', error instanceof Error ? error.message : String(error));
            });
        }
        return storedEntitlement;
    };
}

export function createAnalyticsSessionInitializer(
    deps: AnalyticsSessionInitializerDeps
) {
    const {
        initAnalytics,
        featureFlags,
        isE2E,
        app,
        path,
        StructuredSessionStore,
        ctx,
        withStructuredSessionWrite,
        logger = console,
    } = deps;
    return async function initializeAnalyticsSession() {
        try {
            initAnalytics();
        }
        catch (error) {
            logger.warn('[analytics] init failed:', error);
        }
        if (!featureFlags.structuredSessionV1) {
            return null;
        }
        if (isE2E) {
            logger.log('[boot] structuredSession init start');
        }
        const rootDir = path.join(app.getPath('userData'), 'structured-session-v1');
        const store = new StructuredSessionStore(rootDir, true);
        ctx.structuredSessionStore = store;
        withStructuredSessionWrite(() => store?.init());
        if (isE2E) {
            logger.log('[boot] structuredSession init done');
        }
        return store;
    };
}

export function createDaemonAutoStarter(deps: DaemonAutoStarterDeps) {
    const { daemonStart, logger = console } = deps;
    return async function maybeAutoStartDaemon() {
        void (async () => {
            try {
                const daemonResult = await daemonStart();
                logger.log('[daemon] Auto-start result:', daemonResult);
            }
            catch (error) {
                logger.warn('[daemon] Auto-start failed:', error);
            }
        })();
    };
}

export async function runStartupSequence(deps) {
    await deps.bootstrapAuth();
    await deps.restoreEntitlements();
    const structuredSessionStore = await deps.initializeAnalyticsSession();
    await deps.maybeAutoStartDaemon();
    return {
        structuredSessionStore,
    };
}
