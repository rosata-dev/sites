/**
 * Type-only stand-in for `@site/config` so the theme package can be
 * type-checked on its own. At build time each app aliases `@site/config`
 * to its real `src/config.ts` (see packages/theme/astro.config.mjs), so
 * this module is never executed.
 */
import type {
	ExpressiveCodeConfig,
	LicenseConfig,
	NavBarConfig,
	ProfileConfig,
	SiteConfig,
} from "../src/types/config";

export declare const siteConfig: SiteConfig;
export declare const navBarConfig: NavBarConfig;
export declare const profileConfig: ProfileConfig;
export declare const licenseConfig: LicenseConfig;
export declare const complianceConfig: {
	icpRecord: string;
	networkPoliceRecord: string;
	networkPoliceRecordUrl: string;
	networkPoliceRecordIcon: string;
};
export declare const expressiveCodeConfig: ExpressiveCodeConfig;
