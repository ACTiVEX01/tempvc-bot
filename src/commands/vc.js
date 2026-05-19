const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const TempChannel = require('../models/TempChannel');
const GuildConfig = require('../models/GuildConfig');
const UserSettings = require('../models/UserSettings');
const { buildEmbed } = require('../utils/embeds');
const { logEvent } = require('../events/voiceStateUpdate');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('vc')
        .setDescription('Manage your temporary voice channel')
        .addSubcommand(sub =>
            sub.setName('rename')
                .setDescription('Rename your voice channel')
                .addStringOption(opt =>
                    opt.setName('name')
                        .setDescription('New channel name')
                        .setRequired(true)
                        .setMaxLength(100)
                )
        )
        .addSubcommand(sub =>
            sub.setName('lock')
                .setDescription('Lock your voice channel')
        )
        .addSubcommand(sub =>
            sub.setName('unlock')
                .setDescription('Unlock your voice channel')
        )
        .addSubcommand(sub =>
            sub.setName('hide')
                .setDescription('Hide your voice channel from others')
        )
        .addSubcommand(sub =>
            sub.setName('show')
                .setDescription('Make your voice channel visible')
        )
        .addSubcommand(sub =>
            sub.setName('limit')
                .setDescription('Set user limit for your voice channel')
                .addIntegerOption(opt =>
                    opt.setName('amount')
                        .setDescription('User limit (0 = unlimited)')
                        .setRequired(true)
                        .setMinValue(0)
                        .setMaxValue(99)
                )
        )
        .addSubcommand(sub =>
            sub.setName('block')
                .setDescription('Block a user from your voice channel')
                .addUserOption(opt =>
                    opt.setName('user')
                        .setDescription('User to block')
                        .setRequired(true)
                )
        )
        .addSubcommand(sub =>
            sub.setName('permit')
                .setDescription('Allow a blocked user to join your voice channel')
                .addUserOption(opt =>
                    opt.setName('user')
                        .setDescription('User to permit')
                        .setRequired(true)
                )
        )
        .addSubcommand(sub =>
            sub.setName('kick')
                .setDescription('Kick a user from your voice channel')
                .addUserOption(opt =>
                    opt.setName('user')
                        .setDescription('User to kick')
                        .setRequired(true)
                )
        )
        .addSubcommand(sub =>
            sub.setName('mute')
                .setDescription('Server mute a user in your voice channel')
                .addUserOption(opt =>
                    opt.setName('user')
                        .setDescription('User to mute')
                        .setRequired(true)
                )
        )
        .addSubcommand(sub =>
            sub.setName('unmute')
                .setDescription('Unmute a user in your voice channel')
                .addUserOption(opt =>
                    opt.setName('user')
                        .setDescription('User to unmute')
                        .setRequired(true)
                )
        )
        .addSubcommand(sub =>
            sub.setName('transfer')
                .setDescription('Transfer ownership of your voice channel')
                .addUserOption(opt =>
                    opt.setName('user')
                        .setDescription('New owner')
                        .setRequired(true)
                )
        )
        .addSubcommand(sub =>
            sub.setName('claim')
                .setDescription('Claim ownership of an unowned voice channel')
        )
        .addSubcommand(sub =>
            sub.setName('delete')
                .setDescription('Delete your voice channel')
        )
        .addSubcommand(sub =>
            sub.setName('bitrate')
                .setDescription('Change the bitrate of your voice channel')
                .addIntegerOption(opt =>
                    opt.setName('amount')
                        .setDescription('Bitrate in kbps (8-384)')
                        .setRequired(true)
                        .setMinValue(8)
                        .setMaxValue(384)
                )
        )
        .addSubcommand(sub =>
            sub.setName('region')
                .setDescription('Change the region of your voice channel')
                .addStringOption(opt =>
                    opt.setName('location')
                        .setDescription('Region name')
                        .setRequired(true)
                        .addChoices(
                            { name: '🇺🇸 US West', value: 'us-west' },
                            { name: '🇺🇸 US East', value: 'us-east' },
                            { name: '🇺🇸 US Central', value: 'us-central' },
                            { name: '🇺🇸 US South', value: 'us-south' },
                            { name: '🇪🇺 Europe', value: 'eu-central' },
                            { name: '🇪🇺 EU West', value: 'eu-west' },
                            { name: '🇬🇧 London', value: 'london' },
                            { name: '🇮🇳 India', value: 'india' },
                            { name: '🇯🇵 Japan', value: 'japan' },
                            { name: '🇸🇬 Singapore', value: 'singapore' },
                            { name: '🇧🇷 Brazil', value: 'brazil' },
                            { name: '🇦🇺 Sydney', value: 'sydney' },
                            { name: '🇰🇷 South Korea', value: 'south-korea' },
                            { name: '🇿🇦 South Africa', value: 'south-africa' },
                            { name: '🌍 Automatic', value: null }
                        )
                )
        )
        .addSubcommand(sub =>
            sub.setName('password')
                .setDescription('Set or remove a password for your voice channel')
                .addStringOption(opt =>
                    opt.setName('password')
                        .setDescription('Password to set (leave empty to remove)')
                        .setRequired(false)
                )
        )
        .addSubcommand(sub =>
            sub.setName('request')
                .setDescription('Request access to a locked voice channel')
                .addChannelOption(opt =>
                    opt.setName('channel')
                        .setDescription('The voice channel you want to join')
                        .setRequired(true)
                        .addChannelTypes(ChannelType.GuildVoice)
                )
                .addStringOption(opt =>
                    opt.setName('reason')
                        .setDescription('Why you want to join')
                        .setRequired(false)
                )
        )
        .addSubcommand(sub =>
            sub.setName('accept')
                .setDescription('Accept a user\'s request to join your VC')
                .addUserOption(opt =>
                    opt.setName('user')
                        .setDescription('User to accept')
                        .setRequired(true)
                )
        )
        .addSubcommand(sub =>
            sub.setName('reject')
                .setDescription('Reject a user\'s request to join your VC')
                .addUserOption(opt =>
                    opt.setName('user')
                        .setDescription('User to reject')
                        .setRequired(true)
                )
        )
        .addSubcommand(sub =>
            sub.setName('queue')
                .setDescription('View the waitlist for your voice channel')
        )
        .addSubcommand(sub =>
            sub.setName('guest')
                .setDescription('Give a user temporary guest access to your VC')
                .addUserOption(opt =>
                    opt.setName('user')
                        .setDescription('Guest user')
                        .setRequired(true)
                )
                .addIntegerOption(opt =>
                    opt.setName('duration')
                        .setDescription('Duration in minutes')
                        .setRequired(true)
                        .setMinValue(1)
                        .setMaxValue(1440)
                )
        )
        .addSubcommand(sub =>
            sub.setName('preset')
                .setDescription('Save or load a VC preset')
                .addStringOption(opt =>
                    opt.setName('action')
                        .setDescription('Save, load, or delete a preset')
                        .setRequired(true)
                        .addChoices(
                            { name: '💾 Save Current', value: 'save' },
                            { name: '📂 Load Preset', value: 'load' },
                            { name: '📋 List Presets', value: 'list' },
                            { name: '🗑️ Delete Preset', value: 'delete' }
                        )
                )
                .addStringOption(opt =>
                    opt.setName('name')
                        .setDescription('Preset name')
                        .setRequired(false)
                )
        )
        .addSubcommand(sub =>
            sub.setName('info')
                .setDescription('View info about your current voice channel')
        ),

    async execute(interaction, client) {
        const subcommand = interaction.options.getSubcommand();

        // Commands that don't require owning a temp VC
        if (subcommand === 'claim' || subcommand === 'request') {
            return handleNonOwnerCommand(interaction, client, subcommand);
        }

        // All other commands require the user to be in a temp VC they own
        const tempChannel = await getOwnerTempChannel(interaction);
        if (!tempChannel && subcommand !== 'info') {
            return interaction.reply({
                embeds: [buildEmbed('error', 'You don\'t own any active voice channel. Join a "Create VC" channel to create one.')],
                ephemeral: true
            });
        }

        switch (subcommand) {
            case 'rename': return handleRename(interaction, client, tempChannel);
            case 'lock': return handleLock(interaction, client, tempChannel);
            case 'unlock': return handleUnlock(interaction, client, tempChannel);
            case 'hide': return handleHide(interaction, client, tempChannel);
            case 'show': return handleShow(interaction, client, tempChannel);
            case 'limit': return handleLimit(interaction, client, tempChannel);
            case 'block': return handleBlock(interaction, client, tempChannel);
            case 'permit': return handlePermit(interaction, client, tempChannel);
            case 'kick': return handleKick(interaction, client, tempChannel);
            case 'mute': return handleMute(interaction, client, tempChannel);
            case 'unmute': return handleUnmute(interaction, client, tempChannel);
            case 'transfer': return handleTransfer(interaction, client, tempChannel);
            case 'delete': return handleDelete(interaction, client, tempChannel);
            case 'bitrate': return handleBitrate(interaction, client, tempChannel);
            case 'region': return handleRegion(interaction, client, tempChannel);
            case 'password': return handlePassword(interaction, client, tempChannel);
            case 'accept': return handleAccept(interaction, client, tempChannel);
            case 'reject': return handleReject(interaction, client, tempChannel);
            case 'queue': return handleQueue(interaction, client, tempChannel);
            case 'guest': return handleGuest(interaction, client, tempChannel);
            case 'preset': return handlePreset(interaction, client, tempChannel);
            case 'info': return handleInfo(interaction, client, tempChannel);
        }
    }
};

