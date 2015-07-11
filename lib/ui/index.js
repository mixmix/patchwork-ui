var h = require('hyperscript')
var schemas = require('ssb-msg-schemas')
var refs = require('ssb-ref')

module.exports = function (app) {

  require('./modals')(app)
  require('./subwindows')(app)  

  app.ui.navBack = function (e) {
    e.preventDefault()
    e.stopPropagation()
    window.history.back()
  }
  app.ui.navForward = function (e) {
    e.preventDefault()
    e.stopPropagation()
    window.history.forward()
  }
  app.ui.navRefresh = function (e) {
    e.preventDefault()
    e.stopPropagation()
    app.refreshPage()
  }  

  app.ui.showUserId = function () { 
    swal('Here is your contact id', app.user.id)
  }

  var oldScrollTop
  app.ui.disableScrolling = function () {
    oldScrollTop = document.body.scrollTop
    document.querySelector('html').style.overflow = 'hidden'
    window.scrollTo(0, oldScrollTop)
  }
  app.ui.enableScrolling = function () {
    document.querySelector('html').style.overflow = 'auto'
    window.scrollTo(0, oldScrollTop)
  }

  app.ui.setStatus = function (type, message) {
    var status = document.getElementById('app-status')
    status.innerHTML = ''
    if (type)
      status.appendChild(h('.alert.alert-'+type, message))
  }

  app.ui.notice = function (type, message, duration) {
    app.ui.setStatus(type, message)
    setTimeout(app.ui.setStatus, duration || 15e3)
  }

  app.ui.followPrompt = function (e) {
    e.preventDefault()

    var id = prompt('Enter the contact id')
    if (!id)
      return
    if (!refs.isFeedId(id))
      return swal('Invalid ID', '"'+id+'" is not a valid user ID. Please check your source and try again.', 'error')

    schemas.addContact(app.ssb, id, { following: true }, function (err) {
      if (err) {
        console.error(err)
        swal('Error While Publishing', err.message, 'error')
      }
      else {
        swal('Contact Added', 'You will now follow the messages published by your new contact.', 'success')
        app.refreshPage()
      }
    })
  }

  var pleaseWaitTimer, uhohTimer, tooLongTimer
  app.ui.pleaseWait = function (enabled, after) {
    function doit() {
      // clear main timer
      clearTimeout(pleaseWaitTimer); pleaseWaitTimer = null

      if (enabled === false) {
        // hide spinner
        document.querySelector('#please-wait').style.display = 'none'
        app.ui.setStatus(false)

        // clear secondary timers
        clearTimeout(uhohTimer); uhohTimer = null
        clearTimeout(tooLongTimer); tooLongTimer = null
      }
      else {
        // show spinner
        document.querySelector('#please-wait').style.display = 'block'

        // setup secondary timers
        uhohTimer = setTimeout(function () {
          app.ui.setStatus('warning', 'Hmm, this seems to be taking a while...')
        }, 5e3)
        tooLongTimer = setTimeout(function () {
          app.ui.setStatus('danger', 'I think something broke :(. Please restart Patchwork and let us know if this keeps happening!')
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

  app.ui.dropdown = function (el, options, opts, cb) {
    if (typeof opts == 'function') {
      cb = opts
      opts = {}
    }

    var dropdown = h('.dropdown',
      { onmouseleave: die },
      options.map(function (o) {
        if (o.separator)
          return h('hr')
        return h('a', { href: '#', onclick: onselect(o.value) }, o.label)
      })
    )
    if (opts.width)
      dropdown.style.width = opts.width + 'px'

    var rect = el.getClientRects()[0]
    dropdown.style.top = (rect.bottom + document.body.scrollTop + 10 + (opts.offsetY||0)) + 'px'
    dropdown.style.left = (rect.left + document.body.scrollLeft - 20 + (opts.offsetX||0)) + 'px'
    document.body.appendChild(dropdown)

    function onselect (value) {
      return function (e) {
        e.preventDefault()
        cb(value)
        die()
      }
    }
    function die () {
      if (dropdown)
        document.body.removeChild(dropdown)
      dropdown = null
    }
  }
}