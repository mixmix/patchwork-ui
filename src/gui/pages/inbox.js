var h = require('hyperscript')
var pull = require('pull-stream')
var com = require('../com')
var memo = require('../../lib/memo')

module.exports = function(state) {
  console.time('render')
  var msgs = []
  for (var i=state.inbox.length-1; i>=0; i--) {
    msgs.push(memo('msg:'+state.inbox[i], com.message, state, state.msgsById[state.inbox[i]]))
  }

  state.setPage(com.page(state, 'feed', h('.row',
    h('.col-xs-1', com.sidenav(state)),
    h('.col-xs-7', h('.message-feed', msgs))
  )))
  console.timeEnd('render')
}