// ─── Helper: Get user's owned temp channel ──────────────────
async function getOwnerTempChannel(interaction) {
    const member = interaction.member;

    // First check if they're currently in a VC
    if (member.voice?.channelId) {
        const temp = await TempChannel.findOne({
            channelId: member.voice.channelId,
            ownerId: interaction.user.id
        });
        if (temp) return temp;
    }

    // Fallback: find any VC they own
    return await TempChannel.findOne({
        guildId: interaction.guild.id,
        ownerId: interaction.user.id
    });
}

// ─── Non-owner commands ─────────────────────────────────────
async function handleNonOwnerCommand(interaction, client, subcommand) {
    if (subcommand === 'claim') {
        const member = interaction.member;
        if (!member.voice?.channelId) {
            return interaction.reply({
                embeds: [buildEmbed('error', 'You must be in a voice channel to claim it.')],
                ephemeral: true
            });
        }

        const tempChannel = await TempChannel.findOne({ channelId: member.voice.channelId });
        if (!tempChannel) {
            return interaction.reply({
                embeds: [buildEmbed('error', 'This is not a temporary voice channel.')],
                ephemeral: true
            });
        }

        if (tempChannel.ownerId === interaction.user.id) {
            return interaction.reply({
                embeds: [buildEmbed('error', 'You already own this channel.')],
                ephemeral: true
            });
        }

        // Check if owner is still in the channel
        const channel = interaction.guild.channels.cache.get(member.voice.channelId);
        if (channel && channel.members.has(tempChannel.ownerId)) {
            return interaction.reply({
                embeds: [buildEmbed('error', 'The owner is still in the channel. You can only claim if they\'ve left.')],
                ephemeral: true
            });
        }

        await TempChannel.updateOne(
            { channelId: member.voice.channelId },
            { $set: { ownerId: interaction.user.id } }
        );

        // Update permissions
        if (channel) {
            await channel.permissionOverwrites.edit(interaction.user.id, {
                ManageChannels: true,
                MoveMembers: true
            }).catch(() => {});
        }

        const config = await GuildConfig.findOne({ guildId: interaction.guild.id });
        await logEvent(client, config, interaction.guild, 'vc_claim', {
            user: interaction.user
        });

        return interaction.reply({
            embeds: [buildEmbed('success', '👑 You are now the owner of this voice channel!')],
            ephemeral: true
        });
    }

    if (subcommand === 'request') {
        const targetChannel = interaction.options.getChannel('channel');
        const reason = interaction.options.getString('reason');

        const tempChannel = await TempChannel.findOne({ channelId: targetChannel.id });
        if (!tempChannel) {
            return interaction.reply({
                embeds: [buildEmbed('error', 'That is not a temporary voice channel.')],
                ephemeral: true
            });
        }

        if (tempChannel.ownerId === interaction.user.id) {
            return interaction.reply({
                embeds: [buildEmbed('error', 'You own this channel!')],
                ephemeral: true
            });
        }

        if (tempChannel.blockedUsers.includes(interaction.user.id)) {
            return interaction.reply({
                embeds: [buildEmbed('error', 'You are blocked from that channel.')],
                ephemeral: true
            });
        }

        // Add to waiting list
        await TempChannel.updateOne(
            { channelId: targetChannel.id },
            {
                $addToSet: {
                    waitingUsers: {
                        userId: interaction.user.id,
                        reason: reason || null,
                        requestedAt: new Date()
                    }
                }
            }
        );

        // Notify owner
        try {
            const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
            const owner = await interaction.guild.members.fetch(tempChannel.ownerId).catch(() => null);

            if (owner) {
                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId(`vc:wait:accept:${tempChannel.channelId}:${interaction.user.id}`)
                        .setLabel('✅ Accept')
                        .setStyle(ButtonStyle.Success),
                    new ButtonBuilder()
                        .setCustomId(`vc:wait:reject:${tempChannel.channelId}:${interaction.user.id}`)
                        .setLabel('❌ Reject')
                        .setStyle(ButtonStyle.Danger),
                    new ButtonBuilder()
                        .setCustomId(`vc:wait:block:${tempChannel.channelId}:${interaction.user.id}`)
                        .setLabel('🚫 Block')
                        .setStyle(ButtonStyle.Secondary)
                );

                await owner.send({
                    embeds: [{
                        color: 0x5865F2,
                        title: '🔔 VC Join Request',
                        description: `**${interaction.user.tag}** wants to join your voice channel.`,
                        fields: reason ? [{ name: 'Reason', value: reason }] : [],
                        timestamp: new Date().toISOString()
                    }],
                    components: [row]
                }).catch(() => {});
            }
        } catch (err) {
            console.error('Request notification error:', err);
        }

        return interaction.reply({
            embeds: [buildEmbed('success', `📝 Request sent to the channel owner!${reason ? ` Reason: **${reason}**` : ''}`)],
            ephemeral: true
        });
    }
}

