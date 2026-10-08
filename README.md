# Rosata Sites

基于 Astro 5 与 Fuwari 主题内核的多站点 pnpm workspace 仓库。

## 站点

| 站点 | 目录 | 域名 | 说明 |
|---|---|---|---|
| rosata-cn | `apps/rosata-cn` | <https://rosata.cn> | 生活随笔手札 |
| obsidian-kb | `apps/obsidian-kb` | <https://ob.rosata.cn> | Obsidian 数字花园 / 知识库 |

## 仓库结构

```text
.
├── apps/
│   ├── rosata-cn/           # 站 A：独立 config、文章、资产、页面路由
│   └── obsidian-kb/         # 站 B：同构，独立 config、内容目录
├── packages/
│   └── theme/               # @rosata/theme：共享 Fuwari 衍生主题内核
│                            # （components / layouts / pages 实现 / plugins /
│                            #   utils / styles / i18n / 内容集合 schema）
├── scripts/
│   └── new-post.js          # 文章脚手架，支持 --app 选择目标站点
├── docs/                    # 维护文档
├── pnpm-workspace.yaml
└── package.json             # 私有 workspace 根
```

各站点的 `src/pages/` 是薄壳路由，模板与实现位于 `@rosata/theme`。主题通过 `@site/config` 别名注入各站点自己的 `src/config.ts`，不同站点拥有完全独立的站点信息、导航、页脚备案与 OG 文案。

## 技术栈

- Astro 5
- 共享主题 `@rosata/theme`（Fuwari 衍生）
- Svelte 5
- Tailwind CSS
- Pagefind 搜索索引
- pnpm 9 workspace

## 本地开发

本项目通过 `packageManager` 固定 pnpm 版本，推荐使用 Corepack：

```bash
corepack enable
corepack pnpm install

# 启动指定站点（rosata-cn 为默认）
corepack pnpm dev          # rosata-cn → http://localhost:4321
corepack pnpm dev:kb       # obsidian-kb
```

## 构建与检查

```bash
# 全部站点
corepack pnpm check
corepack pnpm build

# 指定站点
corepack pnpm --filter rosata-cn build
corepack pnpm --filter obsidian-kb build
```

每个站点的构建产物位于各自 `apps/<name>/dist/`（`astro build` + `pagefind` 搜索索引），可直接由 Nginx、Caddy 或其他静态服务托管。

## 写文章

文章位于 `apps/<站点>/src/content/posts/`。可以手动新增 Markdown 文件，也可以使用脚手架：

```bash
corepack pnpm new-post my-new-post                      # 默认 rosata-cn
corepack pnpm new-post --app obsidian-kb my-note        # 指定站点
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

## 新增一个站点

1. 复制 `apps/obsidian-kb` 为 `apps/<新站点>`。
2. 修改 `astro.config.mjs` 中的 `site` 域名与 `src/config.ts` 站点信息。
3. `pnpm-workspace.yaml` 已匹配 `apps/*`，无需修改；`pnpm install` 后即可 `dev`/`build`。
4. 备案信息按站点实际填写，不得复用其他站点的备案号。

## 站点信息（rosata-cn）

站点展示信息集中在 `apps/rosata-cn/src/config.ts`：

- `siteConfig.title`：站点标题与首页标签页标题。
- `siteConfig.subtitle`：站点副标题。
- `siteConfig.banner`：站点顶部横幅图。
- `siteConfig.home` / `siteConfig.about` / `siteConfig.og`：首页跑马灯、关于页与 OG 图文案。
- `profileConfig.name`：侧栏和页脚显示名称。
- `profileConfig.avatar`：侧边栏头像。
- `profileConfig.bio`：个人卡片描述。
- `complianceConfig.icpRecord`：页脚展示的 ICP 号。
- `complianceConfig.networkPoliceRecord`、`networkPoliceRecordUrl` 和 `networkPoliceRecordIcon`：页脚展示的公安联网信息。

当前服务名称为 `我的生活随笔手札`，ICP 号为 `鄂ICP备2026029383号-1`。

## 图片资产（rosata-cn）

当前站点引用的图片资产位于 `apps/rosata-cn/public/assets/` 和 `apps/rosata-cn/public/favicon/`：

- `assets/profile-avatar.webp`：侧边栏头像。
- `assets/site-banner.webp`：站点顶部横幅。
- `assets/post-cover.webp`：文章封面备选图，当前未引用。
- `assets/public-security-badge.png`：公安联网备案图标。
- `assets/site-banner.avif`、`assets/post-cover.avif`：AVIF 压缩备选资产。
- `favicon/favicon-*.png`：浏览器标签图标和移动端图标。

展示用图片优先使用 WebP；favicon 保留 PNG 小尺寸以保证兼容性。文章暂时不使用封面图，也不在正文中插图。

## 部署

- rosata.cn：自托管 Nginx + rsync 发布 `apps/rosata-cn/dist/`，流程见下方维护文档。
- 每个站点均带 `vercel.json` 缓存头配置；如部署到 Vercel，将项目 Root Directory 设为对应 `apps/<站点>` 即可。

## 远程维护

远程部署、Nginx、HTTPS、证书续期、DNS、安全组和故障排查记录见：

- [`docs/REMOTE_MAINTENANCE.md`](docs/REMOTE_MAINTENANCE.md)
- [`docs/SERVER_MAINTENANCE_GUIDE.md`](docs/SERVER_MAINTENANCE_GUIDE.md)
