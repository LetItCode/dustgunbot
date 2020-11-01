const { branch } = require('telegraf')

module.exports = (trueMiddleware, falseMiddleware) =>
  branch(ctx => ctx.message && ctx.message.dice && ctx.message.dice.emoji === '🎰', trueMiddleware, falseMiddleware)
