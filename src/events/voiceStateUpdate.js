const TempChannel = require('../models/TempChannel');
const GuildConfig = require('../models/GuildConfig');
const UserSettings = require('../models/UserSettings');
const { createTempVC, deleteTempVC, sendControlPanel } = require('../utils/channelManager');
const { buildEmbed } = require('../utils/embeds');

module.exports = {
    name: 'voiceStateUpdate',
    async execute(oldState, newState, client) {
        const guild = newState.guild || oldState.guild;

        // ─── User joined a voice channel ─────────────────────
        if (!oldState.channelId && newState.channelId) {
            await handleChannelJoin(newState, client);
        }
        // ─── User left a voice channel ───────────────────────
        else if (oldState.channelId && !newState.channelId) {
            await handleChannelLeave(oldState, client);
        }
        // ─── User moved between channels ─────────────────────
        else if (oldState.channelId && newState.channelId && oldState.channelId !== newState.channelId) {
            await handleChannelLeave(oldState, client);
            await handleChannelJoin(newState, client);
        }
    }
};

async function handleChannelJoin(voiceState, client) {
    const { channel, member, guild } = voiceState;
    if (!channel || !member || member.user.bot) return;

    const config = await GuildConfig.findOne({ guildId: guild.id });
    if (!config) return;

    // ─── Check if joining a "Create VC" channel ──────────────
    const createChannelEntry = config.createChannels.find(c => c.channelId === channel.id);
    if (createChannelEntry) {
        await processTempVCCreation(voiceState, client, config, createChannelEntry);
        return;
    }

    // ─── Check if joining a locked/temp VC ───────────────────
    const tempChannel = await TempChannel.findOne({ channelId: channel.id });
    if (!tempChannel) return;

    // Check if user is blocked
    if (tempChannel.blockedUsers.includes(member.id)) {
        // Move user back or disconnect
        await member.voice.disconnect('Blocked from this VC').catch(() => {});
        try {
            await member.send({
                embeds: [buildEmbed('error', 'You are blocked from that voice channel.')]
            }).catch(() => {});
        } catch {}
        return;
    }

    // Check if VC is locked and user is not permitted
    if (tempChannel.isLocked && tempChannel.ownerId !== member.id && !tempChannel.permittedUsers.includes(member.id)) {
        // Check guest access
        const guestEntry = tempChannel.guestAccess.find(g => g.userId === member.id);
        if (guestEntry && guestEntry.expiresAt > new Date()) {
            // Allow guest access
        } else {
            // Move to waiting room or disconnect
            if (config.waitingRoomEnabled && config.waitingRoomChannelId) {
                const waitChannel = guild.channels.cache.get(config.waitingRoomChannelId);
                if (waitChannel) {
                    await member.voice.setChannel(waitChannelChannel).catch(() => {});
                    // Add to waiting list
                    await TempChannel.updateOne(
                        { channelId: channel.id },
                        { $addToSet: { waitingUsers: { userId: member.id, requestedAt: new Date() } } }
                    );
                    // Notify owner
                    await notifyOwnerOfWaitlist(client, tempChannel, member, guild);
                    return;
                }
            }
            await member.voice.disconnect('VC is locked').catch(() => {});
            try {
                await member.send({
                    embeds: [buildEmbed('error', `That voice channel is locked. Use \`/vc request\` to ask the owner for access.`)]
                }).catch(() => {});
            } catch {}
            return;
        }
    }

    // Check password
    if (tempChannel.password && tempChannel.ownerId !== member.id && !tempChannel.permittedUsers.includes(member.id)) {
        await member.voice.disconnect('Password protected').catch(() => {});
        try {
            await member.send({
                embeds: [buildEmbed('error', `That voice channel is password protected. Use \`/vc password <password>\` to gain access.`)]
            }).catch(() => {});
        } catch {}
        return;
    }

    // Mute check
    if (tempChannel.mutedUsers.includes(member.id)) {
        await member.voice.setMute(true).catch(() => {});
    }

    // Update control panel
    await sendControlPanel(client, tempChannel, guild);
}