// ─── Rename ──────────────────────────────────────────────────
async function handleRename(interaction, client, tempChannel) {
    const name = interaction.options.getString('name');
    const channel = interaction.guild.channels.cache.get(tempChannel.channelId);
    if (!channel) return interaction.reply({ embeds: [buildEmbed('error', 'Channel not found.')], ephemeral: true });

    await channel.setName(name);
    return interaction.reply({ embeds: [buildEmbed('success', `✏️ Channel renamed to **${name}**`)], ephemeral: true });
}

// ─── Lock ────────────────────────────────────────────────────
async function handleLock(interaction, client, tempChannel) {
    const channel = interaction.guild.channels.cache.get(tempChannel.channelId);
    if (!channel) return interaction.reply({ embeds: [buildEmbed('error', 'Channel not found.')], ephemeral: true });

    await channel.permissionOverwrites.edit(interaction.guild.roles.everyone, {
        Connect: false
    });
    await TempChannel.updateOne({ channelId: tempChannel.channelId }, { $set: { isLocked: true } });

    return interaction.reply({ embeds: [buildEmbed('success', '🔒 Channel locked! Only permitted users can join.')], ephemeral: true });
}

// ─── Unlock ──────────────────────────────────────────────────
async function handleUnlock(interaction, client, tempChannel) {
    const channel = interaction.guild.channels.cache.get(tempChannel.channelId);
    if (!channel) return interaction.reply({ embeds: [buildEmbed('error', 'Channel not found.')], ephemeral: true });

    await channel.permissionOverwrites.edit(interaction.guild.roles.everyone, {
        Connect: null
    });
    await TempChannel.updateOne({ channelId: tempChannel.channelId }, { $set: { isLocked: false } });

    return interaction.reply({ embeds: [buildEmbed('success', '🔓 Channel unlocked! Everyone can join now.')], ephemeral: true });
}

