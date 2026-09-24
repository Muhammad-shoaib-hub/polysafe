# PolySafe — 10-Day Build Plan (Node + Express edition)

## Latest update (read this first)
- **5 new Paracetamol interactions** from your friend's updated document (Section B): Warfarin, Rifampicin, Alcohol, Valproic Acid, Probenecid. **Total dataset: 83 interactions, 73 items.**
- **About page trimmed**: removed "Who this is for" and "Who built this" per your friend's request.
- **New logo**: a shield-with-pill icon in blue, in the spirit of the department logo you shared. Note: I built this as an original icon rather than tracing the exact file, since that image may be your department's registered mark — swap in the real logo file yourself if you have rights to use it (replace the inline `<svg>` in each page's `.brand-mark` with an `<img>` tag pointing at your own logo image).
- **New Contact and Feedback pages**, wired to both emails you gave me (mjanuop@gmail.com, mazarsaad031255@gmail.com). **Important:** there's no backend mail server, so these forms open the visitor's own email app pre-filled (a `mailto:` link) rather than silently sending from a server — that's the honest, working version without needing to set up email-sending infrastructure.
- **Nav links redesigned as real pill-shaped buttons** with hover lift and a solid background on the active page, instead of plain underlined text.
- **Feature strip (the 5-in-a-row section) made more colorful and animated**: each card now has a persistent colored gradient background, a continuous gentle icon pulse, and a bigger hover lift — not just color on hover.

---

## Latest update (read this first)
Full creative permission used — here's what changed:

- **12 new AI-supplemented interactions**, added by Claude using well-established pharmacology (Sildenafil+Nitrates, Sertraline+MAOIs, Lisinopril+Spironolactone, Digoxin+Verapamil, Lithium+NSAIDs, Metformin+Contrast, Methotrexate+NSAIDs, Allopurinol+Azathioprine, Insulin+Propranolol, Ciprofloxacin+Theophylline, Tramadol+SSRIs, Clindamycin+Warfarin). **Total dataset: 78 interactions, 70 items.** These are tagged `source: "ai-supplemented"` in the data and show a gold "AI-supplemented — pending review" badge in the UI — they haven't been through the same human review as your friend's original 66, so flag them for him to check first.
- **Deep color redesign**: replaced every pale pastel tint with a richer, more saturated jewel-tone palette (deep emerald, garnet, amber, indigo), plus a bold gold accent. The hero is now a dramatic dark gradient band instead of a pale wash.
- **New Favorites feature**: star any result to save it, plus a form to add your own custom interactions (with full delete). See the important scope note below.

**Important — how Favorites actually works right now:** there's no real login system yet (the Sign Up button is still just a preview). So favorites and custom entries are saved in **this browser's local storage only** — they won't follow the user to a different device or browser, and clearing browser data will erase them. This is the honest, working version for now; when real accounts get built, this is the piece to swap for a proper per-user database.

---

## Latest update (read this first)
This version adds a big set of changes your friend requested:
- **New severity system**: 🚫 Contraindicated (C1), 🔴 Major (C2), 🟠 Moderate (C3), 🟡 Mild (C4) — shown everywhere severity appears.
- **3 new interaction categories**, from your friend's updated document: Drug–Disease (e.g. Propranolol + Asthma), Drug–Food/Drink (e.g. Grapefruit juice + Midazolam), and Drug–Laboratory Test (e.g. Ceftriaxone + urine glucose test). **Total dataset: 66 interactions, 53 items.**
- **Real multi-page site**: Home, Features, About, Resources, each with a shared nav bar and a decorative "Login / Sign Up" button (visual only for now, on purpose).
- **New result buttons**: the main "🩺 Act Like a Pharmacist" button, plus two smaller "📋 Monitoring" and "🧑‍⚕️ Pharmacist Considerations" buttons that jump straight to that section.
- **Redesigned homepage hero** with an original custom illustration (not a stock photo — see note below on why).

**A note on the hero image:** your reference picture used a real stock photograph (pill bottle, stethoscope). I can't legally copy a real photo like that into your project — it belongs to whoever took/licensed it. Instead I built an original illustration in the same spirit, using PolySafe's own colors. If you or your friend want to replace it with a real photo, either take/source a photo you have rights to use, or buy a license from a stock site (e.g. Unsplash's free license, if you check the specific photo's terms), then swap the `<svg class="hero-svg">` block in `public/index.html` for an `<img>` tag pointing at your own image file in `public/`.