async function handleChannelLeave(voiceState, client) {
    const { channel, guild } = voiceState;
    if (!channel) return;

    const tempChannel = await TempChannel.findOne({ channelId: channel.id });
    if (!tempChannel) return;

    // Clean expired guest access
    await TempChannel.updateOne(
        { channelId: channel.id },
        { $pull: { guestAccess: { expiresAt: { $lte: new Date() } } } }
    );

    // Remove from waiting list if they were waiting
    await TempChannel.updateOne(
        { channelId: channel.id },
        { $pull: { waitingUsers: { userId: voiceState.member?.id } } }
    );

    // Unmute user if they were muted in this VC
    if (tempChannel.mutedUsers.includes(voiceState.member?.id)) {
        // They left, so server mute will be handled when they rejoin any channel
    }

    // Check if channel is now empty
    const currentChannel = guild.channels.cache.get(channel.id);
    if (!currentChannel) {
        await TempChannel.deleteOne({ channelId: channel.id });
        client.tempVCCache.delete(channel.id);
        return;
    }

    if (currentChannel.members.size === 0) {
        const config = await GuildConfig.findOne({ guildId: guild.id });
        const delay = config?.deleteDelay || 30;

        setTimeout(async () => {
            const ch = guild.channels.cache.get(channel.id);
            if (!ch) {
                await TempChannel.deleteOne({ channelId: channel.id }).catch(() => {});
                client.tempVCCache.delete(channel.id);
                return;
            }
            if (ch.members.size === 0) {
                await deleteTempVC(client, tempChannel, guild);
            }
        }, delay * 1000);
    } else {
        // Channel still has members - update control panel
        await sendControlPanel(client, tempChannel, guild);
    }
}

async function processTempVCCreation(voiceState, client, config, createChannelEntry) {
    const { member, guild } = voiceState;

    // ─── Check blacklist ─────────────────────────────────────
    if (config.blacklist.includes(member.id)) {
        await member.voice.disconnect('You are blacklisted').catch(() => {});
        return;
    }

    // Check role blacklist
    const memberRoles = member.roles.cache.map(r => r.id);
    if (config.blacklistRoles.some(r => memberRoles.includes(r))) {
        await member.voice.disconnect('Your role is blacklisted').catch(() => {});
        return;
    }

    // ─── Check cooldown ──────────────────────────────────────
    const cooldownKey = `${guild.id}-${member.id}`;
    const now = Date.now();
    const cooldownAmount = config.cooldown || 30000;
    const lastUsed = client.cooldowns.get(cooldownKey);

    if (lastUsed && (now - lastUsed) < cooldownAmount) {
        const remaining = Math.ceil((cooldownAmount - (now - lastUsed)) / 1000);
        await member.voice.disconnect().catch(() => {});
        try {
            await member.send({
                embeds: [buildEmbed('warning', `Cooldown active! Wait **${remaining}s** before creating another VC.`)]
            }).catch(() => {});
        } catch {}
        return;
    }

    client.cooldowns.set(cooldownKey, now);

    // ─── Check max channels ──────────────────────────────────
    const userChannelCount = await TempChannel.countDocuments({
        guildId: guild.id,
        ownerId: member.id
    });
    const maxChannels = config.maxChannelsPerUser || 3;

    if (userChannelCount >= maxChannels) {
        await member.voice.disconnect().catch(() => {});
        try {
            await member.send({
                embeds: [buildEmbed('error', `You already have **${maxChannels}** active VCs. Delete one first.`)]
            }).catch(() => {});
        } catch {}
        return;
    }

    // ─── Determine category and naming ───────────────────────
    let categoryId = createChannelEntry.categoryId;
    let namingStyle = createChannelEntry.namingStyle;
    let customName = createChannelEntry.customName;

    // Check role mappings
    for (const mapping of config.roleMappings) {
        if (memberRoles.includes(mapping.roleId)) {
            categoryId = mapping.categoryId;
            namingStyle = mapping.namingStyle || namingStyle;
            break;
        }
    }

    // ─── Generate channel name ───────────────────────────────
    const channelName = await generateChannelName(namingStyle, member, guild, categoryId, customName);

    // ─── Get user preferences ────────────────────────────────
    const userSettings = await UserSettings.findOne({ userId: member.id });
    const prefs = userSettings?.preferences || {};

    // ─── Create the temp VC ──────────────────────────────────
    try {
        const result = await createTempVC(client, {
            guild,
            ownerId: member.id,
            channelName,
            categoryId,
            bitrate: prefs.defaultBitrate || config.defaultBitrate || 64000,
            limit: prefs.defaultLimit || config.defaultLimit || 0,
            isLocked: prefs.defaultLocked || false,
            isHidden: prefs.defaultHidden || false,
            createTextChannel: createChannelEntry.createTextChannel
        });

        // Move user to new channel
        await member.voice.setChannel(result.voiceChannel).catch(() => {});

        // Update user stats
        await UserSettings.findOneAndUpdate(
            { userId: member.id },
            { $inc: { totalVCCreated: 1 } },
            { upsert: true }
        );

        // Send control panel
        await sendControlPanel(client, result.tempChannel, guild);

        // Log
        await logEvent(client, config, guild, 'vc_create', {
            user: member.user,
            channelName,
            channelId: result.voiceChannel.id
        });

    } catch (err) {
        console.error('Temp VC creation error:', err);
        try {
            await member.send({
                embeds: [buildEmbed('error', 'Failed to create your voice channel. Please try again.')]
            }).catch(() => {});
        } catch {}
    }
}

