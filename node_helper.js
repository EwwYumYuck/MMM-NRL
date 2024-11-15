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
            console.log(this.name + ": API Response Structure:", JSON.stringify(data, null, 2));

            // Transform API data to our format
            let matches = [];
            if (data && Array.isArray(data.fixtures)) {
                console.log(this.name + ": Processing " + data.fixtures.length + " fixtures");
                matches = data.fixtures.map(match => {
                    try {
                        console.log(this.name + ": Processing match data:", JSON.stringify(match, null, 2));
                        
                        const getTeamName = (team) => {
                            if (!team) {
                                console.log(this.name + ": Team data is missing");
                                return 'Unknown Team';
                            }
                            const name = team.shortName || team.name || team.nickName || 'Unknown Team';
                            console.log(this.name + ": Resolved team name:", name);
                            return name;
                        };

                        const getTeamLogo = (team) => {
                            if (!team) {
                                console.log(this.name + ": Team data is missing for logo");
                                return 'modules/MMM-NRL/logos/default.svg';
                            }
                            try {
                                const teamName = getTeamName(team);
                                const logoPath = `modules/MMM-NRL/logos/${teamName.toLowerCase().replace(/[^a-z0-9]/g, '')}.svg`;
                                console.log(this.name + ": Generated logo path:", logoPath);
                                return logoPath;
                            } catch (err) {
                                console.error(this.name + ": Error generating logo path:", err);
                                return 'modules/MMM-NRL/logos/default.svg';
                            }
                        };

                        const matchData = {
                            homeTeam: {
                                name: getTeamName(match.homeTeam),
                                score: match.homeTeam?.score || 0,
                                position: match.homeTeam?.position || null,
                                logo: getTeamLogo(match.homeTeam)
                            },
                            awayTeam: {
                                name: getTeamName(match.awayTeam),
                                score: match.awayTeam?.score || 0,
                                position: match.awayTeam?.position || null,
                                logo: getTeamLogo(match.awayTeam)
                            },
                            status: this.getMatchStatus(match.status),
                            startTime: match.kickOffTime || new Date().toISOString(),
                            round: match.roundNumber || 'Unknown Round',
                            venue: match.venue?.name || 'TBA'
                        };

                        console.log(this.name + ": Successfully processed match:", JSON.stringify(matchData, null, 2));
                        return matchData;
                    } catch (err) {
                        console.error(this.name + ": Error processing match data:", err);
                        console.error(this.name + ": Problematic match data:", JSON.stringify(match, null, 2));
                        return null;
                    }
                }).filter(match => match !== null); // Remove any matches that failed to process
            } else {
                console.log(this.name + ": No fixtures found in API response");
                if (data) {
                    console.log(this.name + ": Available data keys:", Object.keys(data));
                }
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
        if (!apiStatus) {
            console.log(this.name + ": No status provided");
            return 'UNKNOWN';
        }
        
        // Map NRL API status to our internal status
        const statusMap = {
            'Pre Game': 'SCHEDULED',
            'In Progress': 'IN_PROGRESS',
            'Full Time': 'COMPLETED',
            'Postponed': 'SCHEDULED',
            'Cancelled': 'CANCELLED',
            'Final': 'COMPLETED',
            'Half Time': 'IN_PROGRESS',
            'Post Game': 'COMPLETED'
        };

        const mappedStatus = statusMap[apiStatus] || 'UNKNOWN';
        console.log(this.name + `: Mapping status '${apiStatus}' to '${mappedStatus}'`);
        return mappedStatus;
    }
});
