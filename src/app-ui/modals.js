var h = require('hyperscript')
var com = require('../com')

module.exports = function (phoenix) {

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

  phoenix.ui.inviteModal = function (e) {
    e.preventDefault()

    // render

    var form = com.inviteForm(phoenix, { onsubmit: onsubmit })
    var modal = phoenix.ui.modal(form)
    form.querySelector('input').focus()

    // handlers

    function onsubmit (code) {
      form.disable()

      // surrounded by quotes?
      // (the scuttlebot cli ouputs invite codes with quotes, so this could happen)
      if (code.charAt(0) == '"' && code.charAt(code.length - 1) == '"')
        code = code.slice(1, -1) // strip em

      if (code.split(',').length === 3) {
        form.setProcessingText('Contacting server with invite code, this may take a few moments...')
        phoenix.ssb.invite.addMe(code, addMeNext)
      }
      else
        form.enable(), form.setErrorText('Invalid invite code')
        
      function addMeNext (err) {
        if (err) {
          console.error(err)
          form.setErrorText(userFriendlyInviteError(err.stack || err.message))
          form.enable()
          return
        }
        form.setProcessingText('Invite Accepted, syncing...')
        // :TODO:
      }
    }

    // helpers

    function userFriendlyInviteError(msg) {
      if (~msg.indexOf('incorrect or expired') || ~msg.indexOf('has expired'))
        return 'Invite code is incorrect or expired. Make sure you copy/pasted it correctly. If you did, ask the pub-server owner for a new code and try again.'
      if (~msg.indexOf('invalid') || ~msg.indexOf('feed to follow is missing') || ~msg.indexOf('may not be used to follow another key'))
        return 'Invite code is malformed. Make sure you copy/pasted it correctly. If you did, ask the pub-server owner for a new code and try again.'
      if (~msg.indexOf('pub server did not have correct public key'))
        return 'The pub server did not identify itself correctly for the invite code. Ask the pub-server owner for a new code and try again.'
      if (~msg.indexOf('unexpected end of parent stream'))
        return 'Failed to connect to the pub server. Check your connection, make sure the pub server is online, and try again.'
      if (~msg.indexOf('ENOTFOUND'))
        return 'The pub server could not be found. Check your connection, make sure the pub server is online, and try again.'
      if (~msg.indexOf('already following'))
        return 'You are already followed by this pub server.'
      return 'Sorry, an unexpected error occurred. Please try again.'
    }
  }
}