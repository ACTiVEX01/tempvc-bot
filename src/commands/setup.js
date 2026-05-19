const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const GuildConfig = require('../models/GuildConfig');
const { buildEmbed } = require('../utils/embeds');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setup')
        .setDescription('Configure the TempVC bot for your server')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand(sub =>
            sub.setName('create')
                .setDescription('Set up a "Join to Create" voice channel')
                .addChannelOption(opt =>
                    opt.setName('channel')
                        .setDescription('Voice channel to use as Join-to-Create')
                        .setRequired(true)
                        .addChannelTypes(ChannelType.GuildVoice)
                )
                .addChannelOption(opt =>
                    opt.setName('category')
                        .setDescription('Category where temp VCs will be created')
                        .setRequired(false)
                        .addChannelTypes(ChannelType.GuildCategory)
                )
                .addStringOption(opt =>
                    opt.setName('naming')
                        .setDescription('Naming style for new VCs')
                        .setRequired(false)
                        .addChoices(
                            { name: '👤 Owner Name (e.g., Alex\'s Room)', value: 'owner' },
                            { name: '🔢 Numbered (e.g., Voice #1)', value: 'numbered' },
                            { name: '🎮 Activity-based', value: 'activity' },
                            { name: '✏️ Custom', value: 'custom' }
                        )
                )
                .addStringOption(opt =>
                    opt.setName('customname')
                        .setDescription('Custom name template (use {user} for username)')
                        .setRequired(false)
                )
                .addBooleanOption(opt =>
                    opt.setName('textchannel')
                        .setDescription('Create a linked text channel with each VC')
                        .setRequired(false)
                )
        )
        .addSubcommand(sub =>
            sub.setName('role')
                .setDescription('Map a role to a specific category')
                .addRoleOption(opt =>
                    opt.setName('role')
                        .setDescription('Role to map')
                        .setRequired(true)
                )
                .addChannelOption(opt =>
                    opt.setName('category')
                        .setDescription('Category for this role\'s VCs')
                        .setRequired(true)
                        .addChannelTypes(ChannelType.GuildCategory)
                )
                .addStringOption(opt =>
                    opt.setName('naming')
                        .setDescription('Naming style for this role')
                        .setRequired(false)
                        .addChoices(
                            { name: '👤 Owner Name', value: 'owner' },
                            { name: '🔢 Numbered', value: 'numbered' },
                            { name: '🎮 Activity-based', value: 'activity' },
                            { name: '✏️ Custom', value: 'custom' }
                        )
                )
        )
        .addSubcommand(sub =>
            sub.setName('logchannel')
                .setDescription('Set the channel for VC event logs')
                .addChannelOption(opt =>
                    opt.setName('channel')
                        .setDescription('Channel for logs')
                        .setRequired(true)
                )
        )
        .addSubcommand(sub =>
            sub.setName('blacklist')
                .setDescription('Add or remove a user from the blacklist')
                .addUserOption(opt =>
                    opt.setName('user')
                        .setDescription('User to blacklist/unblacklist')
                        .setRequired(true)
                )
        )
        .addSubcommand(sub =>
            sub.setName('cooldown')
                .setDescription('Set VC creation cooldown')
                .addIntegerOption(opt =>
                    opt.setName('seconds')
                        .setDescription('Cooldown in seconds (0 to disable)')
                        .setRequired(true)
                        .setMinValue(0)
                        .setMaxValue(3600)
                )
        )
        .addSubcommand(sub =>
            sub.setName('maxchannels')
                .setDescription('Set max temp VCs per user')
                .addIntegerOption(opt =>
                    opt.setName('amount')
                        .setDescription('Max channels (1-10)')
                        .setRequired(true)
                        .setMinValue(1)
                        .setMaxValue(10)
                )
        )
        .addSubcommand(sub =>
            sub.setName('deletedelay')
                .setDescription('Set delay before empty VCs are deleted')
                .addIntegerOption(opt =>
                    opt.setName('seconds')
                        .setDescription('Delay in seconds (0 = instant)')
                        .setRequired(true)
                        .setMinValue(0)
                        .setMaxValue(300)
                )
        )
        .addSubcommand(sub =>
            sub.setName('activityrename')
                .setDescription('Toggle activity-based VC renaming')
                .addBooleanOption(opt =>
                    opt.setName('enabled')
                        .setDescription('Enable or disable')
                        .setRequired(true)
                )
        )
        .addSubcommand(sub =>
            sub.setName('waitingroom')
                .setDescription('Configure the waiting room system')
                .addBooleanOption(opt =>
                    opt.setName('enabled')
                        .setDescription('Enable or disable waiting room')
                        .setRequired(true)
                )
                .addChannelOption(opt =>
                    opt.setName('channel')
                        .setDescription('Waiting room voice channel')
                        .setRequired(false)
                        .addChannelTypes(ChannelType.GuildVoice)
                )
        )
        .addSubcommand(sub =>
            sub.setName('view')
                .setDescription('View current server configuration')
        )
        .addSubcommand(sub =>
            sub.setName('reset')
                .setDescription('Reset all configuration to defaults')
        ),

    async execute(interaction, client) {
        const subcommand = interaction.options.getSubcommand();

        let config = await GuildConfig.findOne({ guildId: interaction.guild.id });
        if (!config) {
            config = await GuildConfig.create({ guildId: interaction.guild.id });
        }

        switch (subcommand) {
            case 'create': return handleCreate(interaction, client, config);
            case 'role': return handleRole(interaction, client, config);
            case 'logchannel': return handleLogChannel(interaction, client, config);
            case 'blacklist': return handleBlacklist(interaction, client, config);
            case 'cooldown': return handleCooldown(interaction, client, config);
            case 'maxchannels': return handleMaxChannels(interaction, client, config);
            case 'deletedelay': return handleDeleteDelay(interaction, client, config);
            case 'activityrename': return handleActivityRename(interaction, client, config);
            case 'waitingroom': return handleWaitingRoom(interaction, client, config);
            case 'view': return handleView(interaction, client, config);
            case 'reset': return handleReset(interaction, client, config);
        }
    }
};

