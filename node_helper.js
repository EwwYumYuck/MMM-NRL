const NodeHelper = require("node_helper");
const fetch = require("node-fetch");

module.exports = NodeHelper.create({
    start: function() {
        console.log("Starting node helper for: " + this.name);
    },

    socketNotificationReceived: function(notification, payload) {
        if (notification === "GET_NRL_DATA") {
            this.getData(payload);
        }
    },

    getData: async function(config) {
        try {
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
            
            // Process and filter the matches based on config
            let matches = data.matches || [];
            
            if (config.focus_on && config.focus_on.length > 0) {
                matches = matches.filter(match => 
                    config.focus_on.includes(match.homeTeam.id) || 
                    config.focus_on.includes(match.awayTeam.id)
                );
            }

            // Filter based on mode
            if (config.mode === "live") {
                matches = matches.filter(match => match.status === "IN_PROGRESS");
            } else if (config.mode === "upcoming") {
                matches = matches.filter(match => match.status === "SCHEDULED");
            } else if (config.mode === "completed") {
                matches = matches.filter(match => match.status === "COMPLETED");
            }

            // Limit the number of matches
            matches = matches.slice(0, config.maximumEntries);

            this.sendSocketNotification("NRL_DATA", { matches });
        } catch (error) {
            console.error("Error fetching NRL data:", error);
            this.sendSocketNotification("NRL_ERROR", { error: error.message });
        }
    }
});