// ─── Hide ────────────────────────────────────────────────────
async function handleHide(interaction, client, tempChannel) {
    const channel = interaction.guild.channels.cache.get(tempChannel.channelId);
    if (!channel) return interaction.reply({ embeds: [buildEmbed('error', 'Channel not found.')], ephemeral: true });

    await channel.permissionOverwrites.edit(interaction.guild.roles.everyone, {
        ViewChannel: false
    });
    await TempChannel.updateOne({ channelId: tempChannel.channelId }, { $set: { isHidden: true } });

    return interaction.reply({ embeds: [buildEmbed('success', '👁️ Channel hidden from everyone!')], ephemeral: true });
}

// ─── Show ────────────────────────────────────────────────────
async function handleShow(interaction, client, tempChannel) {
    const channel = interaction.guild.channels.cache.get(tempChannel.channelId);
    if (!channel) return interaction.reply({ embeds: [buildEmbed('error', 'Channel not found.')], ephemeral: true });

    await channel.permissionOverwrites.edit(interaction.guild.roles.everyone, {
        ViewChannel: null
    });
    await TempChannel.updateOne({ channelId: tempChannel.channelId }, { $set: { isHidden: false } });

    return interaction.reply({ embeds: [buildEmbed('success', '👁️‍🗨️ Channel is now visible!')], ephemeral: true });
}

// ─── Limit ───────────────────────────────────────────────────
async function handleLimit(interaction, client, tempChannel) {
    const limit = interaction.options.getInteger('amount');
    const channel = interaction.guild.channels.cache.get(tempChannel.channelId);
    if (!channel) return interaction.reply({ embeds: [buildEmbed('error', 'Channel not found.')], ephemeral: true });

    await channel.setUserLimit(limit);
    await TempChannel.updateOne({ channelId: tempChannel.channelId }, { $set: { 'settings.limit': limit } });

    return interaction.reply({
        embeds: [buildEmbed('success', `👥 User limit set to **${limit === 0 ? 'Unlimited' : limit}**`)],
        ephemeral: true
    });
}

