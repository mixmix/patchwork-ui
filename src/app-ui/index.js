var schemas = require('ssb-msg-schemas')

exports.showUserId = function () { 
  swal('Here is your contact id', this.user.id)
}

exports.setStatus = function (type, message) {
  var status = document.getElementById('app-status')
  status.innerHTML = ''
  if (type)
    status.appendChild(h('.alert.alert-'+type, message))
}

exports.followPrompt = function (e) {
  var app = this
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
    app.ui.setStatus('info', 'Contacting server with invite code, this may take a few moments...')
    app.ssb.invite.addMe(id, next)
  }
  else
    schemas.addContact(app.ssb, id, { following: true }, next)
    
  function next (err) {
    app.ui.setStatus(false)
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
      app.refreshPage()
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

exports.setNamePrompt = function (userId) {
  var app = this
  app.ssb.whoami(function (err, user) {
    userId = userId || user.id
    var isSelf = user.id === userId
    
    var name = (isSelf) ?
      prompt('What would you like your nickname to be?') :
      prompt('What would you like their nickname to be?')
    if (!name)
      return

    if (!confirm('Set nickname to '+name+'?'))
      return

    schemas.addContact(app.ssb, userId, { name: name }, done)

    function done(err) {
      if (err) swal('Error While Publishing', err.message, 'error')
      else app.refreshPage()
    }
  })
}