async function handleCreate(interaction, client, config) {
    const channel = interaction.options.getChannel('channel');
    const category = interaction.options.getChannel('category');
    const naming = interaction.options.getString('naming') || 'owner';
    const customName = interaction.options.getString('customname');
    const textChannel = interaction.options.getBoolean('textchannel') || false;

    // Check if channel already exists
    const exists = config.createChannels.find(c => c.channelId === channel.id);
    if (exists) {
        return interaction.reply({
            embeds: [buildEmbed('error', 'That channel is already set up as a Join-to-Create channel.')],
            ephemeral: true
        });
    }

    config.createChannels.push({
        channelId: channel.id,
        categoryId: category?.id || null,
        namingStyle: naming,
        customName: customName || null,
        createTextChannel: textChannel
    });

    await config.save();

    const description = [
        `✅ **Join-to-Create** channel configured!`,
        ``,
        `📢 Channel: <#${channel.id}>`,
        category ? `📁 Category: <#${category.id}>` : '📁 Category: Same as Join channel',
        `🏷️ Naming: **${naming}**`,
        customName ? `✏️ Custom: ${customName}` : null,
        `📝 Text Channel: ${textChannel ? 'Yes' : 'No'}`
    ].filter(Boolean).join('\n');

    return interaction.reply({
        embeds: [{ color: 0x57F287, title: '⚙️ Setup Complete', description }],
        ephemeral: true
    });
}

async function handleRole(interaction, client, config) {
    const role = interaction.options.getRole('role');
    const category = interaction.options.getChannel('category');
    const naming = interaction.options.getString('naming') || 'owner';

    // Remove existing mapping for this role
    config.roleMappings = config.roleMappings.filter(m => m.roleId !== role.id);

    config.roleMappings.push({
        roleId: role.id,
        categoryId: category.id,
        categoryName: category.name,
        namingStyle: naming
    });

    await config.save();

    return interaction.reply({
        embeds: [buildEmbed('success', `🗺️ Role **${role.name}** mapped to category **${category.name}** with **${naming}** naming.`)],
        ephemeral: true
    });
}

async function handleLogChannel(interaction, client, config) {
    const channel = interaction.options.getChannel('channel');
    config.logChannelId = channel.id;
    await config.save();

    return interaction.reply({
        embeds: [buildEmbed('success', `📋 Log channel set to <#${channel.id}>`)],
        ephemeral: true
    });
}

