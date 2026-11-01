const API = "/api/tournament";
let state = null;
let etag = null;
let dirty = false;
let busy = false;
let activeTab = "overview";
let searchTerm = "";
let teamFilter = "all";
let noticeTimer;

const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const esc = (v) => String(v ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;", "'":"&#39;"}[c]));
const team = code => state.teams.find(t => t.code === code);
const CLUB_LOGOS = {
  P1: "https://cdn.jsdelivr.net/gh/leoratzlaff/football-badges@latest/logos/spain/real-madrid.png",
  P2: "https://cdn.jsdelivr.net/gh/leoratzlaff/football-badges@latest/logos/england/arsenal-fc.png",
  P3: "https://cdn.jsdelivr.net/gh/leoratzlaff/football-badges@latest/logos/germany/bayern-munich.png",
  P4: "https://cdn.jsdelivr.net/gh/leoratzlaff/football-badges@latest/logos/england/manchester-united.png"
};
const logo = (code, cls="club-logo") => `<img class="${cls}" src="${CLUB_LOGOS[code]}" alt="${esc(club(code))} crest" loading="lazy" onerror="this.hidden=true">`;
// Display names are presentation-only. Existing short names remain the stable database keys,
// so saved scores, goals, assists and goalkeeper records are not changed.
const PLAYER_DISPLAY_NAMES = {
  "Koller": "Jan Koller",
  "Neymar": "Neymar Jr.",
  "Raul": "Raúl",
  "Musiala": "Jamal Musiala",
  "Kante": "N’Golo Kanté",
  "Casimero": "Casemiro",
  "Marcelo": "Marcelo",
  "Cubarsi": "Pau Cubarsí",
  "Gvardiol": "Joško Gvardiol",
  "Costacurta": "Alessandro Costacurta",
  "Costa": "Diogo Costa",
  "Maradona": "Maradona",
  "Guehi": "Marc Guéhi",
  "Robertson": "Andrew Robertson",
  "Beckenbauer": "Franz Beckenbauer",
  "Griezmann": "Antoine Griezmann",
  "Allister": "Alexis Mac Allister",
  "Vinicius": "Vini Jr.",
  "Aubameyang": "Aubameyang",
  "Pedri": "Pedri",
  "Batisuta": "Gabriel Batistuta",
  "Rice": "Declan Rice",
  "De Jong": "Frenkie de Jong",
  "El Haji": "El Hadji Diouf",
  "Eto": "Samuel Eto’o",
  "Cantona": "Eric Cantona",
  "Olmo": "Dani Olmo",
  "Rodrigo": "Rodri",
  "Tah": "Jonathan Tah",
  "Mukiele": "Nordi Mukiele",
  "Hujisen": "Dean Huijsen",
  "Magalhaes": "Gabriel Magalhães",
  "Bisaka": "Aaron Wan-Bissaka",
  "Seaman": "David Seaman",
  "Jackson": "Nicolas Jackson",
  "McKennie": "Weston McKennie",
  "Reijnders": "Tijjani Reijnders",
  "Bruno": "Bruno Fernandes",
  "Merino": "Mikel Merino",
  "Tonali": "Sandro Tonali",
  "Trossard": "Leandro Trossard",
  "Kovacic": "Mateo Kovačić",
  "Lewis-Skelly": "Myles Lewis-Skelly",
  "Richards": "Chris Richards",
  "Kimmich": "Joshua Kimmich",
  "Akanji": "Manuel Akanji",
  "Osimhen": "Victor Osimhen",
  "Stoichkov": "Hristo Stoichkov",
  "Torres": "Fernando Torres",
  "Raphinia": "Raphinha",
  "Henderson": "Jordan Henderson",
  "Ruben Neves": "Rúben Neves",
  "Cannavaro": "Fabio Cannavaro",
  "Ruben": "Rúben Dias",
  "White": "Ben White",
  "Zanetti": "Javier Zanetti",
  "Oliver Kahn": "Oliver Kahn",
  "Berbatov": "Dimitar Berbatov",
  "Haaland": "Erling Haaland",
  "Mbappe": "Kylian Mbappé",
  "Stojkovic": "Dragan Stojković",
  "Beckham": "David Beckham",
  "Iniesta": "Andrés Iniesta",
  "Carlos": "Roberto Carlos",
  "Kwara": "Khvicha Kvaratskhelia",
  "Messi": "Messi",
  "Owen": "Michael Owen",
  "KDB": "Kevin De Bruyne",
  "De Ligt": "Matthijs de Ligt",
  "Rooney": "Wayne Rooney",
  "Luis Diaz": "Luis Díaz",
  "Yamal": "Lamine Yamal",
  "Paul": "Paul Scholes",
  "Rijkaard": "Frank Rijkaard",
  "Vitinha": "Vitinha",
  "Mendes": "Nuno Mendes",
  "Laporte": "Aymeric Laporte",
  "Rio": "Rio Ferdinand",
  "Trent": "Trent Alexander-Arnold",
  "Angelo": "Angelo Peruzzi",
  "Hazard": "Eden Hazard",
  "Rabiot": "Adrien Rabiot",
  "Marquinhos": "Marquinhos",
  "Saliba": "William Saliba",
  "Xabi": "Xabi Alonso",
  "Gerard": "Steven Gerrard",
  "Olise": "Michael Olise",
  "Hakimi": "Achraf Hakimi",
  "Shevchenko": "Andriy Shevchenko",
  "Masaro": "Daniele Massaro",
  "Van Dijk": "Virgil van Dijk",
  "CR7": "Cristiano Ronaldo"
};
const displayPlayer = name => PLAYER_DISPLAY_NAMES[name] || name;
const PLAYER_PORTRAITS = {
  "Neymar": "/player-portraits/01-neymar-jr.jpg",
  "Raul": "/player-portraits/02-raul.jpg",
  "Musiala": "/player-portraits/03-jamal-musiala.jpg",
  "Kante": "/player-portraits/04-ngolo-kante.jpg",
  "Casimero": "/player-portraits/05-casemiro.jpg",
  "Marcelo": "/player-portraits/06-marcelo.jpg",
  "Cubarsi": "/player-portraits/07-pau-cubarsi.jpg",
  "Gvardiol": "/player-portraits/08-josko-gvardiol.jpg",
  "Costacurta": "/player-portraits/09-alessandro-costacurta.jpg",
  "Costa": "/player-portraits/10-diogo-costa.jpg",
  "Maradona": "/player-portraits/11-maradona.jpg",
  "Guehi": "/player-portraits/12-marc-guehi.jpg",
  "Robertson": "/player-portraits/13-andrew-robertson.jpg",
  "Beckenbauer": "/player-portraits/14-franz-beckenbauer.jpg",
  "Griezmann": "/player-portraits/15-antoine-griezmann.jpg",
  "Allister": "/player-portraits/16-alexis-mac-allister.jpg",
  "Vinicius": "/player-portraits/17-vini-jr.jpg",
  "Aubameyang": "/player-portraits/18-aubameyang.jpg",
  "Pedri": "/player-portraits/19-pedri.jpg",
  "Batisuta": "/player-portraits/20-gabriel-batistuta.jpg",
  "Rice": "/player-portraits/21-declan-rice.jpg",
  "De Jong": "/player-portraits/22-frenkie-de-jong.jpg",
  "Koller": "/player-portraits/23-jan-koller.jpg",
  "El Haji": "/player-portraits/24-el-hadji-diouf.jpg",
  "Eto": "/player-portraits/25-samuel-etoo.jpg",
  "Cantona": "/player-portraits/26-eric-cantona.jpg",
  "Olmo": "/player-portraits/27-dani-olmo.jpg",
  "Rodrigo": "/player-portraits/28-rodri.jpg",
  "Tah": "/player-portraits/29-jonathan-tah.jpg",
  "Mukiele": "/player-portraits/30-nordi-mukiele.jpg",
  "Hujisen": "/player-portraits/31-dean-huijsen.jpg",
  "Magalhaes": "/player-portraits/32-gabriel-magalhaes.jpg",
  "Bisaka": "/player-portraits/33-aaron-wan-bissaka.jpg",
  "Seaman": "/player-portraits/34-david-seaman.jpg",
  "Jackson": "/player-portraits/35-nicolas-jackson.jpg",
  "McKennie": "/player-portraits/36-weston-mckennie.jpg",
  "Reijnders": "/player-portraits/37-tijjani-reijnders.jpg",
  "Bruno": "/player-portraits/38-bruno-fernandes.jpg",
  "Merino": "/player-portraits/39-mikel-merino.jpg",
  "Tonali": "/player-portraits/40-sandro-tonali.jpg",
  "Trossard": "/player-portraits/41-leandro-trossard.jpg",
  "Kovacic": "/player-portraits/42-mateo-kovacic.jpg",
  "Lewis-Skelly": "/player-portraits/43-myles-lewis-skelly.jpg",
  "Richards": "/player-portraits/44-chris-richards.jpg",
  "Kimmich": "/player-portraits/45-joshua-kimmich.jpg",
  "Akanji": "/player-portraits/46-manuel-akanji.jpg",
  "Osimhen": "/player-portraits/47-victor-osimhen.jpg",
  "Stoichkov": "/player-portraits/48-hristo-stoichkov.jpg",
  "Torres": "/player-portraits/49-fernando-torres.jpg",
  "Raphinia": "/player-portraits/50-raphinha.jpg",
  "Henderson": "/player-portraits/51-jordan-henderson.jpg",
  "Ruben Neves": "/player-portraits/52-ruben-neves.jpg",
  "Cannavaro": "/player-portraits/53-fabio-cannavaro.jpg",
  "Ruben": "/player-portraits/54-ruben-dias.jpg",
  "White": "/player-portraits/55-ben-white.jpg",
  "Zanetti": "/player-portraits/56-javier-zanetti.jpg",
  "Oliver Kahn": "/player-portraits/57-oliver-kahn.jpg",
  "Berbatov": "/player-portraits/58-dimitar-berbatov.jpg",
  "Haaland": "/player-portraits/59-erling-haaland.jpg",
  "Mbappe": "/player-portraits/60-kylian-mbappe.jpg",
  "Stojkovic": "/player-portraits/61-dragan-stojkovic.jpg",
  "Beckham": "/player-portraits/62-david-beckham.jpg",
  "Iniesta": "/player-portraits/63-andres-iniesta.jpg",
  "Carlos": "/player-portraits/64-roberto-carlos.jpg",
  "Kwara": "/player-portraits/65-khvicha-kvaratskhelia.jpg",
  "Messi": "/player-portraits/66-messi.jpg",
  "Owen": "/player-portraits/67-michael-owen.jpg",
  "KDB": "/player-portraits/68-kevin-de-bruyne.jpg",
  "De Ligt": "/player-portraits/69-matthijs-de-ligt.jpg",
  "Rooney": "/player-portraits/70-wayne-rooney.jpg",
  "Luis Diaz": "/player-portraits/71-luis-diaz.jpg",
  "Yamal": "/player-portraits/72-lamine-yamal.jpg",
  "Paul": "/player-portraits/73-paul-scholes.jpg",
  "Rijkaard": "/player-portraits/74-frank-rijkaard.jpg",
  "Vitinha": "/player-portraits/75-vitinha.jpg",
  "Mendes": "/player-portraits/76-nuno-mendes.jpg",
  "Laporte": "/player-portraits/77-aymeric-laporte.jpg",
  "Rio": "/player-portraits/78-rio-ferdinand.jpg",
  "Trent": "/player-portraits/79-trent-alexander-arnold.jpg",
  "Angelo": "/player-portraits/80-angelo-peruzzi.jpg",
  "Hazard": "/player-portraits/81-eden-hazard.jpg",
  "Rabiot": "/player-portraits/82-adrien-rabiot.jpg",
  "Marquinhos": "/player-portraits/83-marquinhos.jpg",
  "Saliba": "/player-portraits/84-william-saliba.jpg",
  "Xabi": "/player-portraits/85-xabi-alonso.jpg",
  "Gerard": "/player-portraits/86-steven-gerrard.jpg",
  "Olise": "/player-portraits/87-michael-olise.jpg",
  "Hakimi": "/player-portraits/88-achraf-hakimi.jpg",
  "Shevchenko": "/player-portraits/89-andriy-shevchenko.jpg",
  "Masaro": "/player-portraits/90-daniele-massaro.jpg",
  "Van Dijk": "/player-portraits/91-virgil-van-dijk.jpg",
  "CR7": "/player-portraits/92-cristiano-ronaldo.jpg"
};
const playerPortrait = name => {
  const src = PLAYER_PORTRAITS[name];
  return src ? `<img class="player-portrait" src="${src}" alt="${esc(displayPlayer(name))} portrait" loading="lazy" onerror="this.hidden=true">` : "";
};
const club = code => team(code)?.name || code;
const allPlayers = () => state.teams.flatMap(t => t.squad.map(player => ({ player, team: t.code, club: t.name })));
const scoreDone = f => Number.isInteger(f.homeGoals) && Number.isInteger(f.awayGoals);

function notify(message, error = false) {
  const el = $("#notice");
  el.textContent = message;
  el.className = `notice${error ? " error" : ""}`;
  clearTimeout(noticeTimer);
  noticeTimer = setTimeout(() => el.classList.add("hidden"), 6500);
}
function setStatus(kind, text) {
  const el = $("#connectionStatus");
  el.className = `connection ${kind}`;
  el.innerHTML = `<i></i>${esc(text)}`;
}
function setDirty(value = true) {
  dirty = value;
  $("#saveButton").disabled = !dirty || busy;
  $("#saveMessage").textContent = dirty ? "Unsaved changes — remember to save" : "All changes saved";
  $(".save-dot").style.background = dirty ? "#d8b66b" : "#70c7a0";
}
function fmtTime(value) {
  if (!value) return "Not saved yet";
  try { return `Last saved ${new Date(value).toLocaleString()}`; } catch { return "Saved"; }
}

async function loadState(silent = false) {
  try {
    const res = await fetch(API, { cache: "no-store" });
    const body = await res.json();
    if (!res.ok) throw new Error(body.error || `API returned ${res.status}`);
    if (dirty && !silent) {
      notify("A newer server version is available. Save your changes carefully or reload to avoid overwriting another member.", true);
      return;
    }
    state = body.data;
    etag = body.etag || res.headers.get("ETag");
    dirty = false;
    setDirty(false);
    setStatus("online", "Live data connected");
    $("#lastSaved").textContent = fmtTime(state.updatedAt);
    $("#saveMessage").textContent = "Live tournament data loaded";
    renderAll();
  } catch (err) {
    setStatus("offline", "Connection issue");
    $("#saveMessage").textContent = err.message;
    if (!silent) notify(`Could not load tournament data: ${err.message}`, true);
  }
}

async function saveState() {
  if (!state || !dirty || busy) return;
  busy = true;
  $("#saveButton").disabled = true;
  $("#saveMessage").textContent = "Saving changes…";
  try {
    // Send the version in both the standard If-Match header and the JSON body.
    // The body fallback protects against hosting/proxy layers that omit conditional headers.
    if (!etag) {
      const latestRes = await fetch(API, { cache: "no-store" });
      const latestBody = await latestRes.json();
      if (!latestRes.ok || !latestBody.etag) throw new Error("Could not get the latest save version. Reload the page.");
      throw new Error("The save version was missing. Reload the page before saving so nobody's changes are overwritten.");
    }
    const res = await fetch(API, {
      method: "PUT",
      headers: { "Content-Type": "application/json", "If-Match": etag },
      body: JSON.stringify({ ...state, _expectedETag: etag })
    });
    const body = await res.json();
    if (res.status === 409 || res.status === 428) {
      setStatus("offline", "Update conflict");
      notify(body.error || "Another member saved first. Reload the latest data.", true);
      $("#saveMessage").textContent = "Save conflict — reload latest data";
      return;
    }
    if (!res.ok) throw new Error(body.error || `Save failed (${res.status})`);
    state = body.data;
    etag = body.etag || res.headers.get("ETag");
    setDirty(false);
    setStatus("online", "Live data connected");
    $("#lastSaved").textContent = fmtTime(state.updatedAt);
    $("#saveMessage").textContent = "Changes saved for everyone";
    renderAll();
    notify("Saved successfully. The updated tournament data is now shared with everyone.");
  } catch (err) {
    notify(`Save failed: ${err.message}`, true);
    $("#saveMessage").textContent = "Save failed — your edits are still on this page";
    setDirty(true);
  } finally {
    busy = false;
    $("#saveButton").disabled = !dirty;
  }
}

function calculateStandings() {
  const rows = state.teams.map(t => ({ team: t.code, club: t.name, mp: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, gd: 0, pts: 0 }));
  const byCode = Object.fromEntries(rows.map(r => [r.team, r]));
  state.fixtures.filter(scoreDone).forEach(f => {
    const h = byCode[f.homeTeam], a = byCode[f.awayTeam];
    h.mp++; a.mp++; h.gf += f.homeGoals; h.ga += f.awayGoals; a.gf += f.awayGoals; a.ga += f.homeGoals;
    if (f.homeGoals > f.awayGoals) { h.w++; h.pts += 3; a.l++; }
    else if (f.homeGoals < f.awayGoals) { a.w++; a.pts += 3; h.l++; }
    else { h.d++; a.d++; h.pts++; a.pts++; }
  });
  rows.forEach(r => r.gd = r.gf - r.ga);
  const headToHead = (a, b) => {
    const matches = state.fixtures.filter(f => scoreDone(f) && ((f.homeTeam === a.team && f.awayTeam === b.team) || (f.homeTeam === b.team && f.awayTeam === a.team)));
    let ap = 0, bp = 0;
    matches.forEach(f => {
      const ag = f.homeTeam === a.team ? f.homeGoals : f.awayGoals;
      const bg = f.homeTeam === b.team ? f.homeGoals : f.awayGoals;
      if (ag > bg) ap += 3; else if (ag < bg) bp += 3; else { ap++; bp++; }
    });
    return bp - ap;
  };
  rows.sort((a,b) => b.pts-a.pts || b.gd-a.gd || b.gf-a.gf || headToHead(a,b) || a.club.localeCompare(b.club));
  return rows;
}

function renderOverview() {
  const standings = calculateStandings();
  const played = state.fixtures.filter(scoreDone).length;
  const goals = state.fixtures.filter(scoreDone).reduce((n,f) => n + f.homeGoals + f.awayGoals, 0);
  const next = state.fixtures.find(f => !scoreDone(f));
  const leader = [...state.playerStats].sort((a,b) => b.goals-a.goals || b.assists-a.assists)[0];
  $("#overview").innerHTML = `
    <div class="section-head"><div><div class="kicker">TOURNAMENT CENTRE</div><h2>Season overview</h2><p>Everything happening across the Elite Four league.</p></div><span class="pill">${played}/12 MATCHES PLAYED</span></div>
    <div class="grid stats-grid">
      <div class="stat-card"><span class="label">Matches played</span><strong>${played}<small> / 12</small></strong><small>${12-played} fixtures remaining</small></div>
      <div class="stat-card"><span class="label">Goals scored</span><strong>${goals}</strong><small>Across completed matches</small></div>
      <div class="stat-card"><span class="label">League leader</span><strong style="font-size:22px">${esc(standings[0].club)}</strong><small>${standings[0].pts} points · ${standings[0].gd>=0?"+":""}${standings[0].gd} GD</small></div>
      <div class="stat-card"><span class="label">Squad size</span><strong>92</strong><small>4 clubs · 23 players each</small></div>
    </div>
    <div class="grid team-grid">${state.teams.map(t=>`<article class="team-card"><div class="team-card-head">${logo(t.code)}<span class="team-code">${t.code}</span></div><h3>${esc(t.name)}</h3><p>23 registered players</p></article>`).join("")}</div>
    <div class="two-col" style="margin-top:18px">
      <div class="panel"><div class="panel-title"><h3>Current standings</h3><button class="tiny-action" data-goto="standings">Full table ↗</button></div>${standingsTable(standings.slice(0,4),false)}</div>
      <div class="panel"><div class="panel-title"><h3>${next?"Next fixture":"League complete"}</h3><span class="pill">${next?`MATCHDAY ${next.matchday}`:"ALL PLAYED"}</span></div>${next?`<div class="match-card"><div class="match-top"><span>UPCOMING FIXTURE</span><span>${esc(next.stadium)}</span></div><div class="match-teams"><div class="match-team">${esc(club(next.homeTeam))}</div><div class="score-dash">VS</div><div class="match-team">${esc(club(next.awayTeam))}</div></div></div>`:`<p class="subtle">All 12 league fixtures have results.</p>`}<div class="inline-note">${leader?.goals?`Top scorer: <b class="gold-text">${esc(leader.player)}</b> · ${leader.goals} goals`:`Goal and assist leaders will appear when player stats are entered.`}</div></div>
    </div>
    <div class="panel" style="margin-top:16px"><div class="panel-title"><h3>League format</h3><span class="pill">OFFICIAL RULES</span></div><div class="grid" style="grid-template-columns:repeat(4,1fr)"><div><div class="kicker">WIN</div><b>3 points</b></div><div><div class="kicker">DRAW</div><b>1 point</b></div><div><div class="kicker">LOSS</div><b>0 points</b></div><div><div class="kicker">TIE-BREAK</div><b>PTS → GD → GF → H2H</b></div></div></div>`;
}
function standingsTable(rows, full=true) {
  return `<div class="table-wrap"><table><thead><tr><th>#</th><th>Club</th><th>MP</th><th>W</th><th>D</th><th>L</th><th>GF</th><th>GA</th><th>GD</th><th>Pts</th></tr></thead><tbody>${rows.map((r,i)=>`<tr class="${i===0&&r.mp?"champion-row":""}"><td class="rank">${i+1}</td><td class="club-cell">${esc(r.club)} <span class="team-code-chip">${r.team}</span></td><td>${r.mp}</td><td>${r.w}</td><td>${r.d}</td><td>${r.l}</td><td>${r.gf}</td><td>${r.ga}</td><td class="number">${r.gd>0?"+":""}${r.gd}</td><td><b>${r.pts}</b></td></tr>`).join("")}</tbody></table></div>`;
}
function renderStandings() {
  const rows = calculateStandings();
  $("#standings").innerHTML = `<div class="section-head"><div><div class="kicker">LEAGUE RANKING</div><h2>Points table</h2><p>Automatically calculated from completed fixtures. A match counts only after both scores are entered.</p></div><span class="pill">3 PTS WIN · 1 PTS DRAW</span></div>${standingsTable(rows)}<p class="inline-note">Tie-break order from your Excel: Points, Goal Difference, Goals For, then Head-to-head (when two clubs are tied).</p>`;
}
function renderFixtures() {
  const groups = [...new Set(state.fixtures.map(f=>f.matchday))].sort((a,b)=>a-b);
  $("#fixtures").innerHTML = `<div class="section-head"><div><div class="kicker">HOME & AWAY ROUND ROBIN</div><h2>Fixtures & results</h2><p>Edit either score. Leave both blank until the match is played, then save changes.</p></div><span class="pill">12 FIXTURES · 6 MATCHDAYS</span></div>${groups.map(day=>`<div class="matchday"><div class="matchday-head"><span>MATCHDAY ${day.toString().padStart(2,"0")}</span><span>${state.fixtures.filter(f=>f.matchday===day&&scoreDone(f)).length}/2 COMPLETE</span></div><div class="match-grid">${state.fixtures.filter(f=>f.matchday===day).map(f=>`<article class="match-card"><div class="match-top"><span>${f.id.toUpperCase()}</span><span>${scoreDone(f)?'<b class="gold-text">FULL TIME</b>':'UPCOMING'}</span></div><div class="match-teams"><div class="match-team">${logo(f.homeTeam)}${esc(club(f.homeTeam))}<div class="subtle">${f.homeTeam}</div></div><div class="score-inputs"><input class="field score-input" type="number" min="0" max="99" step="1" aria-label="${esc(club(f.homeTeam))} goals" data-fixture="${f.id}" data-score="homeGoals" value="${f.homeGoals??""}" placeholder="–"><span class="score-dash">:</span><input class="field score-input" type="number" min="0" max="99" step="1" aria-label="${esc(club(f.awayTeam))} goals" data-fixture="${f.id}" data-score="awayGoals" value="${f.awayGoals??""}" placeholder="–"></div><div class="match-team">${logo(f.awayTeam)}${esc(club(f.awayTeam))}<div class="subtle">${f.awayTeam}</div></div></div><div class="stadium">⌖ ${esc(f.stadium)}</div><div class="reset-row"><button class="tiny-action danger" data-reset-match="${f.id}">↺ Reset this match</button></div></article>`).join("")}</div></div>`).join("")}`;
}
function renderSquads() {
  $("#squads").innerHTML = `<div class="section-head"><div><div class="kicker">THE FOUR CLUBS</div><h2>Team squads</h2><p>All 92 player names have been imported from the original workbook.</p></div><span class="pill">4 × 23 PLAYERS</span></div><div class="grid team-grid">${state.teams.map(t=>`<article class="team-card"><div class="team-card-head">${logo(t.code)}<span class="team-code">${t.code} · SQUAD</span></div><h3>${esc(t.name)}</h3><p>${t.squad.length} players registered</p></article>`).join("")}</div><div class="toolbar" style="margin:20px 0 12px"><input id="squadSearch" class="field" placeholder="Search player name…" value="${esc(searchTerm)}"><select id="squadTeam" class="field"><option value="all">All teams</option>${state.teams.map(t=>`<option value="${t.code}" ${teamFilter===t.code?"selected":""}>${esc(t.name)}</option>`).join("")}</select></div><div id="squadTables"></div>`;
  renderSquadTables();
}
function renderSquadTables() {
  const list = allPlayers().filter(p=>(teamFilter==="all"||p.team===teamFilter)&&(p.player.toLowerCase().includes(searchTerm.toLowerCase())||displayPlayer(p.player).toLowerCase().includes(searchTerm.toLowerCase())));
  $("#squadTables").innerHTML = list.length ? `<div class="table-wrap"><table><thead><tr><th>#</th><th>Player</th><th>Club</th><th>Team ID</th></tr></thead><tbody>${list.map((p,i)=>`<tr><td class="rank">${String(i+1).padStart(2,"0")}</td><td class="player-name">${playerPortrait(p.player)}<span>${esc(displayPlayer(p.player))}</span></td><td>${esc(p.club)}</td><td><span class="team-code-chip">${p.team}</span></td></tr>`).join("")}</tbody></table></div>` : `<div class="empty">No players match this search.</div>`;
}
function renderScorers() {
  const goals = [...state.playerStats].sort((a,b)=>b.goals-a.goals||b.assists-a.assists||a.player.localeCompare(b.player));
  const assists = [...state.playerStats].sort((a,b)=>b.assists-a.assists||b.goals-a.goals||a.player.localeCompare(b.player));
  const topG=goals[0],topA=assists[0];
  $("#scorers").innerHTML = `<div class="section-head"><div><div class="kicker">INDIVIDUAL AWARDS</div><h2>Goals & assists</h2><p>All 92 players are listed. Update goals and assists, then save for everyone.</p></div><span class="pill">GOLDEN BOOT · PLAYMAKER</span></div>
    <div class="grid leader-grid"><div class="leader-card"><h3>Golden Boot leader</h3><div class="big">${topG?.goals||0} <small>goals</small></div><p>${topG?.goals?esc(displayPlayer(topG.player))+" · "+esc(club(topG.team)):"No goals recorded yet"}</p></div><div class="leader-card"><h3>Playmaker leader</h3><div class="big">${topA?.assists||0} <small>assists</small></div><p>${topA?.assists?esc(displayPlayer(topA.player))+" · "+esc(club(topA.team)):"No assists recorded yet"}</p></div></div>
    <div class="toolbar" style="margin-bottom:12px"><input id="statsSearch" class="field" placeholder="Search player…" value="${esc(searchTerm)}"><select id="statsTeam" class="field"><option value="all">All teams</option>${state.teams.map(t=>`<option value="${t.code}" ${teamFilter===t.code?"selected":""}>${esc(t.name)}</option>`).join("")}</select><span class="subtle">Edit numbers directly in the table.</span></div><div id="playerStatsTable"></div>`;
  renderPlayerStatsTable();
}
function renderPlayerStatsTable() {
  const list=state.playerStats.filter(p=>(teamFilter==="all"||p.team===teamFilter)&&(p.player.toLowerCase().includes(searchTerm.toLowerCase())||displayPlayer(p.player).toLowerCase().includes(searchTerm.toLowerCase()))).sort((a,b)=>a.team.localeCompare(b.team)||a.player.localeCompare(b.player));
  $("#playerStatsTable").innerHTML = `<div class="table-wrap"><table><thead><tr><th>Player</th><th>Club</th><th>Goals</th><th>Assists</th><th>Contribution</th></tr></thead><tbody>${list.map(p=>`<tr><td class="player-name">${playerPortrait(p.player)}<span>${esc(displayPlayer(p.player))}</span></td><td>${esc(club(p.team))}</td><td><div class="stat-edit"><input class="field field-table" type="number" min="0" max="999" step="1" value="${p.goals}" data-player="${esc(p.player)}" data-team="${p.team}" data-stat="goals" aria-label="${esc(p.player)} goals"><button class="mini-reset" title="Reset only ${esc(p.player)} goals" data-reset-player="${esc(p.player)}" data-team="${p.team}" data-stat="goals">↺</button></div></td><td><div class="stat-edit"><input class="field field-table" type="number" min="0" max="999" step="1" value="${p.assists}" data-player="${esc(p.player)}" data-team="${p.team}" data-stat="assists" aria-label="${esc(p.player)} assists"><button class="mini-reset" title="Reset only ${esc(p.player)} assists" data-reset-player="${esc(p.player)}" data-team="${p.team}" data-stat="assists">↺</button></div></td><td class="number">${p.goals+p.assists}</td></tr>`).join("")}</tbody></table></div>`;
}
function renderKeepers() {
  const cs=[...state.goalkeeperStats].sort((a,b)=>b.cleanSheets-a.cleanSheets), sv=[...state.goalkeeperStats].sort((a,b)=>b.saves-a.saves);
  const c=cs[0],s=sv[0];
  $("#keepers").innerHTML = `<div class="section-head"><div><div class="kicker">GOALKEEPER AWARDS</div><h2>Golden Glove</h2><p>Track clean sheets, saves and notes for each nominated goalkeeper.</p></div><span class="pill">CLEAN SHEETS · SAVES</span></div>
    <div class="grid leader-grid"><div class="leader-card"><h3>Most clean sheets</h3><div class="big">${c?.cleanSheets||0}</div><p>${c?`${esc(displayPlayer(c.player))} · ${esc(club(c.team))}`:"No goalkeeper entries"}</p></div><div class="leader-card"><h3>Most saves</h3><div class="big">${s?.saves||0}</div><p>${s?`${esc(displayPlayer(s.player))} · ${esc(club(s.team))}`:"No goalkeeper entries"}</p></div></div>
    <div class="panel" style="margin-bottom:15px"><div class="panel-title"><h3>Add goalkeeper</h3><span class="subtle">Select a player from the 92-player squad list.</span></div><div class="form-row"><select id="newKeeperTeam" class="field"><option value="P1">Real Madrid</option><option value="P2">Arsenal</option><option value="P3">Bayern Munich</option><option value="P4">Manchester United</option></select><select id="newKeeperPlayer" class="field"></select><button id="addKeeper" class="btn btn-gold">Add goalkeeper</button></div><p class="inline-note">Your Excel explicitly listed Oliver Kahn (P3) and Angelo (P4) as goalkeeper dropdown entries. P1/P2 goalkeeper names were not specified, so you can choose the correct players here.</p></div>
    <div class="table-wrap"><table><thead><tr><th>Goalkeeper</th><th>Club</th><th>Clean sheets</th><th>Saves</th><th>Notes</th><th></th></tr></thead><tbody>${state.goalkeeperStats.map((g,i)=>`<tr><td class="player-name">${playerPortrait(g.player)}<span>${esc(displayPlayer(g.player))}</span></td><td>${esc(club(g.team))}</td><td><div class="stat-edit"><input class="field field-table" type="number" min="0" max="9999" value="${g.cleanSheets}" data-keeper="${i}" data-stat="cleanSheets"><button class="mini-reset" title="Reset only ${esc(g.player)} clean sheets" data-reset-keeper="${i}" data-stat="cleanSheets">↺</button></div></td><td><div class="stat-edit"><input class="field field-table" type="number" min="0" max="9999" value="${g.saves}" data-keeper="${i}" data-stat="saves"><button class="mini-reset" title="Reset only ${esc(g.player)} saves" data-reset-keeper="${i}" data-stat="saves">↺</button></div></td><td><input class="field" style="min-width:140px" value="${esc(g.notes||"")}" data-keeper="${i}" data-stat="notes" aria-label="Notes for ${esc(g.player)}"></td><td><button class="tiny-action danger" data-remove-keeper="${i}">Remove</button></td></tr>`).join("")}</tbody></table></div>`;
  updateKeeperOptions();
}
function updateKeeperOptions() {
  const teamCode=$("#newKeeperTeam")?.value||"P1";
  const select=$("#newKeeperPlayer"); if(!select)return;
  const used=new Set(state.goalkeeperStats.map(g=>`${g.team}|${g.player}`));
  const choices=team(teamCode).squad.filter(p=>!used.has(`${teamCode}|${p}`));
  select.innerHTML=choices.length?choices.map(p=>`<option value="${esc(p)}">${esc(p)}</option>`).join(""):`<option value="">All players already added</option>`;
}
function renderAll() {
  if (!state) return;
  renderOverview(); renderStandings(); renderFixtures(); renderSquads(); renderScorers(); renderKeepers(); showTab(activeTab);
}
function showTab(tab) {
  activeTab=tab;
  $$(".tab").forEach(b=>b.classList.toggle("active",b.dataset.tab===tab));
  $$(".view").forEach(v=>v.classList.toggle("active",v.id===tab));
}
function updateScore(input) {
  const f=state.fixtures.find(x=>x.id===input.dataset.fixture); if(!f)return;
  const val=input.value.trim()===""?null:Number(input.value);
  if(val!==null&&(!Number.isInteger(val)||val<0||val>99)){notify("Score must be a whole number from 0 to 99.",true);input.value=f[input.dataset.score]??"";return;}
  f[input.dataset.score]=val;
  setDirty();
  // Update the standings/overview live while preserving the active fixture edit controls.
  renderOverview(); renderStandings();
}
function updatePlayerStat(input) {
  const p=state.playerStats.find(x=>x.player===input.dataset.player&&x.team===input.dataset.team); if(!p)return;
  const val=Number(input.value);
  if(!Number.isInteger(val)||val<0||val>999){notify("Goals and assists must be whole numbers from 0 to 999.",true);input.value=p[input.dataset.stat];return;}
  p[input.dataset.stat]=val; setDirty();
  // Keep the input focus and table stable; leader cards refresh on the next render.
  const sorted=[...state.playerStats].sort((a,b)=>b.goals-a.goals);
  const top=sorted[0];
  const cards=$$("#scorers .leader-card");
  if(cards[0]){cards[0].querySelector(".big").innerHTML=`${top.goals} <small>goals</small>`;cards[0].querySelector("p").textContent=top.goals?`${top.player} · ${club(top.team)}`:"No goals recorded yet";}
}
function downloadJson(name, data) {
  const blob=new Blob([JSON.stringify(data,null,2)],{type:"application/json"});
  const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=name;a.click();URL.revokeObjectURL(url);
}

$(".tabs").addEventListener("click",e=>{const b=e.target.closest("[data-tab]");if(b)showTab(b.dataset.tab);});
document.addEventListener("click",e=>{
  const resetMatch=e.target.closest("[data-reset-match]");
  if(resetMatch){const f=state.fixtures.find(x=>x.id===resetMatch.dataset.resetMatch);if(f&&confirm(`Reset only ${club(f.homeTeam)} vs ${club(f.awayTeam)}? Other match results will stay unchanged.`)){f.homeGoals=null;f.awayGoals=null;setDirty();renderFixtures();renderOverview();renderStandings();notify(`Only ${f.id} score has been reset. Press Save Changes to share it.`);}return;}
  const resetPlayer=e.target.closest("[data-reset-player]");
  if(resetPlayer){const p=state.playerStats.find(x=>x.player===resetPlayer.dataset.resetPlayer&&x.team===resetPlayer.dataset.team);const k=resetPlayer.dataset.stat;if(p&&confirm(`Reset only ${p.player}'s ${k}?`)){p[k]=0;setDirty();renderScorers();notify(`${p.player}'s ${k} reset. Other player stats are unchanged.`);}return;}
  const resetKeeper=e.target.closest("[data-reset-keeper]");
  if(resetKeeper){const g=state.goalkeeperStats[Number(resetKeeper.dataset.resetKeeper)],k=resetKeeper.dataset.stat;if(g&&confirm(`Reset only ${g.player}'s ${k}?`)){g[k]=0;setDirty();renderKeepers();notify(`${g.player}'s ${k} reset. Other goalkeeper data is unchanged.`);}return;}
  const goto=e.target.closest("[data-goto]"); if(goto)showTab(goto.dataset.goto);
  const add=e.target.closest("#addKeeper"); if(add){const code=$("#newKeeperTeam").value, player=$("#newKeeperPlayer").value;if(!player){notify("Choose a player who has not already been added.",true);return;}state.goalkeeperStats.push({player,team:code,cleanSheets:0,saves:0,notes:""});setDirty();renderKeepers();}
  const rem=e.target.closest("[data-remove-keeper]");if(rem){const i=Number(rem.dataset.removeKeeper);if(confirm(`Remove ${state.goalkeeperStats[i].player} from goalkeeper statistics?`)){state.goalkeeperStats.splice(i,1);setDirty();renderKeepers();}}
});
document.addEventListener("change",e=>{
  const el=e.target;
  if(el.matches("[data-fixture][data-score]"))updateScore(el);
  if(el.matches("[data-player][data-stat]"))updatePlayerStat(el);
  if(el.matches("[data-keeper][data-stat]")){const g=state.goalkeeperStats[Number(el.dataset.keeper)],k=el.dataset.stat;if(k==="notes")g.notes=el.value;else{const v=Number(el.value);if(!Number.isInteger(v)||v<0||v>9999){notify("Enter a whole number from 0 to 9999.",true);el.value=g[k];return;}g[k]=v;}setDirty();}
  if(el.id==="newKeeperTeam")updateKeeperOptions();
  if(el.id==="squadTeam"){teamFilter=el.value;renderSquadTables();}
  if(el.id==="statsTeam"){teamFilter=el.value;renderPlayerStatsTable();}
});
document.addEventListener("input",e=>{
  const el=e.target;
  if(el.id==="squadSearch"){searchTerm=el.value;renderSquadTables();}
  if(el.id==="statsSearch"){searchTerm=el.value;renderPlayerStatsTable();}
});
$("#saveButton").addEventListener("click",saveState);
$("#downloadBackup").addEventListener("click",()=>{if(state)downloadJson("elite-four-season-02-backup.json",state);});

loadState();
setInterval(()=>{if(!dirty&&!busy)loadState(true);},15000);
