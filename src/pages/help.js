'use strict'
var h = require('hyperscript')
var com = require('../com')

function section (title, content) {
  return h('div', h('h2.text-muted', title), content)
}

function panel (title, content) {
  return h('div', { style: 'background: #fff; padding: 1em; margin-bottom: 5px; border: 1px solid #ccc' }, content)
}

module.exports = function (app) {
  var content = [
    section('About', [
      panel('About', [
        'Secure Scuttlebutt is a distributed, free, and open-source network.',
        h('br'), h('br'),
        h('ul',
          h('li', h('strong', 'Distributed:'), ' it runs on user computers, not a parent host.'),
          h('li', h('strong', 'Free:'), ' free as in beer, and free as in freedom.'),
          h('li', h('strong', 'Open-source:'), ' anybody can deploy new software.')
        )
      ]),
      panel('Links', [
      h('ul.list-unstyled', { style: 'margin: 0' },
        h('li', com.a('https://github.com/ssbc/scuttlebot', 'Main Repository'), ' - find the source-code here.'),
        h('li', com.a('https://github.com/ssbc', 'Organization on GitHub'), ' - find related code packages here.'),
        h('li', com.a('https://GitHub.com/ssbc/scuttlebot/issues', 'Bug Tracker'), ' - file issues here.')
      )])
    ]),
    section('Posts', [
      panel('Posts', [
        'Posts in Secure Scuttlebutt are public and readable by anybody.',
        h('br'),
        'Take care! There is currently no undo or delete.'
      ]),
      panel('Mentions', [
        'Posts can "@-mention" users. ',
        'Check your ', com.a('#/inbox', 'Inbox'), ' to find messages that mention you.',
         h('.text-muted', { style: 'padding: 20px; padding-bottom: 10px' }, 'eg "Hello ', com.userlink(app.user.id, '@'+app.users.names[app.user.id]), '!"')
      ]),
      panel('Emojis', [
        'Emojis are written as words surrounded by colons. ',
        'Check the ', h('a', { href: 'http://www.emoji-cheat-sheet.com/', target: '_blank' }, 'Emoji Cheat Sheet'), ' to see what\'s available.',
         h('.text-muted', { style: 'padding: 20px; padding-bottom: 10px' }, 'eg ":smile:" = ', h('img.emoji', { src: '/img/emoji/smile.png', height: 20, width: 20})) 
      ])
    ]),
    section('Friends', [
      panel('Contacts / Following', [
        'Scuttlebutt searches the network for messages from your contacts. ',
        h('button.btn.btn-primary', { onclick: app.ui.followPrompt }, 'Add a contact')
      ]),
      panel('User IDs', [
        'User IDs are generated with cryptography so that they are globally unique. ',
        'Specifically, they are ',
        com.a('https://en.wikipedia.org/wiki/Base64', 'base64'),'-encoded ',
        com.a('https://blake2.net/', 'blake2s'),' hashes of public ',
        com.a('https://en.wikipedia.org/wiki/Elliptic_curve_cryptography', 'elliptic-curve'), ' keys.'
      ]),
      panel('', ['Your ID: ', app.user.id])
    ]),
    section('Pubs', [
      panel('Pub Servers', [
        'Pub servers are bots that host your messages for other people to download. ',
        'Since they\'re on the public web and always online, they help the network stay available.', h('br'), 
        h('br'),
        'You\'ll need to use a pub server if you want to reach people outside of your wifi.'
      ]),
      panel('Invite Codes', [
        'If someone you know is running a pub server, ask them for an invite code. ',
        'You can use the code by pasting it into the ', 
        h('button.btn.btn-xs.btn-primary', { onclick: app.ui.followPrompt }, 'Use an invite'), 
        ' dialog.'
      ]),
      panel(['Running a Pub Server ', h('small.text-muted', 'advanced')], [
        'If you want to run your own pub server, ', 
        com.a('https://github.com/ssbc/scuttlebot#running-a-pub-server', 'follow the instructions in the scuttlebot repo'),
        '.'
      ])
    ]),
    section('Names', [
      panel('Conflicting Names', [
        'Names are not unique in Secure Scuttlebutt. ',
        '(Somebody else could use "', app.users.names[app.user.id], '.")'
      ]),
      panel('Assigning Names', [
        'Open your ', com.a('#/address-book', 'address book'), ' and click the pencil next to somebody\'s name to change it.'
      ])
    ]),
    section('Privacy', [
      panel('Privacy in Secure Scuttlebutt', [
        'Secure Scuttlebutt is anti-spyware: it runs on your computer and keeps your personal data private.', h('br'),
        h('br'),
        'That said, SSB is part of a network and it does emit information. We will explain your footprint so you can know what you\'re telling the world.'
      ]),
      panel('Anonymity', [
        'Secure Scuttlebutt is a public global network. In this current version, all posts are public.', h('br'),
        h('br'),
        'You don\'t have to give any personal information (like your real name) but it should be possible to figure out who you are based on your posts, your friends, and the names people give you. ',
        'Don\'t expect to be anonymous!'
      ]),
      panel('Am I Online? is Public', [
        'Secure Scuttlebutt connects to all the computers it knows about to syncronize with them - a process we call "gossiping." ',
        'The other computers can infer by the connections that your PC is online.', h('br'),
        h('br'),
        'You can see what computers your PC talks to in the ', com.a('#/address-book', 'rightmost column of the network page.')
      ]),
      panel('What Have I Posted? is Public', [
        'Posts and replies are broadcasted publicly.',
      ]),
      panel('Who Do I Follow? and Who Follows Me? is Public', [
        'Follows and unfollows are broadcasted publicly.'
      ]),
      panel('Who Do I Trust or Distrust? is Public', [
        'Flags are broadcasted publicly.'
      ]),
      panel('What\'s My Username? is Public', [
        'Nicknames and avatars are broadcasted publicly.'
      ]),
      panel('What Pub-servers Do I Use? is Public', [
        'The addresses of your pub servers are broadcasted publicly.'
      ]),
      panel('What Isn\'t Public?', [
        'Here is what isn\'t shared by SSB but is frequently tracked by other web apps:', h('br'),
        h('br'),
        h('ul',
          h('li', 'When you\'re using the app.'),
          h('li', 'What pages and information you\'re reading or clicking on.'),
          h('li', 'What messages you started to type, but cancelled.'),
          h('li', 'What you search for.')
        )
      ]),
      panel('Is That All?', [
        'Secure Scuttlebutt is not just this app: it\'s a full database capable of any type of messaging you want. ',
        'Developers can use it to write their own applications. ', h('br'),
        h('br'),
        'This application usually ignores the messages by other apps, but, if you want to see them, browse to the ', com.a('#/feed', 'data feed'), ' and see what\'s happening behind the scenes. ',
        '(That\'s everything there is!)'
      ])
    ])
  ]

  app.setPage('help', h('.row',
    h('.col-xs-2'),
    h('.col-xs-5', content)
  ))
}