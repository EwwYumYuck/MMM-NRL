Module.register("MMM-NRL", {
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

    requiresVersion: "2.1.0",

    getScripts: function() {
        return ["moment.js"];
    },

    getStyles: function() {
        return ["MMM-NRL.css"];
    },

    start: function() {
        Log.info("Starting module: " + this.name);
        
        this.loaded = false;
        this.matches = [];
        this.errorMessage = null;

        if (["live", "upcoming", "completed"].indexOf(this.config.mode) === -1) {
            Log.error(this.name + ": Invalid mode specified. Defaulting to 'live'");
            this.config.mode = "live";
        }

        Log.info(this.name + ": Configuration loaded:", JSON.stringify(this.config));
        
        this.scheduleUpdate();
    },

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

        Log.debug(this.name + ": Creating table with " + this.matches.length + " matches");
        const table = this.createMatchesTable();
        wrapper.appendChild(table);

        return wrapper;
    },

    createMatchesTable: function() {
        const table = document.createElement("table");
        table.className = "small";

        this.matches.forEach((match, index) => {
            Log.debug(this.name + ": Processing match " + index, match);
            const row = document.createElement("tr");
            row.className = "title bright";

            const homeCell = document.createElement("td");
            homeCell.className = "align-right";
            homeCell.innerHTML = match.homeTeam.name;
            
            const scoreCell = document.createElement("td");
            scoreCell.className = "align-center";
            if (this.config.showScores && match.status === "COMPLETED") {
                scoreCell.innerHTML = match.homeTeam.score + " - " + match.awayTeam.score;
            } else {
                scoreCell.innerHTML = "vs";
            }

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
        Log.info(this.name + ": Scheduling updates every " + this.config.updateInterval + "ms");
        const self = this;
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