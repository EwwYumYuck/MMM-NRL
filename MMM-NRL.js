Module.register("MMM-NRL", {
    // Override default module config
    defaults: {
        updateInterval: 300000, // update every 5 minutes
        animationSpeed: 1000,
        maximumEntries: 10,
        showTeamLogos: true,
        showScores: true,
        showTablePosition: true,
        colored: true,
        focus_on: [], // Array of team IDs to focus on
        mode: "all" // Possible values: "all", "live", "upcoming", "completed"
    },

    // Define required scripts
    getScripts: function() {
        return ["moment.js"];
    },

    // Define required styles
    getStyles: function() {
        return [
            "MMM-NRL.css",
            "font-awesome.css"
        ];
    },

    // Override start method
    start: function() {
        Log.info("Starting module: " + this.name);
        
        // Set up data structures
        this.loaded = false;
        this.matches = [];
        this.errorMessage = null;

        // Validate configuration
        if (["all", "live", "upcoming", "completed"].indexOf(this.config.mode) === -1) {
            Log.error(this.name + ": Invalid mode specified. Defaulting to 'all'");
            this.config.mode = "all";
        }

        if (this.config.focus_on && !Array.isArray(this.config.focus_on)) {
            Log.error(this.name + ": focus_on must be an array. Defaulting to empty array.");
            this.config.focus_on = [];
        }

        Log.info(this.name + ": Configuration loaded:", JSON.stringify(this.config));
        
        // Initial data load
        this.scheduleUpdate();
        Log.info(this.name + ": Initial update scheduled");
        
        // Force immediate first update
        this.updateData();
        Log.info(this.name + ": Immediate first update triggered");
    },

    // Override getDom method
    getDom: function() {
        var wrapper = document.createElement("div");
        wrapper.className = "wrapper";

        if (!this.loaded) {
            wrapper.innerHTML = this.translate("LOADING");
            wrapper.className = "dimmed light small";
            return wrapper;
        }

        if (!this.matches || this.matches.length === 0) {
            wrapper.innerHTML = "No matches available";
            wrapper.className = "dimmed light small";
            return wrapper;
        }

        var table = document.createElement("table");
        table.className = "small";

        // Create header row
        var headerRow = document.createElement("tr");
        headerRow.className = "title bright";
        
        var titleCell = document.createElement("td");
        titleCell.colSpan = 5;
        titleCell.innerHTML = this.matches[0].round;
        headerRow.appendChild(titleCell);
        table.appendChild(headerRow);

        // Create matches table
        this.matches.forEach((match) => {
            var row = document.createElement("tr");
            row.className = match.status === "LIVE" ? "bright" : "dimmed";

            // Home team
            var homeCell = document.createElement("td");
            homeCell.className = "align-right";
            if (this.config.showTeamLogos) {
                var homeLogo = document.createElement("img");
                homeLogo.src = this.file("icons/" + match.homeTeam.toLowerCase().replace(/[^a-z0-9]/g, '') + ".png");
                homeLogo.className = "team-logo";
                homeCell.appendChild(homeLogo);
            }
            homeCell.innerHTML += " " + match.homeTeam;
            row.appendChild(homeCell);

            // Score/Time
            var scoreCell = document.createElement("td");
            scoreCell.className = "align-center score" + (match.status === "LIVE" ? " live" : "");
            if (match.status === "SCHEDULED") {
                scoreCell.innerHTML = match.time;
            } else {
                scoreCell.innerHTML = (match.homeScore !== null ? match.homeScore : "-") + 
                                    " - " + 
                                    (match.awayScore !== null ? match.awayScore : "-");
            }
            row.appendChild(scoreCell);

            // Away team
            var awayCell = document.createElement("td");
            awayCell.className = "align-left";
            awayCell.innerHTML = match.awayTeam + " ";
            if (this.config.showTeamLogos) {
                var awayLogo = document.createElement("img");
                awayLogo.src = this.file("icons/" + match.awayTeam.toLowerCase().replace(/[^a-z0-9]/g, '') + ".png");
                awayLogo.className = "team-logo";
                awayCell.appendChild(awayLogo);
            }
            row.appendChild(awayCell);

            // Status/Time
            var timeCell = document.createElement("td");
            timeCell.className = "align-right dimmed light time";
            timeCell.innerHTML = match.status === "LIVE" ? "LIVE" : 
                               (match.status === "COMPLETED" ? "FT" : "");
            row.appendChild(timeCell);

            // Venue
            var venueCell = document.createElement("td");
            venueCell.className = "align-left dimmed light venue";
            venueCell.innerHTML = match.venue;
            row.appendChild(venueCell);

            table.appendChild(row);
        });

        wrapper.appendChild(table);
        return wrapper;
    },

    // Helper function to get ordinal suffix for round number
    getOrdinal: function(n) {
        var s = ["th", "st", "nd", "rd"];
        var v = n % 100;
        return n + (s[(v - 20) % 10] || s[v] || s[0]);
    },

    // Schedule next update
    scheduleUpdate: function() {
        const self = this;
        setInterval(function() {
            self.updateData();
        }, this.config.updateInterval);
    },

    // Request new data from the node helper
    updateData: function() {
        this.sendSocketNotification("GET_NRL_DATA", this.config);
    },

    // Handle notifications from node helper
    socketNotificationReceived: function(notification, payload) {
        if (notification === "NRL_MATCHES") {
            this.matches = payload;
            this.loaded = true;
            this.updateDom(this.config.animationSpeed);
        }
    }
});