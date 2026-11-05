# Void Runner

A responsive space shooter built with plain HTML, CSS, and JavaScript. No build step, backend, API keys, fonts, or external assets are needed.

## Play

- Select **Launch ship**, or press **Enter**.
- Move with **WASD** or the **arrow keys**. On mobile, touch and drag anywhere in the game field; the ship stays slightly above your finger.
- Your ship fires automatically. Destroy enemies for **10 points** each.
- You have **three shields**. Colliding with an enemy or letting one escape costs a shield. After damage, a brief flashing shield gives 1.5 seconds of protection.
- A new wave begins every **18 seconds**, increasing enemy speed and spawn frequency. Difficulty has a cap so play remains practical.
- Press **P**, **Escape**, or the pause button to pause/resume. Switching tabs or losing window focus also pauses play.
- Press **R** at any time to restart, or use **Restart run** while paused. After game over, select **Fly again**.
- Your best completed score is saved in this browser's `localStorage`. Clearing site data resets it. If storage is blocked, the game still works and keeps the best score for the current page session.

## Run locally

From the repository directory:

```sh
python3 -m http.server 8000
```

Open <http://localhost:8000>. The website has no runtime dependencies. All asset references are relative, including when hosted at `/space-game/` on GitHub Pages.

## Deploy to GitHub Pages

1. In the repository, open **Settings → Pages → Build and deployment**, and select **GitHub Actions** as the source (requires repository administration access).
2. Push changes to **main**. The **Deploy to GitHub Pages** workflow runs automatically. You can also select **Actions → Deploy to GitHub Pages → Run workflow** to deploy manually from `main`.
3. The workflow checks JavaScript syntax, configures Pages using `actions/configure-pages`, stages `index.html`, `style.css`, and `game.js`, uploads them using `actions/upload-pages-artifact`, and deploys using `actions/deploy-pages`.
4. Open the URL shown in the workflow's **github-pages** environment. For this repository the expected URL is <https://pavelsokolovan.github.io/space-game/>.

The workflow grants `contents: read`, `pages: write`, and `id-token: write` to the deployment job. No personal access token or repository secret is needed. Deployments share the `pages` concurrency group and do not cancel a deployment already in progress. If deployment fails, check the Actions log, the Pages source setting, and any protection rules on the `github-pages` environment.

## Validation

Syntax check:

```sh
node --check game.js
```

Browser integration checks require Node.js, Python 3, Playwright, and Chromium. Install test tooling locally (not needed to run or deploy the game):

```sh
npm install --no-save --package-lock=false playwright
npx playwright install chromium
CHROMIUM_PATH="$(node -e "console.log(require('playwright').chromium.executablePath())")" node tests/game.spec.cjs
```

The browser checks cover launch, keyboard input, pause/resume, difficulty, restart, automatic pause, game over, score persistence, mobile pointer input, narrow layout, blocked storage, browser errors, and assets served under a project URL. By default the script uses `/usr/bin/chromium`; set `CHROMIUM_PATH` for other installations. Run from a checkout directory named `space-game`; port 4173 must be free. Screenshots are written to the system temporary directory.
