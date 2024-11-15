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
        Log.debug(this.name + ": Updating DOM");
        const wrapper = document.createElement("div");
        wrapper.className = "mmm-nrl";

        if (this.errorMessage) {
            Log.error(this.name + ": Displaying error message:", this.errorMessage);
            
            // Check if it's an off-season error
            if (this.errorMessage.includes("404") || this.errorMessage.includes("No games found")) {
                const currentMonth = new Date().getMonth() + 1; // 1-12
                if (currentMonth >= 10) {
                    wrapper.innerHTML = "NRL is currently in off-season. The 2024 season will begin in March!";
                } else if (currentMonth <= 2) {
                    wrapper.innerHTML = "NRL pre-season starts soon. The 2024 season will begin in March!";
                } else {
                    wrapper.innerHTML = this.errorMessage;
                }
            } else {
                wrapper.innerHTML = this.errorMessage;
            }
            
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
            if (this.config.showTeamLogos) {
                const homeLogo = document.createElement("img");
                homeLogo.src = match.homeTeam.logo;
                homeLogo.className = "team-logo";
                homeLogo.alt = match.homeTeam.name;
                homeCell.appendChild(homeLogo);
            }

            // Add home team name
            homeCell.innerHTML += match.homeTeam.name;

            // Add table position if enabled
            if (this.config.showTablePosition && match.homeTeam.position) {
                const homePos = document.createElement("span");
                homePos.className = "table-position";
                homePos.innerHTML = `[${match.homeTeam.position}]`;
                homeCell.appendChild(homePos);
            }

            // Score cell
            const scoreCell = document.createElement("td");
            scoreCell.className = "score-cell " + match.status.toLowerCase();
            
            if (this.config.showScores) {
                const scoreText = match.status === "SCHEDULED" 
                    ? moment(match.startTime).format("HH:mm")
                    : `${match.homeTeam.score} - ${match.awayTeam.score}`;
                scoreCell.innerHTML = scoreText;
            }

            // Away team cell
            const awayCell = document.createElement("td");
            awayCell.className = "align-left team-cell";

            // Add away team name
            awayCell.innerHTML = match.awayTeam.name;

            // Add table position if enabled
            if (this.config.showTablePosition && match.awayTeam.position) {
                const awayPos = document.createElement("span");
                awayPos.className = "table-position";
                awayPos.innerHTML = `[${match.awayTeam.position}]`;
                awayCell.appendChild(awayPos);
            }

            // Add away team logo if enabled
            if (this.config.showTeamLogos) {
                const awayLogo = document.createElement("img");
                awayLogo.src = match.awayTeam.logo;
                awayLogo.className = "team-logo";
                awayLogo.alt = match.awayTeam.name;
                awayCell.appendChild(awayLogo);
            }

            // Add round and venue info
            const infoCell = document.createElement("td");
            infoCell.className = "dimmed small";
            infoCell.innerHTML = `R${match.round} - ${match.venue}`;

            // Append all cells to row
            row.appendChild(homeCell);
            row.appendChild(scoreCell);
            row.appendChild(awayCell);
            row.appendChild(infoCell);

            // Append row to table
            table.appendChild(row);
        });

        return table;
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
        if (notification === "NRL_DATA") {
            this.loaded = true;
            this.matches = payload.matches;
            this.errorMessage = null;
            this.updateDom(this.config.animationSpeed);
        } else if (notification === "NRL_DATA_ERROR") {
            this.errorMessage = payload.error;
            this.updateDom(this.config.animationSpeed);
        }
    }
});