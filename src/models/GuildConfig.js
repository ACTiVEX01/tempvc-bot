const mongoose = require('mongoose');

const guildConfigSchema = new mongoose.Schema({
    guildId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    createChannels: [{
        channelId: { type: String, required: true },
        categoryId: { type: String, default: null },
        namingStyle: {
            type: String,
            enum: ['owner', 'numbered', 'activity', 'custom'],
            default: 'owner'
        },
        customName: { type: String, default: null },
        createTextChannel: { type: Boolean, default: false }
    }],
    roleMappings: [{
        roleId: { type: String, required: true },
        categoryId: { type: String, required: true },
        categoryName: { type: String, default: 'Temp VCs' },
        namingStyle: {
            type: String,
            enum: ['owner', 'numbered', 'activity', 'custom'],
            default: 'owner'
        }
    }],
    blacklist: [{ type: String }],
    blacklistRoles: [{ type: String }],
    cooldown: {
        type: Number,
        default: 30000
    },
    maxChannelsPerUser: {
        type: Number,
        default: 3
    },
    logChannelId: {
        type: String,
        default: null
    },
    waitingRoomEnabled: {
        type: Boolean,
        default: false
    },
    waitingRoomChannelId: {
        type: String,
        default: null
    },
    activityRename: {
        type: Boolean,
        default: false
    },
    deleteDelay: {
        type: Number,
        default: 30
    },
    defaultBitrate: {
        type: Number,
        default: 64000
    },
    defaultLimit: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('GuildConfig', guildConfigSchema);