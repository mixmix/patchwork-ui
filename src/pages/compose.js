'use strict'
var h = require('hyperscript')
var com = require('../com')

module.exports = function (app) {
  app.setPage('compose', h('.row',
    h('.col-xs-1', com.sidenav(app)),
    h('.col-xs-8',
      com.postForm(app)
    ),
    h('.col-xs-3',
      com.notifications(app),
      com.adverts(app),
      com.sidehelp(app)
    )
  ))
}