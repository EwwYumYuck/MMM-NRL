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
            
            // Get current year and try both current and next year during transition periods
            const currentYear = new Date().getFullYear();
            const seasons = [currentYear];
            
            // During off-season (October-February), also try next year
            const currentMonth = new Date().getMonth() + 1; // 1-12
            if (currentMonth >= 10 || currentMonth <= 2) {
                seasons.push(currentYear + 1);
            }
            
            let data = null;
            let error = null;
            
            // Try each season until we get data
            for (const season of seasons) {
                try {
                    const API_URL = `https://nrl.com/api/v2/game/list?offset=0&limit=50&competitionId=111&season=${season}`;
                    
                    console.log(this.name + ": Trying API endpoint for season " + season + ":", API_URL);
                    const response = await fetch(API_URL, {
                        headers: {
                            'Accept': 'application/json',
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
                            'Referer': 'https://www.nrl.com/draw/',
                            'Origin': 'https://www.nrl.com'
                        }
                    });

                    if (!response.ok) {
                        error = `HTTP error! status: ${response.status} for season ${season}`;
                        console.log(this.name + ": " + error);
                        continue;
                    }

                    data = await response.json();
                    if (data && Array.isArray(data.games) && data.games.length > 0) {
                        console.log(this.name + `: Successfully fetched data from API for season ${season}`);
                        break;
                    } else {
                        error = `No games found in API response for season ${season}`;
                        console.log(this.name + ": " + error);
                    }
                } catch (err) {
                    error = `Error fetching season ${season}: ${err.message}`;
                    console.log(this.name + ": " + error);
                }
            }

            // If we couldn't get data from any season, use fallback data
            if (!data || !Array.isArray(data.games) || data.games.length === 0) {
                console.log(this.name + ": No valid data found for any season, using fallback data");
                console.log(this.name + ": Last error was: " + error);
                
                // Use mock data during off-season or when API is unavailable
                data = {
                    games: [{
                        homeTeam: {
                            nickName: "Broncos",
                            teamName: "Brisbane Broncos",
                            ladderPosition: 4
                        },
                        awayTeam: {
                            nickName: "Storm",
                            teamName: "Melbourne Storm",
                            ladderPosition: 2
                        },
                        gameState: "Pre Game",
                        kickOffDate: new Date(new Date().getTime() + 24 * 60 * 60 * 1000).toISOString(),
                        roundNumber: 1,
                        venue: { name: "Suncorp Stadium" },
                        scores: {
                            home: 0,
                            away: 0
                        }
                    }]
                };
            }

            // Transform API data to our format
            let matches = [];
            if (data && Array.isArray(data.games)) {
                console.log(this.name + ": Processing " + data.games.length + " games");
                matches = data.games.map(game => {
                    try {
                        console.log(this.name + ": Processing game data:", JSON.stringify(game, null, 2));
                        
                        const getTeamName = (team) => {
                            if (!team) return 'Unknown Team';
                            const name = team.nickName || team.teamName || 'Unknown Team';
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
                                name: getTeamName(game.homeTeam),
                                score: game.scores?.home || 0,
                                position: game.homeTeam?.ladderPosition || null,
                                logo: getTeamLogo(game.homeTeam)
                            },
                            awayTeam: {
                                name: getTeamName(game.awayTeam),
                                score: game.scores?.away || 0,
                                position: game.awayTeam?.ladderPosition || null,
                                logo: getTeamLogo(game.awayTeam)
                            },
                            status: this.getMatchStatus(game.gameState),
                            startTime: game.kickOffDate,
                            round: game.roundNumber,
                            venue: game.venue?.name || 'TBA'
                        };
                    } catch (err) {
                        console.error(this.name + ": Error processing game data:", err);
                        return null;
                    }
                }).filter(match => match !== null);
            }

            console.log(this.name + ": Total matches processed:", matches.length);

            // Filter based on mode
            console.log(this.name + ": Filtering matches by mode:", config.mode);
            if (config.mode !== "all") {
                if (config.mode === "live") {
                    matches = matches.filter(match => match.status === "LIVE");
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
            return 'SCHEDULED';
        }
        
        // Map NRL API status to our internal status
        const statusMap = {
            'Pre Game': 'SCHEDULED',
            'In Progress': 'LIVE',
            'Full Time': 'COMPLETED',
            'Postponed': 'SCHEDULED',
            'Cancelled': 'CANCELLED',
            'Final': 'COMPLETED',
            'Half Time': 'LIVE',
            'Post Game': 'COMPLETED'
        };

        const mappedStatus = statusMap[apiStatus] || 'SCHEDULED';
        console.log(this.name + `: Mapping status '${apiStatus}' to '${mappedStatus}'`);
        return mappedStatus;
    }
});
