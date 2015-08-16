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
    var isEncrypted = false
    var secretMessageLabel
    if (msg) {
      msg = { key: app.page.param, value: msg }
      content = com.message(msg, { markread: true, fullview: true, live: true })

      // if encrypted, add the animated 'secret message' label
      if (typeof msg.value.content == 'string') {
        isEncrypted = true
        secretMessageLabel = h('span')
        anim.textDecoding(secretMessageLabel, 'Secret Thread')
      }
    } else {
      content = 'Message not found.'
    }

    ui.setPage('message', h('.layout-onecol',
      h('.layout-main', 
        (isEncrypted) ?
          h('.text-center', 
            h('p', h('code', { style: 'font-size: 18px' }, secretMessageLabel, ' ', com.icon('lock'))),
            h('p', 'All messages in this thread are encrypted.')
          ) :
          '',
        content
      )
    ))
  })
}

