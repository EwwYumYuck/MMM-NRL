const NodeHelper = require("node_helper");
const fetch = require("node-fetch");
const moment = require("moment");

const COMPETITION_IDS = {
    "nrl":  111,
    "nrlw": 161,
    "soo":  116,
    "wsoo": 156
};

const TEAM_KEY_MAP = {
    "sea-eagles":      "seaeagles",
    "rabbitohs":       "rabbitohs",
    "broncos":         "broncos",
    "bulldogs":        "bulldogs",
    "cowboys":         "cowboys",
    "dragons":         "dragons",
    "eels":            "eels",
    "knights":         "knights",
    "panthers":        "panthers",
    "raiders":         "raiders",
    "roosters":        "roosters",
    "sharks":          "sharks",
    "storm":           "storm",
    "wests-tigers":    "tigers",
    "titans":          "titans",
    "warriors":        "warriors",
    "dolphins":        "dolphins",
    // State of Origin
    "blues":           "blues",
    "nsw-blues":       "blues",
    "new-south-wales": "blues",
    "nsw":             "blues",
    "maroons":         "maroons",
    "queensland":      "maroons",
    // Expansion teams — ready for 2027/2028 NRL entry
    "perth-bears":     "perth-bears",
    "png-chiefs":      "png-chiefs"
};

module.exports = NodeHelper.create({
    start: function() {
        this.config = null;
    },

    socketNotificationReceived: function(notification, payload) {
        if (notification === "SET_CONFIG") {
            this.config = payload;
            this.getData();
        }
    },

    getData: async function() {
        try {
            const competitions = this.config.competitions || ["nrl"];
            const allMatches = [];

            for (const comp of competitions) {
                const compKey = String(comp).toLowerCase();
                const compId = COMPETITION_IDS[compKey];

                if (!compId) {
                    console.warn(this.name + ": Unknown competition: " + comp);
                    continue;
                }

                try {
                    console.log(this.name + `: Fetching ${compKey.toUpperCase()} (id=${compId})...`);
                    const response = await fetch(`https://www.nrl.com/draw/data?competition=${compId}`, {
                        headers: {
                            "User-Agent": "Mozilla/5.0",
                            "Accept": "application/json"
                        }
                    });

                    if (!response.ok) throw new Error(`HTTP ${response.status}`);

                    const data = await response.json();
                    (data.fixtures || []).forEach(fixture => {
                        allMatches.push(this.formatMatch(fixture, compKey));
                    });

                } catch (compError) {
                    console.error(this.name + `: Error fetching ${comp} -`, compError.message);
                }
            }

            allMatches.sort((a, b) => new Date(a.starttime) - new Date(b.starttime));

            this.sendSocketNotification("DATA", {
                matches: allMatches,
                details: {
                    competitions: competitions,
                    lastUpdated: new Date().toISOString()
                }
            });

            const hasLiveGames = allMatches.some(m => m.status === "LIVE");
            const nextInterval = hasLiveGames
                ? this.config.updateIntervalLive
                : this.config.updateInterval;

            setTimeout(() => this.getData(), nextInterval);

        } catch (error) {
            console.error(this.name + ": Error -", error);
            this.sendSocketNotification("ERROR", error.message);
            setTimeout(() => this.getData(), this.config.updateInterval);
        }
    },

    formatMatch: function(fixture, competition) {
        const homeTeam = fixture.homeTeam;
        const awayTeam = fixture.awayTeam;
        const kickOffTime = moment(fixture.clock.kickOffTimeLong);

        const formatLogoUrl = (team) => {
            if (!team || !team.theme || !team.theme.key) return null;
            const localKey = TEAM_KEY_MAP[team.theme.key];
            if (!localKey) {
                console.warn(this.name + ": No logo mapping for team key: " + team.theme.key);
                return null;
            }
            return `modules/MMM-NRL/logos/${localKey}.svg`;
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
            competition: competition,
            live: fixture.matchState === "InProgress"
        };
    },

    getMatchStatus: function(matchState) {
        switch (matchState) {
            case "PreGame":
            case "Upcoming":
                return "UPCOMING";
            case "InProgress":
                return "LIVE";
            case "FullTime":
                return "FINISHED";
            default:
                return matchState ? matchState.toUpperCase() : "UNKNOWN";
        }
    }
});
