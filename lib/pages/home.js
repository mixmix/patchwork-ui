'use strict'
var h = require('hyperscript')
var app = require('../app')
var ui = require('../ui')
var com = require('../com')

module.exports = function () {

  // markup

  ui.setPage('home', h('.layout-onecol',
    h('.layout-main', 
      h('.shortcuts',
        h('a', { href: '#/news' }, 'News Feed'),
        h('a', { href: '#/inbox' }, 'Inbox'),
        h('a', { href: '#/profile/'+app.user.id+'?view=site' }, 'Your Site'),
        h('a', { href: '#/setup' }, 'Your Profile'),
        h('a', { href: '#/feed' }, 'Behind the Scenes')
      ),
      com.notifications(),
      com.notifications.side(),
      com.friendsHexagrid({ size: 200, nrow: 4, uneven: true }),
      com.help.side()
    )
  ))
}
