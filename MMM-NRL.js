module.exports = Module.register("MMM-NRL", {
    defaults: {
        updateInterval: 300000, // update every 5 minutes
        animationSpeed: 1000,
        maximumEntries: 10,
        showTeamLogos: true,
        showScores: true,
        showTablePosition: true,
        colored: true,
        focus_on: [], // Array of team IDs to focus on
        mode: "upcoming" // Possible values: "live", "upcoming", "completed"
    },

    requiresVersion: "2.1.0",

    getStyles: function() {
        return ["MMM-NRL.css"];
    },

    start: function() {
        Log.info("Starting module: " + this.name);
        this.loaded = false;
        this.matches = [];
        this.standings = [];
        this.errorMessage = null;
        Log.info(this.name + " is starting with config:", JSON.stringify(this.config));
        this.scheduleUpdate();
    },

    getDom: function() {
        Log.info(this.name + ": Updating DOM");
        const wrapper = document.createElement("div");
        wrapper.className = "mmm-nrl";

        if (this.errorMessage) {
            Log.error(this.name + ": Display error message:", this.errorMessage);
            wrapper.innerHTML = this.errorMessage;
            wrapper.className = "dimmed light small";
            return wrapper;
        }

        if (!this.loaded) {
            Log.info(this.name + ": Module still loading");
            wrapper.innerHTML = "Loading NRL data...";
            wrapper.className = "dimmed light small";
            return wrapper;
        }

        // Create matches table
        if (this.matches && this.matches.length > 0) {
            Log.info(this.name + ": Creating table with " + this.matches.length + " matches");
            const matchesTable = this.createMatchesTable();
            wrapper.appendChild(matchesTable);
        } else {
            Log.info(this.name + ": No matches to display");
            wrapper.innerHTML = "No matches available";
            wrapper.className = "dimmed light small";
        }

        return wrapper;
    },

    createMatchesTable: function() {
        const table = document.createElement("table");
        table.className = "small";

        this.matches.forEach((match, index) => {
            Log.debug(this.name + ": Processing match " + index, JSON.stringify(match));
            const row = document.createElement("tr");
            row.className = "title bright";

            // Home team
            const homeCell = document.createElement("td");
            homeCell.className = "align-right";
            homeCell.innerHTML = match.homeTeam.name;
            
            // Score
            const scoreCell = document.createElement("td");
            scoreCell.className = "align-center";
            if (this.config.showScores && match.status === "COMPLETED") {
                scoreCell.innerHTML = match.homeTeam.score + " - " + match.awayTeam.score;
            } else {
                scoreCell.innerHTML = "vs";
            }

            // Away team
            const awayCell = document.createElement("td");
            awayCell.className = "align-left";
            awayCell.innerHTML = match.awayTeam.name;

            row.appendChild(homeCell);
            row.appendChild(scoreCell);
            row.appendChild(awayCell);
            table.appendChild(row);
        });

        return table;
    },

    scheduleUpdate: function() {
        const self = this;
        Log.info(this.name + ": Scheduling updates every " + this.config.updateInterval + "ms");
        setInterval(() => {
            self.updateData();
        }, this.config.updateInterval);
        
        self.updateData();
    },

    updateData: function() {
        Log.info(this.name + ": Requesting data update");
        this.sendSocketNotification("GET_NRL_DATA", this.config);
    },

    socketNotificationReceived: function(notification, payload) {
        Log.info(this.name + ": Received socket notification: " + notification);
        if (notification === "NRL_DATA") {
            this.loaded = true;
            this.matches = payload.matches;
            Log.info(this.name + ": Received " + this.matches.length + " matches");
            this.updateDom(this.config.animationSpeed);
        } else if (notification === "NRL_ERROR") {
            this.errorMessage = "Error loading NRL data";
            Log.error(this.name + ": Error loading data:", payload.error);
            this.updateDom(this.config.animationSpeed);
        }
    }
});