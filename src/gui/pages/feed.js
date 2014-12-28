var h = require('hyperscript')
var pull = require('pull-stream')
var com = require('../com')
var memo = require('../../lib/memo')

module.exports = function(state) {
  console.time('render')
  var msgs = [], msg
  for (var i=state.msgs.length-1; i>=0; i--) {
    msg = state.msgs[i]
    if (state.page.feedMode == 'threaded') {
      if (msg.repliesToLink)
        continue
      msgs.push(memo('thread:'+msg.key, com.messageThread, state, msg))
    } else {
      msgs.push(memo('msg:'+msg.key, com.message, state, msg))
    }
  }
  
  state.setPage(com.page(state, 'feed', h('.row',
    h('.col-xs-1', com.sidenav(state)),
    h('.col-xs-7', 
      com.postForm(state),
      h('.message-feed', msgs)
    )
  )))
  console.timeEnd('render')
}