// ─── Block ───────────────────────────────────────────────────
async function handleBlock(interaction, client, tempChannel) {
    const user = interaction.options.getUser('user');
    if (user.id === interaction.user.id) return interaction.reply({ embeds: [buildEmbed('error', 'You can\'t block yourself!')], ephemeral: true });
    if (user.id === tempChannel.ownerId) return interaction.reply({ embeds: [buildEmbed('error', 'You can\'t block the owner!')], ephemeral: true });

    await TempChannel.updateOne(
        { channelId: tempChannel.channelId },
        {
            $addToSet: { blockedUsers: user.id },
            $pull: { permittedUsers: user.id }
        }
    );

    // Kick from VC if present
    const member = await interaction.guild.members.fetch(user.id).catch(() => null);
    if (member && member.voice?.channelId === tempChannel.channelId) {
        await member.voice.disconnect('Blocked by owner').catch(() => {});
    }

    const config = await GuildConfig.findOne({ guildId: interaction.guild.id });
    await logEvent(client, config, interaction.guild, 'vc_block', {
        blockedBy: interaction.user.tag,
        blockedUser: user.tag
    });

    return interaction.reply({ embeds: [buildEmbed('success', `🚫 Blocked **${user.tag}** from your channel.`)], ephemeral: true });
}

// ─── Permit ──────────────────────────────────────────────────
async function handlePermit(interaction, client, tempChannel) {
    const user = interaction.options.getUser('user');

    await TempChannel.updateOne(
        { channelId: tempChannel.channelId },
        {
            $addToSet: { permittedUsers: user.id },
            $pull: { blockedUsers: user.id }
        }
    );

    // Update channel permissions for this user
    const channel = interaction.guild.channels.cache.get(tempChannel.channelId);
    if (channel) {
        await channel.permissionOverwrites.edit(user.id, {
            Connect: true,
            ViewChannel: true
        }).catch(() => {});
    }

    return interaction.reply({ embeds: [buildEmbed('success', `✅ **${user.tag}** can now join your channel.`)], ephemeral: true });
}

// ─── Kick ────────────────────────────────────────────────────
async function handleKick(interaction, client, tempChannel) {
    const user = interaction.options.getUser('user');
    const member = await interaction.guild.members.fetch(user.id).catch(() => null);

    if (!member) return interaction.reply({ embeds: [buildEmbed('error', 'User not found.')], ephemeral: true });
    if (!member.voice || member.voice.channelId !== tempChannel.channelId) {
        return interaction.reply({ embeds: [buildEmbed('error', 'That user is not in your VC.')], ephemeral: true });
    }

    await member.voice.disconnect('Kicked by VC owner').catch(() => {});
    return interaction.reply({ embeds: [buildEmbed('success', `👢 Kicked **${user.tag}** from your channel.`)], ephemeral: true });
}

// ─── Mute ────────────────────────────────────────────────────
async function handleMute(interaction, client, tempChannel) {
    const user = interaction.options.getUser('user');
    const member = await interaction.guild.members.fetch(user.id).catch(() => null);

    if (!member) return interaction.reply({ embeds: [buildEmbed('error', 'User not found.')], ephemeral: true });

    await member.voice.setMute(true, 'Muted by VC owner').catch(() => {
        throw new Error('Missing permission to mute. Ensure bot has Mute Members permission.');
    });

    await TempChannel.updateOne(
        { channelId: tempChannel.channelId },
        { $addToSet: { mutedUsers: user.id } }
    );

    return interaction.reply({ embeds: [buildEmbed('success', `🔇 Muted **${user.tag}**.`)], ephemeral: true });
}

// ─── Unmute ──────────────────────────────────────────────────
async function handleUnmute(interaction, client, tempChannel) {
    const user = interaction.options.getUser('user');
    const member = await interaction.guild.members.fetch(user.id).catch(() => null);

    if (!member) return interaction.reply({ embeds: [buildEmbed('error', 'User not found.')], ephemeral: true });

    await member.voice.setMute(false, 'Unmuted by VC owner').catch(() => {});
    await TempChannel.updateOne(
        { channelId: tempChannel.channelId },
        { $pull: { mutedUsers: user.id } }
    );

    return interaction.reply({ embeds: [buildEmbed('success', `🔊 Unmuted **${user.tag}**.`)], ephemeral: true });
}

// ─── Transfer ────────────────────────────────────────────────
async function handleTransfer(interaction, client, tempChannel) {
    const newOwner = interaction.options.getUser('user');
    if (newOwner.id === interaction.user.id) return interaction.reply({ embeds: [buildEmbed('error', 'You can\'t transfer to yourself!')], ephemeral: true });

    const newMember = await interaction.guild.members.fetch(newOwner.id).catch(() => null);
    if (!newMember) return interaction.reply({ embeds: [buildEmbed('error', 'User not found in this server.')], ephemeral: true });

    const channel = interaction.guild.channels.cache.get(tempChannel.channelId);

    await TempChannel.updateOne(
        { channelId: tempChannel.channelId },
        { $set: { ownerId: newOwner.id } }
    );

    if (channel) {
        await channel.permissionOverwrites.edit(interaction.user.id, {
            ManageChannels: null,
            MoveMembers: null
        }).catch(() => {});
        await channel.permissionOverwrites.edit(newOwner.id, {
            ManageChannels: true,
            MoveMembers: true
        }).catch(() => {});
    }

    const config = await GuildConfig.findOne({ guildId: interaction.guild.id });
    await logEvent(client, config, interaction.guild, 'vc_transfer', {
        oldOwner: interaction.user.tag,
        newOwner: newOwner.tag
    });

    return interaction.reply({
        embeds: [buildEmbed('success', `👑 Ownership transferred to **${newOwner.tag}**!`)],
        ephemeral: true
    });
}

