# Publishing sim-ng

## Short answer: no Worker

The whole thing is static: HTML, CSS, and vanilla JS plus one JSON data file. There
is no server code, no build step, no API, and no network call at runtime. So this is
a Cloudflare **Pages** deployment, not a **Worker**. A Worker only earns its place
when you need server-side logic, and there is none here. Any static host works the
same way (Pages, GitHub Pages, Netlify, S3, nginx), because nothing is
Cloudflare-specific.

## What actually ships

The browser loads exactly two paths:

- `index.html` (the app)
- `data/incident.js` (the dataset, loaded via `<script src="data/incident.js">`)

Worth including for transparency, but not required to run:

- `data/incident.json` (audit copy of the data)
- `notes/SOURCES.md` (per-claim citations)

Not needed in production (these are dev and audit only): `scripts/`, `_shots/`,
`README.md`, `PUBLISHING.md`, `.git/`.

Assemble a clean publish folder with the helper:

```bash
cd ~/workspace/sim-ng
./scripts/prepare_publish.sh      # writes ./dist
```

`dist/` is the thing to publish. Paths are relative, so it works at a project root
or any custom domain with no edits.

## Option A: Cloudflare Pages, dashboard upload (no CLI, simplest)

1. Cloudflare dashboard, go to Workers and Pages, then Create, then Pages, then
   **Upload assets**.
2. Name the project (for example `sim-ng`) and drag the **dist/** folder in.
3. Deploy.

Framework preset is **None**, no build command, no output-directory setting. You get
`https://sim-ng.pages.dev`, and every later upload gets its own preview URL.

## Option B: Wrangler CLI (scriptable)

```bash
npm i -g wrangler            # or run with: npx wrangler ...
wrangler login              # opens a browser to authenticate with your account
wrangler pages deploy dist --project-name sim-ng
```

The first run creates the project, later runs redeploy, and the command prints the
live URL. You run this yourself so it uses your Cloudflare login. (I can prepare the
command but cannot authenticate as you.)

## Option C: Git integration, GitHub, auto-deploy on push (chosen path)

Push this repo to GitHub, then let Cloudflare Pages watch it.

```bash
# one-time auth (interactive, run it yourself):  ! gh auth login
cd ~/workspace/sim-ng
gh repo create sim-ng --private --source=. --remote=origin --push
```

That creates the repo, wires the remote, and pushes `main` in one step.

Then in Cloudflare:

1. Workers and Pages, then Create, then Pages, then **Connect to Git**, authorize
   GitHub, and pick `sim-ng`.
2. Production branch: `main`. Framework preset: **None**.
3. Build command: `bash scripts/prepare_publish.sh`
4. Build output directory: `dist`

Every push to `main` then rebuilds and redeploys. You get `https://sim-ng.pages.dev`.

Simpler fallback if you would rather not run a build: leave the build command empty
and set the output directory to `/` (the repo root already has `index.html` and
`data/`). It will serve the dev files too (`scripts/`, `notes/`), which is harmless.

## Custom domain

In the Pages project, open Custom domains and add for example
`sim.yourdomain.com`. Cloudflare manages the DNS record and the TLS certificate, and
the `*.pages.dev` URL keeps working alongside it.

## Notes

- The `window.__sim` debug hook in `index.html` only drives the local sim and exposes
  nothing sensitive. Leave it or strip it, your call.
- The local `python3 -m http.server` preview is for local viewing only. Do not use it
  as the public host.
- Limits: Cloudflare Pages allows up to 20,000 files and 25 MB per file on the free
  plan. This project is a handful of small files, so it is far under either limit.
