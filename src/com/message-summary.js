'use strict'
var com = require('./index')

module.exports = function (app, msg, opts) {
  var msg = com.message(app, msg, opts)
  msg.classList.add('message-summary')
  return msg
}