---

You already have a **working full-stack prototype**. This is your day-by-day
guide, written so you can follow it start to finish even if today is the
first time you've run a Node server.

## Architecture
```
polysafe/
├── data.js        ← single source of truth: 48 curated interaction records
├── server.js       ← Express server: serves the site + a real JSON API
├── package.json     ← run "npm install" once, then "npm start" every time
└── public/            ← everything the browser actually loads
    ├── index.html
    ├── styles.css
    └── app.js           ← fetches data from the API — nothing hardcoded
```
The browser talks to your server over HTTP, same as any real product:
- `GET /api/drugs` → medicine list for the search box
- `GET /api/interactions` → full dataset (cached in the browser for the detail panel)
- `POST /api/analyze` → send `{ medicines: [...] }`, get back the prioritized findings
  (the pairing + matching logic runs **server-side**, in `server.js`)

That's a genuine client/server split. It's simple because your data was
already clean JavaScript — Express just reads the same file the old static
version used.

---

## Day 0 — Get it running (20 minutes)
1. Install **Node.js** if you don't have it: https://nodejs.org (choose the
   LTS version). Confirm it worked — open a terminal and run:
   ```
   node -v
   ```
   You should see something like `v20.x.x`.
2. Open the `polysafe` folder in VS Code (`File → Open Folder…`).
3. Open VS Code's terminal: menu → `Terminal → New Terminal`.
4. Run these two commands:
   ```
   npm install
   npm start
   ```
5. Terminal shows `PolySafe running at http://localhost:3000`. Open that
   link in your browser.
6. Try it: add "Warfarin" and "Amiodarone" → Analyze → click the result row.

**To stop the server:** click the terminal, press `Ctrl+C`.
**After editing `server.js` or `data.js`:** stop it and run `npm start` again
— or better, run `npm run dev` instead of `npm start`, which auto-restarts
the server every time you save (saves you the Ctrl+C dance all week).
**After editing files inside `public/`:** just refresh the browser, no restart needed.

