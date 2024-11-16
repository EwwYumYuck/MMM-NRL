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
            this.getMatches(payload);
        }
    },

    async getMatches(config) {
        try {
            let data = null;
            let error = null;
            
            // Get current year and determine seasons to try
            const currentYear = new Date().getFullYear();
            const currentMonth = new Date().getMonth() + 1; // 1-12
            
            // Define NRL season months and finals rounds
            const SEASON_START_MONTH = 3;  // March
            const SEASON_END_MONTH = 9;    // September (regular season)
            const FINALS_START_MONTH = 9;  // September (finals start)
            const FINALS_END_MONTH = 10;   // October
            
            // Determine if we're in season, finals, or off-season
            let seasonState = "OFF_SEASON";
            if (currentMonth >= SEASON_START_MONTH && currentMonth < FINALS_START_MONTH) {
                seasonState = "IN_SEASON";
            } else if ((currentMonth === FINALS_START_MONTH && new Date().getDate() >= 1) || 
                       (currentMonth === FINALS_END_MONTH && new Date().getDate() <= 15)) {
                seasonState = "FINALS";
            }

            console.log(this.name + `: Current season state: ${seasonState}`);

            // Calculate the date range for fetching matches
            const now = new Date();
            const pastDate = new Date(now);
            pastDate.setDate(pastDate.getDate() - 14); // Get matches from the last 14 days
            const futureDate = new Date(now);
            
            // If we're in off-season, look further ahead for next season's matches
            if (seasonState === "OFF_SEASON") {
                // If we're between November and February, look ahead to March
                if (currentMonth >= 11 || currentMonth <= 2) {
                    futureDate.setFullYear(currentYear + 1);
                    futureDate.setMonth(2); // March
                    futureDate.setDate(31); // End of March
                }
            } else {
                futureDate.setDate(futureDate.getDate() + 7); // Just next 7 days for regular season
            }

            // Format dates for API
            const fromDate = pastDate.toISOString().split('T')[0];
            const toDate = futureDate.toISOString().split('T')[0];

            try {
                // Try current season first
                let apiUrl = `https://nrl.com/draw/data?from=${fromDate}&to=${toDate}&competition=111&season=${currentYear}`;
                console.log(this.name + `: Fetching matches from ${apiUrl}`);

                let response = await fetch(apiUrl, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                    }
                });

                data = await response.json();

                // If we're in off-season and no data found, try next season
                if (seasonState === "OFF_SEASON" && (!data || !data.games || data.games.length === 0)) {
                    apiUrl = `https://nrl.com/draw/data?from=${fromDate}&to=${toDate}&competition=111&season=${currentYear + 1}`;
                    console.log(this.name + `: Trying next season: ${apiUrl}`);
                    
                    response = await fetch(apiUrl, {
                        headers: {
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                        }
                    });

                    if (response.ok) {
                        const nextSeasonData = await response.json();
                        if (nextSeasonData && nextSeasonData.games && nextSeasonData.games.length > 0) {
                            data = nextSeasonData;
                        }
                    }
                }

                console.log(this.name + `: Successfully fetched ${data?.games?.length || 0} matches`);
            } catch (err) {
                console.error(this.name + ": Error fetching matches:", err);
                error = err.message;
            }

            // If we couldn't get data, use appropriate mock data based on season state
            if (!data || !Array.isArray(data.games) || data.games.length === 0) {
                console.log(this.name + ": No valid data found, using mock data");
                
                // Generate mock data that includes both completed and upcoming matches
                const games = [];
                
                if (seasonState === "OFF_SEASON") {
                    // Add some completed matches from previous season
                    for (let i = 0; i < 2; i++) {
                        const pastDate = new Date();
                        pastDate.setDate(pastDate.getDate() - (i + 1));
                        
                        games.push({
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
                            gameState: "Full Time",
                            kickOffDate: pastDate.toISOString(),
                            roundNumber: "Grand Final",
                            venue: { name: "Accor Stadium" },
                            scores: {
                                home: Math.floor(Math.random() * 30) + 10,
                                away: Math.floor(Math.random() * 30) + 10
                            }
                        });
                    }

                    // Add upcoming matches for next season
                    const nextYear = currentYear + 1;
                    const roundNames = ["Round 1", "Round 1", "Round 2", "Round 2"];
                    const teams = [
                        { nick: "Panthers", name: "Penrith Panthers", pos: 1 },
                        { nick: "Broncos", name: "Brisbane Broncos", pos: 2 },
                        { nick: "Rabbitohs", name: "South Sydney Rabbitohs", pos: 3 },
                        { nick: "Roosters", name: "Sydney Roosters", pos: 4 },
                        { nick: "Storm", name: "Melbourne Storm", pos: 5 },
                        { nick: "Cowboys", name: "North Queensland Cowboys", pos: 6 },
                        { nick: "Sharks", name: "Cronulla-Sutherland Sharks", pos: 7 },
                        { nick: "Raiders", name: "Canberra Raiders", pos: 8 }
                    ];

                    for (let i = 0; i < 4; i++) {
                        const futureDate = new Date(nextYear, 2, 1 + Math.floor(i/2) * 7); // March 1st, then March 8th
                        futureDate.setHours(19 + (i % 2) * 2, 30, 0, 0); // 7:30 PM or 9:30 PM

                        games.push({
                            homeTeam: {
                                nickName: teams[i*2].nick,
                                teamName: teams[i*2].name,
                                ladderPosition: teams[i*2].pos
                            },
                            awayTeam: {
                                nickName: teams[i*2+1].nick,
                                teamName: teams[i*2+1].name,
                                ladderPosition: teams[i*2+1].pos
                            },
                            gameState: "Scheduled",
                            kickOffDate: futureDate.toISOString(),
                            roundNumber: roundNames[i],
                            venue: i % 2 === 0 ? "Accor Stadium" : "Suncorp Stadium",
                            scores: {
                                home: null,
                                away: null
                            }
                        });
                    }
                } else {
                    // Add completed matches (including finals if relevant)
                    for (let i = 0; i < 3; i++) {
                        const pastDate = new Date();
                        pastDate.setDate(pastDate.getDate() - (i + 1));
                        
                        let roundInfo = {
                            number: seasonState === "FINALS" ? "Qualifying Final" : `Round ${Math.floor(Math.random() * 5) + 20}`,
                            venue: "Accor Stadium"
                        };
                        
                        if (seasonState === "FINALS") {
                            roundInfo = {
                                number: ["Qualifying Final", "Semi Final", "Preliminary Final"][i] || "Qualifying Final",
                                venue: i % 2 === 0 ? "Accor Stadium" : "Suncorp Stadium"
                            };
                        }
                        
                        games.push({
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
                            gameState: "Full Time",
                            kickOffDate: pastDate.toISOString(),
                            roundNumber: roundInfo.number,
                            venue: { name: roundInfo.venue },
                            scores: {
                                home: Math.floor(Math.random() * 30) + 10,
                                away: Math.floor(Math.random() * 30) + 10
                            }
                        });
                    }
                    
                    // Add upcoming matches
                    for (let i = 0; i < 2; i++) {
                        const futureDate = new Date();
                        futureDate.setDate(futureDate.getDate() + (i + 1));
                        
                        let roundInfo = {
                            number: seasonState === "FINALS" ? "Grand Final" : `Round ${Math.floor(Math.random() * 5) + 20}`,
                            venue: "Accor Stadium"
                        };
                        
                        if (seasonState === "FINALS") {
                            roundInfo = {
                                number: i === 0 ? "Preliminary Final" : "Grand Final",
                                venue: "Accor Stadium"
                            };
                        }
                        
                        games.push({
                            homeTeam: {
                                nickName: "Rabbitohs",
                                teamName: "South Sydney Rabbitohs",
                                ladderPosition: 3
                            },
                            awayTeam: {
                                nickName: "Roosters",
                                teamName: "Sydney Roosters",
                                ladderPosition: 4
                            },
                            gameState: "Scheduled",
                            kickOffDate: futureDate.toISOString(),
                            roundNumber: roundInfo.number,
                            venue: { name: roundInfo.venue },
                            scores: {
                                home: null,
                                away: null
                            }
                        });
                    }
                }
                
                data = { games: games };
            }

            // Transform API data to our format
            let matches = [];
            if (data && Array.isArray(data.games)) {
                data.games.forEach(game => {
                    const match = {
                        homeTeam: getTeamName(game.homeTeam),
                        awayTeam: getTeamName(game.awayTeam),
                        homeLadderPosition: game.homeTeam ? game.homeTeam.ladderPosition : null,
                        awayLadderPosition: game.awayTeam ? game.awayTeam.ladderPosition : null,
                        homeScore: game.scores ? game.scores.home : null,
                        awayScore: game.scores ? game.scores.away : null,
                        status: this.getMatchStatus(game.gameState),
                        time: new Date(game.kickOffDate),
                        venue: game.venue ? game.venue.name : "TBD",
                        roundNumber: game.roundNumber,
                        season: new Date(game.kickOffDate).getFullYear()
                    };

                    // Format the time based on match status
                    if (match.status === "SCHEDULED") {
                        match.time = this.formatKickoffTime(match.time);
                    } else if (match.status === "COMPLETED") {
                        match.time = "FT";
                    }

                    matches.push(match);
                });

                // Sort matches: Completed finals first, then live matches, then upcoming matches
                matches.sort((a, b) => {
                    const statusOrder = { 'COMPLETED': 0, 'LIVE': 1, 'SCHEDULED': 2 };
                    const aIsFinals = this.isFinalsMatch(a.roundNumber);
                    const bIsFinals = this.isFinalsMatch(b.roundNumber);
                    
                    // If we're in off-season, prioritize next season's matches
                    if (seasonState === "OFF_SEASON") {
                        if (a.season !== b.season) {
                            return b.season - a.season; // Show next season's matches first
                        }
                    }
                    
                    // Finals matches take precedence within same season
                    if (aIsFinals !== bIsFinals) {
                        return aIsFinals ? -1 : 1;
                    }
                    
                    // Then sort by status
                    if (statusOrder[a.status] !== statusOrder[b.status]) {
                        return statusOrder[a.status] - statusOrder[b.status];
                    }
                    
                    // For same status, sort by time (most recent first for completed matches)
                    if (a.status === 'COMPLETED') {
                        return new Date(b.time) - new Date(a.time);
                    }
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
    },

    isFinalsMatch: function(roundNumber) {
        const finalsRounds = ["Qualifying Final", "Semi Final", "Preliminary Final", "Grand Final"];
        return finalsRounds.includes(roundNumber);
    }
});

function getTeamName(team) {
    if (!team) {
        console.log(this.name + ": Warning - Missing team data");
        return 'Unknown Team';
    }
    const name = team.nickName || team.teamName || 'Unknown Team';
    console.log(this.name + ": Resolved team name:", name);
    return name;
}
