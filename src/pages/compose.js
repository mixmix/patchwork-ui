'use strict'
var h = require('hyperscript')
var com = require('../com')

module.exports = function (app) {
  var type = app.page.qs.type || 'message'

  // markup

  var form
  if (type == 'message') {
    form = [
      h('.text-muted', h('small', 'Markdown, @-mentions, and emojis are supported.')),
      com.postForm(app, null, { onpost: onpost })
    ]
  } else {
    form = h('.text-muted', h('strong', 'We\'re sorry!'), ' This feature hasn\'t been implemented yet. We\'re working hard to finish it!')
  }

  app.setPage('compose', h('.layout-twocol',
    h('.layout-main',
      h('.composer',
        h('.composer-header',
          com.nav({
            current: type,
            items: [
              ['message',  makeUri({ type: 'message' }),  'Message'],
              ['photos',   makeUri({ type: 'photos' }),   'Photos'],
              ['files',    makeUri({ type: 'files' }),    'Files'],
              ['software', makeUri({ type: 'software' }), 'Software']
            ]
          })),
        h('.composer-body',
          form))),
    h('.layout-rightnav',
      com.sidehelp(app)
    )
  ))

  function makeUri (opts) {
    var qs=''
    if (opts !== false) {
      opts = opts || {}
      opts.type = ('type' in opts) ? opts.type : type
      qs = '?type=' + encodeURIComponent(opts.type)
    }
    return '#/compose'+qs
  }

  // handlers

  function onpost () {
    window.location = '#/'
  }
}
