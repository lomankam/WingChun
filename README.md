# WingChun V23.6 API Fallback

本版將網站影片資料來源改為：

1. 優先讀取 Cloudflare Worker API：`https://wingchun-sync.lomankam-master.workers.dev/api/videos`
2. 若 API 失敗，自動回退讀取原本的 `videos.json`

只需要覆蓋 `index.html`。
