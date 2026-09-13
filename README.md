# 我的生活随笔手札

基于 Astro 5 与 Fuwari theme 的静态生活随笔博客，线上域名为 `https://rosata.cn`。

## 技术栈

- Astro 5
- Fuwari theme
- Svelte 5
- Tailwind CSS
- Pagefind 搜索索引
- pnpm 9

## 本地开发

本项目通过 `packageManager` 固定 pnpm 版本，推荐使用 Corepack：

```bash
corepack enable
corepack pnpm install
corepack pnpm dev
```

开发服务器默认运行在 `http://localhost:4321`。

## 构建与检查

```bash
corepack pnpm check
corepack pnpm type-check
corepack pnpm build
```

构建产物位于 `dist/`，可以直接由 Nginx、Caddy 或其他静态 Web 服务托管。

## 写文章

文章位于 `src/content/posts/`。可以手动新增 Markdown 文件，也可以使用脚本：

```bash
corepack pnpm new-post my-new-post
```

文章 frontmatter 示例：

```md
---
title: "文章标题"
description: "文章描述，用于首页、文章列表、RSS 和 meta description。"
published: 2026-06-12
tags: ["日常", "自处"]
category: 生活随笔
draft: false
---

## 一、章节标题

正文内容。
```

线上文章路径为 `/posts/<slug>/`，归档页为 `/archive/`。

## 站点信息

站点展示信息集中在 `src/config.ts`：

- `siteConfig.title`：站点标题与首页标签页标题。
- `siteConfig.subtitle`：站点副标题。
- `siteConfig.banner`：站点顶部横幅图。
- `profileConfig.name`：侧栏和页脚显示名称。
- `profileConfig.avatar`：侧边栏头像。
- `profileConfig.bio`：个人卡片描述。
- `complianceConfig.icpRecord`：页脚展示的 ICP 号。
- `complianceConfig.networkPoliceRecord`、`networkPoliceRecordUrl` 和 `networkPoliceRecordIcon`：页脚展示的公安联网信息。

当前服务名称为 `我的生活随笔手札`，ICP 号为 `鄂ICP备2026029383号-1`。

## 图片资产

当前项目引用的图片资产位于 `public/assets/` 和 `public/favicon/`：

- `public/assets/profile-avatar.webp`：侧边栏头像。
- `public/assets/site-banner.webp`：站点顶部横幅。
- `public/assets/post-cover.webp`：文章封面备选图，当前未引用。
- `public/assets/public-security-badge.png`：公安联网备案图标。
- `public/assets/site-banner.avif`、`public/assets/post-cover.avif`：AVIF 压缩备选资产。
- `public/favicon/favicon-*.png`：浏览器标签图标和移动端图标。

展示用图片优先使用 WebP；favicon 保留 PNG 小尺寸以保证兼容性。文章暂时不使用封面图，也不在正文中插图。

## 远程维护

远程部署、Nginx、HTTPS、证书续期、DNS、安全组和故障排查记录见：

- [`docs/REMOTE_MAINTENANCE.md`](docs/REMOTE_MAINTENANCE.md)
