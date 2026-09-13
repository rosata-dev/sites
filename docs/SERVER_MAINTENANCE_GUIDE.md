# 服务器通用维护手册

本文档面向以后不一定维护博客、但需要接手这台服务器配置与服务部署的 agent。

目标是让维护者不依赖历史对话，也能快速理解服务器基线、SSH 登录方式、Nginx、HTTPS、DNS、部署流程和排障方法。

不要在仓库里写入服务器密码、私钥、token 或其他明文凭据。当前默认通过本机 `ssh-agent` 或本机私钥登录。

## 1. 服务器基线

- 公网 IP：`150.158.127.29`
- SSH 端口：`42960`
- SSH 用户：`root`
- 操作系统：Debian GNU/Linux 12 (bookworm)
- 反向代理 / Web 服务：Nginx
- 常见站点目录：`/var/www/<service_name>`
- Nginx 站点配置：`/etc/nginx/sites-available/<domain>.conf`
- Nginx 启用链接：`/etc/nginx/sites-enabled/<domain>.conf`
- 访问日志：`/var/log/nginx/<domain>.access.log`
- 错误日志：`/var/log/nginx/<domain>.error.log`
- TLS 证书：Let's Encrypt / Certbot
- 自动续期：`certbot.timer`

## 2. 登录方式

优先使用本机已经加入 `ssh-agent` 的私钥。

```bash
ssh -p 42960 root@150.158.127.29
```

如果需要显式指定私钥：

```bash
ssh -i ~/.ssh/id_ed25519 -o IdentitiesOnly=yes -p 42960 root@150.158.127.29
```

如果 SSH 失败，先确认：

- 本机私钥是否存在
- `ssh-agent` 是否已加载对应密钥
- 云安全组是否放行 TCP `42960`
- 目标服务器是否允许当前公钥

## 3. Nginx 基本操作

检查配置：

```bash
nginx -t
```

查看服务状态：

```bash
systemctl status nginx --no-pager -l
systemctl is-active nginx
systemctl is-enabled nginx
```

重载配置：

```bash
nginx -t && systemctl reload nginx
```

常用日志：

```bash
tail -n 100 /var/log/nginx/error.log
tail -n 100 /var/log/nginx/<domain>.error.log
tail -n 100 /var/log/nginx/<domain>.access.log
```

## 4. 站点与静态文件

如果部署的是静态站点，通常流程是：

1. 本地构建出静态产物。
2. 用 `rsync` 同步到服务器静态目录。
3. 由 Nginx 直接提供文件。

示例：

```bash
rsync -az --delete -e "ssh -p 42960 -o ConnectTimeout=10" "dist/" root@150.158.127.29:/var/www/<service_name>/
```

`--delete` 只应使用在明确的静态站点目录，不要对更高层目录使用。

如果是其他类型服务，建议按服务自身约定调整目录，但仍保持“本地生成，远端只接收成品”的思路。

## 5. HTTPS 与 Certbot

查看证书：

```bash
certbot certificates
```

续期演练：

```bash
certbot renew --dry-run
```

查看自动续期：

```bash
systemctl list-timers --all | grep certbot
systemctl status certbot.timer --no-pager -l
```

Certbot 管理的 Nginx 配置段一般不要手工乱改，尤其是这些行：

```nginx
listen [::]:443 ssl ipv6only=on; # managed by Certbot
listen 443 ssl; # managed by Certbot
ssl_certificate /etc/letsencrypt/live/<domain>/fullchain.pem; # managed by Certbot
ssl_certificate_key /etc/letsencrypt/live/<domain>/privkey.pem; # managed by Certbot
include /etc/letsencrypt/options-ssl-nginx.conf; # managed by Certbot
ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem; # managed by Certbot
```

如果未来重建服务器，推荐流程：

1. 先安装 Nginx。
2. 用 HTTP 配置完成基础站点。
3. 确认公网能访问 80 端口。
4. 安装 `certbot python3-certbot-nginx`。
5. 再申请证书并开启自动跳转。

## 6. DNS 与防火墙

DNS 记录通常是：

```text
<domain>      A      150.158.127.29
www.<domain>   A      150.158.127.29
```

也可以把 `www` 设为 CNAME 指向主域名。

云厂商安全组 / 防火墙至少要放行：

```text
TCP 80     HTTP
TCP 443    HTTPS
TCP 42960  SSH
```

如果外部访问失败但服务器本机正常，优先检查：

- 安全组
- 云防火墙
- 运营商链路
- 本机代理

## 7. 常见排错

### 7.1 SSH 连接失败

先检查端口：

```bash
nc -vz -w 5 150.158.127.29 42960
```

### 7.2 Nginx 配置失败

先看：

```bash
nginx -t
```

再看日志。

### 7.3 HTTPS 证书签发失败

先确认 HTTP 可达，再看：

```bash
tail -n 120 /var/log/letsencrypt/letsencrypt.log
```

### 7.4 站点更新后没变化

按顺序检查：

```bash
本地构建
rsync 同步
远端文件是否更新
Nginx 是否重载
```

## 8. 操作守则

- 先读当前文档和相关项目文档，再动远端。
- 不要把明文密码、私钥、token 写进仓库。
- 不要在未确认时执行 `git commit`、`git push`、`git reset --hard`。
- 修改 Nginx 前先备份。
- 修改 Nginx 后必须先 `nginx -t`，成功后再 `systemctl reload nginx`。
- 如果是静态站点，部署前先完成本地构建。
- 如果是其他服务，按服务本身的部署方式调整，但仍保持“先验证，再上线”。

## 9. 快速清单

```bash
ssh -p 42960 root@150.158.127.29
nginx -t
systemctl reload nginx
certbot certificates
certbot renew --dry-run
tail -n 100 /var/log/nginx/error.log
```

