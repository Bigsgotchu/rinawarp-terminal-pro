import type {
  ApplyVerifiedLicenseInput,
  LicenseSnapshot,
  LicensingService,
} from "../../runtime-contracts/dist/index.js";
import { TOKENS } from "../../runtime-contracts/dist/index.js";
import type { RuntimePlugin } from "../../runtime-core/dist/index.js";
import {
  createLicensingService,
  type LicensingServiceConfig,
} from "./services/createLicensingService.js";

export interface LicensingPluginConfig extends LicensingServiceConfig {}

class DefaultLicensingService implements LicensingService {
  constructor(private readonly service: LicensingService) {}

  getSnapshot(): LicenseSnapshot {
    return this.service.getSnapshot();
  }

  refresh(): Promise<LicenseSnapshot> {
    return this.service.refresh();
  }

  applyVerifiedLicense(input: ApplyVerifiedLicenseInput): string {
    return this.service.applyVerifiedLicense(input);
  }

  resetToStarter(): void {
    this.service.resetToStarter();
  }
}

export const licensingPlugin: RuntimePlugin<LicensingPluginConfig> = {
  meta: {
    id: "feature.licensing",
    displayName: "Licensing",
    version: "1.0.0",
  },

  register(ctx) {
    const service = createLicensingService(ctx.config);
    ctx.container.registerFactory(
      TOKENS.licensingService,
      () => new DefaultLicensingService(service),
      { singleton: true },
    );
  },
};