If `npm install` fails, you're almost certainly not in the right folder —
run `pwd` (or check VS Code's terminal path) and confirm you see
`package.json` when you run `ls`.

---

## Day 1 — Understand the three layers
Sit with your friend and trace ONE request together, out loud:
1. You type "Warfarin" in the browser → `public/app.js` sends
   `GET /api/drugs` when the page first loads.
2. `server.js` receives that request, reads `data.js`, sends back JSON.
3. You click **Analyze** → `public/app.js` sends `POST /api/analyze` with
   your medicine list → `server.js` does the pairing/matching → sends back
   the prioritized findings → `public/app.js` draws them on screen.

That's the entire mental model: **browser asks, server answers, browser
draws.** Don't try to memorize the code yet — just get comfortable pointing
at "this part runs in the browser" vs. "this part runs on the server."

## Day 2 — Content pass with your pharmacy-student friend
- Open `data.js`. Find one record (search for `POLY-WAR-RIF-001`) and read it
  together.
- Your friend reviews **all 48 records** against the original document,
  noting anything mistranscribed or worded oddly.
- You don't fix anything yet — just collect the list today.

## Day 3 — Fix what he found
- In `data.js`, use Ctrl+F to jump to each flagged record by its ID.
- Edit the text between the quotes, save, then refresh the browser (if
  `npm run dev` is running you don't even need to restart).
- Re-test each fixed record in the app.

## Day 4 — Stress-test it like a real user
Try these on purpose:
- 0 medicines, then 1 medicine (Analyze button should stay disabled/greyed out)
- 10 medicines at once
- two drugs with **no** curated interaction (should say "N pairs had no
  curated record," never go silent)
- **Turn off** `npm start` for a second while the page is open, then click
  Analyze — you should see the friendly error message, not a broken page
  (this is what the `try/catch` in `app.js` and `init()` are for)
- open it on your **phone**: find your computer's local IP (Windows: `ipconfig`,
  Mac: `ifconfig` or System Settings → Wi-Fi → Details) and visit
  `http://YOUR-IP:3000` on your phone, same Wi-Fi network

## Day 5 — Make it demo-ready
- Run the report's own example: **Warfarin + Aspirin + Ibuprofen + Amiodarone
  + Sertraline**. This is your go-to demo — it's already been tested and
  correctly surfaces two High-priority findings at the top.
- Read through the "Act Like a Pharmacist" panel out loud with your friend —
  does the order (Risk → Mechanism → Clinical effect → Monitoring →
  Considerations → Evidence) feel right? Wording lives in `data.js`, the
  panel structure lives in the `openPanel()` function in `public/app.js`.

## Day 6 — Optional: a couple of small backend wins (you have the skills now)
Since you know Node/Express, if you want to push further before deploying:
- Add a `GET /api/health` route that just returns `{ status: "ok" }` — a
  tiny but real thing to point to as "I built monitoring into it."
- Add basic input validation in `/api/analyze` (e.g. reject if `medicines`
  isn't an array, or has more than 10 items) — a few lines, teaches you real
  API defensiveness.
Skip this entirely if you're tight on time — the app is already complete
without it.

## Day 7 — Deploy it so it has a real URL
Because this now has a Node server (not just static files), use a host built
for that — both have free tiers and both work from a GitHub repo:
- **Render.com** (simplest): push this folder to a GitHub repo → New →
  Web Service → connect the repo → Build command `npm install`, start
  command `npm start` → deploy. You get a real URL.
- **Railway.app**: same idea — connect the repo, it detects Node
  automatically from `package.json`.
Do this today, not Day 10, so you have slack if a deploy setting needs a fix.

## Day 8 — Prepare what you'll say about it
Practice explaining, in your own words:
- The problem: a normal checker just says yes/no — it doesn't tell you which
  interaction, out of many, actually deserves attention first.
- Your idea: **Detect → Prioritize → Understand.**
- The architecture, briefly: "the frontend is just a shell — all the medical
  data and matching logic lives on the server, behind a real API, the way an
  actual product would be built."
- What it's honestly NOT: not a replacement for DrugBank/Micromedex, not an
  AI that invents facts — it only explains verified, curated data.

## Day 9 — Bug bash with real people
- Have 2–3 people use the live (deployed) link while you silently watch.
- Note every confusing moment — don't explain, just watch and write.
- Fix only the top 3–5 issues. No new features this late.

## Day 10 — Ship it 🎉
- Final deploy check, on your phone and a laptop.
- Screenshots for your report/slides.
- Send your friend the live link — he helped build something real.

---

## How to extend `data.js` later
Each record is created with the `mk(...)` helper:
`id, drugA, drugB, type, severity, contraindicated, direction, risk,
mechanism, effect, monitoring, action, evidence, note`.

- `severity` is exactly `"critical"`, `"major"`, `"moderate"`, or `"minor"`.
- `contraindicated` is `false`, `true`, or the string `"conditional"` (explain
  the condition in `note`, e.g. "in neonates ≤28 days").
- `monitoring` and `action` are single strings with items separated by ` • `
  — the frontend splits on `•` to build bullet lists automatically.
- New drugs are picked up automatically by the search box — nothing else to
  register. `DRUG_LIST` is built from every `drugA`/`drugB` already in
  `INTERACTIONS`.
- To add a whole drug **class** (like the fluoroquinolone group already
  there), add entries to `CLASS_ALIASES` at the bottom of `data.js`.
- Since `server.js` reads `data.js` directly with `require()`, any edit you
  save there is live again the moment you restart the server (or
  automatically if you're running `npm run dev`).

## Known limitations (be upfront about these in your report)
- Curated prototype dataset (48 pairs / 40 drugs), not comprehensive. A pair
  with no record means "not reviewed," never "confirmed safe" — the UI says
  this on purpose.
- No real drug-name normalization (RxNorm) yet — matching is exact/loose
  string matching against the curated list.
- No database yet — `data.js` is the whole "database." That's fine for a
  10-day project; a real next step would be moving these records into
  Postgres/MongoDB, which is a natural "Day 11+" if you keep building this.
- No user accounts, no persistence between sessions — by design, for scope.
