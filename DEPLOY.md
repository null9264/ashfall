# 部署到 Cloudflare Pages(小白级指引)

沙盒已经验证:此工程能**直接部署到 Cloudflare Pages**,无需 GitHub,无需信用卡。

## 为什么选 Cloudflare?

- 国内访问比 Vercel/GitHub Pages 稳得多
- D1(SQLite)免费配额足够中小游戏
- 免费子域 `*.pages.dev` 即可上线,绑定自有域名更稳
- 沙盒已经实测 `cloudflare.com / api.cloudflare.com / pages.dev` 在国内出网可达
- `wrangler` 可从 npm 镜像安装,**不需要 GitHub**

## 准备(你需要做的,5 分钟)

### 1. 注册 Cloudflare

1. 打开 https://dash.cloudflare.com/sign-up
2. 推荐 **Continue with Google**(最快,无需信用卡)
3. 登录后会在 dashboard 顶部看到一个默认账号

### 2. 生成 API Token

1. 打开 https://dash.cloudflare.com/profile/api-tokens
2. 点 **Create Token → Edit Cloudflare Pages** 模板(或选 Custom Token,授予 `Pages: Edit` + `D1: Edit` + `Account: Read`)
3. 点 **Continue to summary → Create Token**
4. **复制生成的 token**(以一长串字符形式呈现,只显示一次)

### 3. (可选,推荐)注册一个你自己的域名

国内想百分百稳定访问,绑一个域名(几十元/年)。

- 万网/腾讯云/阿里云都可以买
- 买完后在 Cloudflare 添加站点,按提示改 NS 记录
- 沙盒里 AI 部署时直接绑这个域名

## 部署(交给 AI 一步搞定)

把以下两样发到对话里:

```
CLOUDFLARE_API_TOKEN=你的token
DOMAIN=你的域名(可选,不带也可以,系统会给你 *.pages.dev)
```

AI 会自动执行:

```bash
npx wrangler d1 create ashfall-db
npx wrangler d1 migrations apply ashfall-db --remote
npx wrangler pages deploy dist --project-name ashfall
# 绑域名(若有)
```

部署成功后会返回一个 URL,如 `https://ashfall.pages.dev`,这个链接**你的朋友直接打开就能玩**。

## 部署后管理

- Cloudflare Dashboard → Pages → ashfall → 看到部署历史
- D1 数据库可在 Workers & Pages → D1 → ashfall-db 管理
- 改完代码后,AI 跑一遍上面命令即可重新部署

## 故障排查

| 症状 | 原因 | 解法 |
|---|---|---|
| `Authentication error [code: 10000]` | token 错误或过期 | 重新生成 token |
| `d1: DATABASE_NOT_FOUND` | 没建库或 migration 没跑 | 跑迁移命令 |
| 部署成功但打开 404 | `dist/` 为空(本地未 build) | 先 `npm run build` 再部署 |
| 国内访问偶尔慢 | `pages.dev` 偶发不稳 | 绑自有域名 |