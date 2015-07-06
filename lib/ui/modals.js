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

  app.ui.getLookupModal = function (e) {
    e.preventDefault()

    // render

    var codesEl = h('div')
    var helpEl = h('div.help',
      h('p', h('strong', 'Q: What are lookup codes?')),
      h('p', 'A: Lookup codes are a reliable way to connect. Send one to your friend via email, chat, SMS, etc. Then, have them send you theirs.'),
      h('p', h('strong', 'Q: How do I use one?')),
      h('p', 'A: Paste it into the friend-search and press enter. Patchwork will try to get your friend\'s data. If it fails, ask them to send another.')
    )
    var form = com.inviteForm(app, { onsubmit: onsubmit })
    var modal = app.ui.modal(h('.lookup-code-form',
      h('h3', 'Lookup Codes'),
      codesEl,
      h('hr'),
      helpEl
    ))

    // collect codes

    app.ssb.gossip.peers(function (err, peers) {
      if (!peers) {
        modal.close()
        swal('Error Getting Lookup Codes', 'Failed to fetch your peer information. '+(err && err.message ? err.message : ''), 'error')
        return
      }

      var n=1
      peers.forEach(function (peer) {
        if (!social.follows(app, peer.key, app.user.id))
          return
        n++
        var code = app.user.id + '[via]' + peer.host + ':' + peer.port + ':' + peer.key
        codesEl.appendChild(h('.code',
          h('p',
            h('strong', 'Global lookup via ', peer.host),
            ' ',
            h('a.btn.btn-3d.btn-xs.pull-right', { href: '#', onclick: oncopy(code) }, com.icon('copy'), ' Copy to clipboard')
          ),
          h('textarea.form-control', code)
        ))
      })

      codesEl.appendChild(h('.code',
        h('p',
          h('strong', 'Local lookup via WiFi'),
          ' ',
          h('a.btn.btn-3d.btn-xs.pull-right', { href: '#', onclick: oncopy(app.user.id) }, com.icon('copy'), ' Copy to clipboard')
        ),
        h('p', h('input.form-control', { value: app.user.id })),
        'This one will only work if your friend is on the same WiFi as you.'
      ))

      if (n == 1) {
        helpEl.appendChild(h('p', h('strong', 'Q: How can I connect outside of my WiFi?')))
        helpEl.appendChild(h('p', 'A: It looks like your not followed by any Pubs. ', h('a', 'Follow the instructions here to join the global network.')))        
      }
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