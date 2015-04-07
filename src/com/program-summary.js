'use strict'
var h = require('hyperscript')
var com = require('./index')
var u = require('../lib/util')

module.exports = function (app, msg, opts) {

  // markup

  var programSummary = h('tr.program-summary',
    h('td', com.userHexagon(app, msg.value.author, 30), author(app, msg)),
    h('td', 'TODO'))

  return programSummary
}

function ago (msg) {
  var str = u.prettydate(new Date(msg.value.timestamp))
  if (str === 'yesterday')
    str = '1d'
  return h('small.text-muted', str, ' ago')
}

function author (app, msg) {
  return h('p', com.user(app, msg.value.author), ' ', ago(msg))
}