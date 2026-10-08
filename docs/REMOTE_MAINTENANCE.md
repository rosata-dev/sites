# 我的生活随笔手札远程维护手册

本文档面向未来维护本仓库的 agent 或开发者。维护者不需要依赖历史对话，即可理解当前 Fuwari/Astro 项目结构、远程服务器、部署流程、证书续期和站点信息更新方式。

不要在本文档或仓库中写入服务器密码、私钥、token 或其他明文凭据。当前维护方式默认使用本机已经加入 `ssh-agent` 的私钥登录。

> **架构变更说明（2026-02）**：本仓库已重构为 pnpm workspace monorepo。共享主题位于 `packages/theme`（`@rosata/theme`），rosata.cn 站点代码、内容和资产位于 `apps/rosata-cn`，另有 `apps/site-template` 作为新建站点的模板示例（不部署）。本文档中的历史路径按以下规则对应：
>
> - `src/` → `apps/rosata-cn/src/`
> - `public/` → `apps/rosata-cn/public/`
> - `dist/` → `apps/rosata-cn/dist/`
> - `deploy/` → `apps/rosata-cn/deploy/`
> - `src/components`、`src/utils` 等主题代码 → `packages/theme/src/`
>
> 站点特定构建请使用 `corepack pnpm --filter rosata-cn build`；根目录 `corepack pnpm build` 会构建全部站点。

## 1. 当前状态

- 站点域名：`https://rosata.cn`
- `www` 域名：`https://www.rosata.cn`
- 源码仓库：`https://github.com/rosata-dev/sites`（私有仓库，`main` 分支；本地提交后通过 `git push` 同步）
- 首页路径：`/`
- 文章路径：`/posts/<slug>/`
- 归档路径：`/archive/`
- 关于页：`/about/`
- RSS：`https://rosata.cn/rss.xml`
- 服务器公网 IP：`150.158.127.29`
- SSH 端口：`42960`
- SSH 用户：`root`
- 服务器系统：Debian GNU/Linux 12 (bookworm)
- Web 服务：Nginx
- 静态站点目录：`/var/www/rosata_blog`
- Nginx 站点配置：`/etc/nginx/sites-available/rosata.cn.conf`
- Nginx 启用链接：`/etc/nginx/sites-enabled/rosata.cn.conf`
- 安全响应头片段：`/etc/nginx/snippets/rosata-security-headers.conf`（仅 rosata.cn.conf include）
- 访问日志：`/var/log/nginx/rosata.cn.access.log`
- 错误日志：`/var/log/nginx/rosata.cn.error.log`
- TLS 证书：Let's Encrypt / Certbot
- 证书域名：`rosata.cn`、`www.rosata.cn`
- 证书路径：`/etc/letsencrypt/live/rosata.cn/fullchain.pem`
- 私钥路径：`/etc/letsencrypt/live/rosata.cn/privkey.pem`
- 自动续期：`certbot.timer`

当前站点基底是 Fuwari theme。Fuwari 是完整 Astro 模板，不是单独 npm theme 包；本仓库已采用“替换项目基底并迁移内容”的方式维护。

## 2. 本地项目结构

```text
.
├── apps/
│   ├── rosata-cn/           # rosata.cn 站点
│   │   ├── astro.config.mjs # site: "https://rosata.cn/"
│   │   ├── deploy/nginx/    # 与服务器 live 配置同步的 Nginx 配置
│   │   ├── public/          # banner、头像、备案图标、favicon、manifest
│   │   └── src/
│   │       ├── config.ts    # 站点配置（标题、副标题、备案号等）
│   │       ├── content/     # posts/（5 篇文章）+ spec/about.md + config.ts
│   │       └── pages/       # 薄壳路由，实现位于 @rosata/theme
│   └── site-template/         # 模板示例站，同构（不部署）
├── packages/
│   └── theme/               # @rosata/theme 共享主题内核
│       ├── astro.config.mjs # createSiteConfig() 工厂
│       └── src/             # components/ layouts/ pages/ utils/ styles/
│                            # plugins/ i18n/ types/ constants/ content/
├── scripts/
│   └── new-post.js          # --app <name> 选择目标站点
├── docs/
│   └── REMOTE_MAINTENANCE.md
├── package.json             # 私有 workspace 根
├── pnpm-workspace.yaml
└── pnpm-lock.yaml
```

