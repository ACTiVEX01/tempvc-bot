/**
 * Build a standardized embed message
 * @param {string} type - 'success', 'error', 'warning', 'info'
 * @param {string} message - The description text
 * @returns {Object} Discord embed object
 */
function buildEmbed(type, message) {
    const colors = {
        success: 0x57F287,  // Green
        error: 0xED4245,    // Red
        warning: 0xFEE75C,  // Yellow
        info: 0x5865F2      // Blurple
    };

    const emojis = {
        success: '✅',
        error: '❌',
        warning: '⚠️',
        info: 'ℹ️'
    };

    return {
        color: colors[type] || colors.info,
        description: `${emojis[type] || ''} ${message}`,
        timestamp: new Date().toISOString()
    };
}

module.exports = { buildEmbed };