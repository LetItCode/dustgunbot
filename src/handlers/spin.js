const debug = require('debug')('dg:handlers:spin')

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
  if (change === 'nomoney') return
  const text = i18n.t(change > 0 ? 'win' : 'lose', { user: h.fullName(from), change: Math.abs(change) })
  db.User.reward(from.id, change)
  return replyWithHTML(text)
}

function calcReward (value, dust) {
  if (dust < 25) return 'nomoney'
  const comb = (--value).toString(4).padStart(3, '0').split('').reverse().join('') // prettier-ignore
  let reward = -25
  const symbols = Array.from({ length: 4 }).map((_, i) => (comb.match(new RegExp(i, 'g')) || []).length)
  switch (true) {
    case symbols[3] > 1: reward += symbols[3] === 2 ? 30 : 300; break // prettier-ignore
    case symbols[2] > 1: reward += symbols[2] === 2 ? 28 : 200; break // prettier-ignore
    case symbols[1] > 1: reward += symbols[1] === 2 ? 26 : 150; break // prettier-ignore
    case symbols[0] > 1: reward += symbols[0] === 2 ? 10 : 100; break // prettier-ignore
  }
  return reward
}
