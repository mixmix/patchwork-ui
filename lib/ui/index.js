var h = require('hyperscript')
var schemas = require('ssb-msg-schemas')
var refs = require('ssb-ref')

module.exports = function (phoenix) {

  require('./modals')(phoenix)
  require('./subwindows')(phoenix)  

  phoenix.ui.navBack = function (e) {
    e.preventDefault()
    e.stopPropagation()
    window.history.back()
  }
  phoenix.ui.navForward = function (e) {
    e.preventDefault()
    e.stopPropagation()
    window.history.forward()
  }
  phoenix.ui.navRefresh = function (e) {
    e.preventDefault()
    e.stopPropagation()
    phoenix.refreshPage()
  }  

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

  phoenix.ui.setStatus = function (type, message) {
    var status = document.getElementById('app-status')
    status.innerHTML = ''
    if (type)
      status.appendChild(h('.alert.alert-'+type, message))
  }

  phoenix.ui.followPrompt = function (e) {
    e.preventDefault()

    var id = prompt('Enter the contact id')
    if (!id)
      return
    if (!refs.isFeedId(id))
      return swal('Invalid ID', '"'+id+'" is not a valid user ID. Please check your source and try again.', 'error')

    schemas.addContact(phoenix.ssb, id, { following: true }, function (err) {
      if (err) {
        console.error(err)
        swal('Error While Publishing', err.message, 'error')
      }
      else {
        swal('Contact Added', 'You will now follow the messages published by your new contact.', 'success')
        phoenix.refreshPage()
      }
    })
  }

  var pleaseWaitTimer, uhohTimer, tooLongTimer
  phoenix.ui.pleaseWait = function (enabled, after) {
    function doit() {
      // clear main timer
      clearTimeout(pleaseWaitTimer); pleaseWaitTimer = null

      if (enabled === false) {
        // hide spinner
        document.querySelector('#please-wait').style.display = 'none'
        phoenix.ui.setStatus(false)

        // clear secondary timers
        clearTimeout(uhohTimer); uhohTimer = null
        clearTimeout(tooLongTimer); tooLongTimer = null
      }
      else {
        // show spinner
        document.querySelector('#please-wait').style.display = 'block'

        // setup secondary timers
        uhohTimer = setTimeout(function () {
          phoenix.ui.setStatus('warning', 'Hmm, this seems to be taking a while...')
        }, 5e3)
        tooLongTimer = setTimeout(function () {
          phoenix.ui.setStatus('danger', 'I think something broke :(. Please restart Patchwork and let us know if this keeps happening!')
        }, 20e3)
      }
    }

    // disable immediately
    if (!enabled)
      return doit()

    // enable immediately, or after a timer (if not already waiting)
    if (!after)
      doit()
    else if (!pleaseWaitTimer)
      pleaseWaitTimer = setTimeout(doit, after)
  }
}