# WingChun V23.0 Foundation

本版建立平台資料層（Data Layer），版面與功能保持 V22.3 穩定版邏輯。

## 新增內容

- `data/videos.json`：1～29 集課程資料，補齊官方英文標題、英文分類、英文關鍵字。
- `data/terminology.json`：詠春術語官方資料庫。
- `data/categories.json`：分類中英對照。
- `data/languages.json`：網站固定文字中英資料。
- `data/settings.json`：網站設定資料。
- `data/changelog.json`：版本更新紀錄。
- `docs/STYLE_GUIDE.md`：官方英文用語規範。
- `docs/WingChun_Terminology_v1.0.md`：術語表。

## 注意

為了穩定，網站目前仍讀取根目錄 `videos.json`；`data/` 是 V23 平台化的資料基礎。下一版會逐步讓網站改讀 `data/`。
