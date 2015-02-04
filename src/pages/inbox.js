'use strict'
var h = require('hyperscript')
var multicb = require('multicb')
var com = require('../com')

module.exports = function (app) {
  var done = multicb({ pluck: 1 })
  var opts = { start: +app.page.qs.start || 0 }
  app.ssb.phoenix.getInboxCount(done())
  app.ssb.phoenix.getInbox(opts, done())
  done(function (err, data) {
    var msgcount = data[0]
    var msgs = data[1]

    // track read messages
    app.unreadMessages = 0
    localStorage.readMessages = msgcount

    // markup
    
    var content
    if (msgs.length === 0) {
      content = [
        h('p', h('strong', 'Your inbox is empty!')),
        h('p', 'When somebody @-mentions you or replies to your posts, you\'ll see their message here.')
      ]
    } else {
      content = h('table.table.message-feed', msgs.map(function (msg) {
        if (msg.value) return com.messageSummary(app, msg)
      }))
    }

    var prevBtn = h('a.btn.btn-primary', { href: '#/inbox?start='+((opts.start - 30 > 0) ? opts.start - 30 : 0) }, '<')
    var nextBtn = h('a.btn.btn-primary', { href: '#/inbox?start='+(opts.start+30) }, '>')
    if (opts.start <= 0) prevBtn.setAttribute('disabled', true)    
    if (opts.start+30 > msgcount) nextBtn.setAttribute('disabled', true)

    app.setPage('feed', h('.row',
      h('.col-xs-2.col-md-1', com.sidenav(app)),
      h('.col-xs-10.col-md-9',
        h('p', prevBtn, (opts.start + 1), ' - ', Math.min(msgcount, (opts.start + 30)), ' ('+msgcount+')', nextBtn),
        content
      ),
      h('.hidden-xs.hidden-sm.col-md-2',
        com.adverts(app),
        h('hr'),
        com.sidehelp(app)
      )
    ))
  })
}