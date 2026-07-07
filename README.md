# WingChun V22.3

本版為 V22.3「CSS 模組化」版本。

## 本次更新

- 保留 V22.2.2 的所有功能與版面。
- 將單一 `css/style.css` 拆成多個 CSS 模組。
- `css/style.css` 改為入口檔，使用 `@import` 匯入各模組。
- 版本號更新為 `v22.3`。
- `index.html` 中 CSS / JS 快取參數更新為 `?v=22.3`。

## CSS 結構

```text
css/
├── style.css              # CSS 入口檔，匯入全部模組
├── base.css               # 基礎版面、課程卡片、最新更新、側欄
├── chat.css               # 聊天室基礎樣式
├── theme-hero-tune.css    # 黑金主題與 Hero 調整
├── hero-banner.css        # 主視覺 Banner
├── brand-language.css     # Logo 與語言按鈕狀態
├── hero-final.css         # 最終 Hero 主視覺與按鈕
├── course-layout.css      # 所有課程區與語言按鈕位置
├── buttons-cards.css      # 全站按鈕與卡片互動
├── language-fixes.css     # 語言按鈕文字與 Hover 修正
├── animations.css         # Logo 金光與動畫
├── ai-shortcut.css        # AI 助理捷徑按鈕
└── lesson-card-fix.css    # 集數移至標題區雙 Capsule 修正
```

## 測試重點

1. 首頁主視覺是否正常。
2. 語言按鈕是否正常切換。
3. 課程卡片集數是否位於標題區上方，沒有遮住縮圖。
4. 最新更新、AI 助理、聊天室是否正常。
5. 手機版顯示是否正常。

