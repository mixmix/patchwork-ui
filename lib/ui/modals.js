var h = require('hyperscript')
var schemas = require('ssb-msg-schemas')
var clipboard = require('clipboard')
var app = require('../app')
var ui = require('./index')
var com = require('../com')
var social = require('../social-graph')

function modal (el) {
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
    ui.enableScrolling()
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
  ui.disableScrolling()

  return modal
}

var inviteRegex = /.+:.+:.+@.+/
module.exports.invite = function (e) {
  e.preventDefault()

  // render

  var form = com.inviteForm({ onsubmit: onsubmit })
  var m = modal(form)
  form.querySelector('input').focus()

  // handlers

  function onsubmit (code) {
    form.disable()
    m.disableClose()

    // surrounded by quotes?
    // (the scuttlebot cli ouputs invite codes with quotes, so this could happen)
    if (code.charAt(0) == '"' && code.charAt(code.length - 1) == '"')
      code = code.slice(1, -1) // strip em

    if (inviteRegex.test(code)) {
      form.setProcessingText('Contacting server with invite code, this may take a few moments...')
      app.ssb.invite.accept(code, addMeNext)
    }
    else
      m.enableClose(), form.enable(), form.setErrorText('Invalid invite code')
      
    function addMeNext (err) {
      m.enableClose()
      if (err) {
        console.error(err)
        form.setErrorText(userFriendlyInviteError(err.stack || err.message))
        form.enable()
        return
      }

      // trigger sync with the pub
      app.ssb.gossip.connect(code.split(',')[0])

      // nav to home in live-party-mode
      m.close()
      app.homeMode.live = true
      app.homeMode.view = 'party'
      if (window.location.hash != '#/')
        window.location.hash = '#/'
      else
        ui.refreshPage()
    }
  }
}

module.exports.lookup = function (e) {
  e.preventDefault()

  // render

  var form = com.lookupForm({ onsubmit: onsubmit })
  var m = modal(form)
  form.querySelector('input').focus()

  // create user's code

  app.ssb.gossip.peers(function (err, peers) {
    if (!peers) {
      m.close()
      swal('Error Getting Lookup Codes', 'Failed to fetch your peer information. '+(err && err.message ? err.message : ''), 'error')
      return
    }

    var addrs = []
    peers.forEach(function (peer) {
      if (social.follows(peer.key, app.user.id))
        addrs.push(peer.host + ':' + peer.port + ':' + peer.key)
    })
    var code = app.user.id
    if (addrs.length)
      code += '[via]'+addrs.join(',')

    form.setYourLookupCode(code)
  })

  // handlers

  function onsubmit (code) {
    var id, seq, err
    form.disable()
    pull(app.ssb.phoenix.useLookupCode(code), pull.drain(
      function (e) {
        if (e.type == 'connecting')
          form.setProcessingText('Connecting...')
        if (e.type == 'syncing') {
          id = e.id
          form.setProcessingText('Connected, syncing user data...')
        }
        if (e.type == 'finished')
          seq = e.seq
        if (e.type == 'error')
          err = e
      },
      function () {
        form.enable()
        if (id && seq) {
          form.setProcessingText('Profile synced, redirecting...')
          setTimeout(function () {
            window.location.hash = '#/profile/'+id
          }, 1e3)
        } else {
          if (err) {
            form.setErrorText('Error: '+err.message+ ' :(')
            console.error(err)
          } else
            form.setErrorText('Error: User not found :(')
        }
      })
    )
  }
}

module.exports.getLookup = function (e) {
  e.preventDefault()

  // render

  var codesEl = h('div')
  var m = modal(h('.lookup-code-form', codesEl))

  // collect codes

  app.ssb.gossip.peers(function (err, peers) {
    if (!peers) {
      m.close()
      swal('Error Getting Lookup Codes', 'Failed to fetch your peer information. '+(err && err.message ? err.message : ''), 'error')
      return
    }

    var addrs = []
    peers.forEach(function (peer) {
      if (social.follows(peer.key, app.user.id))
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

module.exports.setName = function (userId) {
  userId = userId || app.user.id

  // render

  var oldname = com.userName(userId)
  var form = com.renameForm(userId, { onsubmit: onsubmit })
  var m = modal(form)
  form.querySelector('input').focus()

  // handlers

  function onsubmit (name) {   
    if (!name)
      return
    if (name === oldname)
      return m.close()

    schemas.addContact(app.ssb, userId, { name: name }, function (err) {
      if (err) 
        console.error(err), swal('Error While Publishing', err.message, 'error')
      else {
        m.close()
        ui.refreshPage()
      }
    })
  }
}

module.exports.flag = function (userId) {

  // render

  var form = com.flagForm(userId, { onsubmit: onsubmit })
  var m = modal(form)

  // handlers

  function onsubmit () {
    m.close()
    ui.refreshPage()
  }
}

module.exports.post = function (parent, opts) {

  // render

  var _onpost = opts.onpost
  var _oncancel = opts.oncancel

  opts = opts || {}
  opts.onpost = onpost
  opts.oncancel = oncancel
  var m = modal(com.postForm(parent, opts))

  // handlers

  function onpost (msg) {
    m.close()
    _onpost && _onpost(msg)
  }

  function oncancel () {
    m.close()
    _oncancel && _oncancel()
  }
}