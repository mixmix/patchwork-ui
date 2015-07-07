var h = require('hyperscript')
var schemas = require('ssb-msg-schemas')
var clipboard = require('clipboard')
var com = require('../com')
var social = require('../social-graph')

module.exports = function (app) {

  app.ui.modal = function (el) {
    // create a context so we can release this modal on close
    var h2 = h.context()
    var canclose = true

    // markup

    var inner = h2('.modal-inner', el)
    var modal = h2('.modal', { onclick: onmodalclick }, inner)
    document.body.appendChild(modal)

    modal.enableClose = function () { canclose = true }
    modal.disableClose = function () { canclose = false }

    modal.close = function () {
      if (!canclose)
        return

      // remove
      document.body.removeChild(modal)
      window.removeEventListener('hashchange', modal.close)
      window.removeEventListener('keyup', onkeyup)
      h2.cleanup()
      app.ui.enableScrolling()
      modal = null
    }

    // handlers

    function onmodalclick (e) {
      if (e.target == modal)
        modal.close()
    }
    function onkeyup (e) {
      // close on escape
      if (e.which == 27)
        modal.close()
    }
    window.addEventListener('hashchange', modal.close)
    window.addEventListener('keyup', onkeyup)
    app.ui.disableScrolling()

    return modal
  }

  var inviteRegex = /.+:.+:.+@.+/
  app.ui.inviteModal = function (e) {
    e.preventDefault()

    // render

    var form = com.inviteForm(app, { onsubmit: onsubmit })
    var modal = app.ui.modal(form)
    form.querySelector('input').focus()

    // handlers

    function onsubmit (code) {
      form.disable()
      modal.disableClose()

      // surrounded by quotes?
      // (the scuttlebot cli ouputs invite codes with quotes, so this could happen)
      if (code.charAt(0) == '"' && code.charAt(code.length - 1) == '"')
        code = code.slice(1, -1) // strip em

      if (inviteRegex.test(code)) {
        form.setProcessingText('Contacting server with invite code, this may take a few moments...')
        app.ssb.invite.accept(code, addMeNext)
      }
      else
        modal.enableClose(), form.enable(), form.setErrorText('Invalid invite code')
        
      function addMeNext (err) {
        modal.enableClose()
        if (err) {
          console.error(err)
          form.setErrorText(userFriendlyInviteError(err.stack || err.message))
          form.enable()
          return
        }

        // trigger sync with the pub
        app.ssb.gossip.connect(code.split(',')[0])

        // nav to home in live-party-mode
        modal.close()
        app.ui.homeMode.live = true
        app.ui.homeMode.view = 'party'
        if (window.location.hash != '#/')
          window.location.hash = '#/'
        else
          app.refreshPage()
      }
    }
  }

  app.ui.lookupHelpModal = function (e) {
    e.preventDefault()

    // render

    var modal = app.ui.modal(h('.lookup-code-form',
      h('.help',
        h('h3', 'Can\'t find your friend?'),
        h('p', 'Have them send you their lookup code. If they need help, tell them to do this:'),
        h('.help-section',
          h('img', { src: 'img/help-open-profile-dropdown.gif' }),
          h('div', h('p', h('strong', '1.'), ' Click on your profile picture on the top right.'))
        ),
        h('.help-section',
          h('img', { src: 'img/help-select-lookup-code.gif' }),
          h('div', h('p', h('strong', '2.'), ' Select "Your Lookup Code."'))
        ),
        h('.help-section',
          h('img', { src: 'img/help-copy-lookup.gif' }),
          h('div',
            h('p', h('strong', '3.'), ' Copy the code at the top of the popup.'),
            h('p', h('strong', '4.'), ' Send it to me!')
          )
        ),
        h('hr'),
        h('h3', 'Using a Lookup Code'),
        h('p', 'Once you\'ve got a code, here\'s how to use it:'),
        h('.help-section',
          h('img', { src: 'img/help-open-profile-dropdown.gif' }),
          h('div', h('p', h('strong', '1.'), ' Click on your profile picture on the top right.'))
        ),
        h('.help-section',
          h('img', { src: 'img/help-select-address-book.gif' }),
          h('div', h('p', h('strong', '2.'), ' Select "Address Book."'))
        ),
        h('.help-section',
          h('img', { src: 'img/help-use-lookup-code.gif' }),
          h('div',
            h('p', h('strong', '3.'), ' Paste the code into the Find a Friend input.'),
            h('p', h('strong', '4.'), ' Press enter!')
          )
        )
      )
    ))
  }

  app.ui.getLookupModal = function (e) {
    e.preventDefault()

    // render

    var codesEl = h('div')
    var modal = app.ui.modal(h('.lookup-code-form', codesEl))

    // collect codes

    app.ssb.gossip.peers(function (err, peers) {
      if (!peers) {
        modal.close()
        swal('Error Getting Lookup Codes', 'Failed to fetch your peer information. '+(err && err.message ? err.message : ''), 'error')
        return
      }

      var addrs = []
      peers.forEach(function (peer) {
        if (social.follows(app, peer.key, app.user.id))
          addrs.push(peer.host + ':' + peer.port + ':' + peer.key)
      })
      var code = app.user.id
      if (addrs.length)
        code += '[via]'+addrs.join(',')

      codesEl.appendChild(h('.code',
        h('p',
          h('strong', 'Your Lookup Code'),
          ' ',
          h('a.btn.btn-3d.btn-xs.pull-right', { href: '#', onclick: oncopy(code) }, com.icon('copy'), ' Copy to clipboard')
        ),
        h('p', h('input.form-control', { value: code }))
      ))
    })

    // handlers 

    function oncopy (text) {
      return function (e) {
        e.preventDefault()
        var btn = e.target
        if (btn.tagName == 'SPAN')
          btn = e.path[1]
        clipboard.writeText(text)
        btn.innerText = 'Copied!'
      }
    }
  }

  app.ui.useLookupModal = function (code) {

    // render

    var status = h('div', 'Initializing...')
    var modal = app.ui.modal(h('.modal-form', h('h3', 'User Lookup'), status))

    // launch

    var id, seq, err
    pull(app.ssb.phoenix.useLookupCode(code), pull.drain(
      function (e) {
        if (e.type == 'connecting')
          status.innerText = 'Connecting...'
        if (e.type == 'syncing') {
          id = e.id
          status.innerText = 'Connected, syncing user data...'
        }
        if (e.type == 'finished')
          seq = e.seq
        if (e.type == 'error')
          err = e
      },
      function () {
        if (id && seq) {
          status.innerText = 'Profile synced, redirecting...'
          setTimeout(function () {
            window.location.hash = '#/profile/'+id
          }, 1e3)
        } else {
          status.classList.add('text-danger')
          if (err) {
            status.innerText = 'Error: '+err.message+ ' :('
            console.error(err)
          } else
            status.innerText = 'Error: User not found :('
        }
      })
    )
  }

  app.ui.setNameModal = function (userId) {
    userId = userId || app.user.id

    // render

    var oldname = com.userName(app, userId)
    var form = com.renameForm(app, userId, { onsubmit: onsubmit })
    var modal = app.ui.modal(form)
    form.querySelector('input').focus()

    // handlers

    function onsubmit (name) {   
      if (!name)
        return
      if (name === oldname)
        return modal.close()

      schemas.addContact(app.ssb, userId, { name: name }, function (err) {
        if (err) swal('Error While Publishing', err.message, 'error')
        else {
          modal.close()
          app.refreshPage()
        }
      })
    }
  }

  app.ui.flagModal = function (userId) {

    // render

    var form = com.flagForm(app, userId, { onsubmit: onsubmit })
    var modal = app.ui.modal(form)

    // handlers

    function onsubmit () {
      modal.close()
      app.refreshPage()
    }
  }
}