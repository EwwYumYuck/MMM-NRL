module.exports = {
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
            mode: "live", // Possible values: "live", "upcoming", "completed"
        },

        requiresVersion: "2.1.0",

        start: function() {
            Log.info("Starting module: " + this.name);
            this.loaded = false;
            this.matches = [];
            this.standings = [];
            this.errorMessage = null;
            
            this.scheduleUpdate();
        },

        getDom: function() {
            const wrapper = document.createElement("div");
            wrapper.className = "mmm-nrl";

            if (this.errorMessage) {
                wrapper.innerHTML = this.errorMessage;
                wrapper.className = "dimmed light small";
                return wrapper;
            }

            if (!this.loaded) {
                wrapper.innerHTML = "Loading NRL data...";
                wrapper.className = "dimmed light small";
                return wrapper;
            }

            // Create matches table
            if (this.matches.length > 0) {
                const matchesTable = this.createMatchesTable();
                wrapper.appendChild(matchesTable);
            }

            return wrapper;
        },

        createMatchesTable: function() {
            const table = document.createElement("table");
            table.className = "small";

            this.matches.forEach((match) => {
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
            setInterval(() => {
                self.updateData();
            }, this.config.updateInterval);
            
            self.updateData();
        },

        updateData: function() {
            this.sendSocketNotification("GET_NRL_DATA", this.config);
        },

        socketNotificationReceived: function(notification, payload) {
            if (notification === "NRL_DATA") {
                this.loaded = true;
                this.matches = payload.matches;
                this.updateDom(this.config.animationSpeed);
            } else if (notification === "NRL_ERROR") {
                this.errorMessage = "Error loading NRL data";
                this.updateDom(this.config.animationSpeed);
            }
        }
    })
};