const { ChannelType, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const TempChannel = require('../models/TempChannel');
const GuildConfig = require('../models/GuildConfig');

/**
 * Create a temporary voice channel
 */
async function createTempVC(client, options) {
    const { guild, ownerId, channelName, categoryId, bitrate, limit, isLocked, isHidden, createTextChannel } = options;

    const permissionOverwrites = [
        {
            id: guild.roles.everyone.id,
            allow: [],
            deny: isLocked ? [PermissionFlagsBits.Connect] : [],
        },
        {
            id: ownerId,
            allow: [
                PermissionFlagsBits.ManageChannels,
                PermissionFlagsBits.MoveMembers,
                PermissionFlagsBits.MuteMembers,
                PermissionFlagsBits.DeafenMembers,
                PermissionFlagsBits.Connect,
                PermissionFlagsBits.Speak,
                PermissionFlagsBits.Stream,
                PermissionFlagsBits.UseVAD
            ],
            deny: []
        },
        {
            id: client.user.id,
            allow: [
                PermissionFlagsBits.ManageChannels,
                PermissionFlagsBits.MoveMembers,
                PermissionFlagsBits.MuteMembers,
                PermissionFlagsBits.Connect,
                PermissionFlagsBits.Speak,
                PermissionFlagsBits.ViewChannel
            ],
            deny: []
        }
    ];

    if (isHidden) {
        permissionOverwrites[0].deny.push(PermissionFlagsBits.ViewChannel);
        // Allow owner to view
        permissionOverwrites[1].allow.push(PermissionFlagsBits.ViewChannel);
        // Allow bot to view
        permissionOverwrites[2].allow.push(PermissionFlagsBits.ViewChannel);
    }

    // Create voice channel
    const voiceChannel = await guild.channels.create({
        name: channelName,
        type: ChannelType.GuildVoice,
        parent: categoryId || undefined,
        bitrate: bitrate || 64000,
        userLimit: limit || 0,
        permissionOverwrites
    });

    // Create linked text channel if enabled
    let textChannel = null;
    if (createTextChannel) {
        const textOverwrites = [
            {
                id: guild.roles.everyone.id,
                deny: [PermissionFlagsBits.ViewChannel]
            },
            {
                id: ownerId,
                allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageMessages]
            },
            {
                id: client.user.id,
                allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageMessages]
            }
        ];

        textChannel = await guild.channels.create({
            name: `${channelName.replace(/[^a-zA-Z0-9-_]/g, '-').toLowerCase()}-chat`,
            type: ChannelType.GuildText,
            parent: categoryId || undefined,
            permissionOverwrites: textOverwrites,
            topic: `Linked text channel for ${channelName} | Owner: <@${ownerId}>`
        }).catch(() => null);
    }

    // Save to database
    const tempChannel = await TempChannel.create({
        channelId: voiceChannel.id,
        guildId: guild.id,
        ownerId,
        categoryId: categoryId || null,
        isLocked: isLocked || false,
        isHidden: isHidden || false,
        linkedTextChannelId: textChannel?.id || null,
        settings: {
            bitrate: bitrate || 64000,
            limit: limit || 0,
            region: null
        }
    });

    // Cache
    client.tempVCCache.set(voiceChannel.id, tempChannel);

    return { voiceChannel, textChannel, tempChannel };
}

/**
 * Delete a temporary voice channel
 */
async function deleteTempVC(client, tempChannel, guild) {
    const channel = guild.channels.cache.get(tempChannel.channelId);

    if (channel) {
        await channel.delete().catch(() => {});
    }

    // Delete linked text channel
    if (tempChannel.linkedTextChannelId) {
        const textChannel = guild.channels.cache.get(tempChannel.linkedTextChannelId);
        if (textChannel) {
            await textChannel.delete().catch(() => {});
        }
    }

    // Remove from database
    await TempChannel.deleteOne({ channelId: tempChannel.channelId }).catch(() => {});

    // Remove from cache
    client.tempVCCache.delete(tempChannel.channelId);
}

/**
 * Send control panel to VC owner via DM
 */
