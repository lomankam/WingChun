# WingChun V25.3 Admin One-click Publish

## 更新檔案

請更新：

- `admin/index.html`
- `cloudflare/worker.js`

## Cloudflare Secrets

必須已存在：

- `YOUTUBE_API_KEY`
- `GITHUB_TOKEN`

建議新增：

- `ADMIN_PASSWORD`：後台密碼。若未設定，預設為 `wingchun2026`。

## 測試

1. Worker 部署後測試：
   - `/api/health` 應顯示 `version: 7.0.0` 且 `githubEnabled: true`
2. 前往：
   - `https://lomankam.github.io/WingChun/admin/`
3. 登入後貼 YouTube 未列出影片連結。
4. 確認資料後按「確認發布到 GitHub」。

## 發布結果

系統會更新 GitHub：

- `data/videoIds.json`
- `data/wcmd.json`

GitHub Pages 通常 1–3 分鐘後更新。
