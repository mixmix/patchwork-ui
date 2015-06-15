'use strict'
var h = require('hyperscript')
var mlib = require('ssb-msgs')
var pull = require('pull-stream')
var multicb = require('multicb')
var com = require('../com')

module.exports = function (app) {

  // markup

  app.setPage('home', h('.layout-twocol',
    h('.layout-main', 
      com.welcomehelp(app),
      h('.text-center', { style: 'padding-top: 30px' }, h('a.btn.btn-strong.btn-success', { href: '#/compose', title: 'New Post' }, com.icon('plus'))),
      com.messageFeed(app, { feed: app.ssb.phoenix.createHomeStream, loadmore: true, infinite: true })),
    h('.layout-rightnav',
      com.sidehelp(app)
    )
  ))
}
