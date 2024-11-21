/* Magic Mirror
 * Module: MMM-NRL
 *
 * By EwwYumYuck
 * MIT Licensed.
 */

Module.register("MMM-NRL", {
    defaults: {
        updateInterval: 5 * 60 * 1000, // 5 minutes
        updateIntervalLive: 60 * 1000, // 1 minute for live games
        animationSpeed: 1000,
        colored: true,
        showLogos: true,
        showScores: true,
        showTime: true,
        showVenue: true,
        maximumEntries: 10,
        focus_on: false, // Team to focus on
        mode: "all", // all, live, upcoming, completed
        useAbbreviations: true // New option to toggle abbreviations
    },

    teamAbbreviations: {
        "Storm": "MEL",
        "Raiders": "CAN",
        "Panthers": "PEN",
        "Titans": "GLD",
        "Rabbitohs": "SOU",
        "Warriors": "NZL",
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
        "Dolphins": "DOL"
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
        if (this.error) {
            return "MMM-NRL - Error";
        }
        if (!this.loaded) {
            return "MMM-NRL - Loading...";
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
        let filteredMatches = matches;

        // Filter by mode
        if (this.config.mode === "live") {
            filteredMatches = matches.filter(m => m.status === "LIVE");
        } else if (this.config.mode === "upcoming") {
            filteredMatches = matches.filter(m => m.status === "UPCOMING");
        } else if (this.config.mode === "completed") {
            filteredMatches = matches.filter(m => m.status === "FINISHED");
        }

        // Filter by team if focus_on is set
        if (this.config.focus_on) {
            filteredMatches = filteredMatches.filter(m => 
                m.home.name.toLowerCase() === this.config.focus_on.toLowerCase() || 
                m.away.name.toLowerCase() === this.config.focus_on.toLowerCase()
            );
        }

        // Limit number of matches
        return filteredMatches.slice(0, this.config.maximumEntries);
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

        const matchesTable = document.createElement("table");
        matchesTable.className = "small";

        this.matches.forEach(match => {
            matchesTable.appendChild(this.createMatchRow(match));
        });

        wrapper.appendChild(matchesTable);
        return wrapper;
    },

    createMatchRow: function(match) {
        const row = document.createElement("tr");
        row.className = "title bright";

        // Home Team
        const homeCell = document.createElement("td");
        homeCell.className = "align-right";
        if (this.config.showLogos && match.home.logo) {
            const logo = this.createLogo(match.home, !this.config.colored);
            if (logo) {
                homeCell.appendChild(logo);
            }
        }
        const homeName = this.config.useAbbreviations ? (this.teamAbbreviations[match.home.name] || match.home.name) : match.home.name;
        homeCell.innerHTML += ` ${homeName}`;
        row.appendChild(homeCell);

        // Score
        const scoreCell = document.createElement("td");
        scoreCell.className = "align-center score-cell";
        if (this.config.showScores && (match.status === "LIVE" || match.status === "FINISHED")) {
            scoreCell.innerHTML = `${match.home.score} - ${match.away.score}`;
        } else {
            const matchTime = new Date(match.starttime);
            scoreCell.innerHTML = matchTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }
        if (match.status === "LIVE") {
            scoreCell.className += " live";
        }
        row.appendChild(scoreCell);

        // Away Team
        const awayCell = document.createElement("td");
        awayCell.className = "align-left";
        const awayName = this.config.useAbbreviations ? (this.teamAbbreviations[match.away.name] || match.away.name) : match.away.name;
        awayCell.innerHTML = awayName;
        if (this.config.showLogos && match.away.logo) {
            const logo = this.createLogo(match.away, !this.config.colored);
            if (logo) {
                awayCell.appendChild(logo);
            }
        }
        row.appendChild(awayCell);

        // Venue (if enabled)
        if (this.config.showVenue && match.venue) {
            const venueRow = document.createElement("tr");
            venueRow.className = "dimmed small";
            const venueCell = document.createElement("td");
            venueCell.colSpan = 3;
            venueCell.className = "align-center";
            venueCell.innerHTML = `${match.venue} - ${match.round}`;
            venueRow.appendChild(venueCell);
            return document.createDocumentFragment().appendChild(row).appendChild(venueRow).parentNode;
        }

        return row;
    },

    createLogo: function(team, isGrayscale) {
        if (!team.logo) {
            return null;
        }
        
        const img = document.createElement("img");
        img.className = "team-logo" + (isGrayscale ? " grayscale" : "");
        img.src = team.logo;
        img.alt = team.name;
        img.width = 25;
        img.height = 25;
        
        // Add error handling
        img.onerror = function() {
            img.style.display = 'none';
            console.error("Error loading logo for team:", team.name);
        };
        
        return img;
    }
});