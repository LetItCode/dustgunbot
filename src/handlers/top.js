const { safePassThru } = require('telegraf')

const top5Emoji = ['🥇', '🥈', '🥉', '🎗', '🎗']

module.exports = async ctx => {
  const { match, from, replyWithHTML, i18n, db, h } = ctx
  const { kind = 'dust' } = match.groups

  const users = await db.User.find().sort({ [kind]: -1 })
  if (users.length === 0) return safePassThru()

  let text = i18n.t(`top.${kind}Title`) + '\n'
  const topList = users
    .map((user, index) => {
      if (index < 5) {
        return i18n.t('top.bestRow', { emoji: top5Emoji[index], user: h.fullName(user), score: user[kind] })
      } else if (
        users[index].telegramId === from.id ||
        (users[index + 1] && users[index + 1].telegramId === from.id) ||
        (users[index - 1] && users[index - 1].telegramId === from.id && index > 5)
      ) {
        return i18n.t('top.row', { place: index + 1, user: h.fullName(user), score: user[kind] })
      }
    })
    .filter(Boolean)
  text += topList.splice(0, 5).join('\n')
  if (topList.length > 0) text += '\n...\n' + topList.join('\n')

  replyWithHTML(text)
}
