import type {
	ExpressiveCodeConfig,
	LicenseConfig,
	NavBarConfig,
	ProfileConfig,
	SiteConfig,
} from "@rosata/theme/types/config.ts";
import { LinkPreset } from "@rosata/theme/types/config.ts";

// ────────────────────────────────────────────────────────────
// 模板站点配置：复制本目录新建站点后，逐项替换为站点自己的信息。
// ────────────────────────────────────────────────────────────

export const siteConfig: SiteConfig = {
	title: "站点名称", // TODO: 站点标题（首页标签页、页脚大字、OG 图）
	subtitle: "站点副标题。", // TODO: 首页 Hero 副标题
	lang: "zh_CN", // Language code, e.g. 'en', 'zh_CN', 'ja', etc.
	themeColor: {
		hue: 205, // Default hue for the theme color, from 0 to 360. e.g. red: 0, teal: 200, cyan: 250, pink: 345
		fixed: false, // Hide the theme color picker for visitors
	},
	banner: {
		enable: true,
		src: "/assets/site-banner.svg", // TODO: 替换 public/assets/ 下的占位横幅图；不需要横幅可把 enable 改为 false
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
		latestEntriesLabel: "Latest Entries · 最新文章", // TODO: 首页文章区标题
		postsCountUnit: "篇", // TODO: 文章计数单位
		marqueeWords: ["词一", "词二", "词三", "词四"], // TODO: 首页跑马灯关键词（建议 4-8 个）
	},
	about: {
		label: "ABOUT · 关于本站", // TODO: 关于页眉标签
		ruleText: "标签 · 标签 · 标签", // TODO: 关于页装饰分隔文本
		signature: "—— 站点名称", // TODO: 关于页落款
	},
	og: {
		kicker: "SITE", // TODO: OG 图左上角英文角标
		categoryFallback: "文章", // TODO: 文章无分类时 OG 图显示的分段名
	},
	favicon: [
		// TODO: 默认仅使用通用 favicon.svg；如需明暗两套 PNG 图标，
		// 把生成的图标放入 public/favicon/ 后在此登记，例如：
		// { src: "/favicon/favicon-light-32.png", sizes: "32x32", theme: "light" },
	],
};

export const navBarConfig: NavBarConfig = {
	links: [LinkPreset.Home, LinkPreset.Archive, LinkPreset.About],
	// 也可追加外链：{ name: "GitHub", url: "https://github.com/...", external: true }
};

export const profileConfig: ProfileConfig = {
	avatar: "/assets/profile-avatar.svg", // TODO: 替换 public/assets/ 下的占位头像图
	name: "站点名称", // TODO: 侧栏与页脚显示名
	bio: "站点简介。", // TODO: 侧栏个人卡片简介
	links: [
		// TODO: 侧栏社交链接，图标名见 packages/theme/src/constants/icon.ts，例如：
		// { name: "GitHub", icon: "fa6-brands:github", url: "https://github.com/..." },
	],
};

export const licenseConfig: LicenseConfig = {
	enable: true,
	name: "CC BY-NC-SA 4.0",
	url: "https://creativecommons.org/licenses/by-nc-sa/4.0/",
};

// TODO: 站点完成 ICP/公安备案后填写真实编号；留空时页脚自动隐藏该区域。
// 不得复用其他站点的备案号。
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
