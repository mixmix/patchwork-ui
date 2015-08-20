'use strict'
var h = require('hyperscript')
var o = require('observable')
var app = require('../app')
var ui = require('../ui')
var com = require('../com')

module.exports = function () {

  // markup

  ui.setPage('home', h('.layout-onecol',
    h('.layout-main', 
      h('.shortcuts',
        h('.shortcuts-left',
          h('a', { href: '#/news', title: 'The latest posts by users you follow' }, 'News Feed (', app.observ.newPosts, ')'),
          h('a', { href: '#/inbox', title: 'Your inbox' }, 'Inbox (', app.observ.indexCounts.inboxUnread, ')'),
          h('a', { href: '#/publisher', title: 'View your files and publish updates' }, 'Your Site')
        ),
        h('.shortcuts-right',
          h('a', { href: '#/stars', title: 'Stars on your posts, and stars by you' }, com.icon('star'), ' ', app.observ.indexCounts.votesUnread),
          h('a', { href: '#/friends', title: 'Friends, followers, and other users' }, com.icon('user'), ' ', app.observ.indexCounts.followsUnread)
        )
      ),
      com.notifications(),
      com.notifications.side(),
      com.friendsHexagrid({ size: 200, nrow: 4, uneven: true }),
      com.help.side()
    )
  ))
}
