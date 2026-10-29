# MangaVerse 📖✨

Usa ka modernong Web App para sa pagbasa, pag-search, pag-bookmark, ug pag-download sa mga **Manga (Japanese)**, **Manhwa (Korean Webtoons)**, ug **Manhua (Chinese Comics)** gamit ang libreng MangaDex API.

---

## 🚀 Features

- 🔍 **Live Search & Advanced Filters**:
  - Filter sumala sa tipo: **🇯🇵 Manga**, **🇰🇷 Manhwa**, **🇨🇳 Manhua**.
  - 70+ Genre & Theme tags (Action, Romance, Isekai, Fantasy, Martial Arts, Comedy, etc.).
  - Status filter (Ongoing, Completed) ug Sort (Popularity, Latest, Rating).
- 📖 **Immersive Manga & Webtoon Reader**:
  - **Webtoon Mode**: Continuous vertical scroll (walay putol nga strip, perfect para sa Manhwa).
  - **Single Page Mode**: Page-by-page reader nga naay Keyboard shortcuts (`←` / `→`, `A` / `D`, `F` para fullscreen) ug RTL (Right-to-Left) support.
  - **Data Saver Mode**: Pag-toggle sa compressed images para tipid sa data.
- 💾 **Personal Library & Bookmarks**:
  - Kategoriya sa pag-save: *Currently Reading*, *Plan to Read*, *Completed*, *On Hold*, *Dropped*.
  - I-backup ug i-restore ang imong bookmarks gamit ang JSON file.
- ⏱️ **Reading History & Resume**:
  - Awtomatikong ma-save kung asa ka nga chapter ug panid (page) ni-undang.
  - "Continue Reading" shelf sa Home page para dali ma-resume.
- 📥 **Offline Reading / CBZ Download**:
  - Pwede nimo ma-download ang bisan unsang chapter isip `.cbz` (Comic Book Zip) file para mabasa bisan offline.

---

## 🛠️ Tech Stack

- **Framework**: [Next.js](https://nextjs.org/) (App Router + React 19)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Data Source**: [MangaDex REST API](https://api.mangadex.org/)
- **Offline CBZ Packager**: JSZip + FileSaver

---

## 💻 Unsaon Pag-padagan (How to Run)

Ablihi ang Terminal sulod sa folder:
```bash
cd ~/Downloads/apps/manga
```

### 1. Development Mode (Live server):
```bash
npm run dev -- -p 3005
```
Dayon ablihi ang imong browser sa:
👉 **[http://localhost:3005](http://localhost:3005)**

*(Pwede usab kini ma-abli sa imong cellphone basta parehas mo og Wi-Fi gamit ang imong local network IP)*

### 2. Production Build:
```bash
npm run build
npm run start -- -p 3005
```
