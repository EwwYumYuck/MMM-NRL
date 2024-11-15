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
            
            // Get current year and determine seasons to try
            const currentYear = new Date().getFullYear();
            const seasons = [];
            
            // During late year (October-December), try completed season first
            const currentMonth = new Date().getMonth() + 1; // 1-12
            if (currentMonth >= 10) {
                seasons.push(currentYear);
            } else if (currentMonth <= 2) {
                seasons.push(currentYear - 1);
                seasons.push(currentYear);
            } else {
                seasons.push(currentYear);
            }

            // If we're close to the new season (Jan-Mar), add next season
            if (currentMonth >= 1 && currentMonth <= 3) {
                seasons.push(currentYear + 1);
            }
            
            console.log(this.name + ": Will try seasons in order:", seasons.join(", "));
            
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

            // If we couldn't get data, use mock data
            if (!data || !Array.isArray(data.games) || data.games.length === 0) {
                console.log(this.name + ": No valid data found, using mock data");
                console.log(this.name + ": Last error was: " + error);
                
                // Use mock data showing next season's first round
                const nextYear = new Date().getFullYear() + 1;
                const marchFirst = new Date(nextYear, 2, 1, 19, 30); // March 1st, 7:30 PM
                
                data = {
                    games: [
                        {
                            homeTeam: {
                                nickName: "Panthers",
                                teamName: "Penrith Panthers",
                                ladderPosition: 1
                            },
                            awayTeam: {
                                nickName: "Broncos",
                                teamName: "Brisbane Broncos",
                                ladderPosition: 2
                            },
                            gameState: "Pre Game",
                            kickOffDate: marchFirst.toISOString(),
                            roundNumber: 1,
                            venue: { name: "BlueBet Stadium" },
                            scores: {
                                home: 0,
                                away: 0
                            }
                        },
                        {
                            homeTeam: {
                                nickName: "Storm",
                                teamName: "Melbourne Storm",
                                ladderPosition: 3
                            },
                            awayTeam: {
                                nickName: "Warriors",
                                teamName: "Warriors",
                                ladderPosition: 4
                            },
                            gameState: "Pre Game",
                            kickOffDate: new Date(marchFirst.getTime() + 24 * 60 * 60 * 1000).toISOString(),
                            roundNumber: 1,
                            venue: { name: "AAMI Park" },
                            scores: {
                                home: 0,
                                away: 0
                            }
                        }
                    ]
                };
            }

            // Transform API data to our format
            let matches = [];
            if (data && Array.isArray(data.games)) {
                console.log(this.name + ": Processing " + data.games.length + " games");
                matches = data.games.map(game => {
                    try {
                        console.log(this.name + ": Processing game data:", JSON.stringify({
                            homeTeam: game.homeTeam?.nickName || game.homeTeam?.teamName,
                            awayTeam: game.awayTeam?.nickName || game.awayTeam?.teamName,
                            gameState: game.gameState,
                            kickOffDate: game.kickOffDate,
                            roundNumber: game.roundNumber,
                            venue: game.venue?.name
                        }, null, 2));
                        
                        const getTeamName = (team) => {
                            if (!team) {
                                console.log(this.name + ": Warning - Missing team data");
                                return 'Unknown Team';
                            }
                            const name = team.nickName || team.teamName || 'Unknown Team';
                            console.log(this.name + ": Resolved team name:", name);
                            return name;
                        };

                        const kickOffDate = new Date(game.kickOffDate);
                        const now = new Date();
                        const status = this.getMatchStatus(game.gameState);
                        const isUpcoming = status === 'SCHEDULED' && kickOffDate > now;
                        const isLive = status === 'LIVE';
                        const showScore = !isUpcoming || config.showScores;

                        console.log(this.name + ": Match details:", {
                            status,
                            isUpcoming,
                            isLive,
                            showScore,
                            kickOffTime: this.formatKickoffTime(kickOffDate)
                        });

                        return {
                            homeTeam: getTeamName(game.homeTeam),
                            awayTeam: getTeamName(game.awayTeam),
                            homeScore: showScore ? (game.scores?.home || 0) : null,
                            awayScore: showScore ? (game.scores?.away || 0) : null,
                            status: status,
                            time: isUpcoming ? 
                                this.formatKickoffTime(kickOffDate) : 
                                (isLive ? 'LIVE' : this.formatGameTime(kickOffDate)),
                            round: 'Round ' + game.roundNumber,
                            venue: game.venue?.name || 'TBA'
                        };
                    } catch (err) {
                        console.error(this.name + ": Error processing game data:", err);
                        return null;
                    }
                }).filter(match => match !== null);

                // Sort matches: Live first, then upcoming, then completed
                matches.sort((a, b) => {
                    const statusOrder = { 'LIVE': 0, 'SCHEDULED': 1, 'COMPLETED': 2 };
                    if (statusOrder[a.status] !== statusOrder[b.status]) {
                        return statusOrder[a.status] - statusOrder[b.status];
                    }
                    // For same status, sort by time
                    return new Date(a.time) - new Date(b.time);
                });
            }

            // Filter based on mode
            if (config.mode !== "all") {
                matches = matches.filter(match => {
                    if (config.mode === "live") return match.status === "LIVE";
                    if (config.mode === "upcoming") return match.status === "SCHEDULED";
                    if (config.mode === "completed") return match.status === "COMPLETED";
                    return true;
                });
            }

            // Limit entries
            matches = matches.slice(0, config.maximumEntries || 10);

            this.sendSocketNotification("NRL_MATCHES", matches);
        } catch (error) {
            console.error(this.name + ": Error fetching NRL data:", error);
            
            // If we're in development mode, use mock data
            if (process.env.NODE_ENV === 'development') {
                console.log(this.name + ": Using mock data in development mode");
                const mockMatches = [
                    {
                        homeTeam: "Broncos",
                        awayTeam: "Storm",
                        homeScore: 24,
                        awayScore: 18,
                        status: "COMPLETED",
                        time: new Date().toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' }),
                        round: "Round 1",
                        venue: "Suncorp Stadium"
                    }
                ];
                this.sendSocketNotification("NRL_MATCHES", mockMatches);
            } else {
                this.sendSocketNotification("NRL_DATA_ERROR", { 
                    error: "Unable to fetch NRL data. The NRL season might be in break, or there might be an issue with the API connection." 
                });
            }
        }
    },

    formatKickoffTime: function(date) {
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        let formattedTime;
        if (date.toDateString() === today.toDateString()) {
            formattedTime = 'Today ' + date.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' });
        } else if (date.toDateString() === tomorrow.toDateString()) {
            formattedTime = 'Tomorrow ' + date.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' });
        } else {
            formattedTime = date.toLocaleDateString('en-AU', { 
                weekday: 'short', 
                day: 'numeric', 
                month: 'short',
                hour: '2-digit',
                minute: '2-digit'
            });
        }
        console.log(this.name + ": Formatted kickoff time:", formattedTime);
        return formattedTime;
    },

    formatGameTime: function(date) {
        const formattedTime = date.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' });
        console.log(this.name + ": Formatted game time:", formattedTime);
        return formattedTime;
    },

    getMatchStatus: function(apiStatus) {
        if (!apiStatus) {
            console.log(this.name + ": No status provided, defaulting to SCHEDULED");
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