关键文件说明：

- `apps/rosata-cn/src/config.ts`：站点标题、语言、导航、个人卡片、页脚展示信息、主题色。
- `apps/rosata-cn/src/content/posts/*.md`：博客文章，每篇文章使用 Markdown frontmatter。
- `apps/rosata-cn/src/content/spec/about.md`：关于页正文。
- `apps/rosata-cn/src/content/config.ts`：Astro 内容集合 schema（re-export 主题定义）。
- `packages/theme/src/components/Footer.astro`：页脚、ICP 号和公安联网信息预留展示逻辑。
- `packages/theme/src/pages/rss.xml.ts`：RSS 输出实现。
- `packages/theme/src/utils/url-utils.ts`：文章、标签和分类 URL 生成。
- `apps/rosata-cn/public/assets/profile-avatar.webp`：侧边栏头像。
- `apps/rosata-cn/public/assets/site-banner.webp`：站点顶部横幅。
- `apps/rosata-cn/public/assets/post-cover.webp`：文章封面备选图，当前未引用。
- `apps/rosata-cn/public/assets/public-security-badge.png`：公安联网备案图标，页脚展示时放在备案编号左侧。保持原始 PNG 透明通道，不要加背景或用不透明画布重采样。
- `apps/rosata-cn/public/assets/*.avif`：压缩率更高的备选图片资产，当前未作为主引用格式。
- `apps/rosata-cn/public/favicon/favicon-*.png`：浏览器标签图标和移动端图标。
- `apps/rosata-cn/deploy/nginx/rosata.cn.conf`：与服务器 live 配置同步的完整 Nginx 配置（含 HTTPS、缓存策略、gzip 调优与安全头 include）。
- `apps/rosata-cn/deploy/nginx/rosata-security-headers.conf`：安全响应头片段，对应服务器 `/etc/nginx/snippets/rosata-security-headers.conf`。

注意：`apps/rosata-cn/deploy/nginx/rosata.cn.conf` 自 2026-09-12 起就是服务器 live 配置的镜像，不再是签发证书前的 bootstrap。标记 `# managed by Certbot` 的行由 Certbot 管理，不要手动改动；其他部分修改后上传，必须先 `nginx -t` 再 `systemctl reload nginx`。安全头片段被 server 级和多个 location 级 include；注意任何自带 `add_header` 的 location 都必须显式 include 该片段，否则会屏蔽 server 级安全头的继承。

## 3. 本地开发

启用 Corepack：

```bash
corepack enable
```

安装依赖：

```bash
corepack pnpm install
```

启动本地开发服务器：

```bash
corepack pnpm dev
```

构建静态产物：

```bash
corepack pnpm --filter rosata-cn build
```

构建产物目录：

```text
apps/rosata-cn/dist/
```

建议部署前检查：

```bash
corepack pnpm --filter rosata-cn check
corepack pnpm --filter rosata-cn type-check
corepack pnpm --filter rosata-cn build
```

`corepack pnpm --filter rosata-cn build` 会先执行 `astro build`，再执行 `pagefind --site dist` 生成搜索索引。

## 4. 写文章

在 `apps/rosata-cn/src/content/posts/` 下新增 Markdown 文件，例如：

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

frontmatter 字段：

- `title`：必填，文章标题。
- `description`：可选，文章摘要。
- `published`：必填，发布日期，可写 `YYYY-MM-DD`。
- `updated`：可选，更新日期。
- `tags`：可选，字符串数组，默认空数组。
- `category`：可选，分类名称；当前使用 `生活随笔`。
- `draft`：可选，布尔值，默认 `false`。设置为 `true` 时不会出现在页面和 RSS。
- `image`：可选，文章封面。
- `lang`：可选，文章语言。

也可以用脚本创建文章：

