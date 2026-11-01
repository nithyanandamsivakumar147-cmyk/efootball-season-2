# Elite Four European eFootball League — Season 02

A fresh public tournament website built from the supplied Excel workbook. It uses a static HTML/CSS/JavaScript frontend, a Netlify Function API, and Netlify Blobs for shared persistent storage. No Supabase project, database SQL, PIN, login, or environment variables are required.

## Included workbook information

- 4 teams: Real Madrid (P1), Arsenal (P2), Bayern Munich (P3), Manchester United (P4)
- 23 player names per team (92 total), imported in the order listed in the workbook's `Dropdown Lists` sheet
- All 12 home/away fixtures across 6 matchdays, including the stadium names
- Points system: win 3, draw 1, loss 0
- Standings: MP, W, D, L, GF, GA, GD, points; ranking uses points, goal difference, goals scored, then head-to-head when two teams are tied
- Goals and assists: all 92 players start at zero and can be edited
- Golden Glove: Oliver Kahn (P3) and Angelo (P4) are seeded because those are the goalkeeper names explicitly present in the Excel dropdown list. The workbook does not specify P1/P2 goalkeeper names; use the Add goalkeeper control to select them from the squads.
- The original workbook is included at `data/Original-Tournament-Workbook.xlsx`.

## Deploy a NEW Netlify site (recommended: GitHub connection)

1. Extract the ZIP file on your computer. You should see `public/`, `package.json`, `netlify.toml`, `netlify/`, and `data/`. The website files are inside `public/`.
2. Create a new empty repository in your GitHub account, for example `elite-four-season-02`.
3. Upload the **contents** of the extracted folder into the repository root. Do not upload only the ZIP itself and do not put everything inside an extra nested folder.
4. In Netlify, choose **Add new project** → **Import an existing project** → **GitHub**.
5. Select the new repository.
6. In build settings, use:
   - Base directory: leave blank
   - Build command: leave blank (or `npm install` if Netlify insists on a command)
   - Publish directory: `public`
   - Functions directory: `netlify/functions` (already set in `netlify.toml`)
7. Deploy the site.
8. After deployment, open `https://YOUR-NEW-SITE.netlify.app/api/tournament`. The first GET creates the initial shared tournament data in Netlify Blobs and should return JSON containing `data` and `etag`.
9. Open the site homepage. It should show the four teams and all tournament sections.

Netlify reads the `@netlify/blobs` dependency from `package.json` and automatically provides the site credentials to Functions. Do not add Supabase environment variables or any service-role keys.

## Editing the tournament

- Anyone who can access the public website can edit match scores, goals, assists, and goalkeeper statistics.
- Make changes in the relevant section, then click **Save changes** in the fixed bottom bar.
- Changes are stored in the shared Netlify Blobs store and become available to other visitors.
- The page checks for updates every 15 seconds when there are no unsaved local edits.
- If two people save at almost the same time, the API uses ETag conditional writes. One save may receive a conflict response; reload the latest page before editing again.
- **Download data** downloads the current data as a JSON backup.
- Before each successful save, the server also stores the previous full state as `latest-backup` in Netlify Blobs. It can be downloaded by opening `/api/tournament?backup=latest`.

## Security warning — public editing is intentionally enabled

There is no PIN and no login. This means anyone with the URL can also call the public update endpoint and change tournament data. The API validates the structure and numeric ranges and prevents stale simultaneous writes, but it cannot prove that an editor is one of the four intended members. Do not store private information in this site. Share the link only with people you trust. Netlify Blobs credentials stay server-side and are never included in browser code.

If the link is shared widely or vandalism becomes a concern, add authentication or a private editor link before continuing to use it.

## Important notes

- This is a new site; it does not change or repair the old Supabase-backed site.
- Tournament data is initialized on the first API read. After that, data is stored in the site-wide Netlify Blobs store and persists across future deploys.
- Do not delete the Netlify site or its Blobs store if you want to preserve saved scores and stats.
- The website is a community tournament tracker, not an official eFootball product.

## Season 02 update: individual resets and club crests

The public editor now includes individual reset controls:
- Each fixture card has **Reset this match**, which clears only that fixture's home and away score.
- Each player Goals and Assists cell has its own reset icon, which clears only that one statistic for that player.
- Each goalkeeper Clean Sheets and Saves cell has its own reset icon, which clears only that one statistic for that goalkeeper.
- Every reset asks for confirmation and marks the change unsaved. Click **Save Changes** to publish it to everyone.

Four club crests are displayed from the football-badges CDN: Real Madrid, Arsenal, Bayern Munich and Manchester United. These are third-party hosted image assets; the site falls back to text if a logo URL is unavailable.

Note: this update does not yet bundle the 92 eFootball in-game player-card portraits. Those images need to be matched to exact eFootball card assets/versions; no card image files or asset IDs were supplied, so the site must not guess or substitute real-life photos.


## Player portraits update

The public app includes 90 verified eFootball face portraits, shown beside player names in squads, goals/assists, and goalkeeper tables. Two players currently show initials placeholders because their matching card images were not identifiable in the supplied archive: Marquinhos and Vitinha. The supplied archive contains two Luis Díaz cards and one non-player Barcelona graphic; the duplicate and unclear graphic were not assigned to another player. See `data/player-portrait-audit.json` for the audit.
