const express = require('express');
const router = express.Router();
const GuildConfig = require('../../models/GuildConfig');
const TempChannel = require('../../models/TempChannel');

// Middleware to ensure user is authenticated and is an admin of the guild
async function isAdmin(req, res, next) {
    if (!req.isAuthenticated()) return res.status(401).json({ error: 'Not authenticated' });
    
    const guildId = req.params.guildId;
    const client = req.app.get('discordClient');
    
    const guild = client.guilds.cache.get(guildId);
    if (!guild) return res.status(404).json({ error: 'Bot not in this guild' });

    const member = await guild.members.fetch(req.user.id).catch(() => null);
    if (!member || !member.permissions.has('Administrator')) {
        return res.status(403).json({ error: 'You are not an administrator in this guild' });
    }
    
    next();
}

// Get guilds the user shares with the bot where they have admin
router.get('/guilds', async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ error: 'Not authenticated' });
    
    const client = req.app.get('discordClient');
    const userGuilds = req.user.guilds || [];
    
    const adminGuilds = userGuilds.filter(g => {
        const permissions = BigInt(g.permissions);
        const adminPerm = BigInt(0x8); // ADMINISTRATOR permission
        return (permissions & adminPerm) === adminPerm && client.guilds.cache.has(g.id);
    });

    res.json(adminGuilds);
});

// Get config for a specific guild
router.get('/guild/:guildId/config', isAdmin, async (req, res) => {
    try {
        const config = await GuildConfig.findOne({ guildId: req.params.guildId });
        if (!config) return res.status(404).json({ error: 'Config not found' });
        res.json(config);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Update config for a specific guild
router.post('/guild/:guildId/config', isAdmin, async (req, res) => {
    try {
        const updatedConfig = await GuildConfig.findOneAndUpdate(
            { guildId: req.params.guildId },
            { $set: req.body },
            { new: true, upsert: true }
        );
        res.json(updatedConfig);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Get active temp channels for a guild
router.get('/guild/:guildId/channels', isAdmin, async (req, res) => {
    try {
        const channels = await TempChannel.find({ guildId: req.params.guildId });
        res.json(channels);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;