```bash
corepack pnpm new-post my-new-post
# 或指定站点：corepack pnpm new-post --app site-template my-note
```

写完文章后至少运行：

```bash
corepack pnpm --filter rosata-cn build
```

当前文章暂时不使用 frontmatter 的 `image` 封面图，也不在正文中插图。以后如需恢复统一封面，可在文章 frontmatter 中添加 `image: "/assets/post-cover.webp"`。

## 5. 修改站点信息

站点展示信息集中在 `apps/rosata-cn/src/config.ts`。

```ts
export const siteConfig = {
	title: "我的生活随笔手札",
	subtitle: "在日常细节里整理心绪，写下关于关系、欲望、语言与自处的生活随笔。",
	lang: "zh_CN",
	themeColor: {
		hue: 205,
		fixed: false,
	},
	banner: {
		enable: true,
		src: "/assets/site-banner.webp",
		position: "center",
		credit: {
			enable: false,
			text: "",
			url: "",
		},
	},
};

export const profileConfig = {
	avatar: "/assets/profile-avatar.webp",
	name: "我的生活随笔手札",
	bio: "把普通日子里的迟疑、关系、语言和自处写成可以回看的片段。",
	links: [],
};

export const complianceConfig = {
	icpRecord: "鄂ICP备2026029383号-1",
	networkPoliceRecord: "鄂公网安备42050002421034号",
	networkPoliceRecordUrl: "https://beian.mps.gov.cn/#/query/webSearch?code=42050002421034",
	networkPoliceRecordIcon: "/assets/public-security-badge.png",
};
```

维护要点：

- 首页 `<title>` 来自 `siteConfig.title`，当前为 `我的生活随笔手札`。
- 页脚名称来自 `profileConfig.name`。
- 侧栏头像来自 `profileConfig.avatar`。
- 站点顶部横幅来自 `siteConfig.banner.src`，`siteConfig.banner.enable` 为 `true` 时展示。
- 修改 ICP 号时，调整 `complianceConfig.icpRecord`。
- 公安联网信息在 `complianceConfig.networkPoliceRecord`、`networkPoliceRecordUrl` 和 `networkPoliceRecordIcon`。编号为空时，页面不会展示公安联网信息。
- 修改后重新构建并部署。

## 5.1 图片资产处理

当前展示用图片优先使用 WebP，favicon 保留 PNG 小尺寸以保证浏览器兼容性。源图不要直接提交为页面引用，先缩放、裁剪、压缩后再放入项目。

当前资产约定：

```text
public/assets/profile-avatar.webp
public/assets/site-banner.webp
public/assets/post-cover.webp
public/assets/site-banner.avif
public/assets/post-cover.avif
public/favicon/favicon-light-32.png
public/favicon/favicon-light-128.png
public/favicon/favicon-light-180.png
public/favicon/favicon-light-192.png
public/favicon/favicon-dark-32.png
public/favicon/favicon-dark-128.png
public/favicon/favicon-dark-180.png
public/favicon/favicon-dark-192.png
```

如需用本机图片重新生成资产，可参考：

```bash
convert "/path/to/avatar.png" -auto-orient -strip -resize 512x512^ -gravity center -extent 512x512 -quality 82 "public/assets/profile-avatar.webp"
convert "/path/to/banner.png" -auto-orient -strip -resize 1920x960^ -gravity center -extent 1920x960 -quality 78 "public/assets/site-banner.webp"
convert "/path/to/banner.png" -auto-orient -strip -resize 1280x720^ -gravity center -extent 1280x720 -quality 78 "public/assets/post-cover.webp"
convert "/path/to/banner.png" -auto-orient -strip -resize 1920x960^ -gravity center -extent 1920x960 -quality 45 "public/assets/site-banner.avif"
convert "/path/to/banner.png" -auto-orient -strip -resize 1280x720^ -gravity center -extent 1280x720 -quality 45 "public/assets/post-cover.avif"
```

favicon 从头像源图生成：

