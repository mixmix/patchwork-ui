'use strict'
var h = require('hyperscript')
var app = require('../app')
var ui = require('../ui')
var com = require('../com')

module.exports = function () {

  // markup

  ui.setPage('drive', h('.layout-onecol',
    h('.layout-main',
      h('.pull-right',
        h('a.btn.btn-3d', 'Upload File')
      ),
      h('h3', 'Your Drive ', h('small', 'Non-functional Mockup Interface')),
      com.files(app.user.id)
    )
  ))
}
