# MMM-NRL

A MagicMirror² module for displaying NRL (National Rugby League) match scores and information.

## Installation

1. Navigate to your MagicMirror's modules folder:
```bash
cd ~/MagicMirror/modules
```

2. Clone this repository:
```bash
git clone https://github.com/yourusername/MMM-NRL.git
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
    position: "top_right",
    config: {
        updateInterval: 300000, // Update every 5 minutes
        animationSpeed: 1000,
        maximumEntries: 10,
        showTeamLogos: true,
        showScores: true,
        showTablePosition: true,
        colored: true,
        focus_on: [], // Array of team IDs to focus on specific teams
        mode: "live" // Possible values: "live", "upcoming", "completed"
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
| focus_on        | Array of team IDs to focus on. Empty array shows all teams                                    |
| mode            | Display mode: "live", "upcoming", or "completed". Default is "live"                            |

## Screenshots

[Add screenshots here]

## Contributing

Feel free to submit issues and pull requests!

## License

This project is licensed under the MIT License.
