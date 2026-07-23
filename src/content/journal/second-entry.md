---
title: notes.log
date: 2026-01-15
excerpt: 第二篇範例,示範多筆日誌條目在列表中如何排列。
category: 技術
---

第二篇範例日誌。

每一篇文章都是 `src/content/journal/` 底下的一個 `.md` 檔案,檔名(去掉副檔名)就是網址的 slug,例如這篇檔名是 `second-entry.md`,網址就是 `/journal/second-entry`。

frontmatter(檔案最上面 `---` 包起來的區塊)需要三個欄位:`title`、`date`、`excerpt`,格式錯誤的話建置時會直接報錯提醒你。

想放圖片的話,把圖片先傳到任一圖床(例如 Imgur、GitHub、雲端硬碟的公開連結等),拿到網址後用標準 Markdown 語法貼上即可:

![範例圖片](https://picsum.photos/800/400)
