const { optional } = require('telegraf')

module.exports = (...fns) => optional(ctx => ctx.message && !ctx.message.forward_from, ...fns)
