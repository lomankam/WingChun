# WingChun V24.2 Auto New Video

## 目的
新的公開 YouTube 影片上傳後，網站可自動更新影片總數、中文標題，並提供英文標題 fallback，避免英文/雙語模式空白。

## 需要更新
1. Cloudflare Worker：貼上 `cloudflare/worker.js` 後 Deploy。
2. GitHub Pages：覆蓋 `index.html`。
3. 保留 `data/` 與 `docs/`。

## 測試
- `/api/health` 應顯示 Worker v5.0.0
- `/api/videos` 應顯示 count 至少 29

## 注意
YouTube Data API 只能自動列出公開影片；若新影片設為「未列出」，仍需把 videoId 加入 Worker 或 WCMD。
