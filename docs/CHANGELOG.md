# CHANGELOG

## V24.2
- Worker 升級至 v5.0.0：已知影片 ID + YouTube 公開影片自動偵測。
- 網站合併 WCMD 與 API 時，會自動加入 WCMD 尚未登錄的新集數。
- 新集數英文標題加入 fallback，避免英文/雙語模式空白。
- 底部版本更新為 Website v24.2 ｜ Worker v5.0 ｜ Database WCMD v1.0。


## V24.3
- 新增 `data/videoIds.json`，支援不公開 / 未列出影片。
- Worker 升級 v6.0.0，支援 `/api/videos?ids=...`。
- 網站讀取 videoIds.json 後向 Worker 取得 YouTube 資料。
- 新影片只需新增影片 ID，即可更新影片數、中文標題、縮圖、連結與英文 fallback 標題。
