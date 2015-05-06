var h = require('hyperscript')
var schemas = require('ssb-msg-schemas')

module.exports = function (phoenix) {

  require('./invite-flow')(phoenix)

  phoenix.ui.showUserId = function () { 
    swal('Here is your contact id', phoenix.user.id)
  }

  var oldScrollTop
  phoenix.ui.disableScrolling = function () {
    oldScrollTop = document.body.scrollTop
    document.querySelector('html').style.overflow = 'hidden'
    window.scrollTo(0, oldScrollTop)
  }
  phoenix.ui.enableScrolling = function () {
    document.querySelector('html').style.overflow = 'auto'
    window.scrollTo(0, oldScrollTop)
  }

  phoenix.ui.modal = function (el) {
    // create a context so we can release this modal on close
    var h2 = h.context()

    // markup

    var inner = h2('.modal-inner', el)
    var modal = h2('.modal', { onclick: onmodalclick }, inner)
    document.body.appendChild(modal)

    modal.close = function () {
      // check if there are any forms in progress
      var els = Array.prototype.slice.call(inner.querySelectorAll('textarea'))
      for (var i=0; i < els.length; i++) {
        if (els[i].value) {
          if (!confirm('Close modal and lose changes to your reply?'))
            return
          break
        }
      }

      // remove
      document.body.removeChild(modal)
      window.removeEventListener('hashchange', modal.close)
      window.removeEventListener('keyup', onkeyup)
      h2.cleanup()
      phoenix.ui.enableScrolling()
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
    phoenix.ui.disableScrolling()

    return modal
  }

  phoenix.ui.setStatus = function (type, message) {
    var status = document.getElementById('app-status')
    status.innerHTML = ''
    if (type)
      status.appendChild(h('.alert.alert-'+type, message))
  }

  phoenix.ui.followPrompt = function (e) {
    e.preventDefault()

    var id = prompt('Enter the contact id or invite code')
    if (!id)
      return

    // surrounded by quotes?
    // the scuttlebot cli ouputs invite codes with quotes, so this could happen
    if (id.charAt(0) == '"' && id.charAt(id.length - 1) == '"')
      id = id.slice(1, -1) // strip em

    var parts = id.split(',')
    var isInvite = (parts.length === 3)
    if (isInvite) {
      phoenix.ui.setStatus('info', 'Contacting server with invite code, this may take a few moments...')
      phoenix.ssb.invite.addMe(id, next)
    }
    else
      schemas.addContact(phoenix.ssb, id, { following: true }, next)
      
    function next (err) {
      phoenix.ui.setStatus(false)
      if (err) {
        console.error(err)
        if (isInvite)
          swal('Invite Code Failed', userFriendlyInviteError(err.stack || err.message), 'error')
        else
          swal('Error While Publishing', err.message, 'error')
      }
      else {
        if (isInvite)
          swal('Invite Code Accepted', 'You are now hosted by '+parts[0], 'success')
        else
          swal('Contact Added', 'You will now follow the messages published by your new contact.', 'success')
        phoenix.refreshPage()
      }
    }

    function userFriendlyInviteError(msg) {
      if (~msg.indexOf('incorrect or expired') || ~msg.indexOf('has expired'))
        return 'Invite code is incorrect or expired. Make sure you copy/pasted it correctly. If you did, ask the pub-server owner for a new code and try again.'
      if (~msg.indexOf('invalid') || ~msg.indexOf('feed to follow is missing') || ~msg.indexOf('may not be used to follow another key'))
        return 'Invite code is malformed. Make sure you copy/pasted it correctly. If you did, ask the pub-server owner for a new code and try again.'
      if (~msg.indexOf('pub server did not have correct public key'))
        return 'The pub server did not identify itself correctly for the invite code. Ask the pub-server owner for a new code and try again.'
      if (~msg.indexOf('unexpected end of parent stream'))
        return 'Failed to connect to the pub server. Check your connection, make sure the pub server is online, and try again.'
      if (~msg.indexOf('already following'))
        return 'You are already followed by this pub server.'
      return 'Sorry, an unexpected error occurred. Please try again.'
    }
  }

  phoenix.ui.setNamePrompt = function (userId) {
    phoenix.ssb.whoami(function (err, user) {
      userId = userId || user.id
      var isSelf = user.id === userId
      
      var name = (isSelf) ?
        prompt('What would you like your nickname to be?') :
        prompt('What would you like their nickname to be?')
      if (!name)
        return

      if (!confirm('Set nickname to '+name+'?'))
        return

      schemas.addContact(phoenix.ssb, userId, { name: name }, done)

      function done(err) {
        if (err) swal('Error While Publishing', err.message, 'error')
        else phoenix.refreshPage()
      }
    })
  }

  var pleaseWaitTimer
  phoenix.ui.pleaseWait = function (enabled, after) {
    function doit() {
      if (enabled === false)
        document.querySelector('#please-wait').style.display = 'none'
      else
        document.querySelector('#please-wait').style.display = 'block'
    }

    if (!enabled && pleaseWaitTimer) {
      clearTimeout(pleaseWaitTimer)
      pleaseWaitTimer = null
    }

    if (!after || !enabled)
      doit()
    else if (!pleaseWaitTimer)
      pleaseWaitTimer = setTimeout(doit, after)
  }
}