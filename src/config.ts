import type {
	ExpressiveCodeConfig,
	LicenseConfig,
	NavBarConfig,
	ProfileConfig,
	SiteConfig,
} from "./types/config";
import { LinkPreset } from "./types/config";

export const siteConfig: SiteConfig = {
	title: "我的生活随笔手札",
	subtitle: "在日常细节里整理心绪，写下关于关系、欲望、语言与自处的生活随笔。",
	lang: "zh_CN", // Language code, e.g. 'en', 'zh_CN', 'ja', etc.
	themeColor: {
		hue: 205, // Default hue for the theme color, from 0 to 360. e.g. red: 0, teal: 200, cyan: 250, pink: 345
		fixed: false, // Hide the theme color picker for visitors
	},
	banner: {
		enable: true,
		src: "/assets/site-banner.webp", // Relative to the /src directory. Relative to the /public directory if it starts with '/'
		position: "center", // Equivalent to object-position, only supports 'top', 'center', 'bottom'. 'center' by default
		credit: {
			enable: false, // Display the credit text of the banner image
			text: "", // Credit text to be displayed
			url: "", // (Optional) URL link to the original artwork or artist's page
		},
	},
	toc: {
		enable: true, // Display the table of contents on the right side of the post
		depth: 2, // Maximum heading depth to show in the table, from 1 to 3
	},
	favicon: [
		{
			src: "/favicon/favicon-light-32.png",
			sizes: "32x32",
			theme: "light",
		},
		{
			src: "/favicon/favicon-dark-32.png",
			sizes: "32x32",
			theme: "dark",
		},
		{
			src: "/favicon/favicon-light-192.png",
			sizes: "192x192",
			theme: "light",
		},
		{
			src: "/favicon/favicon-dark-192.png",
			sizes: "192x192",
			theme: "dark",
		},
	],
};

export const navBarConfig: NavBarConfig = {
	links: [
		LinkPreset.Home,
		LinkPreset.Archive,
		LinkPreset.About,
	],
};

export const profileConfig: ProfileConfig = {
	avatar: "/assets/profile-avatar.webp", // Relative to the /src directory. Relative to the /public directory if it starts with '/'
	name: "我的生活随笔手札",
	bio: "把普通日子里的迟疑、关系、语言和自处写成可以回看的片段。",
	links: [],
};

export const licenseConfig: LicenseConfig = {
	enable: true,
	name: "CC BY-NC-SA 4.0",
	url: "https://creativecommons.org/licenses/by-nc-sa/4.0/",
};

export const complianceConfig = {
	icpRecord: "鄂ICP备2026029383号-1",
	networkPoliceRecord: "鄂公网安备42050002421034号",
	networkPoliceRecordUrl: "https://beian.mps.gov.cn/#/query/webSearch?code=42050002421034",
	networkPoliceRecordIcon: "/assets/public-security-badge.png",
};

export const expressiveCodeConfig: ExpressiveCodeConfig = {
	// Note: Some styles (such as background color) are being overridden, see the astro.config.mjs file.
	// Please select a dark theme, as this blog theme currently only supports dark background color
	theme: "github-dark",
};
