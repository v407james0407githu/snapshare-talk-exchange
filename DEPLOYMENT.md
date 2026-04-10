# 部署清單

## 1. 本機確認

```bash
npm install
npm run build
```

建議本機與 Cloudflare Pages 使用相同 Node 大版本：

- `.nvmrc`：`22`
- Cloudflare Pages 環境變數可加：
  - `NODE_VERSION=22`

## 2. GitHub

- 確認正式原始碼在 `src/` 內
- 不要把暫存修改檔直接丟在 repo 根目錄當成正式來源
- push 到要部署的 branch（通常是 `main`）

## 3. Cloudflare Pages

建立專案時填入：

- Framework preset: `Vite`
- Build command: `npm run build`
- Output directory: `dist`
- Root directory: `/`（若 repo 根目錄就是此專案）

環境變數：

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_SUPABASE_PROJECT_ID`
- `NODE_VERSION=22`

## 4. Supabase

確認以下設定：

- Site URL：`https://ip543.com`
- Redirect URLs：
  - `https://ip543.com`
  - `https://www.ip543.com`
  - Cloudflare preview 網址

另外請在 Supabase Edge Functions secrets 中設定：

- `RESEND_API_KEY`
- `RESEND_API_URL`（可選）

## 5. 部署後驗收

前台：

- `/`
- `/about`
- `/contact`
- `/privacy`
- `/terms`

登入：

- `/auth -> /admin` 是否正常

後台：

- `/admin`
- `/admin/community/photos`
- `/admin/members`
- `/admin/moderation/reports`
- `/admin/analytics`
- `/admin/settings`
- `/admin/settings/features`

SEO：

- `title`
- `description`
- `og:title`
- `og:description`
- `og:image`
- `favicon`

## 6. Cloudflare SPA 路由

本專案部署到 Cloudflare Workers/Pages 時，不使用 `public/_redirects`。
Cloudflare 新版部署流程會把 `/* /index.html 200` 判定為可能造成無限迴圈的規則並中止部署。
目前先依賴 Vite + Cloudflare 的預設 SPA 路由處理；若之後深層路由仍有 404，再改用 Cloudflare 相容的 routing 設定補上。

## 7. Cloudflare Headers

本專案已加入 `public/_headers`：

- HTML 路由加上基本安全標頭
- `/assets/*` 設定長快取

部署後如果首頁正常但資產沒有吃到快取，請先確認 `_headers` 有被一起部署。
