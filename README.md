# IP543 攝影論壇

IP543 是以 React + Vite 建置的前端網站，資料庫、登入驗證、Storage 與後端能力使用 Supabase。  
此專案建議後續以：

- GitHub 管理原始碼
- Supabase 管理資料、Auth、Storage、Functions
- Cloudflare Pages 部署前端

為主要維運方式。

## 技術堆疊

- Vite
- React 18
- TypeScript
- Tailwind CSS
- shadcn/ui
- TanStack Query
- Supabase

## 本機開發

需求：

- Node.js 18+ 或更新版本
- npm
- Git

安裝依賴：

```bash
npm install
```

啟動開發環境：

```bash
npm run dev
```

本機預覽正式 build：

```bash
npm run build
npm run preview
```

## 環境變數

請建立 `.env.local` 或 `.env`，可參考 `.env.example`：

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-supabase-anon-key
VITE_SUPABASE_PROJECT_ID=your-project-ref
```

## Cloudflare Pages 部署

這是標準 SPA 專案，建議部署到 Cloudflare Pages。

### Build 設定

- Framework preset: `Vite`
- Build command: `npm run build`
- Build output directory: `dist`
- Root directory: `/`

### 必填環境變數

在 Cloudflare Pages 專案中新增：

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_SUPABASE_PROJECT_ID`
- `NODE_VERSION=22`

### SPA 路由設定

本專案已包含 `public/_redirects`，可讓以下前端路由在 Cloudflare 正常工作：

- `/auth`
- `/admin`
- `/about`
- `/contact`
- `/privacy`
- `/terms`

### Headers 與快取

本專案已包含 `public/_headers`：

- `/assets/*` 使用長快取
- HTML 路由加上基本安全標頭

## Supabase 搬遷 / 維運注意事項

請在 Supabase Dashboard 中確認：

1. `Authentication > URL Configuration`
2. `Site URL`
3. `Redirect URLs`

至少包含：

- `https://ip543.com`
- `https://www.ip543.com`
- Cloudflare Pages 提供的 preview domain

若登入流程或 magic link / OAuth 要正常運作，這些設定不能漏。

## Supabase Edge Functions 寄信設定

本專案的郵件佇列處理使用 Resend API。請在 Supabase Edge Functions secrets 中設定：

- `RESEND_API_KEY`
- `RESEND_API_URL`（可選，預設為 `https://api.resend.com/emails`）

這些 secret 不需要放到 Cloudflare Pages 前端環境變數。

## 專案目錄說明

- `src/`：前端主程式
- `public/`：靜態檔案
- `supabase/migrations/`：資料庫 migration
- `supabase/config.toml`：Supabase 本地設定

## 搬遷前建議

1. 先確認 `npm run build` 成功
2. 確認 `.env` 內容正確
3. 確認 GitHub 上實際更新的是 `src/...` 內正式檔案，而不是額外暫存資料夾
4. 確認 Supabase Auth redirect URL 已設定好
5. 再將 GitHub repo 連到 Cloudflare Pages

## 根目錄注意事項

若根目錄有這類暫存檔案，建議不要作為正式部署來源：

- `Auth.tsx`
- `ReportManagement.tsx`
- `SystemSettings.tsx`
- `UserManagement.tsx`

正式原始碼應以 `src/` 內對應檔案為準。
