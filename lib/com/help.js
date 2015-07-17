var h = require('hyperscript')

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