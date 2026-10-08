import type {
	ExpressiveCodeConfig,
	LicenseConfig,
	NavBarConfig,
	ProfileConfig,
	SiteConfig,
} from "@rosata/theme/types/config.ts";
import { LinkPreset } from "@rosata/theme/types/config.ts";

export const siteConfig: SiteConfig = {
	title: "Rosata 数字花园",
	subtitle: "一片正在生长的知识园地：笔记、索引与持续修订中的想法。",
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
	home: {
		latestEntriesLabel: "Latest Notes · 最新笔记",
		postsCountUnit: "条",
		marqueeWords: [
			"笔记",
			"链接",
			"生长",
			"整理",
			"回顾",
			"索引",
			"片段",
			"思考",
		],
	},
	about: {
		label: "ABOUT · 关于这座花园",
		ruleText: "笔记 · 索引 · 生长",
		signature: "—— 数字花园",
	},
	og: {
		kicker: "DIGITAL GARDEN",
		categoryFallback: "笔记",
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
	links: [LinkPreset.Home, LinkPreset.Archive, LinkPreset.About],
};

export const profileConfig: ProfileConfig = {
	avatar: "/assets/profile-avatar.webp", // Relative to the /src directory. Relative to the /public directory if it starts with '/'
	name: "Rosata 数字花园",
	bio: "把分散的笔记整理成可以回望与生长的知识园地。",
	links: [],
};

export const licenseConfig: LicenseConfig = {
	enable: true,
	name: "CC BY-NC-SA 4.0",
	url: "https://creativecommons.org/licenses/by-nc-sa/4.0/",
};

// TODO: 本站域名 ob.rosata.cn 尚未备案；备案完成后填写真实编号并恢复页脚展示。
export const complianceConfig = {
	icpRecord: "",
	networkPoliceRecord: "",
	networkPoliceRecordUrl: "",
	networkPoliceRecordIcon: "/assets/public-security-badge.png",
};

export const expressiveCodeConfig: ExpressiveCodeConfig = {
	// Note: Some styles (such as background color) are being overridden, see the astro.config.mjs file.
	// Please select a dark theme, as this blog theme currently only supports dark background color
	theme: "github-dark",
};
