const mongoose = require('mongoose')

module.exports = uri => {
  mongoose.connect(uri, {
    useNewUrlParser: true,
    useFindAndModify: false,
    useUnifiedTopology: true
  })

  const database = {}

  // Users
  const userSchema = new mongoose.Schema({
    telegramId: Number,
    username: String,
    firstName: String,
    lastName: String,
    dust: Number,
    exp: Number
  })

  userSchema.statics.reward = function (telegramId, change) {
    return this.findOneAndUpdate(
      { telegramId },
      change === 'brah' ? { $set: { dust: 1 }, $inc: { exp: 1 } } : { $inc: { dust: change } }
    ).exec()
  }

  database.User = mongoose.model('User', userSchema)

  // Export models like 'database'
  return database
}
