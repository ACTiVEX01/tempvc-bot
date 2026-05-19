const mongoose = require('mongoose');

const userSettingsSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    presets: [{
        name: { type: String, required: true },
        settings: {
            bitrate: { type: Number, default: 64000 },
            limit: { type: Number, default: 0 },
            region: { type: String, default: null },
            isLocked: { type: Boolean, default: false },
            isHidden: { type: Boolean, default: false },
            name: { type: String, default: null }
        }
    }],
    preferences: {
        defaultName: { type: String, default: null },
        defaultLocked: { type: Boolean, default: false },
        defaultHidden: { type: Boolean, default: false },
        defaultLimit: { type: Number, default: 0 },
        defaultBitrate: { type: Number, default: 64000 }
    },
    totalVCCreated: { type: Number, default: 0 },
    totalTimeInVC: { type: Number, default: 0 }
}, {
    timestamps: true
});

module.exports = mongoose.model('UserSettings', userSettingsSchema);