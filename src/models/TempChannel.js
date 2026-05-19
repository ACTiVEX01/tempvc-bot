const mongoose = require('mongoose');

const tempChannelSchema = new mongoose.Schema({
    channelId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    guildId: {
        type: String,
        required: true,
        index: true
    },
    ownerId: {
        type: String,
        required: true,
        index: true
    },
    categoryId: {
        type: String,
        default: null
    },
    isLocked: {
        type: Boolean,
        default: false
    },
    isHidden: {
        type: Boolean,
        default: false
    },
    password: {
        type: String,
        default: null
    },
    blockedUsers: [{ type: String }],
    permittedUsers: [{ type: String }],
    mutedUsers: [{ type: String }],
    waitingUsers: [{
        userId: { type: String, required: true },
        reason: { type: String, default: null },
        requestedAt: { type: Date, default: Date.now }
    }],
    guestAccess: [{
        userId: { type: String, required: true },
        expiresAt: { type: Date, required: true }
    }],
    autoAcceptRoles: [{ type: String }],
    linkedTextChannelId: {
        type: String,
        default: null
    },
    settings: {
        bitrate: { type: Number, default: 64000 },
        region: { type: String, default: null },
        limit: { type: Number, default: 0 }
    },
    controlPanelMessageId: {
        type: String,
        default: null
    },
    createdAt: {
        type: Date,
        default: Date.now,
        expires: 86400 // TTL: auto-remove docs after 24h (safety net)
    }
});

tempChannelSchema.index({ guildId: 1, ownerId: 1 });

module.exports = mongoose.model('TempChannel', tempChannelSchema);