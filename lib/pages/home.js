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
        h('a', { href: '#/news', title: 'The latest posts by users you follow' }, 'News Feed (', app.observ.newPosts, ')'),
        h('a', { href: '#/inbox', title: 'Your inbox' }, com.icon('inbox'), ' ', app.observ.indexCounts.inboxUnread),
        h('a', { href: '#/stars', title: 'Stars on your posts, and stars by you' }, com.icon('star'), ' ', app.observ.indexCounts.votesUnread),
        h('a', { href: '#/friends', title: 'Friends, followers, and other users' }, com.icon('user'), ' ', app.observ.indexCounts.followsUnread),
        h('a', { href: '#/profile/'+app.user.id+'?view=site', title: 'Go to your site' }, 'Your Site'),
        h('a', { href: '#/setup', title: 'Edit your profile' }, 'Your Profile'),
        h('a', { href: '#/feed', title: 'View the raw data feed' }, 'Behind the Scenes')
      ),
      com.notifications(),
      com.notifications.side(),
      com.friendsHexagrid({ size: 200, nrow: 4, uneven: true }),
      com.help.side()
    )
  ))
}
