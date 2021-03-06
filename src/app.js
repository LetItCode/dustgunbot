require('dotenv').config()
const debug = require('debug')('dg:app')
const { Telegraf, groupChat, fork, compose } = require('telegraf')
const TelegrafI18n = require('telegraf-i18n')
const rateLimit = require('telegraf-ratelimit')
const path = require('path')
const helpers = require('./helpers')
const database = require('./database')
const { notForward, casino } = require('./middleware')
const { dice, spin, top } = require('./handlers')

const i18n = new TelegrafI18n({
  defaultLanguage: 'ru',
  directory: path.resolve(__dirname, 'locales')
})

const diceLimit = rateLimit({ window: 5 * 60 * 1000, limit: 1 })
const spinLimit = rateLimit({ window: 30 * 1000, limit: 1 })

const bot = new Telegraf(process.env.BOT_TOKEN)
bot.context.h = helpers
bot.context.db = database(process.env.MONGO_URI)
bot.use(i18n)
bot.on('dice', groupChat(notForward(casino(compose([spinLimit, fork(spin)]), compose([diceLimit, fork(dice)])))))
bot.hears(/^\/top(?<kind>exp)?($|@)/, groupChat(top))
bot.catch(err => debug(err))
bot.launch()
