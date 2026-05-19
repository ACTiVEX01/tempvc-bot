const TempChannel = require('../models/TempChannel');
const GuildConfig = require('../models/GuildConfig');

module.exports = {
    name: 'interactionCreate',
    async execute(interaction, client) {
        // ─── Slash Commands ───────────────────────────────────
        if (interaction.isChatInputCommand()) {
            const command = client.commands.get(interaction.commandName);
            if (!command) return;

            try {
                await command.execute(interaction, client);
            } catch (error) {
                console.error(`Command error [${interaction.commandName}]:`, error);

                const errorMsg = {
                    content: '❌ There was an error executing this command.',
                    ephemeral: true
                };

                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp(errorMsg).catch(() => {});
                } else {
                    await interaction.reply(errorMsg).catch(() => {});
                }
            }
            return;
        }

        // ─── Button Interactions ──────────────────────────────
        if (interaction.isButton()) {
            await handleButton(interaction, client);
            return;
        }

        // ─── Modal Submissions ────────────────────────────────
        if (interaction.isModalSubmit()) {
            await handleModal(interaction, client);
            return;
        }

        // ─── Select Menu ──────────────────────────────────────
        if (interaction.isStringSelectMenu()) {
            await handleSelectMenu(interaction, client);
            return;
        }
    }
};

