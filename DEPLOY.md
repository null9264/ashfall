# Cloudflare Pages 部署说明

## 方式一：Git 集成（推荐，推送即部署）

### 步骤 1：Dashboard 绑定 GitHub

1. 打开 https://dash.cloudflare.com/
2. 左侧 **Workers & Pages** → 选中 `ashfall` 项目
3. **Settings** → **Builds** → **Connect to Git**
4. 选择 **GitHub** → 授权（首次跳转）
5. 选仓库：**null9264/ashfall** / 分支：**main**

### 步骤 2：构建配置

| 配置项 | 值 |
|---|---|
| Framework preset | Vite |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Root directory | (留空) |

### 步骤 3：确认 D1 绑定

**Settings** → **Functions** → **D1 database bindings**：

| Variable name | D1 database |
|---|---|
| `DB` | `ashfall-db` (id: `c5cf2d50-a387-4195-bb16-334dc52b33b7`) |

### 步骤 4：触发首次部署

回到 **Deployments** → **Create deployment** → **Branch: main** → **Deploy**。

完成后日志里看到 `✓ Compiled successfully` 就成功。

---

## 之后更新代码

```bash
git add -A
git commit -m "描述"
git push origin main
```

Git push 后 Cloudflare 自动构建，约 2-3 分钟上线。

---

## 方式二：手动上传（备用）

如果不接 Git，可以本地 build 后拖拽 dist/ 到 Dashboard：

```bash
npm install
npm run build
# 把 dist/ 整个文件夹拖到 Cloudflare Dashboard → Pages → ashfall → Upload
```

---

## 验收清单

部署成功后验证：

| URL | 期望 |
|---|---|
| `https://ashfall-6mr.pages.dev/` | 首屏输入昵称进游戏 |
| `https://ashfall-6mr.pages.dev/#/admin-de151e977f2564132a767db5` | 后台登录页 |
| `https://ashfall-6mr.pages.dev/api/state` | 返回 `{"area":{"id":"gate"},"nickname":null,...}` |
| 页面底部 | "💬 反馈建议" 链接 |
| 后台"反馈"Tab | 看到玩家反馈列表 |

## 故障排查

| 症状 | 原因 | 解法 |
|---|---|---|
| Build failed: `Cannot find module` | 依赖没装 | 检查 build 是否跑了 `npm install`（Vite 模板默认会） |
| Functions 404 | D1 没绑定 | 检查 Settings → Functions → D1 bindings |
| 部署成功但首屏空白 | SPA 路由问题 | 已配置 `_redirects`，重部署即可 |
