Module.register("MMM-NRL", {
    defaults: {
        updateInterval: 300000, // 5 minutes
        animationSpeed: 1000,
        maximumEntries: 10,
        showTeamLogos: true,
        showScores: true,
        showTablePosition: true,
        colored: true,
        focus_on: [],
        mode: "all",
        showFooter: true,
        timeFormat: "dd, HH:mm",
        showSeasonProgress: true  // New option to show season progress
    },

    getScripts: function() {
        return ["moment.js"];
    },

    getStyles: function() {
        return ["MMM-NRL.css", "font-awesome.css"];
    },

    start: function() {
        Log.info("Starting module: " + this.name);
        this.loaded = false;
        this.error = false;
        this.matches = [];

        this.sendSocketNotification("GET_NRL_DATA", this.config);
        this.scheduleUpdate();
    },

    getDom: function() {
        const wrapper = document.createElement("div");
        wrapper.className = "MMM-NRL";

        if (!this.loaded) {
            wrapper.innerHTML = "Loading...";
            wrapper.className = "dimmed light small";
            return wrapper;
        }

        if (!this.matches || this.matches.length === 0) {
            wrapper.innerHTML = "No matches available";
            wrapper.className = "dimmed light small";
            return wrapper;
        }

        const container = document.createElement("div");
        container.className = "container";

        // Add season progress bar if enabled and we have a match
        if (this.config.showSeasonProgress && this.matches[0]) {
            const seasonProgress = document.createElement("div");
            seasonProgress.className = "season-progress";
            
            // Determine season state from first match
            const isOffSeason = this.matches[0].homeTeam === "OFF SEASON";
            const isFinals = this.matches[0].roundNumber === "GF" || 
                           (typeof this.matches[0].roundNumber === 'string' && 
                            this.matches[0].roundNumber.includes("Finals"));

            const progressBar = document.createElement("div");
            progressBar.className = "progress-bar";

            const progressText = document.createElement("div");
            progressText.className = "progress-text";

            if (isOffSeason) {
                const nextYear = new Date().getFullYear() + 1;
                progressText.innerHTML = `NRL ${nextYear} Season starts in March`;
                progressBar.style.width = "0%";
                progressBar.classList.add("off-season");
            } else if (isFinals) {
                progressText.innerHTML = "NRL Finals Series";
                progressBar.style.width = "100%";
                progressBar.classList.add("finals");
            } else {
                // Regular season - calculate progress (27 rounds)
                const currentRound = parseInt(this.matches[0].roundNumber) || 0;
                const progress = Math.min((currentRound / 27) * 100, 100);
                progressText.innerHTML = `Round ${currentRound}/27`;
                progressBar.style.width = progress + "%";
                progressBar.classList.add("in-season");
            }

            const progressBarContainer = document.createElement("div");
            progressBarContainer.className = "progress-bar-container";
            progressBarContainer.appendChild(progressBar);

            seasonProgress.appendChild(progressText);
            seasonProgress.appendChild(progressBarContainer);
            container.appendChild(seasonProgress);
        }

        const table = document.createElement("table");
        table.className = "table";

        // Create header row
        const headerRow = document.createElement("tr");
        headerRow.className = "tableHeader";

        const timeHeader = document.createElement("th");
        timeHeader.className = "dateHeader date";
        timeHeader.innerHTML = "TIME";

        const homeHeader = document.createElement("th");
        homeHeader.className = "firstTeamHeader";
        homeHeader.innerHTML = "HOME";
        homeHeader.setAttribute("colspan", "3");

        const vsHeader = document.createElement("th");
        vsHeader.className = "vsHeader";
        vsHeader.innerHTML = " ";

        const awayHeader = document.createElement("th");
        awayHeader.className = "secondTeamHeader";
        awayHeader.innerHTML = "AWAY";
        awayHeader.setAttribute("colspan", "3");

        headerRow.appendChild(timeHeader);
        headerRow.appendChild(homeHeader);
        headerRow.appendChild(vsHeader);
        headerRow.appendChild(awayHeader);
        table.appendChild(headerRow);

        // Create match rows
        this.matches.forEach((match) => {
            const row = document.createElement("tr");
            row.className = match.status.toLowerCase();

            // Time/Status column
            const timeCell = document.createElement("td");
            timeCell.className = "date " + match.status.toLowerCase();
            
            // Enhanced status display
            if (match.status === "LIVE") {
                timeCell.innerHTML = "LIVE";
                timeCell.classList.add("bright", "blink");
            } else if (match.status === "COMPLETED") {
                timeCell.innerHTML = "FT";
                timeCell.classList.add("dimmed");
            } else if (match.homeTeam === "OFF SEASON") {
                timeCell.innerHTML = "OFF SEASON";
                timeCell.classList.add("off-season");
            } else if (match.roundNumber === "GF") {
                timeCell.innerHTML = "GRAND FINAL";
                timeCell.classList.add("finals", "bright");
            } else {
                timeCell.innerHTML = match.time;
            }
            row.appendChild(timeCell);

            // Home team name with ladder position
            const homeNameCell = document.createElement("td");
            homeNameCell.className = "firstTeam firstTeamName name";
            let homeText = match.homeTeam;
            if (this.config.showTablePosition && match.homeLadderPosition) {
                homeText = `[${match.homeLadderPosition}] ${match.homeTeam}`;
            }
            homeNameCell.innerHTML = homeText;
            row.appendChild(homeNameCell);

            // Home team logo
            const homeLogoCell = document.createElement("td");
            homeLogoCell.className = "firstTeam firstTeamLogo logo";
            if (this.config.showTeamLogos && match.homeTeam !== "OFF SEASON" && match.homeTeam !== "TBD") {
                const homeLogo = document.createElement("img");
                homeLogo.src = this.file("logos/" + match.homeTeam.toLowerCase().replace(/[^a-z0-9]/g, '') + ".png");
                homeLogo.className = "team-logo" + (!this.config.colored ? " uncolored" : "");
                homeLogoCell.appendChild(homeLogo);
            }
            row.appendChild(homeLogoCell);

            // Home team score
            const homeScoreCell = document.createElement("td");
            homeScoreCell.className = "firstTeam firstTeamScore score";
            homeScoreCell.innerHTML = match.homeScore !== null ? match.homeScore : "-";
            row.appendChild(homeScoreCell);

            // VS divider
            const vsCell = document.createElement("td");
            vsCell.className = "vs";
            vsCell.innerHTML = match.status === "LIVE" ? "•" : ":";
            row.appendChild(vsCell);

            // Away team score
            const awayScoreCell = document.createElement("td");
            awayScoreCell.className = "secondTeam secondTeamScore score";
            awayScoreCell.innerHTML = match.awayScore !== null ? match.awayScore : "-";
            row.appendChild(awayScoreCell);

            // Away team logo
            const awayLogoCell = document.createElement("td");
            awayLogoCell.className = "secondTeam secondTeamLogo logo";
            if (this.config.showTeamLogos && match.awayTeam !== "2024" && match.awayTeam !== "TBD") {
                const awayLogo = document.createElement("img");
                awayLogo.src = this.file("logos/" + match.awayTeam.toLowerCase().replace(/[^a-z0-9]/g, '') + ".png");
                awayLogo.className = "team-logo" + (!this.config.colored ? " uncolored" : "");
                awayLogoCell.appendChild(awayLogo);
            }
            row.appendChild(awayLogoCell);

            // Away team name with ladder position
            const awayNameCell = document.createElement("td");
            awayNameCell.className = "secondTeam secondTeamName name";
            let awayText = match.awayTeam;
            if (this.config.showTablePosition && match.awayLadderPosition) {
                awayText = `${match.awayTeam} [${match.awayLadderPosition}]`;
            }
            awayNameCell.innerHTML = awayText;
            row.appendChild(awayNameCell);

            // Highlight focused teams
            if (this.config.focus_on && this.config.focus_on.length > 0) {
                if (this.config.focus_on.includes(match.homeTeam)) {
                    homeNameCell.classList.add("bright");
                }
                if (this.config.focus_on.includes(match.awayTeam)) {
                    awayNameCell.classList.add("bright");
                }
            }

            table.appendChild(row);
        });

        // Add footer if enabled
        if (this.config.showFooter) {
            const footerRow = document.createElement("tr");
            footerRow.className = "footerRow";

            const footer = document.createElement("td");
            footer.className = "footer";
            footer.setAttribute("colspan", "8");
            footer.innerHTML = "Updated: " + moment().format("dd, DD.MM.YYYY, HH:mm[h]");
            footerRow.appendChild(footer);

            table.appendChild(footerRow);
        }

        container.appendChild(table);
        wrapper.appendChild(container);

        return wrapper;
    },

    scheduleUpdate: function() {
        const self = this;
        setInterval(function() {
            self.sendSocketNotification("GET_NRL_DATA", self.config);
        }, this.config.updateInterval);
    },

    socketNotificationReceived: function(notification, payload) {
        if (notification === "NRL_MATCHES") {
            this.matches = payload;
            this.loaded = true;
            this.updateDom(this.config.animationSpeed);
        }
    }
});