```bash
convert "/path/to/avatar.png" -auto-orient -strip -resize 192x192^ -gravity center -extent 192x192 -quality 88 "public/favicon/favicon-light-192.png"
convert "/path/to/avatar.png" -auto-orient -strip -resize 180x180^ -gravity center -extent 180x180 -quality 88 "public/favicon/favicon-light-180.png"
convert "/path/to/avatar.png" -auto-orient -strip -resize 128x128^ -gravity center -extent 128x128 -quality 88 "public/favicon/favicon-light-128.png"
convert "/path/to/avatar.png" -auto-orient -strip -resize 32x32^ -gravity center -extent 32x32 -quality 88 "public/favicon/favicon-light-32.png"
cp "public/favicon/favicon-light-192.png" "public/favicon/favicon-dark-192.png"
cp "public/favicon/favicon-light-180.png" "public/favicon/favicon-dark-180.png"
cp "public/favicon/favicon-light-128.png" "public/favicon/favicon-dark-128.png"
cp "public/favicon/favicon-light-32.png" "public/favicon/favicon-dark-32.png"
```

## 6. 部署流程

标准部署流程：

```bash
corepack pnpm --filter rosata-cn check
corepack pnpm --filter rosata-cn type-check
corepack pnpm --filter rosata-cn build
rsync -az --delete -e "ssh -p 42960 -o ConnectTimeout=10" "apps/rosata-cn/dist/" root@150.158.127.29:/var/www/rosata_blog/
```

`rsync --delete` 会删除远程 `/var/www/rosata_blog/` 中本地 `apps/rosata-cn/dist/` 不存在的文件。只对站点静态目录使用，不要把目标路径改成 `/var/www/` 或更高层目录。

SSH 认证说明：服务器只接受公钥登录。本机私钥已加入 Windows 侧 OpenSSH 的 `ssh-agent`；WSL 侧自己的 `ssh-agent` 可能没有加载私钥（表现为 `Permission denied (publickey)`）。在 WSL 中执行部署时，用 Windows 的 `ssh.exe` 作为 rsync 传输层即可：

```bash
rsync -az --delete -e "/mnt/c/Windows/System32/OpenSSH/ssh.exe -p 42960 -o ConnectTimeout=10" "apps/rosata-cn/dist/" root@150.158.127.29:/var/www/rosata_blog/
```

部署后验证：

```bash
curl --noproxy '*' --max-time 15 -I https://rosata.cn/
curl --noproxy '*' --max-time 15 -I https://www.rosata.cn/
curl --noproxy '*' --max-time 15 -I https://rosata.cn/archive/
curl --noproxy '*' --max-time 15 -I https://rosata.cn/about/
curl --noproxy '*' --max-time 15 -I https://rosata.cn/posts/morning-cup/
curl --noproxy '*' --max-time 15 -I http://rosata.cn/
curl --noproxy '*' --max-time 15 -s https://rosata.cn/rss.xml | sed -n '1,16p'
```

期望结果：

- `https://rosata.cn/`：`HTTP/1.1 200 OK`
- `https://www.rosata.cn/`：`HTTP/1.1 200 OK`
- `https://rosata.cn/archive/`：`HTTP/1.1 200 OK`
- `https://rosata.cn/about/`：`HTTP/1.1 200 OK`
- `https://rosata.cn/posts/morning-cup/`：`HTTP/1.1 200 OK`
- `http://rosata.cn/`：`HTTP/1.1 301 Moved Permanently`，`Location: https://rosata.cn/`
- RSS 输出中包含 `/posts/` 链接。

如果本地 DNS 或代理干扰验证，可以强制解析到服务器 IP：

```bash
curl --noproxy '*' --max-time 15 -I --resolve rosata.cn:443:150.158.127.29 https://rosata.cn/
curl --noproxy '*' --max-time 15 -I --resolve rosata.cn:80:150.158.127.29 http://rosata.cn/
```

## 7. 服务器维护命令

登录服务器：

```bash
ssh -p 42960 root@150.158.127.29
```

检查 Nginx：

```bash
nginx -t
systemctl status nginx --no-pager -l
systemctl is-active nginx
systemctl is-enabled nginx
```

