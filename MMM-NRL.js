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
        timeFormat: "dd, HH:mm"
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
        wrapper.className = "MMM-NRL table";

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

            // Time/Status column
            const timeCell = document.createElement("td");
            timeCell.className = "date " + match.status.toLowerCase();
            if (match.status === "LIVE") {
                timeCell.innerHTML = "LIVE";
                timeCell.classList.add("bright");
            } else if (match.status === "COMPLETED") {
                timeCell.innerHTML = "FT";
                timeCell.classList.add("dimmed");
            } else {
                timeCell.innerHTML = match.time;
            }
            row.appendChild(timeCell);

            // Home team name
            const homeNameCell = document.createElement("td");
            homeNameCell.className = "firstTeam firstTeamName name";
            homeNameCell.innerHTML = match.homeTeam;
            row.appendChild(homeNameCell);

            // Home team logo
            const homeLogoCell = document.createElement("td");
            homeLogoCell.className = "firstTeam firstTeamLogo logo";
            if (this.config.showTeamLogos) {
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
            vsCell.innerHTML = ":";
            row.appendChild(vsCell);

            // Away team score
            const awayScoreCell = document.createElement("td");
            awayScoreCell.className = "secondTeam secondTeamScore score";
            awayScoreCell.innerHTML = match.awayScore !== null ? match.awayScore : "-";
            row.appendChild(awayScoreCell);

            // Away team logo
            const awayLogoCell = document.createElement("td");
            awayLogoCell.className = "secondTeam secondTeamLogo logo";
            if (this.config.showTeamLogos) {
                const awayLogo = document.createElement("img");
                awayLogo.src = this.file("logos/" + match.awayTeam.toLowerCase().replace(/[^a-z0-9]/g, '') + ".png");
                awayLogo.className = "team-logo" + (!this.config.colored ? " uncolored" : "");
                awayLogoCell.appendChild(awayLogo);
            }
            row.appendChild(awayLogoCell);

            // Away team name
            const awayNameCell = document.createElement("td");
            awayNameCell.className = "secondTeam secondTeamName name";
            awayNameCell.innerHTML = match.awayTeam;
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

        wrapper.appendChild(table);
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