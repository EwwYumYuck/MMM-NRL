const NodeHelper = require("node_helper");
const fetch = require("node-fetch");
const moment = require("moment");

module.exports = NodeHelper.create({
    start: function() {
        this.config = null;
        this.updateInterval = null;
        this.live = false;
    },

    socketNotificationReceived: function(notification, payload) {
        if (notification === "SET_CONFIG") {
            this.config = payload;
            this.updateInterval = this.config.updateInterval;
            this.getData();
        }
    },

    getData: async function() {
        try {
            console.log(this.name + ": Fetching NRL data...");
            
            const response = await fetch("https://www.nrl.com/draw/data", {
                headers: {
                    "User-Agent": "Mozilla/5.0",
                    "Accept": "application/json"
                }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            const fixtures = data.fixtures || [];
            
            const matches = fixtures.map(fixture => this.formatMatch(fixture));
            
            // Sort matches by date
            matches.sort((a, b) => new Date(a.starttime) - new Date(b.starttime));

            const payload = {
                matches: matches,
                details: {
                    season: data.selectedSeasonId,
                    competition: "NRL",
                    lastUpdated: new Date().toISOString()
                }
            };

            this.sendSocketNotification("DATA", payload);
            
            // Schedule next update based on if there are live games
            const hasLiveGames = matches.some(match => match.matchState === "InProgress");
            const nextInterval = hasLiveGames ? this.config.updateIntervalLive : this.config.updateInterval;
            
            setTimeout(() => {
                this.getData();
            }, nextInterval);

        } catch (error) {
            console.error(this.name + ": Error fetching NRL data -", error);
            setTimeout(() => {
                this.getData();
            }, this.config.updateInterval);
        }
    },

    formatMatch: function(fixture) {
        const homeTeam = fixture.homeTeam;
        const awayTeam = fixture.awayTeam;
        const kickOffTime = moment(fixture.clock.kickOffTimeLong);

        // Function to format logo URL
        const formatLogoUrl = (team) => {
            if (!team.theme || !team.theme.key) return null;
            return `https://www.nrl.com/content/dam/nrl/club-logos/${team.theme.key}/badge.svg`;
        };

        return {
            id: `${homeTeam.teamId}-${awayTeam.teamId}-${kickOffTime.format("YYYYMMDD")}`,
            home: {
                name: homeTeam.nickName,
                score: homeTeam.score || 0,
                logo: formatLogoUrl(homeTeam)
            },
            away: {
                name: awayTeam.nickName,
                score: awayTeam.score || 0,
                logo: formatLogoUrl(awayTeam)
            },
            starttime: kickOffTime.toISOString(),
            venue: fixture.venue,
            status: this.getMatchStatus(fixture.matchState),
            round: fixture.roundTitle,
            live: fixture.matchState === "InProgress"
        };
    },

    getMatchStatus: function(matchState) {
        switch (matchState) {
            case "PreGame":
                return "UPCOMING";
            case "InProgress":
                return "LIVE";
            case "FullTime":
                return "FINISHED";
            default:
                return matchState.toUpperCase();
        }
    }
});