async function sendControlPanel(client, tempChannel, guild) {
    try {
        const owner = await guild.members.fetch(tempChannel.ownerId).catch(() => null);
        if (!owner) return;

        const channel = guild.channels.cache.get(tempChannel.channelId);
        if (!channel) return;

        // Build button rows
        const row1 = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`vc:lock:${tempChannel.channelId}`)
                                .setLabel(tempChannel.isLocked ? '🔓 Unlock' : '🔒 Lock')
                .setStyle(tempChannel.isLocked ? ButtonStyle.Success : ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId(`vc:hide:${tempChannel.channelId}`)
                .setLabel(tempChannel.isHidden ? '👁️ Show' : '👁️‍🗨️ Hide')
                .setStyle(tempChannel.isHidden ? ButtonStyle.Success : ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId(`vc:delete:${tempChannel.channelId}`)
                .setLabel('❌ Delete')
                .setStyle(ButtonStyle.Danger)
        );

        const row2 = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`vc:rename:${tempChannel.channelId}`)
                .setLabel('✏️ Rename')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId(`vc:limit:${tempChannel.channelId}`)
                .setLabel('👥 Limit')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId(`vc:transfer:${tempChannel.channelId}`)
                .setLabel('👑 Transfer')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId(`vc:claim:${tempChannel.channelId}`)
                .setLabel('🤚 Claim')
                .setStyle(ButtonStyle.Secondary)
        );

        const row3 = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`vc:kick:${tempChannel.channelId}`)
                .setLabel('👢 Kick')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId(`vc:block_btn:${tempChannel.channelId}`)
                .setLabel('🚫 Block')
                .setStyle(ButtonStyle.Secondary)
        );

        const membersList = channel.members.map(m => `• <@${m.id}>`).join('\n') || 'Empty';
        
        const embed = {
            color: 0x5865F2,
            title: `🎛️ Control Panel: ${channel.name}`,
            description: `Manage your temporary voice channel using the buttons below.`,
            fields: [
                { name: '👥 Members', value: membersList, inline: true },
                { name: '⚙️ Status', value: `${tempChannel.isLocked ? '🔒 Locked' : '🔓 Unlocked'} | ${tempChannel.isHidden ? '👁️‍🗨️ Hidden' : '👁️ Visible'} | 👥 Limit: ${tempChannel.settings.limit === 0 ? '∞' : tempChannel.settings.limit}`, inline: true },
                { name: '📋 Waitlist', value: tempChannel.waitingUsers.length > 0 ? `${tempChannel.waitingUsers.length} user(s) waiting` : 'Empty', inline: true }
            ],
            footer: { text: `Owner: <@${tempChannel.ownerId}> | Channel ID: ${tempChannel.channelId}` },
            timestamp: new Date().toISOString()
        };

        // Edit existing control panel message or send a new one
        if (tempChannel.controlPanelMessageId) {
            try {
                const msg = await owner.send({ 
                    embeds: [embed], 
                    components: [row1, row2, row3] 
                }).catch(async () => {
                    // If DM fails (e.g., user blocked bot), we can't do much
                    return null;
                });

                if (msg) {
                    await TempChannel.updateOne(
                        { channelId: tempChannel.channelId },
                        { $set: { controlPanelMessageId: msg.id } }
                    );
                }
            } catch (err) {
                // User might have DMs disabled, fail silently
            }
        } else {
            try {
                const msg = await owner.send({ 
                    embeds: [embed], 
                    components: [row1, row2, row3] 
                });
                await TempChannel.updateOne(
                    { channelId: tempChannel.channelId },
                    { $set: { controlPanelMessageId: msg.id } }
                );
            } catch (err) {
                // Fail silently if DMs are closed
            }
        }
    } catch (err) {
        // console.error('Control panel error:', err);
    }
}

/**
 * Rename channels based on user activity (Game playing)
 */
async function renameBasedOnActivity(client) {
    try {
        const configs = await GuildConfig.find({ activityRename: true });
        if (configs.length === 0) return;

        for (const config of configs) {
            const guild = client.guilds.cache.get(config.guildId);
            if (!guild) continue;

            const tempChannels = await TempChannel.find({ guildId: guild.id });
            
            for (const temp of tempChannels) {
                const channel = guild.channels.cache.get(temp.channelId);
                if (!channel) continue;

                const owner = guild.members.cache.get(temp.ownerId);
                if (!owner) continue;

                // Check what the owner is playing
                const gameActivity = owner.presence?.activities?.find(a => a.type === 0); // 0 = PLAYING
                
                if (gameActivity) {
                    const newName = `🎮 ${gameActivity.name}`;
                    if (channel.name !== newName) {
                        await channel.setName(newName).catch(() => {}); // Catch rate limit errors
                    }
                } else {
                    // Revert to owner name if no game
                    const defaultName = `🔊 ${owner.displayName}'s Room`;
                    if (channel.name !== defaultName && !channel.name.startsWith('🔊') && channel.name.startsWith('🎮')) {
                        await channel.setName(defaultName).catch(() => {});
                    }
                }
            }
        }
    } catch (err) {
        // console.error('Activity rename error:', err);
    }
}

module.exports = { createTempVC, deleteTempVC, sendControlPanel, renameBasedOnActivity };