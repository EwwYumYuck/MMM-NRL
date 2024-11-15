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
            
            // Using the NRL API endpoint with better season handling
            const SEASON = new Date().getFullYear();
            const API_URLS = [
                `https://www.nrl.com/draw/data?competition=111&season=${SEASON}`,
                `https://www.nrl.com/draw/data?competition=111&season=${SEASON - 1}`,
                `https://www.nrl.com/api/v1/draws/nrl?competition=111&season=${SEASON}`
            ];

            let data = null;
            let response = null;
            let error = null;

            // Try each API endpoint until we get a successful response
            for (const url of API_URLS) {
                try {
                    console.log(this.name + ": Trying API endpoint:", url);
                    response = await fetch(url, {
                        headers: {
                            'Accept': 'application/json',
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
                            'Referer': 'https://www.nrl.com/draw/',
                            'Origin': 'https://www.nrl.com'
                        }
                    });

                    if (response.ok) {
                        data = await response.json();
                        console.log(this.name + ": Successfully fetched data from API:", url);
                        break;
                    } else {
                        console.log(this.name + `: API endpoint ${url} returned status: ${response.status}`);
                    }
                } catch (err) {
                    error = err;
                    console.log(this.name + `: Error with API endpoint ${url}:`, err.message);
                }
            }

            if (!data) {
                console.log(this.name + ": All API endpoints failed, using fallback data");
                // Use mock data during off-season or when API is unavailable
                data = {
                    fixtures: [{
                        homeTeam: {
                            nickname: "Broncos",
                            name: "Brisbane Broncos"
                        },
                        awayTeam: {
                            nickname: "Storm",
                            name: "Melbourne Storm"
                        },
                        status: "UPCOMING",
                        kickOffTimeLong: new Date(new Date().getTime() + 24 * 60 * 60 * 1000).toISOString(), // tomorrow
                        roundNumber: "1",
                        venue: { name: "Suncorp Stadium" }
                    }]
                };
            }

            console.log(this.name + ": API Response Structure:", JSON.stringify(data, null, 2));

            // Transform API data to our format
            let matches = [];
            if (data && Array.isArray(data.fixtures)) {
                console.log(this.name + ": Processing " + data.fixtures.length + " fixtures");
                matches = data.fixtures.map(match => {
                    try {
                        console.log(this.name + ": Processing match data:", JSON.stringify(match, null, 2));
                        
                        const getTeamName = (team) => {
                            if (!team) return 'Unknown Team';
                            const name = team.nickname || team.shortName || team.name || 'Unknown Team';
                            console.log(this.name + ": Resolved team name:", name);
                            return name;
                        };

                        const getTeamLogo = (team) => {
                            const name = getTeamName(team);
                            const logoPath = `modules/MMM-NRL/logos/${name.toLowerCase().replace(/[^a-z0-9]/g, '')}.svg`;
                            console.log(this.name + ": Generated logo path:", logoPath);
                            return logoPath;
                        };

                        return {
                            homeTeam: {
                                name: getTeamName(match.homeTeam),
                                score: match.homeTeamScore || match.homeScore || 0,
                                position: match.homeTeamLadderPosition || null,
                                logo: getTeamLogo(match.homeTeam)
                            },
                            awayTeam: {
                                name: getTeamName(match.awayTeam),
                                score: match.awayTeamScore || match.awayScore || 0,
                                position: match.awayTeamLadderPosition || null,
                                logo: getTeamLogo(match.awayTeam)
                            },
                            status: this.getMatchStatus(match.status),
                            startTime: match.kickOffTimeLong || match.kickOffTime || new Date().toISOString(),
                            round: `Round ${match.roundNumber || '?'}`,
                            venue: match.venue?.name || match.venueName || 'TBA'
                        };
                    } catch (err) {
                        console.error(this.name + ": Error processing match data:", err);
                        return null;
                    }
                }).filter(match => match !== null); // Remove any matches that failed to process
            } else if (data && Array.isArray(data.draws)) {
                // Alternative API structure
                console.log(this.name + ": Processing " + data.draws.length + " draws");
                matches = data.draws.flatMap(draw => 
                    (draw.matches || []).map(match => {
                        try {
                            return {
                                homeTeam: {
                                    name: match.homeTeam?.name || 'Unknown Team',
                                    score: match.homeScore || 0,
                                    position: null,
                                    logo: `modules/MMM-NRL/logos/${(match.homeTeam?.name || 'unknown').toLowerCase().replace(/[^a-z0-9]/g, '')}.svg`
                                },
                                awayTeam: {
                                    name: match.awayTeam?.name || 'Unknown Team',
                                    score: match.awayScore || 0,
                                    position: null,
                                    logo: `modules/MMM-NRL/logos/${(match.awayTeam?.name || 'unknown').toLowerCase().replace(/[^a-z0-9]/g, '')}.svg`
                                },
                                status: this.getMatchStatus(match.status),
                                startTime: match.kickoffTime || new Date().toISOString(),
                                round: draw.roundTitle || 'Unknown Round',
                                venue: match.venue || 'TBA'
                            };
                        } catch (err) {
                            console.error(this.name + ": Error processing match from draw:", err);
                            return null;
                        }
                    }).filter(m => m !== null)
                );
            } else {
                console.log(this.name + ": No fixtures or draws found in API response");
                if (data) {
                    console.log(this.name + ": Available data keys:", Object.keys(data));
                }
            }

            if (matches.length === 0 && process.env.NODE_ENV === 'development') {
                console.log(this.name + ": No matches found, using mock data in development mode");
                matches = [{
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
                }];
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
