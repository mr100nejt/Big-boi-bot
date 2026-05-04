const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

const BASE = 'https://overfast-api.tekrop.fr';

const ROLE_EMOJI = { tank: '🛡️', damage: '⚔️', support: '💚' };
const RANK_COLORS = {
  bronze: 0xcd7f32, silver: 0xc0c0c0, gold: 0xffd700,
  platinum: 0x00b4d8, diamond: 0x00f5d4, master: 0x9b5de5,
  grandmaster: 0xf15bb5, champion: 0xff6b6b
};

function rankColor(summary) {
  for (const role of ['tank', 'damage', 'support']) {
    const div = summary?.competitive?.pc?.[role]?.division;
    if (div && RANK_COLORS[div]) return RANK_COLORS[div];
  }
  return 0x5865f2;
}

function formatRank(roleData) {
  if (!roleData) return 'Unranked';
  return `${roleData.division.charAt(0).toUpperCase() + roleData.division.slice(1)} ${roleData.tier}`;
}

function formatTime(seconds) {
  if (!seconds) return 'N/A';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('owstats')
    .setDescription('Look up an Overwatch 2 player\'s stats')
    .addStringOption(opt =>
      opt.setName('battletag')
        .setDescription('Player battletag (e.g. Username-1234)')
        .setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName('mode')
        .setDescription('Game mode (default: competitive)')
        .setRequired(false)
        .addChoices(
          { name: 'Competitive', value: 'competitive' },
          { name: 'Quickplay', value: 'quickplay' }
        )
    ),

  async execute(interaction) {
    await interaction.deferReply();

    const battletag = interaction.options.getString('battletag').trim();
    const mode = interaction.options.getString('mode') ?? 'competitive';
    const playerId = battletag.replace('#', '-');

    let summary, careerStats;

    try {
      const [summaryRes, statsRes] = await Promise.all([
        fetch(`${BASE}/players/${encodeURIComponent(playerId)}/summary`),
        fetch(`${BASE}/players/${encodeURIComponent(playerId)}/stats/career?gamemode=${mode}&platform=pc`)
      ]);

      if (summaryRes.status === 404) {
        return interaction.editReply(`Player **${battletag}** not found. Check the battletag uses \`Name-1234\` format.`);
      }
      if (summaryRes.status === 403 || statsRes.status === 403) {
        return interaction.editReply(`**${battletag}**'s profile is private. They need to set Career Profile to Public in OW2 settings (Options → Social).`);
      }
      if (!summaryRes.ok) throw new Error(`Summary API ${summaryRes.status}`);

      summary = await summaryRes.json();
      if (statsRes.ok) careerStats = await statsRes.json();
    } catch (err) {
      console.error('owstats error:', err.message);
      return interaction.editReply('Could not fetch stats. The API may be down — try again in a moment.');
    }

    const allHeroes = careerStats?.['all-heroes'];
    const game = allHeroes?.game ?? {};
    const combat = allHeroes?.combat ?? {};
    const average = allHeroes?.average ?? {};
    const best = allHeroes?.best ?? {};

    const topHeroes = careerStats
      ? Object.entries(careerStats)
          .filter(([key]) => key !== 'all-heroes')
          .map(([key, data]) => ({
            name: key,
            time: data?.game?.time_played ?? 0,
            wins: data?.game?.games_won ?? 0,
            winRate: data?.game?.win_percentage ?? 0,
            heroSpecific: data?.hero_specific ?? []
          }))
          .sort((a, b) => b.time - a.time)
          .slice(0, 5)
      : [];

    const pc = summary?.competitive?.pc;
    const season = pc?.season ? `Season ${pc.season}` : 'Current Season';

    const embed = new EmbedBuilder()
      .setColor(rankColor(summary))
      .setAuthor({ name: summary.username ?? battletag, iconURL: summary.avatar ?? null })
      .setThumbnail(summary.avatar ?? null)
      .setTitle(`OW2 Stats — ${mode.charAt(0).toUpperCase() + mode.slice(1)}`);

    if (mode === 'competitive') {
      embed.addFields({
        name: `Ranks (${season})`,
        value: [
          `${ROLE_EMOJI.tank} Tank: **${formatRank(pc?.tank)}**`,
          `${ROLE_EMOJI.damage} Damage: **${formatRank(pc?.damage)}**`,
          `${ROLE_EMOJI.support} Support: **${formatRank(pc?.support)}**`,
        ].join('\n'),
        inline: false
      });
    }

    if (allHeroes) {
      embed.addFields(
        {
          name: '📊 Career Stats (All-Time)',
          value: [
            `🕒 Time Played: **${formatTime(game.time_played)}**`,
            `🎮 Games: **${(game.games_played ?? 0).toLocaleString()}** played — **${(game.games_won ?? 0).toLocaleString()}** won`,
            `📈 Win Rate: **${game.win_percentage ?? 'N/A'}%**`,
          ].join('\n'),
          inline: false
        },
        {
          name: '⚔️ Combat',
          value: [
            `Eliminations: **${(combat.eliminations ?? 0).toLocaleString()}**`,
            `Deaths: **${(combat.deaths ?? 0).toLocaleString()}**`,
            `Final Blows: **${(combat.final_blows ?? 0).toLocaleString()}**`,
          ].join('\n'),
          inline: true
        },
        {
          name: '📉 Per 10 Min',
          value: [
            `Elims: **${average.eliminations_per_10_min ?? 'N/A'}**`,
            `Deaths: **${average.deaths_per_10_min ?? 'N/A'}**`,
            `Damage: **${average.all_damage_done_per_10_min ?? 'N/A'}**`,
          ].join('\n'),
          inline: true
        },
        {
          name: '🏆 Best Game',
          value: [
            `Elims: **${best.eliminations_most_in_game ?? 'N/A'}**`,
            `Kill Streak: **${best.kill_streak_best ?? 'N/A'}**`,
          ].join('\n'),
          inline: true
        }
      );
      if (topHeroes.length > 0) {
        for (const [i, h] of topHeroes.entries()) {
          const heroName = h.name.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
          const specificEntries = Array.isArray(h.heroSpecific)
            ? h.heroSpecific.slice(0, 4)
            : Object.entries(h.heroSpecific ?? {}).slice(0, 4).map(([key, value]) => ({ key, value }));

          const specificLines = specificEntries.map(s => {
            const label = s.key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
            const val = typeof s.value === 'number' ? s.value.toLocaleString() : s.value;
            return `${label}: **${val}**`;
          });

          embed.addFields({
            name: `${i + 1}. ${heroName} — ${formatTime(h.time)} | ${h.wins}W | ${h.winRate}% WR`,
            value: specificLines.length > 0 ? specificLines.join('\n') : 'No hero-specific stats available',
            inline: true
          });
        }
      }
    } else {
      embed.setDescription('No stats found — profile may be private or has no games played in this mode.');
    }

    embed.setFooter({ text: `Stats are career all-time (no season filter available) • OverFast API` });

    await interaction.editReply({ embeds: [embed] });
  }
};
