async function safeDefer(interaction) {
    try {
        await interaction.deferReply();
    } catch (err) {
        if (err.code !== 10062) throw err;
        const channel = interaction.channel;
        if (!channel) return;
        const mention = `<@${interaction.user.id}>`;
        interaction.editReply = (opts) => {
            if (typeof opts === 'string') return channel.send({ content: `${mention} ${opts}` });
            const { flags, ephemeral, ...rest } = opts;
            return channel.send({ content: mention, ...rest });
        };
        interaction.followUp = (opts) => {
            if (typeof opts === 'string') return channel.send({ content: `${mention} ${opts}` });
            const { flags, ephemeral, ...rest } = opts;
            return channel.send({ content: mention, ...rest });
        };
    }
}

module.exports = { safeDefer };
