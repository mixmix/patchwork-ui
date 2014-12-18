var h = require('hyperscript')
var com = require('../com')

function simple(cb) {
  return function(state) {
    document.body.innerHTML = ''
    document.body.appendChild(cb(state))
  }
}

module.exports = {
  notfound: simple(function(state) {
    return com.page(state, 'notfound', h('.row',
      h('.col-xs-1', com.sidenav(state)),
      h('.col-xs-11', h('p', h('strong', 'Not Found')))
    ))
  }),
  loading: simple(function(state) {
    return com.page(state, 'loading', h('.row',
      h('.col-xs-1', com.sidenav(state)),
      h('.col-xs-11', h('p', h('strong', 'loading...')))
    ))
  }),
  feed: require('./feed'),
  inbox: simple(function(state) {
    return com.page(state, 'inbox', h('.row',
      h('.col-xs-1', com.sidenav(state)),
      h('.col-xs-11', h('p', h('strong', 'Inbox')))
    ))
  }),
  message: simple(function(state) {
    return com.page(state, 'message', h('.row',
      h('.col-xs-1', com.sidenav(state)),
      h('.col-xs-11', h('p', h('strong', 'message')))
    ))
  }),
  profile: simple(function(state) {
    return com.page(state, 'profile', h('.row',
      h('.col-xs-1', com.sidenav(state)),
      h('.col-xs-11', h('p', h('strong', 'profile')))
    ))
  }),
  network: simple(function(state) {
    return com.page(state, 'network', h('.row',
      h('.col-xs-1', com.sidenav(state)),
      h('.col-xs-11', h('p', h('strong', 'network')))
    ))
  }),
  help: simple(function(state) {
    return com.page(state, 'help', h('.row',
      h('.col-xs-1', com.sidenav(state)),
      h('.col-xs-11', h('p', h('strong', 'help')))
    ))
  })
}