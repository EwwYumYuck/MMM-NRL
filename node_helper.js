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
            
            // Using the correct NRL API endpoint
            const API_URL = "https://www.nrl.com/draw/data";
            const response = await fetch(API_URL, {
                headers: {
                    'Accept': 'application/json',
                    'User-Agent': 'Mozilla/5.0 (compatible; MagicMirror/1.0; +https://magicmirror.builders)'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            console.log(this.name + ": Successfully fetched data from NRL API");

            // Transform API data to our format
            let matches = [];
            if (data && Array.isArray(data.fixtures)) {
                matches = data.fixtures.map(match => ({
                    homeTeam: {
                        name: match.homeTeam.shortName || match.homeTeam.name,
                        score: match.homeTeam.score,
                        position: match.homeTeam.position,
                        logo: `modules/MMM-NRL/logos/${(match.homeTeam.shortName || match.homeTeam.name).toLowerCase().replace(/\s+/g, '')}.svg`
                    },
                    awayTeam: {
                        name: match.awayTeam.shortName || match.awayTeam.name,
                        score: match.awayTeam.score,
                        position: match.awayTeam.position,
                        logo: `modules/MMM-NRL/logos/${(match.awayTeam.shortName || match.awayTeam.name).toLowerCase().replace(/\s+/g, '')}.svg`
                    },
                    status: this.getMatchStatus(match.status),
                    startTime: match.kickOffTime,
                    round: match.roundNumber,
                    venue: match.venue ? match.venue.name : 'TBA'
                }));
            }

            console.log(this.name + ": Total matches received:", matches.length);

            // Filter based on mode
            console.log(this.name + ": Filtering matches by mode:", config.mode);
            if (config.mode !== "all") {
                if (config.mode === "live") {
                    matches = matches.filter(match => match.status === "IN_PROGRESS");
                } else if (config.mode === "upcoming") {
                    matches = matches.filter(match => match.status === "SCHEDULED");
                } else if (config.mode === "completed") {
                    matches = matches.filter(match => match.status === "COMPLETED");
                }
                console.log(this.name + ": Matches after status filtering:", matches.length);
            }

            // Filter by teams if specified
            if (config.focus_on && config.focus_on.length > 0) {
                console.log(this.name + ": Filtering for teams:", config.focus_on);
                matches = matches.filter(match => 
                    config.focus_on.includes(match.homeTeam.name) || 
                    config.focus_on.includes(match.awayTeam.name)
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
            console.error(this.name + ": Error fetching NRL data:", error);
            
            // If we're in development mode, use mock data
            if (process.env.NODE_ENV === 'development') {
                console.log(this.name + ": Using mock data in development mode");
                const mockMatches = [
                    {
                        homeTeam: {
                            name: "Broncos",
                            score: 24,
                            position: 4,
                            logo: "modules/MMM-NRL/logos/broncos.svg"
                        },
                        awayTeam: {
                            name: "Storm",
                            score: 18,
                            position: 2,
                            logo: "modules/MMM-NRL/logos/storm.svg"
                        },
                        status: "COMPLETED",
                        startTime: new Date().toISOString(),
                        round: "Round 1",
                        venue: "Suncorp Stadium"
                    }
                ];
                this.sendSocketNotification("NRL_DATA", { matches: mockMatches });
            } else {
                this.sendSocketNotification("NRL_DATA_ERROR", { 
                    error: "Unable to fetch NRL data. The NRL season might be in break, or there might be an issue with the API connection." 
                });
            }
        }
    },

    getMatchStatus: function(apiStatus) {
        // Map NRL API status to our internal status
        const statusMap = {
            'Pre Game': 'SCHEDULED',
            'In Progress': 'IN_PROGRESS',
            'Full Time': 'COMPLETED',
            'Postponed': 'SCHEDULED',
            'Cancelled': 'CANCELLED'
        };
        return statusMap[apiStatus] || 'UNKNOWN';
    }
});