// ─── Delete ──────────────────────────────────────────────────
async function handleDelete(interaction, client, tempChannel) {
    const { deleteTempVC } = require('../utils/channelManager');
    await deleteTempVC(client, tempChannel, interaction.guild);
    return interaction.reply({ embeds: [buildEmbed('success', '🗑️ Voice channel deleted!')], ephemeral: true });
}

// ─── Bitrate ─────────────────────────────────────────────────
async function handleBitrate(interaction, client, tempChannel) {
    const bitrate = interaction.options.getInteger('amount') * 1000; // Convert kbps to bps
    const channel = interaction.guild.channels.cache.get(tempChannel.channelId);
    if (!channel) return interaction.reply({ embeds: [buildEmbed('error', 'Channel not found.')], ephemeral: true });

    await channel.setBitrate(bitrate);
    await TempChannel.updateOne({ channelId: tempChannel.channelId }, { $set: { 'settings.bitrate': bitrate } });

    return interaction.reply({
        embeds: [buildEmbed('success', `🎵 Bitrate set to **${bitrate / 1000} kbps**`)],
        ephemeral: true
    });
}

// ─── Region ──────────────────────────────────────────────────
async function handleRegion(interaction, client, tempChannel) {
    const region = interaction.options.getString('location');
    const channel = interaction.guild.channels.cache.get(tempChannel.channelId);
    if (!channel) return interaction.reply({ embeds: [buildEmbed('error', 'Channel not found.')], ephemeral: true });

    await channel.setRTCRegion(region);
    await TempChannel.updateOne({ channelId: tempChannel.channelId }, { $set: { 'settings.region': region } });

    return interaction.reply({
        embeds: [buildEmbed('success', `🌍 Region set to **${region || 'Automatic'}**`)],
        ephemeral: true
    });
}

// ─── Password ────────────────────────────────────────────────
async function handlePassword(interaction, client, tempChannel) {
    const password = interaction.options.getString('password');

    if (!password) {
        // Remove password
        await TempChannel.updateOne(
            { channelId: tempChannel.channelId },
            { $set: { password: null } }
        );
        return interaction.reply({ embeds: [buildEmbed('success', '🔓 Password removed from your channel.')], ephemeral: true });
    }

    await TempChannel.updateOne(
        { channelId: tempChannel.channelId },
        { $set: { password } }
    );

    return interaction.reply({
        embeds: [buildEmbed('success', `🔐 Password set! Others must use \`/vc password <password>\` to join.`)],
        ephemeral: true
    });
}

// ─── Accept ──────────────────────────────────────────────────
async function handleAccept(interaction, client, tempChannel) {
    const user = interaction.options.getUser('user');
    const channel = interaction.guild.channels.cache.get(tempChannel.channelId);

    await TempChannel.updateOne(
        { channelId: tempChannel.channelId },
        {
            $addToSet: { permittedUsers: user.id },
            $pull: { waitingUsers: { userId: user.id } }
        }
    );

    if (channel) {
        await channel.permissionOverwrites.edit(user.id, { Connect: true, ViewChannel: true }).catch(() => {});
    }

    // Move user if they're in a voice channel
    const member = await interaction.guild.members.fetch(user.id).catch(() => null);
    if (member && member.voice.channelId && channel) {
        await member.voice.setChannel(channel).catch(() => {});
    }

    try {
        await user.send({
            embeds: [buildEmbed('success', `✅ You've been accepted into the voice channel in **${interaction.guild.name}**!`)]
        }).catch(() => {});
    } catch {}

    return interaction.reply({ embeds: [buildEmbed('success', `✅ Accepted **${user.tag}**!`)], ephemeral: true });
}

// ─── Reject ──────────────────────────────────────────────────
async function handleReject(interaction, client, tempChannel) {
    const user = interaction.options.getUser('user');

    await TempChannel.updateOne(
        { channelId: tempChannel.channelId },
        { $pull: { waitingUsers: { userId: user.id } } }
    );

    const member = await interaction.guild.members.fetch(user.id).catch(() => null);
    if (member?.voice?.channelId) {
        await member.voice.disconnect('Rejected from VC').catch(() => {});
    }

    return interaction.reply({ embeds: [buildEmbed('success', `❌ Rejected **${user.tag}**.`)], ephemeral: true });
}

