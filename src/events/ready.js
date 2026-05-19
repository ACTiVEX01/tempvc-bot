const TempChannel = require('../models/TempChannel');
const GuildConfig = require('../models/GuildConfig');

module.exports = {
    name: 'ready',
    once: true,
    async execute(client) {
        console.log(`✅ ${client.user.tag} is online!`);
        console.log(`📡 Serving ${client.guilds.cache.size} guilds`);

        client.user.setActivity('/vc help | TempVC Bot');

        // ─── Cleanup orphaned temp channels ──────────────────
        try {
            const allTempChannels = await TempChannel.find({});
            let cleaned = 0;

            for (const temp of allTempChannels) {
                const guild = client.guilds.cache.get(temp.guildId);
                if (!guild) {
                    await TempChannel.deleteOne({ channelId: temp.channelId });
                    cleaned++;
                    continue;
                }

                const channel = guild.channels.cache.get(temp.channelId);
                if (!channel) {
                    // Also clean linked text channel
                    if (temp.linkedTextChannelId) {
                        const tc = guild.channels.cache.get(temp.linkedTextChannelId);
                        if (tc) await tc.delete().catch(() => {});
                    }
                    await TempChannel.deleteOne({ channelId: temp.channelId });
                    cleaned++;
                    continue;
                }

                // Check if channel is empty
                if (channel.members.size === 0) {
                    const config = await GuildConfig.findOne({ guildId: temp.guildId });
                    const delay = config?.deleteDelay || 30;

                    setTimeout(async () => {
                        const ch = guild.channels.cache.get(temp.channelId);
                        if (ch && ch.members.size === 0) {
                            await ch.delete().catch(() => {});
                            if (temp.linkedTextChannelId) {
                                const tc = guild.channels.cache.get(temp.linkedTextChannelId);
                                if (tc) await tc.delete().catch(() => {});
                            }
                            await TempChannel.deleteOne({ channelId: temp.channelId });
                        }
                    }, delay * 1000);
                }

                // Cache the temp channel for quick lookup
                client.tempVCCache.set(temp.channelId, temp);
            }

            console.log(`🧹 Cleaned ${cleaned} orphaned temp channels`);
        } catch (err) {
            console.error('Cleanup error:', err);
        }

        // ─── Ensure guild configs exist ──────────────────────
        for (const [guildId, guild] of client.guilds.cache) {
            try {
                await GuildConfig.findOneAndUpdate(
                    { guildId },
                    { $setOnInsert: { guildId } },
                    { upsert: true, new: true }
                );
            } catch (err) {
                console.error(`Config init error for ${guildId}:`, err);
            }
        }
    }
};