# MMM-NRL

A MagicMirror² module for displaying NRL (National Rugby League) match scores and information.

## Installation

1. Navigate to your MagicMirror's modules folder:
```bash
cd ~/MagicMirror/modules
```

2. Clone this repository:
```bash
git clone https://github.com/EwwYumYuck/MMM-NRL
```

3. Install dependencies:
```bash
cd MMM-NRL
npm install
```

## Configuration

Add the following configuration to your `config/config.js` file:

```javascript
{
    module: "MMM-NRL",
    header: "MMM-NRL",  // Optional: Set to null to hide header
    position: "top_right",
    config: {
        updateInterval: 300000,        // 5 minutes for regular updates
        updateIntervalLive: 60000,     // 1 minute for live games
        animationSpeed: 1000,
        showLogos: true,
        showScores: true,
        showVenue: true,
        colored: true,                 // false for grayscale logos
        maximumEntries: 10,
        focus_on: false,              // Set to team name to focus on specific team
        mode: "all"                   // "all", "live", "upcoming", or "completed"
    }
}
```

### Configuration Options

| Option             | Description                                                                                    | Default |
|--------------------|------------------------------------------------------------------------------------------------|---------|
| header             | Text to display in the header. Set to null to hide header                                      | "MMM-NRL" |
| updateInterval     | How often to fetch new data for regular updates (in milliseconds)                              | 300000 (5 minutes) |
| updateIntervalLive | How often to fetch new data during live games (in milliseconds)                                | 60000 (1 minute) |
| animationSpeed     | Speed of the update animation (in milliseconds)                                                | 1000 |
| showLogos         | Whether to show team logos                                                                     | true |
| showScores        | Whether to show match scores                                                                   | true |
| showVenue         | Whether to show match venue                                                                    | true |
| colored           | Whether to show colored logos (false for grayscale)                                            | true |
| maximumEntries    | Maximum number of matches to display                                                           | 10 |
| focus_on          | Team name to focus on (e.g., "Storm", "Broncos"). Set to false to show all teams              | false |
| mode              | Display mode: "all", "live", "upcoming", or "completed"                                        | "all" |

## Features

- Live match scores and updates
- Team logos (colored or grayscale)
- Match venues and round information
- Configurable update intervals (faster updates for live matches)
- Filter matches by team or status
- Clean and modern design

## Screenshots

[Add screenshots here]

## Updating

To update the module to the latest version:

```bash
cd ~/MagicMirror/modules/MMM-NRL
git pull
npm install
```

## Contributing

Feel free to submit issues and pull requests!

## License

This project is licensed under the MIT License - see the LICENSE file for details.
