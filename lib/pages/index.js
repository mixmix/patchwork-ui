'use strict'
var h = require('hyperscript')
var com = require('../com')

function notfound (app) {
  app.setPage('notfound', [
    h('img', { src: 'img/lick-the-door.gif', style: 'display: block; margin: 10px auto; border-radius: 3px;' }),
    h('h2.text-center', 'Page Not Found'),
    h('div.text-center', { style: 'margin-top: 20px' },
      'Sorry, that page wasn\'t found. Maybe you typed the name wrong? Or maybe somebody gave you a bad link.'
    )
  ])
}

module.exports = {
  'address-book':   require('./address-book'),
  compose:          require('./compose'),
  // ext:              require('./ext'),
  feed:             require('./feed'),
  files:            require('./files'),
  friends:          require('./friends'),
  help:             require('./help'),
  home:             require('./home'),  
  inbox:            require('./inbox'),
  msg:              require('./message'),
  notfound:         notfound,
  photos:           require('./photos'),
  profile:          require('./profile'),
  setup:            require('./setup'),
  software:         require('./software'),
  stars:            require('./stars'),
  sync:             require('./sync')
}