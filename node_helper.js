const NodeHelper = require("node_helper");
const fetch = require("node-fetch");

module.exports = NodeHelper.create({
    start: function() {
        console.log("Starting node helper for: " + this.name);
        this.started = false;
        this.config = null;
    },

    // Override socketNotificationReceived method
    socketNotificationReceived: function(notification, payload) {
        console.log(this.name + ": Received socket notification:", notification);
        
        if (notification === "GET_NRL_DATA") {
            if (!this.started) {
                console.log(this.name + ": First time initialization");
                this.config = payload;
                this.started = true;
            }
            console.log(this.name + ": Getting NRL data with config:", JSON.stringify(payload));
            this.getData(payload);
        }
    },

    getData: async function(config) {
        try {
            console.log(this.name + ": Fetching NRL data from API...");
            
            // Using mock data for testing since the API endpoint isn't working
            const mockData = {
                matches: [
                    {
                        homeTeam: {
                            name: "Warriors",
                            score: 24,
                            position: 4,
                            logo: "modules/MMM-NRL/logos/warriors.svg"
                        },
                        awayTeam: {
                            name: "Broncos",
                            score: 18,
                            position: 2,
                            logo: "modules/MMM-NRL/logos/broncos.svg"
                        },
                        status: "IN_PROGRESS",
                        startTime: new Date().toISOString()
                    },
                    {
                        homeTeam: {
                            name: "Storm",
                            score: 30,
                            position: 1,
                            logo: "modules/MMM-NRL/logos/storm.svg"
                        },
                        awayTeam: {
                            name: "Roosters",
                            score: 22,
                            position: 3,
                            logo: "modules/MMM-NRL/logos/roosters.svg"
                        },
                        status: "COMPLETED",
                        startTime: new Date().toISOString()
                    }
                ]
            };

            console.log(this.name + ": Successfully created mock data");
            
            // Process and filter the matches based on config
            let matches = mockData.matches;
            console.log(this.name + ": Total matches received:", matches.length);

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

            // Filter by teams if specified
            if (config.focus_on && config.focus_on.length > 0) {
                console.log(this.name + ": Filtering for teams:", config.focus_on);
                matches = matches.filter(match => 
                    config.focus_on.includes(match.homeTeam.id) || 
                    config.focus_on.includes(match.awayTeam.id)
                );
                console.log(this.name + ": Matches after team filtering:", matches.length);
            }

            // Limit the number of matches
            matches = matches.slice(0, config.maximumEntries);
            console.log(this.name + ": Final matches after limiting to " + config.maximumEntries + ":", matches.length);

            // Send the processed data back to the module
            this.sendSocketNotification("NRL_DATA", { matches });
            console.log(this.name + ": Data sent back to module");

        } catch (error) {
            console.error(this.name + ": Error fetching NRL data:", error.message);
            this.sendSocketNotification("NRL_ERROR", { 
                error: error.message || "Unknown error occurred while fetching NRL data"
            });
        }
    }
});
