require('dotenv').config()
const debug = require('debug')('darts:app')
const { Telegraf, groupChat, fork } = require('telegraf')
const TelegrafI18n = require('telegraf-i18n')
const rateLimit = require('telegraf-ratelimit')
const path = require('path')
const helpers = require('./helpers')
const database = require('./database')

const i18n = new TelegrafI18n({
  defaultLanguage: 'ru',
  directory: path.resolve(__dirname, 'locales')
})

const diceLimit = rateLimit({ window: 5 * 60 * 1000, limit: 1 })

const bot = new Telegraf(process.env.BOT_TOKEN)
bot.context.h = helpers
bot.context.db = database(process.env.MONGO_URI)
bot.use(i18n, diceLimit)
bot.on('dice', groupChat(fork(dice)))
bot.catch(err => debug(err))
bot.launch()

// Handlers
async function dice (ctx) {
  const { from, message: { dice }, replyWithHTML, i18n, db, h } = ctx // prettier-ignore
  debug({ ...from, ...dice })

  const user = await db.User.findOneAndUpdate(
    { telegramId: from.id },
    {
      $setOnInsert: { dust: 1 },
      $set: {
        username: from.username,
        firstName: from.first_name,
        lastName: from.last_name
      }
    },
    { upsert: true, new: true }
  )

  await h.pause(4000)

  const change = calcReward(dice.value, user.dust)
  debug(`change: ${change}`)
  const text = i18n.t(change === 'brah' ? change : `msg${dice.value}`, {
    user: h.fullName(from),
    change: Math.abs(change)
  })
  db.User.reward(from.id, change)
  return replyWithHTML(text)
}

function calcReward (value, dust) {
  if (dust <= 1 && value <= 2) return 'brah'
  switch (value) {
    case 1: return -Math.ceil(dust / 2) // prettier-ignore
    case 2: return -1 // prettier-ignore
    case 3: return 0 // prettier-ignore
    case 4: return 1 // prettier-ignore
    case 5: return 3 // prettier-ignore
    case 6: return Math.ceil(dust) // prettier-ignore
  }
}
