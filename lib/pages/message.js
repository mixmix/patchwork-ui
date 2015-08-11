'use strict'
var h = require('hyperscript')
var mlib = require('ssb-msgs')
var app = require('../app')
var ui = require('../ui')
var anim = require('../ui/anim')
var com = require('../com')
var util = require('../util')

module.exports = function () {

  app.ssb.get(app.page.param, function (err, msg) {
    var content
    if (msg) {
      msg = { key: app.page.param, value: msg }
      content = com.message(msg, { markread: true, fullview: true, live: true })

      // if encrypted, add the animated 'secret message' label
      if (typeof msg.value.content == 'string') {
        var secretMessageLabel = h('span')
        content = [
          h('p.text-center', h('code', { style: 'font-size: 18px' }, secretMessageLabel, ' ', com.icon('lock'))),
          content
        ]
        anim.textDecoding(secretMessageLabel, 'Secret Message')
      }
    } else {
      content = 'Message not found.'
    }

    ui.setPage('message', h('.layout-twocol',
      h('.layout-main', content),
      h('.layout-rightnav',
        h('.well.text-muted', {style: 'margin-top: 24px'}, com.icon('flash'), ' Replies will auto-update as long as you are on this page.')
      )
    ))
  })
}

