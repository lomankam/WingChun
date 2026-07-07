# WCMD Schema v24.1

WCMD（Wing Chun Master Database）是網站、搜尋與 AI 未來共用的唯一課程資料來源。

## 主要欄位

- `episode`：集數
- `title.zh` / `title.en`：中文與英文標題
- `category`：七大主分類之一
- `tags`：搜尋與 AI 使用的關鍵字
- `concepts`：觀念型節點，例如「順勢而行」「接觸反應」
- `skills`：技術型節點，例如「抱牌掌」「蹬手」
- `youtube`：YouTube videoId、url、thumbnail、publishedAt
- `dataStatus`：標記資料是否已確認

## 分類狀態

- `confirmed`：已與使用者確認
- `draft`：合理建議版，等待使用者最終確認

## 下一步

V24.2：讓 Worker 讀取 WCMD 並合併 YouTube API 的縮圖與發布時間。