重载 Nginx：

```bash
nginx -t && systemctl reload nginx
```

查看日志：

```bash
tail -n 100 /var/log/nginx/rosata.cn.access.log
tail -n 100 /var/log/nginx/rosata.cn.error.log
tail -n 100 /var/log/nginx/error.log
```

确认站点文件：

```bash
find /var/www/rosata_blog -maxdepth 3 -type f | sort
```

服务器本机验证虚拟主机：

```bash
curl -I -H 'Host: rosata.cn' http://127.0.0.1/
curl -s -o /dev/null -w 'home:%{http_code}:%{content_type}:%{size_download}\n' -H 'Host: rosata.cn' http://127.0.0.1/
curl -s -o /dev/null -w 'rss:%{http_code}:%{content_type}:%{size_download}\n' -H 'Host: rosata.cn' http://127.0.0.1/rss.xml
```

## 8. HTTPS 和 Certbot

查看证书：

```bash
certbot certificates
```

续期演练：

```bash
certbot renew --dry-run
```

查看自动续期 timer：

```bash
systemctl list-timers --all | grep certbot
systemctl status certbot.timer --no-pager -l
```

当前证书由 Certbot 通过 Nginx 插件管理。不要手动编辑下面这些行，除非清楚 Certbot 的生成规则：

```nginx
listen [::]:443 ssl ipv6only=on; # managed by Certbot
listen 443 ssl; # managed by Certbot
ssl_certificate /etc/letsencrypt/live/rosata.cn/fullchain.pem; # managed by Certbot
ssl_certificate_key /etc/letsencrypt/live/rosata.cn/privkey.pem; # managed by Certbot
include /etc/letsencrypt/options-ssl-nginx.conf; # managed by Certbot
ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem; # managed by Certbot
```

如果未来重建服务器，推荐流程：

1. 先安装 Nginx。
2. 用 `apps/rosata-cn/deploy/nginx/rosata.cn.conf` 配好 HTTP 站点。
3. 确认 `http://rosata.cn/` 公网可访问。
4. 安装 `certbot python3-certbot-nginx`。
5. 执行：

```bash
certbot --nginx -d rosata.cn -d www.rosata.cn --non-interactive --agree-tos --redirect --register-unsafely-without-email
```

如果有维护邮箱，优先使用：

```bash
certbot --nginx -d rosata.cn -d www.rosata.cn --non-interactive --agree-tos --redirect -m you@example.com
```

## 9. DNS 和云安全组

DNS 记录应为：

```text
rosata.cn      A      150.158.127.29
www.rosata.cn  A      150.158.127.29
```

也可以让 `www.rosata.cn` 使用 CNAME 指向 `rosata.cn`。

云厂商安全组/防火墙至少放行：

```text
TCP 80     HTTP
TCP 443    HTTPS
TCP 42960  SSH
```

如果外部访问失败但服务器本机访问成功，优先检查安全组。典型表现是：

- 服务器本机 `curl -H 'Host: rosata.cn' http://127.0.0.1/` 返回 `200`
- 外部 `curl http://150.158.127.29/ -H 'Host: rosata.cn'` 超时或空响应
- Nginx access log 没有外部请求记录

这种情况说明请求没有到达 Nginx，根因通常是云安全组、云防火墙、运营商链路或本机代理，而不是 Astro 或 Nginx 配置。

## 10. 常见故障排查

### 10.1 `rsync` 报 `command not found`

现象：

```text
bash: line 1: rsync: command not found
rsync error: error in rsync protocol data stream (code 12)
```

原因：远端服务器未安装 `rsync`。

修复：

```bash
ssh -p 42960 root@150.158.127.29 "DEBIAN_FRONTEND=noninteractive apt-get install -y rsync"
```

### 10.2 SSH 端口超时

检查端口：

```bash
nc -vz -w 5 150.158.127.29 42960
```

如果失败，检查云安全组是否仍放行 TCP `42960`。不要只放行 80/443 后误删 SSH 规则。