async function handleButton(interaction, client) {
    const customId = interaction.customId;
    const parts = customId.split(':');

    if (parts[0] !== 'vc') return;

    const action = parts[1];
    const channelId = parts[2];
    const targetUserId = parts[3]; // For wait list buttons

    const tempChannel = await TempChannel.findOne({ channelId });
    if (!tempChannel) {
        return interaction.reply({ content: '❌ This voice channel no longer exists.', ephemeral: true });
    }

    // ─── Control Panel Buttons ───────────────────────────────
    const controlActions = ['lock', 'unlock', 'hide', 'show', 'delete', 'rename', 'limit', 'transfer', 'kick', 'block_btn', 'claim'];

    if (controlActions.includes(action)) {
        // Only the owner can use control panel (except claim)
        if (action !== 'claim' && interaction.user.id !== tempChannel.ownerId) {
            return interaction.reply({ content: '❌ Only the channel owner can use this.', ephemeral: true });
        }

        const guild = interaction.guild;
        const channel = guild.channels.cache.get(channelId);
        if (!channel) {
            return interaction.reply({ content: '❌ Channel not found.', ephemeral: true });
        }

        switch (action) {
            case 'lock': {
                await channel.permissionOverwrites.edit(guild.roles.everyone, {
                    Connect: false
                });
                await TempChannel.updateOne({ channelId }, { $set: { isLocked: true } });
                await interaction.reply({ content: '🔒 Channel locked!', ephemeral: true });
                break;
            }
            case 'unlock': {
                await channel.permissionOverwrites.edit(guild.roles.everyone, {
                    Connect: null
                });
                await TempChannel.updateOne({ channelId }, { $set: { isLocked: false } });
                await interaction.reply({ content: '🔓 Channel unlocked!', ephemeral: true });
                break;
            }
            case 'hide': {
                await channel.permissionOverwrites.edit(guild.roles.everyone, {
                    ViewChannel: false
                });
                await TempChannel.updateOne({ channelId }, { $set: { isHidden: true } });
                await interaction.reply({ content: '👁️ Channel hidden!', ephemeral: true });
                break;
            }
            case 'show': {
                await channel.permissionOverwrites.edit(guild.roles.everyone, {
                    ViewChannel: null
                });
                await TempChannel.updateOne({ channelId }, { $set: { isHidden: false } });
                await interaction.reply({ content: '👁️‍🗨️ Channel visible!', ephemeral: true });
                break;
            }
            case 'delete': {
                const { deleteTempVC } = require('../utils/channelManager');
                await deleteTempVC(client, tempChannel, guild);
                await interaction.reply({ content: '🗑️ Channel deleted!', ephemeral: true });
                return;
            }
            case 'rename': {
                const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');
                const modal = new ModalBuilder()
                    .setCustomId(`vc:modal:rename:${channelId}`)
                    .setTitle('Rename Voice Channel');

                const nameInput = new TextInputBuilder()
                    .setCustomId('vc:input:rename')
                    .setLabel('New Channel Name')
                    .setStyle(TextInputStyle.Short)
                    .setPlaceholder('Enter new name...')
                    .setRequired(true)
                    .setMaxLength(100);

                modal.addComponents(new ActionRowBuilder().addComponents(nameInput));
                await interaction.showModal(modal);
                return;
            }
            case 'limit': {
                const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');
                const modal = new ModalBuilder()
                    .setCustomId(`vc:modal:limit:${channelId}`)
                    .setTitle('Set User Limit');

                const limitInput = new TextInputBuilder()
                    .setCustomId('vc:input:limit')
                    .setLabel('User Limit (0 = unlimited)')
                    .setStyle(TextInputStyle.Short)
                    .setPlaceholder('0')
                    .setRequired(true);

                modal.addComponents(new ActionRowBuilder().addComponents(limitInput));
                await interaction.showModal(modal);
                return;
            }
            case 'transfer': {
                const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');
                const modal = new ModalBuilder()
                    .setCustomId(`vc:modal:transfer:${channelId}`)
                    .setTitle('Transfer Ownership');

                const userInput = new TextInputBuilder()
                    .setCustomId('vc:input:transfer')
                    .setLabel('User ID of new owner')
                    .setStyle(TextInputStyle.Short)
                    .setPlaceholder('Paste the user ID here')
                    .setRequired(true);

                modal.addComponents(new ActionRowBuilder().addComponents(userInput));
                await interaction.showModal(modal);
                return;
            }
            case 'kick': {
                const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');
                const modal = new ModalBuilder()
                    .setCustomId(`vc:modal:kick:${channelId}`)
                    .setTitle('Kick User from VC');

                const userInput = new TextInputBuilder()
                    .setCustomId('vc:input:kick')
                    .setLabel('User ID to kick')
                    .setStyle(TextInputStyle.Short)
                    .setPlaceholder('Paste the user ID here')
                    .setRequired(true);

                modal.addComponents(new ActionRowBuilder().addComponents(userInput));
                await interaction.showModal(modal);
                return;
            }
            case 'block_btn': {
                const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');
                const modal = new ModalBuilder()
                    .setCustomId(`vc:modal:block:${channelId}`)
                    .setTitle('Block User from VC');

                const userInput = new TextInputBuilder()
                    .setCustomId('vc:input:block')
                    .setLabel('User ID to block')
                    .setStyle(TextInputStyle.Short)
                    .setPlaceholder('Paste the user ID here')
                    .setRequired(true);

                modal.addComponents(new ActionRowBuilder().addComponents(userInput));
                await interaction.showModal(modal);
                return;
            }
            case 'claim': {
                if (tempChannel.ownerId === interaction.user.id) {
                    return interaction.reply({ content: '❌ You already own this channel.', ephemeral: true });
                }

                // Check if owner is still in the channel
                const channel2 = interaction.guild.channels.cache.get(channelId);
                if (channel2) {
                    const ownerInChannel = channel2.members.has(tempChannel.ownerId);
                    if (ownerInChannel) {
                        return interaction.reply({ content: '❌ The owner is still in the channel.', ephemeral: true });
                    }
                }

                await TempChannel.updateOne(
                    { channelId },
                    { $set: { ownerId: interaction.user.id } }
                );

                await interaction.reply({ content: '👑 You are now the owner of this channel!', ephemeral: true });
                break;
            }
        }

        // Refresh control panel
        const updatedTemp = await TempChannel.findOne({ channelId });
        if (updatedTemp) {
            const { sendControlPanel } = require('../utils/channelManager');
            await sendControlPanel(client, updatedTemp, interaction.guild);
        }
        return;
    }

    // ─── Waiting Room Buttons ────────────────────────────────
    if (['wait:accept', 'wait:reject', 'wait:block'].includes(action)) {
        if (interaction.user.id !== tempChannel.ownerId) {
            return interaction.reply({ content: '❌ Only the owner can manage waitlist.', ephemeral: true });
        }

        const targetMember = await interaction.guild.members.fetch(targetUserId).catch(() => null);
        if (!targetMember) {
            return interaction.reply({ content: '❌ User not found.', ephemeral: true });
        }

        const channel = interaction.guild.channels.cache.get(channelId);

        switch (action) {
            case 'wait:accept': {
                // Add to permitted users
                await TempChannel.updateOne(
                    { channelId },
                    {
                        $addToSet: { permittedUsers: targetUserId },
                        $pull: { waitingUsers: { userId: targetUserId } }
                    }
                );

                // Move user to VC
                if (channel) {
                    await channel.permissionOverwrites.edit(targetUserId, { Connect: true });
                    await targetMember.voice.setChannel(channel).catch(() => {});
                }

                await interaction.reply({ content: `✅ Accepted **${targetMember.user.tag}**!`, ephemeral: true });

                try {
                    await targetMember.send({
                        embeds: [{
                            color: 0x57F287,
                            description: `✅ You've been accepted into the voice channel!`
                        }]
                    }).catch(() => {});
                } catch {}
                break;
            }
            case 'wait:reject': {
                await TempChannel.updateOne(
                    { channelId },
                    { $pull: { waitingUsers: { userId: targetUserId } } }
                );

                // Disconnect from waiting room
                await targetMember.voice.disconnect('Rejected from VC').catch(() => {});

                await interaction.reply({ content: `❌ Rejected **${targetMember.user.tag}**.`, ephemeral: true });
                break;
            }
            case 'wait:block': {
                await TempChannel.updateOne(
                    { channelId },
                    {
                        $addToSet: { blockedUsers: targetUserId },
                        $pull: { waitingUsers: { userId: targetUserId } }
                    }
                );

                await targetMember.voice.disconnect('Blocked from VC').catch(() => {});

                await interaction.reply({ content: `🚫 Blocked **${targetMember.user.tag}**.`, ephemeral: true });
                break;
            }
        }

        // Update the message to show it's been handled
        try {
            const row = interaction.message.components[0];
            if (row) {
                const disabledRow = row;
                // Disable buttons
                await interaction.message.edit({ components: [] }).catch(() => {});
            }
        } catch {}
        return;
    }
}

