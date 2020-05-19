const debug = require('debug')('dg:handlers:dice')

module.exports = async ctx => {
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