async function generateChannelName(style, member, guild, categoryId, customName) {
    switch (style) {
        case 'owner':
            return `🔊 ${member.displayName}'s Room`;

        case 'numbered': {
            const existingCount = await TempChannel.countDocuments({
                guildId: guild.id,
                categoryId: categoryId || { $exists: false }
            });
            return `🔊 Voice #${existingCount + 1}`;
        }

        case 'activity': {
            const activity = member.presence?.activities?.find(a => a.type === 0);
            if (activity) return `🎮 ${activity.name} Squad`;
            return `🔊 ${member.displayName}'s Room`;
        }

        case 'custom':
            return customName || `🔊 ${member.displayName}'s Room`;

        default:
            return `🔊 ${member.displayName}'s Room`;
    }
}

async function notifyOwnerOfWaitlist(client, tempChannel, requestingMember, guild) {
    try {
        const owner = await guild.members.fetch(tempChannel.ownerId).catch(() => null);
        if (!owner) return;

        const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`vc:wait:accept:${tempChannel.channelId}:${requestingMember.id}`)
                .setLabel('✅ Accept')
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId(`vc:wait:reject:${tempChannel.channelId}:${requestingMember.id}`)
                .setLabel('❌ Reject')
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId(`vc:wait:block:${tempChannel.channelId}:${requestingMember.id}`)
                .setLabel('🚫 Block')
                .setStyle(ButtonStyle.Secondary)
        );

        await owner.send({
            embeds: [{
                color: 0x5865F2,
                title: '🔔 Someone wants to join your VC',
                description: `**${requestingMember.user.tag}** is waiting to join your voice channel.`,
                timestamp: new Date().toISOString()
            }],
            components: [row]
        }).catch(() => {});
    } catch (err) {
        console.error('Waitlist notification error:', err);
    }
}

async function logEvent(client, config, guild, eventType, data) {
    if (!config.logChannelId) return;

    const logChannel = guild.channels.cache.get(config.logChannelId);
    if (!logChannel) return;

    const colors = {
        vc_create: 0x57F287,
        vc_delete: 0xED4245,
        vc_transfer: 0xFEE75C,
        vc_block: 0xED4245,
        vc_claim: 0x5865F2
    };

    const messages = {
        vc_create: `🎤 **${data.user.tag}** created temp VC: **${data.channelName}** (\`${data.channelId}\`)`,
        vc_delete: `🗑️ Temp VC deleted: **${data.channelName}** (\`${data.channelId}\`)`,
        vc_transfer: `👑 VC ownership transferred from **${data.oldOwner}** to **${data.newOwner}**`,
        vc_block: `🚫 **${data.blockedBy}** blocked **${data.blockedUser}** from their VC`,
        vc_claim: `👑 **${data.user.tag}** claimed ownership of an unowned VC`
    };

    await logChannel.send({
        embeds: [{
            color: colors[eventType] || 0x5865F2,
            description: messages[eventType] || eventType,
            timestamp: new Date().toISOString()
        }]
    }).catch(() => {});
}

module.exports.logEvent = logEvent;