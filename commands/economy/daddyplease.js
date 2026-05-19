const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getBalance, addBalance, getLoan, issueLoan, setLoanCooldown } = require('../../utils/currency');

const INTEREST_RATE = 0.25;
const MAX_LOAN = 5000;
const COOLDOWN_MS = 60 * 60 * 1000; // 1 hour

module.exports = {
  data: new SlashCommandBuilder()
    .setName('daddyplease')
    .setDescription('Ask Big Boi Bot for a loan — but you gotta win a coinflip to get it')
    .addIntegerOption(opt =>
      opt.setName('amount')
        .setDescription(`Amount to borrow (max ${MAX_LOAN.toLocaleString()} coins)`)
        .setRequired(true)
        .setMinValue(100)
        .setMaxValue(MAX_LOAN)
    ),

  async execute(interaction) {
    const userId = interaction.user.id;
    const guildId = interaction.guildId;
    const amount = interaction.options.getInteger('amount');
    const now = Date.now();

    const loan = getLoan(userId, guildId);

    if (loan.owed > 0) {
      return interaction.reply({
        content: `You already owe Big Boi Bot **${loan.owed.toLocaleString()} coins**. Pay that back first with \`/repay\`.`,
        flags: 64,
      });
    }

    if (loan.cooldown_until > now) {
      const remaining = Math.ceil((loan.cooldown_until - now) / 60000);
      return interaction.reply({
        content: `Big Boi Bot already said no. Come back in **${remaining} minute${remaining !== 1 ? 's' : ''}**.`,
        flags: 64,
      });
    }

    const won = Math.random() < 0.5;

    if (!won) {
      setLoanCooldown(userId, guildId, now + COOLDOWN_MS);

      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xed4245)
            .setTitle('🪙 Loan DENIED')
            .setDescription(`Big Boi Bot flipped a coin... and it came up **tails**.\n\n**Application rejected.** Try again in 1 hour.`)
            .addFields({ name: 'Requested', value: `${amount.toLocaleString()} coins`, inline: true })
            .setFooter({ text: 'Maybe get a job instead.' }),
        ],
      });
    }

    const owed = Math.ceil(amount * (1 + INTEREST_RATE));
    issueLoan(userId, guildId, amount, owed);
    addBalance(userId, guildId, amount);

    const newBalance = getBalance(userId, guildId);

    return interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0x57f287)
          .setTitle('🪙 DADDY APPROVES')
          .setDescription(`Big Boi Bot flipped a coin... and it came up **heads**.\n\n**DADDY APPROVES. You're in debt.**`)
          .addFields(
            { name: 'Received', value: `${amount.toLocaleString()} coins`, inline: true },
            { name: 'You Owe Back', value: `${owed.toLocaleString()} coins`, inline: true },
            { name: 'Interest', value: `${INTEREST_RATE * 100}%`, inline: true },
            { name: 'New Balance', value: `${newBalance.toLocaleString()} coins`, inline: false },
          )
          .setFooter({ text: 'Pay it back with /repay. Big Boi Bot knows where you live.' }),
      ],
    });
  },
};
