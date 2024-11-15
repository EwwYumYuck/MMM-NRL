#!/bin/bash

# Create logos directory if it doesn't exist
mkdir -p ../logos

# Team logo URLs from NRL CDN
declare -A team_logos=(
    ["broncos"]="https://www.broncos.com.au/remote.axd/nrl.com-operations-horizon.a.bigcontent.io/v1/content/dam/nrl/teams/broncos.svg"
    ["bulldogs"]="https://www.bulldogs.com.au/remote.axd/nrl.com-operations-horizon.a.bigcontent.io/v1/content/dam/nrl/teams/bulldogs.svg"
    ["cowboys"]="https://www.cowboys.com.au/remote.axd/nrl.com-operations-horizon.a.bigcontent.io/v1/content/dam/nrl/teams/cowboys.svg"
    ["dragons"]="https://www.dragons.com.au/remote.axd/nrl.com-operations-horizon.a.bigcontent.io/v1/content/dam/nrl/teams/dragons.svg"
    ["eels"]="https://www.eels.com.au/remote.axd/nrl.com-operations-horizon.a.bigcontent.io/v1/content/dam/nrl/teams/eels.svg"
    ["knights"]="https://www.newcastleknights.com.au/remote.axd/nrl.com-operations-horizon.a.bigcontent.io/v1/content/dam/nrl/teams/knights.svg"
    ["panthers"]="https://www.penrithpanthers.com.au/remote.axd/nrl.com-operations-horizon.a.bigcontent.io/v1/content/dam/nrl/teams/panthers.svg"
    ["rabbitohs"]="https://www.rabbitohs.com.au/remote.axd/nrl.com-operations-horizon.a.bigcontent.io/v1/content/dam/nrl/teams/rabbitohs.svg"
    ["raiders"]="https://www.raiders.com.au/remote.axd/nrl.com-operations-horizon.a.bigcontent.io/v1/content/dam/nrl/teams/raiders.svg"
    ["roosters"]="https://www.roosters.com.au/remote.axd/nrl.com-operations-horizon.a.bigcontent.io/v1/content/dam/nrl/teams/roosters.svg"
    ["seaeagles"]="https://www.seaeagles.com.au/remote.axd/nrl.com-operations-horizon.a.bigcontent.io/v1/content/dam/nrl/teams/seaeagles.svg"
    ["sharks"]="https://www.sharks.com.au/remote.axd/nrl.com-operations-horizon.a.bigcontent.io/v1/content/dam/nrl/teams/sharks.svg"
    ["storm"]="https://www.melbournestorm.com.au/remote.axd/nrl.com-operations-horizon.a.bigcontent.io/v1/content/dam/nrl/teams/storm.svg"
    ["tigers"]="https://www.weststigers.com.au/remote.axd/nrl.com-operations-horizon.a.bigcontent.io/v1/content/dam/nrl/teams/tigers.svg"
    ["titans"]="https://www.titans.com.au/remote.axd/nrl.com-operations-horizon.a.bigcontent.io/v1/content/dam/nrl/teams/titans.svg"
    ["warriors"]="https://www.warriors.kiwi/remote.axd/nrl.com-operations-horizon.a.bigcontent.io/v1/content/dam/nrl/teams/warriors.svg"
    ["dolphins"]="https://www.dolphins.com.au/remote.axd/nrl.com-operations-horizon.a.bigcontent.io/v1/content/dam/nrl/teams/dolphins.svg"
)

# Download each logo
for team in "${!team_logos[@]}"; do
    echo "Downloading $team logo..."
    curl -L -o "../logos/$team.svg" "${team_logos[$team]}" \
        -H "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36" \
        -H "Accept: image/svg+xml" \
        -H "Referer: https://www.nrl.com/"
done

# Create a default logo
cat > "../logos/default.svg" << 'EOF'
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 25 25">
  <circle cx="12.5" cy="12.5" r="11" fill="none" stroke="currentColor" stroke-width="1.5"/>
  <text x="12.5" y="16" font-size="12" text-anchor="middle" fill="currentColor">?</text>
</svg>
EOF

echo "Done downloading logos!"
