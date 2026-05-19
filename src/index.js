require('dotenv').config();
const { Client, GatewayIntentBits, Collection, Partials } = require('discord.js');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildPresences,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ],
    partials: [Partials.Channel, Partials.GuildMember]
});

client.commands = new Collection();
client.cooldowns = new Map();
client.tempVCCache = new Map();

// ─── Load Commands ──────────────────────────────────────────
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(f => f.endsWith('.js'));

for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    if ('data' in command && 'execute' in command) {
        client.commands.set(command.data.name, command);
    } else {
        console.log(`[WARNING] ${file} is missing required properties.`);
    }
}

// ─── Load Events ────────────────────────────────────────────
const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter(f => f.endsWith('.js'));

for (const file of eventFiles) {
    const filePath = path.join(eventsPath, file);
    const event = require(filePath);
    if (event.once) {
        client.once(event.name, (...args) => event.execute(...args, client));
    } else {
        client.on(event.name, (...args) => event.execute(...args, client));
    }
}

// ─── Connect MongoDB ────────────────────────────────────────
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('✅ Connected to MongoDB'))
    .catch(err => console.error('❌ MongoDB connection error:', err));

mongoose.connection.on('error', err => console.error('MongoDB error:', err));
mongoose.connection.on('disconnected', () => console.log('⚠️ MongoDB disconnected'));

// ─── Activity Rename Interval ───────────────────────────────
const { renameBasedOnActivity } = require('./utils/channelManager');
setInterval(() => {
    renameBasedOnActivity(client);
}, parseInt(process.env.ACTIVITY_RENAME_INTERVAL) || 60000);

// ─── Login ──────────────────────────────────────────────────
client.login(process.env.DISCORD_TOKEN)
    .then(() => console.log('🤖 Bot logging in...'))
    .catch(err => console.error('❌ Login failed:', err));

// ─── Start Dashboard (optional) ─────────────────────────────
if (process.env.NODE_ENV !== 'bot-only') {
    try {
        const { createDashboard } = require('./dashboard/server');
        createDashboard(client);
    } catch (err) {
        console.log('ℹ️ Dashboard not started (optional feature)');
    }
}

// ─── Graceful Shutdown ──────────────────────────────────────
process.on('SIGINT', async () => {
    console.log('\n🛑 Shutting down gracefully...');
    client.destroy();
    await mongoose.connection.close();
    process.exit(0);
});

module.exports = client;