async function handleBlacklist(interaction, client, config) {
    const user = interaction.options.getUser('user');
    const isBlacklisted = config.blacklist.includes(user.id);

    if (isBlacklisted) {
        config.blacklist = config.blacklist.filter(id => id !== user.id);
        await config.save();
        return interaction.reply({
            embeds: [buildEmbed('success', `✅ **${user.tag}** removed from blacklist.`)],
            ephemeral: true
        });
    } else {
        config.blacklist.push(user.id);
        await config.save();
        return interaction.reply({
            embeds: [buildEmbed('success', `🚫 **${user.tag}** added to blacklist.`)],
            ephemeral: true
        });
    }
}

async function handleCooldown(interaction, client, config) {
    const seconds = interaction.options.getInteger('seconds');
    config.cooldown = seconds * 1000;
    await config.save();

    return interaction.reply({
        embeds: [buildEmbed('success', `⏱️ Cooldown set to **${seconds === 0 ? 'Disabled' : seconds + ' seconds'}**`)],
        ephemeral: true
    });
}

async function handleMaxChannels(interaction, client, config) {
    const amount = interaction.options.getInteger('amount');
    config.maxChannelsPerUser = amount;
    await config.save();

    return interaction.reply({
        embeds: [buildEmbed('success', `📊 Max channels per user set to **${amount}**`)],
        ephemeral: true
    });
}

async function handleDeleteDelay(interaction, client, config) {
    const seconds = interaction.options.getInteger('seconds');
    config.deleteDelay = seconds;
    await config.save();

    return interaction.reply({
        embeds: [buildEmbed('success', `⏳ Delete delay set to **${seconds === 0 ? 'Instant' : seconds + ' seconds'}**`)],
        ephemeral: true
    });
}

async function handleActivityRename(interaction, client, config) {
    const enabled = interaction.options.getBoolean('enabled');
    config.activityRename = enabled;
    await config.save();

    return interaction.reply({
        embeds: [buildEmbed('success', `🎮 Activity rename **${enabled ? 'enabled' : 'disabled'}**`)],
        ephemeral: true
    });
}

async function handleWaitingRoom(interaction, client, config) {
    const enabled = interaction.options.getBoolean('enabled');
    const channel = interaction.options.getChannel('channel');

    config.waitingRoomEnabled = enabled;
    if (channel) config.waitingRoomChannelId = channel.id;
    if (!enabled) config.waitingRoomChannelId = null;

    await config.save();

    return interaction.reply({
        embeds: [buildEmbed('success', `🎫 Waiting room **${enabled ? 'enabled' : 'disabled'}**${channel ? ` with channel <#${channel.id}>` : ''}`)],
        ephemeral: true
    });
}

async function handleView(interaction, client, config) {
    const channels = config.createChannels.map(c => {
        return `📢 <#${c.channelId}> → 📁 ${c.categoryId ? `<#${c.categoryId}>` : 'Same'} (${c.namingStyle})`;
    }).join('\n') || 'None configured';

    const roles = config.roleMappings.map(m => {
        return `<@&${m.roleId}> → 📁 <#${m.categoryId}> (${m.namingStyle})`;
    }).join('\n') || 'None configured';

    const fields = [
        { name: '📢 Create Channels', value: channels, inline: false },
        { name: '🗺️ Role Mappings', value: roles, inline: false },
        { name: '📋 Log Channel', value: config.logChannelId ? `<#${config.logChannelId}>` : 'Not set', inline: true },
        { name: '⏱️ Cooldown', value: `${config.cooldown / 1000}s`, inline: true },
        { name: '📊 Max Channels/User', value: `${config.maxChannelsPerUser}`, inline: true },
        { name: '⏳ Delete Delay', value: `${config.deleteDelay}s`, inline: true },
        { name: '🎮 Activity Rename', value: config.activityRename ? 'Enabled' : 'Disabled', inline: true },
        { name: '🎫 Waiting Room', value: config.waitingRoomEnabled ? 'Enabled' : 'Disabled', inline: true },
        { name: '🚫 Blacklisted Users', value: config.blacklist.length > 0 ? config.blacklist.map(id => `<@${id}>`).join(', ') : 'None', inline: false }
    ];

    return interaction.reply({
        embeds: [{
            color: 0x5865F2,
            title: `⚙️ Configuration for ${interaction.guild.name}`,
            fields,
            timestamp: new Date().toISOString()
        }],
        ephemeral: true
    });
}

async function handleReset(interaction, client, config) {
    await GuildConfig.deleteOne({ guildId: interaction.guild.id });
    await GuildConfig.create({ guildId: interaction.guild.id });

    return interaction.reply({
        embeds: [buildEmbed('success', '🔄 All configuration reset to defaults!')],
        ephemeral: true
    });
}