### 10.3 HTTPS 证书签发失败

先验证 HTTP：

```bash
curl --noproxy '*' --max-time 15 -I --resolve rosata.cn:80:150.158.127.29 http://rosata.cn/
```

如果 HTTP 不通，先修 DNS、安全组和 Nginx。Let's Encrypt 的 HTTP-01 验证依赖公网可以访问 80 端口。

查看 Certbot 日志：

```bash
tail -n 120 /var/log/letsencrypt/letsencrypt.log
```

### 10.4 页面更新后线上没变化

按顺序检查：

```bash
corepack pnpm --filter rosata-cn build
find apps/rosata-cn/dist -maxdepth 3 -type f | sort
rsync -az --delete -e "ssh -p 42960 -o ConnectTimeout=10" "apps/rosata-cn/dist/" root@150.158.127.29:/var/www/rosata_blog/
curl --noproxy '*' --max-time 15 -I https://rosata.cn/
```

HTML/XML/JSON 的缓存为 `max-age=60`，最多可能有短时间缓存。`/_astro/` 构建产物与 `/pagefind/` 搜索索引文件名带内容哈希，缓存为一年 `immutable`；其余静态资源（图片、字体、favicon）缓存 30 天。整站响应带安全头（HSTS、nosniff、SAMEORIGIN、Referrer-Policy、Permissions-Policy），gzip 在 rosata.cn.conf 的 server 作用域内调优，不影响其他站点。

### 10.5 旧 `/blog/` 链接

当前 Fuwari 文章路径是 `/posts/<slug>/`。旧项目曾使用 `/blog/<slug>/`，如果未来发现外部已有旧链接，可以在远程 Nginx live 配置中为 HTTPS server 增加重定向：

```nginx
location ~ ^/blog/(.*)$ {
    return 301 /posts/$1;
}
```

修改 Nginx 前先备份 live 配置，修改后必须执行：

```bash
nginx -t && systemctl reload nginx
```

## 11. 未来 agent 操作守则

维护本项目时请遵守：

- 先读 `README.md` 和本文档，再执行远程操作。
- 不要把明文密码、私钥、token 写入仓库。
- 不要在用户未要求时执行 `git commit`、`git push`、`git reset --hard`。
- 不要直接覆盖远程 Nginx live 配置，除非已先备份并确认 Certbot 管理段。
- 远程修改 Nginx 后必须执行 `nginx -t`，成功后才 `systemctl reload nginx`。
- 部署前必须执行 `corepack pnpm --filter rosata-cn check`、`corepack pnpm --filter rosata-cn type-check` 和 `corepack pnpm --filter rosata-cn build`。
- 部署后必须验证 HTTPS 首页、归档页、关于页、至少一篇文章、HTTP 跳转和 RSS。
- 对 `/var/www/rosata_blog/` 使用 `rsync --delete` 是允许的；不要对更高层目录使用 `--delete`。

## 12. 快速维护清单

新增文章并部署：

```bash
corepack pnpm --filter rosata-cn check
corepack pnpm --filter rosata-cn type-check
corepack pnpm --filter rosata-cn build
rsync -az --delete -e "ssh -p 42960 -o ConnectTimeout=10" "apps/rosata-cn/dist/" root@150.158.127.29:/var/www/rosata_blog/
curl --noproxy '*' --max-time 15 -I https://rosata.cn/
curl --noproxy '*' --max-time 15 -I https://rosata.cn/archive/
curl --noproxy '*' --max-time 15 -I https://rosata.cn/about/
curl --noproxy '*' --max-time 15 -I https://rosata.cn/posts/morning-cup/
curl --noproxy '*' --max-time 15 -I http://rosata.cn/
curl --noproxy '*' --max-time 15 -s https://rosata.cn/rss.xml | sed -n '1,16p'
```

服务器健康检查：

```bash
ssh -p 42960 root@150.158.127.29 "nginx -t && systemctl is-active nginx && certbot certificates"
```

证书续期演练：

```bash
ssh -p 42960 root@150.158.127.29 "certbot renew --dry-run"
```