// ─── Queue ───────────────────────────────────────────────────
async function handleQueue(interaction, client, tempChannel) {
    if (tempChannel.waitingUsers.length === 0) {
        return interaction.reply({
            embeds: [buildEmbed('info', 'No users in the waitlist.')],
            ephemeral: true
        });
    }

    const queueList = tempChannel.waitingUsers.map((w, i) => {
        const time = `<t:${Math.floor(new Date(w.requestedAt).getTime() / 1000)}:R>`;
        return `**${i + 1}.** <@${w.userId}> ${w.reason ? `- *${w.reason}*` : ''} ${time}`;
    }).join('\n');

    return interaction.reply({
        embeds: [{
            color: 0x5865F2,
            title: '📋 Waitlist',
            description: queueList,
            footer: { text: `${tempChannel.waitingUsers.length} user(s) waiting` }
        }],
        ephemeral: true
    });
}

// ─── Guest ───────────────────────────────────────────────────
async function handleGuest(interaction, client, tempChannel) {
    const user = interaction.options.getUser('user');
    const duration = interaction.options.getInteger('duration');

    const expiresAt = new Date(Date.now() + duration * 60 * 1000);

    await TempChannel.updateOne(
        { channelId: tempChannel.channelId },
        {
            $addToSet: {
                guestAccess: { userId: user.id, expiresAt },
                permittedUsers: user.id
            }
        }
    );

    const channel = interaction.guild.channels.cache.get(tempChannel.channelId);
    if (channel) {
        await channel.permissionOverwrites.edit(user.id, { Connect: true, ViewChannel: true }).catch(() => {});
    }

    // Move user if in a voice channel
    const member = await interaction.guild.members.fetch(user.id).catch(() => null);
    if (member && member.voice.channelId && channel) {
        await member.voice.setChannel(channel).catch(() => {});
    }

    // Schedule guest removal
    setTimeout(async () => {
        const updated = await TempChannel.findOne({ channelId: tempChannel.channelId });
        if (updated) {
            await TempChannel.updateOne(
                { channelId: tempChannel.channelId },
                {
                    $pull: { guestAccess: { userId: user.id }, permittedUsers: user.id }
                }
            );
        }
    }, duration * 60 * 1000);

    return interaction.reply({
        embeds: [buildEmbed('success', `🎫 **${user.tag}** has guest access for **${duration} minute(s)**.`)],
        ephemeral: true
    });
}

// ─── Preset ──────────────────────────────────────────────────
async function handlePreset(interaction, client, tempChannel) {
    const action = interaction.options.getString('action');
    const name = interaction.options.getString('name');

    switch (action) {
        case 'save': {
            if (!name) return interaction.reply({ embeds: [buildEmbed('error', 'Please provide a preset name.')], ephemeral: true });

            const channel = interaction.guild.channels.cache.get(tempChannel.channelId);
            const presetData = {
                name,
                settings: {
                    bitrate: tempChannel.settings.bitrate,
                    limit: tempChannel.settings.limit,
                    region: tempChannel.settings.region,
                    isLocked: tempChannel.isLocked,
                    isHidden: tempChannel.isHidden,
                    name: channel ? channel.name : null
                }
            };

            await UserSettings.findOneAndUpdate(
                { userId: interaction.user.id },
                { $push: { presets: presetData } },
                { upsert: true }
            );

            return interaction.reply({
                embeds: [buildEmbed('success', `💾 Preset **"${name}"** saved!`)],
                ephemeral: true
            });
        }
        case 'load': {
            if (!name) return interaction.reply({ embeds: [buildEmbed('error', 'Please provide a preset name.')], ephemeral: true });

            const userSettings = await UserSettings.findOne({ userId: interaction.user.id });
            if (!userSettings) return interaction.reply({ embeds: [buildEmbed('error', 'No presets found.')], ephemeral: true });

            const preset = userSettings.presets.find(p => p.name.toLowerCase() === name.toLowerCase());
            if (!preset) return interaction.reply({ embeds: [buildEmbed('error', `Preset "${name}" not found.`)], ephemeral: true });

            const channel = interaction.guild.channels.cache.get(tempChannel.channelId);
            if (!channel) return interaction.reply({ embeds: [buildEmbed('error', 'Channel not found.')], ephemeral: true });

            // Apply preset settings
            if (preset.settings.bitrate) await channel.setBitrate(preset.settings.bitrate).catch(() => {});
            if (preset.settings.limit !== undefined) await channel.setUserLimit(preset.settings.limit).catch(() => {});
            if (preset.settings.region) await channel.setRTCRegion(preset.settings.region).catch(() => {});
            if (preset.settings.name) await channel.setName(preset.settings.name).catch(() => {});

            if (preset.settings.isLocked) {
                await channel.permissionOverwrites.edit(interaction.guild.roles.everyone, { Connect: false });
            } else {
                await channel.permissionOverwrites.edit(interaction.guild.roles.everyone, { Connect: null });
            }

            if (preset.settings.isHidden) {
                await channel.permissionOverwrites.edit(interaction.guild.roles.everyone, { ViewChannel: false });
            } else {
                await channel.permissionOverwrites.edit(interaction.guild.roles.everyone, { ViewChannel: null });
            }

            await TempChannel.updateOne(
                { channelId: tempChannel.channelId },
                {
                    $set: {
                        isLocked: preset.settings.isLocked,
                        isHidden: preset.settings.isHidden,
                        settings: preset.settings
                    }
                }
            );

            return interaction.reply({
                embeds: [buildEmbed('success', `📂 Preset **"${name}"** loaded!`)],
                ephemeral: true
            });
        }
        case 'list': {
            const userSettings = await UserSettings.findOne({ userId: interaction.user.id });
            if (!userSettings || userSettings.presets.length === 0) {
                return interaction.reply({
                    embeds: [buildEmbed('info', 'You have no saved presets. Use `/vc preset save <name>` to create one.')],
                    ephemeral: true
                });
            }

            const presetList = userSettings.presets.map((p, i) => {
                const flags = [];
                if (p.settings.isLocked) flags.push('🔒');
                if (p.settings.isHidden) flags.push('👁️');
                if (p.settings.limit > 0) flags.push(`👥${p.settings.limit}`);
                return `**${i + 1}.** ${p.name} ${flags.join(' ')}`;
            }).join('\n');

            return interaction.reply({
                embeds: [{
                    color: 0x5865F2,
                    title: '💾 Your Presets',
                    description: presetList
                }],
                ephemeral: true
            });
        }
        case 'delete': {
            if (!name) return interaction.reply({ embeds: [buildEmbed('error', 'Please provide a preset name.')], ephemeral: true });

            const result = await UserSettings.updateOne(
                { userId: interaction.user.id },
                { $pull: { presets: { name: new RegExp(`^${name}$`, 'i') } } }
            );

            if (result.modifiedCount === 0) {
                return interaction.reply({ embeds: [buildEmbed('error', `Preset "${name}" not found.`)], ephemeral: true });
            }

            return interaction.reply({
                embeds: [buildEmbed('success', `🗑️ Preset **"${name}"** deleted!`)],
                ephemeral: true
            });
        }
    }
}

