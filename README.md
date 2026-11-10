# Loïc Dumas — Portfolio

Live at **https://jangloic.github.io** once published.

## Files

| File | What it is | Edit it? |
|---|---|---|
| `content.js` | **All the text** (EN + FR): chat answers, case studies, game, method | Yes, this is the only file you normally touch |
| `index.html` | Page structure | Rarely |
| `styles.css` | Colours and layout (Ocean palette at the top) | Rarely |
| `app.js` | Chat, AI model, game, pages | No |
| `assets/` | CV (and your photo later) | Add or replace files |

## Publish on GitHub Pages (about 5 minutes, free)

1. Sign in to GitHub as **Jangloic**.
2. Click **+ → New repository**.
   - Repository name: **`Jangloic.github.io`** (exactly this)
   - Public
   - Click **Create repository**.
3. On the new repo page, click **uploading an existing file**.
4. Drag **everything inside this folder** (`index.html`, `content.js`, `app.js`, `styles.css`, `README.md` and the `assets` folder) into the page.
5. Click **Commit changes**.
6. Go to **Settings → Pages**. Under *Build and deployment*, choose **Deploy from a branch**, branch **main**, folder **/ (root)**, then **Save**.
7. Wait 1–2 minutes, then open **https://jangloic.github.io**.

## Edit the site later

- **Small text change:** on GitHub, open `content.js` → pencil icon ✏️ → edit → **Commit changes**. Live in about a minute.
- **With Claude (personal account):** upload `content.js`, ask for the change, then paste the new file back on GitHub the same way.
- Every text is written `T("English", "Français")`, so always update both languages.

## Add your photo later

1. Put the photo in `assets/`, e.g. `assets/photo.jpg` (square, at least 400×400 px).
2. In `content.js`, set `photo: "assets/photo.jpg"`.

## How the chat works

The chat loads a small open-source model (all-MiniLM-L6-v2, about 23 MB) in the visitor's browser the first time they click the input. It finds the closest answer among the ones written in `content.js`, so it never invents anything. If the model can't load, keyword matching takes over. To add an answer, copy an entry in the `chat` list and change its `id`, `ex` (example questions), `kw` (keywords) and `a` (answer).

## Add screenshots to a case study

1. Export the image (in Figma: select the frame → **Export** → PNG) and put it in `assets/`, e.g. `assets/genai-1.png`.
2. In `content.js`, find the project's `gallery: []` and add a line:
   `{ src: "assets/genai-1.png", wide: true, cap: T("Caption in English", "Légende en français") }`
   Use `wide: true` for desktop screens; leave it out for phone screens.
