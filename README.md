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
    header: "MMM-NRL",
    position: "top_right",
    config: {
        updateInterval: 300000, // Update every 5 minutes
        animationSpeed: 1000,
        maximumEntries: 10,
        showTeamLogos: true,
        showScores: true,
        showTablePosition: true,
        colored: true,
        focus_on: [], // Array of team names to focus on specific teams
        mode: "all" // Possible values: "all", "live", "upcoming", "completed"
    }
}
```

### Configuration Options

| Option           | Description                                                                                    |
|-----------------|------------------------------------------------------------------------------------------------|
| updateInterval  | How often to fetch new data (in milliseconds). Default is 300000 (5 minutes)                   |
| animationSpeed  | Speed of the update animation (in milliseconds). Default is 1000                               |
| maximumEntries  | Maximum number of matches to display. Default is 10                                            |
| showTeamLogos   | Whether to show team logos. Default is true                                                    |
| showScores      | Whether to show match scores. Default is true                                                  |
| showTablePosition| Whether to show team positions in the league table. Default is true                           |
| colored         | Whether to show colored text. Default is true                                                  |
| focus_on        | Array of team names to focus on. Empty array shows all teams                                  |
| mode            | Display mode: "all", "live", "upcoming", or "completed". Default is "all"                      |

### Display Modes

- **all**: Shows all matches regardless of their status (default)
- **live**: Shows only matches currently in progress
- **upcoming**: Shows only scheduled matches that haven't started
- **completed**: Shows only finished matches

### Team Names for focus_on

You can focus on specific teams by adding their names to the `focus_on` array. For example:
```javascript
focus_on: ["Broncos", "Storm", "Raiders"]
```

Available team names:
- Broncos
- Bulldogs
- Cowboys
- Dragons
- Eels
- Knights
- Panthers
- Rabbitohs
- Raiders
- Roosters
- Sea Eagles
- Sharks
- Storm
- Tigers
- Titans
- Warriors
- Dolphins

## Screenshots

[Add screenshots here]

## Contributing

Feel free to submit issues and pull requests!

## License

This project is licensed under the MIT License.