// ─── Info ────────────────────────────────────────────────────
async function handleInfo(interaction, client, tempChannel) {
    if (!tempChannel) {
        // Check if user is in any VC
        if (interaction.member.voice?.channelId) {
            const anyTemp = await TempChannel.findOne({ channelId: interaction.member.voice.channelId });
            if (anyTemp) {
                return interaction.reply({
                    embeds: [buildTempInfoEmbed(anyTemp, interaction)],
                    ephemeral: true
                });
            }
        }
        return interaction.reply({
            embeds: [buildEmbed('info', 'You are not in a temporary voice channel.')],
            ephemeral: true
        });
    }

    return interaction.reply({
        embeds: [buildTempInfoEmbed(tempChannel, interaction)],
        ephemeral: true
    });
}

function buildTempInfoEmbed(tempChannel, interaction) {
    const channel = interaction.guild.channels.cache.get(tempChannel.channelId);
    const owner = interaction.guild.members.cache.get(tempChannel.ownerId);

    return {
        color: 0x5865F2,
        title: '🎙️ Voice Channel Info',
        fields: [
            { name: '📝 Name', value: channel?.name || 'Unknown', inline: true },
            { name: '👑 Owner', value: owner ? `<@${tempChannel.ownerId}>` : 'Unknown', inline: true },
            { name: '👥 Members', value: `${channel?.members?.size || 0}/${tempChannel.settings.limit || '∞'}`, inline: true },
            { name: '🔒 Locked', value: tempChannel.isLocked ? 'Yes' : 'No', inline: true },
            { name: '👁️ Hidden', value: tempChannel.isHidden ? 'Yes' : 'No', inline: true },
            { name: '🔐 Password', value: tempChannel.password ? 'Set' : 'None', inline: true },
            { name: '🎵 Bitrate', value: `${(tempChannel.settings.bitrate || 64000) / 1000}kbps`, inline: true },
            { name: '🌍 Region', value: tempChannel.settings.region || 'Automatic', inline: true },
            { name: '🚫 Blocked', value: tempChannel.blockedUsers.length > 0 ? tempChannel.blockedUsers.map(id => `<@${id}>`).join(', ') : 'None', inline: false },
            { name: '📋 Waitlist', value: tempChannel.waitingUsers.length > 0 ? `${tempChannel.waitingUsers.length} user(s) waiting` : 'Empty', inline: true }
        ],
        footer: { text: `Channel ID: ${tempChannel.channelId}` },
        timestamp: new Date().toISOString()
    };
}