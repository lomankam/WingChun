# WingChun V26.2 Visitor Statistics

管理後台 `admin/index.html` 新增連線國家與時間統計，資料由 Cloudflare Worker 與 D1 提供。

- 前台每次載入會紀錄 Cloudflare 判定的國家代碼、累計次數與最後造訪時間。
- 不儲存 IP 位址或其他訪客識別資料。
- 統計資料只能在通過管理密碼驗證後讀取。
