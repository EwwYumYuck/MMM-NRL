/* Magic Mirror
 * Module: MMM-NRL
 *
 * By EwwYumYuck
 * MIT Licensed.
 */

Module.register("MMM-NRL", {
    defaults: {
        updateInterval: 5 * 60 * 1000,
        updateIntervalLive: 60 * 1000,
        animationSpeed: 1000,
        colored: true,
        showLogos: true,
        showScores: true,
        showTime: true,
        showVenue: true,
        maximumEntries: 10,
        focus_on: false,
        mode: "all", // all, live, upcoming, completed
        useAbbreviations: true,
        header: "NRL Matches",
        competitions: ["nrl"], // e.g. ["nrl", "nrlw", "soo", "wsoo"]
        showCompetition: false  // legacy: label in venue row (single-competition mode only)
    },

    competitionLabels: {
        "nrl":  "NRL",
        "nrlw": "NRLW",
        "soo":  "SOO",
        "wsoo": "WSOO"
    },

    teamAbbreviations: {
        "Storm": "MEL",
        "Raiders": "CAN",
        "Panthers": "PEN",
        "Titans": "GLD",
        "Rabbitohs": "SOU",
        "Warriors": "WAR",
        "Sea Eagles": "MAN",
        "Dragons": "STI",
        "Eels": "PAR",
        "Wests Tigers": "WST",
        "Roosters": "SYD",
        "Cowboys": "NQL",
        "Knights": "NEW",
        "Broncos": "BRI",
        "Sharks": "CRO",
        "Bulldogs": "CBY",
        "Dolphins": "DOL",
        // State of Origin
        "Blues": "NSW",
        "Maroons": "QLD",
        // Expansion teams (2027/2028)
        "Bears": "PER",
        "Chiefs": "PNG"
    },

    start: function() {
        Log.info("Starting module: " + this.name);
        this.loaded = false;
        this.matches = [];
        this.error = null;
        this.sendSocketNotification("SET_CONFIG", this.config);
    },

    getStyles: function() {
        return ["MMM-NRL.css", "font-awesome.css"];
    },

    getHeader: function() {
        if (this.error) return "MMM-NRL - Error";
        if (!this.loaded) return "MMM-NRL - Loading...";
        return this.config.header;
    },

    socketNotificationReceived: function(notification, payload) {
        if (notification === "DATA") {
            this.loaded = true;
            this.matches = this.filterMatches(payload.matches);
            this.error = null;
            this.updateDom(this.config.animationSpeed);
        } else if (notification === "ERROR") {
            this.error = payload;
            this.updateDom(this.config.animationSpeed);
        }
    },

    filterMatches: function(matches) {
        let filtered = matches;

        if (this.config.mode === "live") {
            filtered = matches.filter(m => m.status === "LIVE");
        } else if (this.config.mode === "upcoming") {
            filtered = matches.filter(m => m.status === "UPCOMING");
        } else if (this.config.mode === "completed") {
            filtered = matches.filter(m => m.status === "FINISHED");
        }

        if (this.config.focus_on) {
            filtered = filtered.filter(m =>
                m.home.name.toLowerCase() === this.config.focus_on.toLowerCase() ||
                m.away.name.toLowerCase() === this.config.focus_on.toLowerCase()
            );
        }

        return filtered.slice(0, this.config.maximumEntries);
    },

    getDom: function() {
        const wrapper = document.createElement("div");
        wrapper.className = "MMM-NRL";

        if (this.error) {
            wrapper.innerHTML = `Error: ${this.error}`;
            wrapper.className = "dimmed light small";
            return wrapper;
        }

        if (!this.loaded) {
            wrapper.innerHTML = "Loading...";
            wrapper.className = "dimmed light small";
            return wrapper;
        }

        const competitions = this.config.competitions || ["nrl"];
        const grouped = competitions.length > 1;

        if (grouped) {
            // Build a map of competition -> matches
            const groups = {};
            this.matches.forEach(match => {
                const comp = match.competition || "nrl";
                if (!groups[comp]) groups[comp] = [];
                groups[comp].push(match);
            });

            competitions.forEach(comp => {
                const compMatches = groups[comp];
                if (!compMatches || compMatches.length === 0) return;

                const table = document.createElement("table");
                table.className = "small nrl-group";

                // Section header: e.g. "NRL — Round 15" or "SOO — Game 2"
                const headerRow = document.createElement("tr");
                const headerCell = document.createElement("td");
                headerCell.colSpan = 3;
                headerCell.className = "competition-header";
                const label = this.competitionLabels[comp] || comp.toUpperCase();
                const round = compMatches[0].round || "";
                headerCell.textContent = round ? `${label} — ${round}` : label;
                headerRow.appendChild(headerCell);
                table.appendChild(headerRow);

                compMatches.forEach(match => {
                    table.appendChild(this.createMatchRow(match, true));
                });

                wrapper.appendChild(table);
            });
        } else {
            // Single competition — original layout with venue rows
            const table = document.createElement("table");
            table.className = "small";
            this.matches.forEach(match => {
                const node = this.createMatchRow(match, false);
                table.appendChild(node);
            });
            wrapper.appendChild(table);
        }

        return wrapper;
    },

    createMatchRow: function(match, grouped) {
        const row = document.createElement("tr");
        row.className = "title bright";

        // Home team
        const homeCell = document.createElement("td");
        homeCell.className = "align-right";
        if (this.config.showLogos && match.home.logo) {
            const logo = this.createLogo(match.home, !this.config.colored);
            if (logo) homeCell.appendChild(logo);
        }
        const homeName = this.config.useAbbreviations
            ? (this.teamAbbreviations[match.home.name] || match.home.name)
            : match.home.name;
        homeCell.innerHTML += ` ${homeName}`;
        row.appendChild(homeCell);

        // Score / time
        const scoreCell = document.createElement("td");
        scoreCell.className = "align-center score-cell";
        if (this.config.showScores && (match.status === "LIVE" || match.status === "FINISHED")) {
            scoreCell.innerHTML = `${match.home.score} - ${match.away.score}`;
        } else {
            const matchTime = new Date(match.starttime);
            if (grouped) {
                // Compact: "Wed 19:50"
                const day = matchTime.toLocaleDateString([], { weekday: "short" });
                const time = matchTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
                scoreCell.innerHTML = `<span class="match-day">${day}</span> <span class="match-time">${time}</span>`;
            } else {
                const dateStr = matchTime.toLocaleDateString([], { day: "numeric", month: "short", year: "numeric" });
                scoreCell.innerHTML = `<div class="match-date">${dateStr}</div>`;
                scoreCell.innerHTML += `<div class="match-time">${matchTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>`;
            }
        }
        // Grouped: venue shown inline under the time — no extra row needed
        if (grouped && this.config.showVenue && match.venue) {
            scoreCell.innerHTML += `<div class="venue-inline">${match.venue}</div>`;
        }
        if (match.status === "LIVE") scoreCell.className += " live";
        row.appendChild(scoreCell);

        // Away team
        const awayCell = document.createElement("td");
        awayCell.className = "align-left";
        const awayName = this.config.useAbbreviations
            ? (this.teamAbbreviations[match.away.name] || match.away.name)
            : match.away.name;
        awayCell.innerHTML = awayName;
        if (this.config.showLogos && match.away.logo) {
            const logo = this.createLogo(match.away, !this.config.colored);
            if (logo) awayCell.appendChild(logo);
        }
        row.appendChild(awayCell);

        // Venue row — single mode only (grouped shows venue inline in score cell above)
        if (!grouped && this.config.showVenue && match.venue) {
            const venueRow = document.createElement("tr");
            venueRow.className = "dimmed small";
            const venueCell = document.createElement("td");
            venueCell.colSpan = 3;
            venueCell.className = "venue-cell";
            let venueText = `${match.venue} - ${match.round}`;
            if (this.config.showCompetition && match.competition) {
                const label = this.competitionLabels[match.competition] || match.competition.toUpperCase();
                venueText = `${label} | ${venueText}`;
            }
            venueCell.innerHTML = venueText;
            venueRow.appendChild(venueCell);
            const fragment = document.createDocumentFragment();
            fragment.appendChild(row);
            fragment.appendChild(venueRow);
            return fragment;
        }

        return row;
    },

    createLogo: function(team, isGrayscale) {
        if (!team.logo) return null;
        const img = document.createElement("img");
        img.className = "team-logo" + (isGrayscale ? " grayscale" : "");
        img.src = team.logo;
        img.alt = team.name;
        img.width = 25;
        img.height = 25;
        img.onerror = function() {
            img.style.display = "none";
            console.error("Error loading logo for team:", team.name);
        };
        return img;
    }
});
