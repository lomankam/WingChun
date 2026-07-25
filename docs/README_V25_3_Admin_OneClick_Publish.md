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

自動同步需要另外設定一個非機密變數：

- `YOUTUBE_CHANNEL_ID`：YouTube 頻道 ID；或直接設定 `YOUTUBE_UPLOADS_PLAYLIST_ID`。

若兩者都未設定，Worker 會嘗試從現有影片 ID 推導頻道的 uploads playlist。

## Cloudflare Workers AI

`cloudflare/wrangler.toml` 已加入：

```toml
[ai]
binding = "AI"
```

部署 Worker 前，請確認 Cloudflare 帳戶已啟用 Workers AI。Worker 會使用 `env.AI`，預設模型為 `@cf/qwen/qwen3-30b-a3b-fp8`；如需調整，可設定非機密變數 `AI_MODEL`。

- 阿智：`POST /api/ai/chat`
- 管理員發布未填英文標題時：Worker 自動產生英文標題
- 官方術語來源：`data/terminology.json`

## 測試

1. Worker 部署後測試：
   - `/api/health` 應顯示 `version: 8.2.0`、`githubEnabled: true`、`workersAIEnabled: true`
2. 前往：
   - `https://lomankam.github.io/WingChun/admin/`
3. 登入後貼 YouTube 未列出影片連結。
4. 確認資料後按「確認發布到 GitHub」。

## 發布結果

系統會更新 GitHub：

- `data/videoIds.json`
- `data/wcmd.json`

GitHub Pages 通常 1–3 分鐘後更新。
