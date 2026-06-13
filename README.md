# MMM-NRL

A MagicMirror² module that shows NRL match scores, upcoming fixtures, and results — built for footy fans who want it on their mirror without the fuss.

Supports NRL, NRLW, State of Origin, and Women's State of Origin. Built with NZ and Pacific audiences in mind.

---

## What it does

- Shows the **current round's matches** — upcoming games, live scores, and recent results
- When a round finishes, it keeps showing the results until the next round's fixtures are available — so your mirror is never blank
- If you enable multiple competitions, each one gets its own section with a clear header so it stays easy to read on a small screen
- Live games get a faster refresh (every minute) and a blinking score so they stand out

---

## Installation

Navigate to your MagicMirror modules folder and clone the repo:

```bash
cd ~/MagicMirror/modules
git clone https://github.com/EwwYumYuck/MMM-NRL
cd MMM-NRL
npm install
```

---

## Basic setup

Add this to your `config/config.js`:

```javascript
{
    module: "MMM-NRL",
    position: "top_right",
    config: {
        header: null    // null = auto ("NRL Matches", "State of Origin", etc.) or set a custom string
    }
}
```

That's it. By default it shows NRL Premiership fixtures for the current round, with logos, scores, venues, and team abbreviations all turned on.

---

## Adding more competitions

Want NRLW and State of Origin on the same mirror? Just add them to the `competitions` array:

```javascript
{
    module: "MMM-NRL",
    position: "middle_center",
    config: {
        header: "NRL / NRLW / Origin",
        competitions: ["nrl", "nrlw", "soo"],
        maximumEntries: 10
    }
}
```

Each competition shows as its own group with a header like `NRL — Round 15` or `SOO — Game 2`. No extra config needed — it figures out the layout automatically.

Available competitions:

| Value | Competition |
|-------|-------------|
| `"nrl"` | NRL Premiership (men's) — on by default |
| `"nrlw"` | NRL Women's Premiership |
| `"soo"` | Ampol State of Origin (men's) |
| `"wsoo"` | Ampol Women's State of Origin |

### What it looks like with multiple competitions

```
NRL — ROUND 15
[logo] SOU  12 - 8   BRI [logo]   ← result from last game
[logo] MEL  Wed 19:50  NQL [logo] ← coming up

NRLW — ROUND 1
[logo] BRI  20 - 14  DRG [logo]

SOO — GAME 2
[logo] NSW  Wed 20:00  QLD [logo]
```

Use `maximumEntries` to control how many matches show in total — handy if you have a small screen and multiple competitions enabled.

---

## All config options

| Option | What it does | Default |
|--------|-------------|---------|
| `header` | Text shown at the top. `null` = auto-generated from competition | `null` |
| `competitions` | Which competitions to show — see above | `["nrl"]` |
| `maximumEntries` | Max number of matches to show across all competitions | `10` |
| `mode` | Filter to `"all"`, `"live"`, `"upcoming"`, or `"completed"` | `"all"` |
| `focus_on` | Only show matches involving one team e.g. `"Warriors"` | `false` |
| `showLogos` | Show team badge logos | `true` |
| `showScores` | Show scores for live and completed games | `true` |
| `showVenue` | Show venue and round info (single competition only) | `true` |
| `showTime` | Show kick-off time for upcoming games | `true` |
| `colored` | Coloured logos — set to `false` for grayscale | `true` |
| `useAbbreviations` | Use short team codes like MEL, BRI instead of full names | `true` |
| `updateInterval` | How often to refresh data (milliseconds) | `300000` (5 min) |
| `updateIntervalLive` | Refresh rate during live games | `60000` (1 min) |
| `animationSpeed` | Transition speed when the display updates | `1000` |
| `showCompetition` | Single-competition mode only: show comp label in venue row | `false` |

---

## Team abbreviations

### NRL Premiership

| Team | Code |
|------|------|
| Broncos | BRI |
| Bulldogs | CBY |
| Cowboys | NQL |
| Dolphins | DOL |
| Dragons | STI |
| Eels | PAR |
| Knights | NEW |
| Panthers | PEN |
| Rabbitohs | SOU |
| Raiders | CAN |
| Roosters | SYD |
| Sea Eagles | MAN |
| Sharks | CRO |
| Storm | MEL |
| Titans | GLD |
| Warriors | WAR |
| Wests Tigers | WST |

### NRLW — Women's Premiership

NRLW teams use the same names and codes as their NRL counterparts above.

### State of Origin

| Team | Code |
|------|------|
| Blues | NSW |
| Maroons | QLD |

### Expansion teams

| Team | Code | Joining |
|------|------|---------|
| Perth | PER | 2027 |
| Chiefs | PNG | 2027+ |

Perth Bears and PNG Chiefs are already wired up — logos and abbreviations are ready to go and will appear automatically once the NRL API starts including them.

---

## Keeping it up to date

```bash
cd ~/MagicMirror/modules/MMM-NRL
git pull
pm2 restart MagicMirror
```

You only need to run `npm install` again if the changelog says new packages were added.

---

## Changelog

### v0.4.0 — 2026-06-12
No breaking changes — existing configs work as-is.

- **Alignment fix** — all competitions (NRL, SOO, NRLW) now use equal fixed-width team columns so QLD/NSW display is consistent with MEL/BRI
- **Fixed venue row HTML bug** — venue row was incorrectly nested inside the match row; now properly rendered as a sibling `<tr>`
- **DOM safety** — replaced `innerHTML` with `textContent`/`createElement` throughout
- **Extended SOO abbreviations** — module now recognises `"Queensland Maroons"`, `"Queensland"`, `"New South Wales Blues"` etc. from the API

### v0.3.0 — 2026-06-09
No breaking changes — existing configs work as-is.

- **Compact grouped layout** for multi-competition setups — each competition gets a section header (e.g. `NRL — Round 15`) instead of a venue row per match, which cuts vertical space roughly in half on small screens
- **Current round only** — the module now always shows the current round's fixtures; results stay visible after a round ends until the next round's games are published
- **Compact date format** — upcoming games in grouped mode show as `Wed 19:50` rather than a two-line date and time
- `showVenue` now applies to single-competition mode only

### v0.2.0 — 2026-06-09
No breaking changes.

- **Multi-competition support** — NRL, NRLW, State of Origin, Women's SoO all from one module
- **Perth Bears and PNG Chiefs pre-wired** for their 2027/2028 NRL entries
- Fixed a bug where the venue row was rendering incorrectly
- Fixed API errors showing silently instead of surfacing on the display
- Fixed `Upcoming` match state not being handled correctly
- Corrected Warriors abbreviation from `NZL` to `WAR`

### v0.1.0 — Initial release
- NRL Premiership fixtures, scores, and venues
- Team logos with colored and grayscale support
- Live match detection with faster refresh
- Configurable header, mode, team focus, and abbreviations

---

## Screenshot

![MMM-NRL Module Screenshot](screenshot/screenshot.png)

## Contributing

Issues and pull requests are welcome!

## License

MIT
