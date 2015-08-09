var h = require('hyperscript')
var com = require('./index')
var modals = require('../ui/modals')

module.exports.help = function (item) {
  if (item == 'secret-messages') {
    return h('div', { style: 'padding: 10px 20px' },
      h('h4', 'About'),
      h('p',
        h('strong', 'Secret Messages'), ' are encrypted end-to-end so that only your recipients can read them. ',
        'The recipients, subject, and content are completely hidden. '
      ),
      h('hr'),
      h('h4', 'Friends Only'),
      h('p',
        h('strong', 'Recipients must follow you. '),
        'If you happen to send a message to someone that ', h('em', 'doesn\'t'), ' follow you, ',
        'then they\'ll receive the message once they resume following.'
      ),
      h('hr'),
      h('h4', 'Cryptography'),
      h('p',
        h('strong', 'Behind the scenes, users are identified by public keys. '),
        'If you\'re following someone, you already have their pubkey! ',
        'That\'s what we use to encrypt the message. ',
        '(That, and libsodium.)'
      )
    )
  }
}


module.exports.helpTitle = function (item) {
  if (item == 'secret-messages') {
    return 'About: Secret Messages'
  }
}

exports.welcomehelp = function () {
  return h('.message',
    h('span.user-img', { style: 'top: 0' }, h('img', { src: com.profilePicUrl(false) })),
    h('.message-inner',
      h('ul.message-header.list-inline', h('li', h('strong', 'Scuttlebot'))),
      h('.message-body',
        h('.markdown',
          h('h3', 'Hello! And welcome to ', h('strong', 'Patchwork.')),
          h('p', 
            'Patchwork is an independent network of servers and users. ',
            'The software is Free and Open-source, and the data is stored on your computer.'
          ),
          h('p', 'Take that, corporate overlords!')
        )
      )
    ),
    h('.message-comments',
      h('.comment',
        h('span.user-img', h('img', { src: com.profilePicUrl(false) })),
        h('.comment-inner',
          h('.comment-body',
            h('.markdown',
              h('h4', 'Step 1: Join a public mesh node'),
              h('p', 'To reach across the Internet, you need to belong to a public mesh node, also known as a ', h('strong', 'Pub'), '. '),
              h('.text-center', { style: 'padding: 7px; background: rgb(238, 238, 238); margin-bottom: 10px; border-radius: 5px;' },
                h('a.btn.btn-3d', { href: '#', onclick: modals.invite }, com.icon('cloud'), ' Join a Pub')
              )
            )
          )
        )
      ),
      h('.comment',
        h('span.user-img', h('img', { src: com.profilePicUrl(false) })),
        h('.comment-inner',
          h('.comment-body',
            h('.markdown',
              h('h4', 'Step 2: Find your friends'),
              h('p', 'Have your friends send you their IDs so you can follow them. Paste the ID into the location bar, just like it\'s a URL. If you don\'t have their profile yet, Patchwork will prompt you to download it.')
            )
          )
        )
      ),
      h('.comment',
        h('span.user-img', h('img', { src: com.profilePicUrl(false) })),
        h('.comment-inner',
          h('.comment-body',
            h('.markdown',
              h('h4', 'Step 3: There is no step 3.'),
              h('p', 'You can publish ', h('strong', 'Comments, Photos, and Files'), ' using the box at the top of your feed. You can also send ', h('strong', 'Secret Messages'), ' to the people you follow (and that follow you) by opening their profile page and clicking Secret Message.')
            )
          )
        )
      )
    )
  )
}