require('dotenv').config();
const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');

const commands = [];
const commandsPath = path.join(__dirname, 'src', 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(f => f.endsWith('.js'));

for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    if ('data' in command && 'execute' in command) {
        commands.push(command.data.toJSON());
    } else {
        console.log(`[WARNING] ${file} missing data/execute`);
    }
}

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
    try {
        console.log(`Registering ${commands.length} slash commands...`);

        // Guild-specific (instant update, good for dev)
        // const data = await rest.put(
        //     Routes.applicationGuildCommands(process.env.CLIENT_ID, 'YOUR_GUILD_ID'),
        //     { body: commands }
        // );

        // Global (takes up to 1 hour to propagate)
        const data = await rest.put(
            Routes.applicationCommands(process.env.CLIENT_ID),
            { body: commands }
        );

        console.log(`✅ Registered ${data.length} commands globally.`);
    } catch (error) {
        console.error('❌ Failed to register commands:', error);
    }
})();