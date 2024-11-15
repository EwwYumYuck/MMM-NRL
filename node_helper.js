const NodeHelper = require("node_helper");
const fetch = require("node-fetch");

module.exports = NodeHelper.create({
    start: function() {
        console.log("Starting node helper for: " + this.name);
    },

    socketNotificationReceived: function(notification, payload) {
        console.log(this.name + ": Received socket notification:", notification);
        if (notification === "GET_NRL_DATA") {
            console.log(this.name + ": Getting NRL data with config:", JSON.stringify(payload));
            this.getData(payload);
        }
    },

    getData: async function(config) {
        try {
            console.log(this.name + ": Fetching NRL data from API...");
            // Using NRL's public API endpoint
            const response = await fetch("https://nrl.com/api/v2/matches", {
                headers: {
                    "Accept": "application/json",
                    "User-Agent": "MagicMirror/1.0"
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            console.log(this.name + ": Raw API response:", JSON.stringify(data, null, 2));
            
            // Process and filter the matches based on config
            let matches = data.matches || [];
            console.log(this.name + ": Total matches before filtering:", matches.length);
            
            if (config.focus_on && config.focus_on.length > 0) {
                console.log(this.name + ": Filtering for teams:", config.focus_on);
                matches = matches.filter(match => 
                    config.focus_on.includes(match.homeTeam.id) || 
                    config.focus_on.includes(match.awayTeam.id)
                );
                console.log(this.name + ": Matches after team filtering:", matches.length);
            }

            // Filter based on mode
            console.log(this.name + ": Filtering matches by mode:", config.mode);
            if (config.mode === "live") {
                matches = matches.filter(match => match.status === "IN_PROGRESS");
            } else if (config.mode === "upcoming") {
                matches = matches.filter(match => match.status === "SCHEDULED");
            } else if (config.mode === "completed") {
                matches = matches.filter(match => match.status === "COMPLETED");
            }
            console.log(this.name + ": Matches after status filtering:", matches.length);

            // Limit the number of matches
            matches = matches.slice(0, config.maximumEntries);
            console.log(this.name + ": Final matches after limiting to " + config.maximumEntries + ":", matches.length);
            console.log(this.name + ": Processed matches:", JSON.stringify(matches, null, 2));

            this.sendSocketNotification("NRL_DATA", { matches });
        } catch (error) {
            console.error(this.name + ": Error fetching NRL data:", error);
            this.sendSocketNotification("NRL_ERROR", { error: error.message });
        }
    }
});
