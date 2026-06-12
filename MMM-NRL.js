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
        competitions: ["nrl"], // ["nrl", "nrlw", "soo", "wsoo"]
        header: null,          // null = auto-generate from competition
        showCompetition: false
    },

    competitionLabels: {
        "nrl":  "NRL",
        "nrlw": "NRLW",
        "soo":  "SOO",
        "wsoo": "WSOO"
    },

    competitionHeaders: {
        "nrl":  "NRL Matches",
        "nrlw": "NRLW Matches",
        "soo":  "State of Origin",
        "wsoo": "Women's State of Origin"
    },

    teamAbbreviations: {
        // NRL / NRLW clubs
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
        // Expansion teams
        "Bears": "PER",
        "Chiefs": "PNG",
        // State of Origin — multiple name forms the API may return
        "Queensland Maroons": "QLD",
        "Queensland": "QLD",
        "Maroons": "QLD",
        "New South Wales Blues": "NSW",
        "New South Wales": "NSW",
        "Blues": "NSW"
    },

    start: function() {
        Log.info("Starting module: " + this.name);
        this.loaded = false;
        this.matches = [];
        this.error = null;
        // Support legacy singular competition config
        if (this.config.competition && !this.config.competitions) {
            this.config.competitions = [this.config.competition];
        }
        this.sendSocketNotification("SET_CONFIG", this.config);
    },

    getStyles: function() {
        return ["MMM-NRL.css", "font-awesome.css"];
    },

    getHeader: function() {
        if (this.error) return "MMM-NRL - Error";
        if (!this.loaded) return "MMM-NRL - Loading...";
        if (this.config.header !== null && this.config.header !== undefined) return this.config.header;
        const competitions = this.config.competitions || ["nrl"];
        if (competitions.length === 1) {
            return this.competitionHeaders[competitions[0]] || "NRL Matches";
        }
        return "NRL Matches";
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
            wrapper.className = "dimmed light small";
            wrapper.textContent = `Error: ${this.error}`;
            return wrapper;
        }

        if (!this.loaded) {
            wrapper.className = "dimmed light small";
            wrapper.textContent = "Loading...";
            return wrapper;
        }

        const competitions = this.config.competitions || ["nrl"];
        const grouped = competitions.length > 1;

        if (grouped) {
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
                    this.createMatchRows(match, true).forEach(row => table.appendChild(row));
                });

                wrapper.appendChild(table);
            });
        } else {
            const table = document.createElement("table");
            table.className = "small";
            this.matches.forEach(match => {
                this.createMatchRows(match, false).forEach(row => table.appendChild(row));
            });
            wrapper.appendChild(table);
        }

        return wrapper;
    },

    createMatchRows: function(match, grouped) {
        const rows = [];
        const row = document.createElement("tr");
        row.className = "title bright";

        // Home team
        const homeCell = document.createElement("td");
        homeCell.className = "align-right";
        const homeName = this.config.useAbbreviations
            ? (this.teamAbbreviations[match.home.name] || match.home.name)
            : match.home.name;
        const homeNameSpan = document.createElement("span");
        homeNameSpan.textContent = homeName;
        homeCell.appendChild(homeNameSpan);
        if (this.config.showLogos && match.home.logo) {
            const logo = this.createLogo(match.home, !this.config.colored);
            if (logo) homeCell.appendChild(logo);
        }
        row.appendChild(homeCell);

        // Score / time
        const scoreCell = document.createElement("td");
        scoreCell.className = "align-center score-cell";
        if (this.config.showScores && (match.status === "LIVE" || match.status === "FINISHED")) {
            scoreCell.textContent = `${match.home.score} - ${match.away.score}`;
        } else {
            const matchTime = new Date(match.starttime);
            if (grouped) {
                const daySpan = document.createElement("span");
                daySpan.className = "match-day";
                daySpan.textContent = matchTime.toLocaleDateString([], { weekday: "short" });
                const timeSpan = document.createElement("span");
                timeSpan.className = "match-time";
                timeSpan.textContent = matchTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
                scoreCell.appendChild(daySpan);
                scoreCell.appendChild(document.createTextNode(" "));
                scoreCell.appendChild(timeSpan);
            } else {
                const dateStr = matchTime.toLocaleDateString([], { day: "numeric", month: "short" });
                const dateDiv = document.createElement("div");
                dateDiv.className = "match-date";
                dateDiv.textContent = dateStr;
                const timeDiv = document.createElement("div");
                timeDiv.className = "match-time";
                timeDiv.textContent = matchTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
                scoreCell.appendChild(dateDiv);
                scoreCell.appendChild(timeDiv);
            }
        }
        if (grouped && this.config.showVenue && match.venue) {
            const venueDiv = document.createElement("div");
            venueDiv.className = "venue-inline";
            venueDiv.textContent = match.venue;
            scoreCell.appendChild(venueDiv);
        }
        if (match.status === "LIVE") scoreCell.classList.add("live");
        row.appendChild(scoreCell);

        // Away team
        const awayCell = document.createElement("td");
        awayCell.className = "align-left";
        const awayName = this.config.useAbbreviations
            ? (this.teamAbbreviations[match.away.name] || match.away.name)
            : match.away.name;
        if (this.config.showLogos && match.away.logo) {
            const logo = this.createLogo(match.away, !this.config.colored);
            if (logo) awayCell.appendChild(logo);
        }
        const awayNameSpan = document.createElement("span");
        awayNameSpan.textContent = awayName;
        awayCell.appendChild(awayNameSpan);
        row.appendChild(awayCell);

        rows.push(row);

        // Venue row — single-competition mode only (grouped shows venue inline above)
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
            venueCell.textContent = venueText;
            venueRow.appendChild(venueCell);
            rows.push(venueRow);
        }

        return rows;
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
