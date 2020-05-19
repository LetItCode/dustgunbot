require('dotenv').config()
const debug = require('debug')('dg:app')
const { Telegraf, groupChat, fork, optional, safePassThru } = require('telegraf')
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
bot.use(i18n)
bot.on('dice', groupChat(notForward(diceLimit, fork(dice))))
bot.hears(/^\/top(?<kind>exp)?($|@)/, groupChat(top))
bot.catch(err => debug(err))
bot.launch()

// Middleware
function notForward (...fns) {
  return optional(ctx => ctx.message && !ctx.message.forward_from, ...fns)
}

// Handlers
async function dice (ctx) {
  const { from, message: { dice }, replyWithHTML, i18n, db, h } = ctx // prettier-ignore
  debug({ ...from, ...dice })

  const user = await db.User.findOneAndUpdate(
    { telegramId: from.id },
    {
      $setOnInsert: { dust: 1, exp: 0 },
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

async function top (ctx) {
  const { match, from, replyWithHTML, i18n, db, h } = ctx
  const { kind = 'dust' } = match.groups

  const users = await db.User.find().sort({ [kind]: -1 })
  if (users.length === 0) return safePassThru()

  const top5Emoji = ['🥇', '🥈', '🥉', '🎗', '🎗']
  let text = i18n.t(`top.${kind}Title`) + '\n'
  const topList = users
    .map((user, index) => {
      if (index < 5) return i18n.t('top.bestRow', { emoji: top5Emoji[index], user: h.fullName(user), score: user[kind] })
      else if (
        users[index].telegramId === from.id ||
        (users[index + 1] && users[index + 1].telegramId === from.id) ||
        (users[index - 1] && users[index - 1].telegramId === from.id && index > 5)
      )
        return i18n.t('top.row', { place: index + 1, user: h.fullName(user), score: user[kind] })
    })
    .filter(_ => _)
  text += topList.splice(0, 5).join('\n')
  if (topList.length > 0) text += '\n...\n' + topList.join('\n')

  replyWithHTML(text)
}