async function handleModal(interaction, client) {
    const customId = interaction.customId;
    const parts = customId.split(':');

    if (parts[0] !== 'vc' || parts[1] !== 'modal') return;

    const action = parts[2];
    const channelId = parts[3];

    const tempChannel = await TempChannel.findOne({ channelId });
    if (!tempChannel) {
        return interaction.reply({ content: '❌ Channel no longer exists.', ephemeral: true });
    }

    if (interaction.user.id !== tempChannel.ownerId) {
        return interaction.reply({ content: '❌ Only the owner can do this.', ephemeral: true });
    }

    const channel = interaction.guild.channels.cache.get(channelId);
    if (!channel) {
        return interaction.reply({ content: '❌ Channel not found.', ephemeral: true });
    }

    switch (action) {
        case 'rename': {
            const newName = interaction.fields.getTextInputValue('vc:input:rename');
            await channel.setName(newName);
            await interaction.reply({ content: `✏️ Channel renamed to **${newName}**!`, ephemeral: true });
            break;
        }
        case 'limit': {
            const limit = parseInt(interaction.fields.getTextInputValue('vc:input:limit'));
            if (isNaN(limit) || limit < 0 || limit > 99) {
                return interaction.reply({ content: '❌ Invalid limit. Must be 0-99.', ephemeral: true });
            }
            await channel.setUserLimit(limit);
            await TempChannel.updateOne({ channelId }, { $set: { 'settings.limit': limit } });
            await interaction.reply({ content: `👥 User limit set to **${limit === 0 ? 'Unlimited' : limit}**!`, ephemeral: true });
            break;
        }
        case 'transfer': {
            const newOwnerId = interaction.fields.getTextInputValue('vc:input:transfer').trim();
            const newOwner = await interaction.guild.members.fetch(newOwnerId).catch(() => null);
            if (!newOwner) {
                return interaction.reply({ content: '❌ User not found.', ephemeral: true });
            }

            const oldOwnerTag = interaction.user.tag;
            await TempChannel.updateOne({ channelId }, { $set: { ownerId: newOwnerId } });

            // Update permissions
            await channel.permissionOverwrites.edit(interaction.user.id, {
                ManageChannels: null,
                MoveMembers: null
            }).catch(() => {});
            await channel.permissionOverwrites.edit(newOwnerId, {
                ManageChannels: true,
                MoveMembers: true
            }).catch(() => {});

            await interaction.reply({ content: `👑 Ownership transferred to **${newOwner.user.tag}**!`, ephemeral: true });

            // Log
            const { logEvent } = require('./voiceStateUpdate');
            const config = await GuildConfig.findOne({ guildId: interaction.guild.id });
            await logEvent(client, config, interaction.guild, 'vc_transfer', {
                oldOwner: oldOwnerTag,
                newOwner: newOwner.user.tag
            });
            break;
        }
        case 'kick': {
            const kickUserId = interaction.fields.getTextInputValue('vc:input:kick').trim();
            const kickMember = await interaction.guild.members.fetch(kickUserId).catch(() => null);
            if (!kickMember) {
                return interaction.reply({ content: '❌ User not found.', ephemeral: true });
            }
            if (!kickMember.voice || kickMember.voice.channelId !== channelId) {
                return interaction.reply({ content: '❌ User is not in your VC.', ephemeral: true });
            }
            await kickMember.voice.disconnect('Kicked by owner').catch(() => {});
            await interaction.reply({ content: `👢 Kicked **${kickMember.user.tag}**!`, ephemeral: true });
            break;
        }
        case 'block': {
            const blockUserId = interaction.fields.getTextInputValue('vc:input:block').trim();
            await TempChannel.updateOne(
                { channelId },
                {
                    $addToSet: { blockedUsers: blockUserId },
                    $pull: { permittedUsers: blockUserId }
                }
            );

            // Kick if in channel
            const blockMember = await interaction.guild.members.fetch(blockUserId).catch(() => null);
            if (blockMember && blockMember.voice?.channelId === channelId) {
                await blockMember.voice.disconnect('Blocked by owner').catch(() => {});
            }

            await interaction.reply({ content: `🚫 Blocked user!`, ephemeral: true });

            const { logEvent } = require('./voiceStateUpdate');
            const config = await GuildConfig.findOne({ guildId: interaction.guild.id });
            await logEvent(client, config, interaction.guild, 'vc_block', {
                blockedBy: interaction.user.tag,
                blockedUser: blockMember?.user?.tag || blockUserId
            });
            break;
        }
    }

    // Refresh control panel
    const updatedTemp = await TempChannel.findOne({ channelId });
    if (updatedTemp) {
        const { sendControlPanel } = require('../utils/channelManager');
        await sendControlPanel(client, updatedTemp, interaction.guild);
    }
}

async function handleSelectMenu(interaction, client) {
    // Reserved for future select menu interactions
    // e.g., preset selection dropdown
}