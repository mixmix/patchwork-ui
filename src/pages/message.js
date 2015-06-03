'use strict'
var h = require('hyperscript')
var mlib = require('ssb-msgs')
var com = require('../com')
var util = require('../lib/util')

module.exports = function (app) {
  app.ssb.relatedMessages({
    id: app.page.param,
    count: true,
    parent: true
  }, function (err, thread) {
    var content
    if (thread) {
      content = com.messageThread(app, thread, {
        onrender: function (msg) {
          app.ssb.phoenix.markRead(msg.key)
        },
        onpost: function () {
          app.refreshPage()
        }
      })

      var plink = mlib.asLinks(thread.value.content.repliesTo, 'msg')[0]
      if (plink) {
        app.ssb.get(plink.msg, function (err, parent) {
          var summary
          if (parent) {
            var pauthor = (app.users.names[parent.author] || util.shortString(parent.author))
            if (parent.content.text)
              summary = pauthor + ': "' + util.shortString(parent.content.text, 100) + '"'
            else
              summary = parent.content.type+' message by ' + pauthor
          } else {
            summary = 'parent message not yet received (' + plink.msg + ')'
          }
          content.querySelector('.in-response-to').appendChild(com.a('#/msg/'+plink.msg, [com.icon('arrow-up'),' ',summary]))
        })
      }
    } else {
      content = 'Message not found.'
    }

    app.setPage('message', h('.layout-twocol',
      h('.layout-main', h('div', { style: 'padding: 0 15px' }, content)),
      h('.layout-sidenav',
        com.networkGraph(app, { drawLabels: false, touchEnabled: false, mouseEnabled: false, mouseWheelEnabled: false }),
        com.friendsHexagrid(app, { size: 80 }),
        com.sidehelp(app)
      )
    ))
  })
}

