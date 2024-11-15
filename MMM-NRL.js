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
        mode: "live" // Possible values: "live", "upcoming", "completed"
    },

    // Define required scripts
    getScripts: function() {
        return ["moment.js"];
    },

    // Define required styles
    getStyles: function() {
        return ["MMM-NRL.css"];
    },

    // Override start method
    start: function() {
        Log.info("Starting module: " + this.name);
        
        // Set up data structures
        this.loaded = false;
        this.matches = [];
        this.errorMessage = null;

        // Validate configuration
        if (["live", "upcoming", "completed"].indexOf(this.config.mode) === -1) {
            Log.error(this.name + ": Invalid mode specified. Defaulting to 'live'");
            this.config.mode = "live";
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
        Log.debug(this.name + ": Updating DOM");
        const wrapper = document.createElement("div");
        wrapper.className = "mmm-nrl";

        if (this.errorMessage) {
            Log.error(this.name + ": Displaying error message:", this.errorMessage);
            wrapper.innerHTML = this.errorMessage;
            wrapper.className = "dimmed light small";
            return wrapper;
        }

        if (!this.loaded) {
            Log.debug(this.name + ": Module not yet loaded, showing loading message");
            wrapper.innerHTML = "Loading NRL data...";
            wrapper.className = "dimmed light small";
            return wrapper;
        }

        if (!this.matches || this.matches.length === 0) {
            Log.debug(this.name + ": No matches available to display");
            wrapper.innerHTML = "No matches available";
            wrapper.className = "dimmed light small";
            return wrapper;
        }

        // Create matches table
        Log.debug(this.name + ": Creating table with " + this.matches.length + " matches");
        const table = this.createMatchesTable();
        wrapper.appendChild(table);

        return wrapper;
    },

    createMatchesTable: function() {
        const table = document.createElement("table");
        table.className = "small nrl-table";

        this.matches.forEach((match, index) => {
            Log.debug(this.name + ": Processing match " + index, match);
            
            // Create match row
            const row = document.createElement("tr");
            row.className = "title bright match-row";

            // Home team cell
            const homeCell = document.createElement("td");
            homeCell.className = "align-right team-cell";
            
            // Add home team logo if enabled
            if (this.config.showTeamLogos && match.homeTeam.logo) {
                const homeLogo = document.createElement("img");
                homeLogo.src = match.homeTeam.logo;
                homeLogo.className = "team-logo";
                homeCell.appendChild(homeLogo);
            }

            // Add home team name
            const homeText = document.createElement("span");
            homeText.innerHTML = match.homeTeam.name;
            if (this.config.showTablePosition) {
                homeText.innerHTML += ` (${match.homeTeam.position})`;
            }
            homeCell.appendChild(homeText);
            row.appendChild(homeCell);

            // Score cell
            const scoreCell = document.createElement("td");
            scoreCell.className = "align-center score-cell";
            if (this.config.showScores && match.status !== "SCHEDULED") {
                scoreCell.innerHTML = `${match.homeTeam.score} - ${match.awayTeam.score}`;
            } else {
                const matchTime = moment(match.startTime).format("HH:mm");
                scoreCell.innerHTML = matchTime;
            }
            row.appendChild(scoreCell);

            // Away team cell
            const awayCell = document.createElement("td");
            awayCell.className = "align-left team-cell";
            
            // Add away team name
            const awayText = document.createElement("span");
            awayText.innerHTML = match.awayTeam.name;
            if (this.config.showTablePosition) {
                awayText.innerHTML += ` (${match.awayTeam.position})`;
            }
            awayCell.appendChild(awayText);

            // Add away team logo if enabled
            if (this.config.showTeamLogos && match.awayTeam.logo) {
                const awayLogo = document.createElement("img");
                awayLogo.src = match.awayTeam.logo;
                awayLogo.className = "team-logo";
                awayCell.appendChild(awayLogo);
            }
            
            row.appendChild(awayCell);
            table.appendChild(row);
        });

        return table;
    },

    scheduleUpdate: function() {
        const self = this;
        setInterval(function() {
            self.updateData();
        }, this.config.updateInterval);
    },

    updateData: function() {
        Log.info(this.name + ": Requesting data update");
        this.sendSocketNotification("GET_NRL_DATA", this.config);
    },

    socketNotificationReceived: function(notification, payload) {
        Log.info(this.name + ": Received socket notification:", notification);
        
        if (notification === "NRL_DATA") {
            Log.info(this.name + ": Processing NRL data update");
            this.loaded = true;
            this.matches = payload.matches;
            this.errorMessage = null;
            Log.info(this.name + ": Received " + this.matches.length + " matches");
            this.updateDom(this.config.animationSpeed);
        } else if (notification === "NRL_ERROR") {
            Log.error(this.name + ": Error loading NRL data:", payload.error);
            this.errorMessage = "Error loading NRL data: " + payload.error;
            this.updateDom(this.config.animationSpeed);
        }
    }
});