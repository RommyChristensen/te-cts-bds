const fs = require('fs');
const path = require('path');
const UserModel = require('./models/userModel');

// Parse birthdate from format like "19-Apr" to proper date
function parseBirthdate(birthdateStr) {
    const monthMap = {
        'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04', 'May': '05', 'Jun': '06',
        'Jul': '07', 'Aug': '08', 'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12'
    };
    
    const parts = birthdateStr.split('-');
    if (parts.length === 2) {
        const day = parts[0].padStart(2, '0');
        const month = monthMap[parts[1]];
        if (month) {
            // Default to year 2000 for now, can be adjusted
            return `2000-${month}-${day}`;
        }
    }
    return null;
}

// Generate username from initial and player_id
function generateUsername(initial, playerId) {
    return `${initial.toLowerCase()}${playerId}`;
}

async function importPlayers() {
    try {
        // Read the players data
        const filePath = path.join(__dirname, 'users-bds.txt');
        const fileContent = fs.readFileSync(filePath, 'utf8');
        const players = JSON.parse(fileContent);
        
        console.log(`Found ${players.length} players to import`);
        
        let successCount = 0;
        let errorCount = 0;
        
        for (const player of players) {
            try {
                const userData = {
                    username: generateUsername(player.Initial, player['Player ID']),
                    nama: player.Name,
                    tim: `Team ${player.Team}`,
                    eliminated: false,
                    name: player.Name,
                    initial: player.Initial,
                    gender: player.Gender,
                    bds_team: player['BDS Team'],
                    birthdate: parseBirthdate(player['Birthday Date']),
                    player_id: player['Player ID']
                };
                
                // Check if user already exists
                const existingUser = await UserModel.getByUsername(userData.username);
                if (existingUser) {
                    console.log(`⚠️  User ${userData.username} already exists, updating...`);
                    await UserModel.update(userData.username, userData);
                } else {
                    console.log(`✅ Creating user: ${userData.username}`);
                    await UserModel.create(userData);
                }
                
                successCount++;
                
            } catch (error) {
                console.error(`❌ Error importing player ${player.Name}:`, error.message);
                errorCount++;
            }
        }
        
        console.log(`\n🎉 Import completed!`);
        console.log(`✅ Success: ${successCount} players`);
        console.log(`❌ Errors: ${errorCount} players`);
        
    } catch (error) {
        console.error('❌ Error reading or parsing players file:', error);
    }
}

// Run the import
importPlayers().then(() => {
    console.log('Import process finished');
    process.exit(0);
}).catch(error => {
    console.error('Import process failed:', error);
    process.exit(1);
});
