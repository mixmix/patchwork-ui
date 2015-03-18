var h = require('hyperscript')
var com = require('./index')
var u = require('../lib/util')

module.exports = function (app, msg, opts) {

  var stats = (msg) ? u.calcMessageStats(app, msg) : {}

  // markup

  var upvoted   = (stats.uservote ===  1) ? '.selected' : ''
  var downvoted = (stats.uservote === -1) ? '.selected' : ''
  var upvote = h('a.upvote'+upvoted, { href: '#', onclick: (opts && opts.handlers) ? onupvote : null  }, com.icon('triangle-top'))
  var downvote = h('a.downvote'+downvoted, { href: '#', onclick: (opts && opts.handlers) ? ondownvote : null }, com.icon('triangle-bottom'))
  var votes = h('span.votes', { 'data-amt': stats.votes||0 })

  return h('.message-stats',
    h('span.stat', upvote, votes, downvote),
    h('span.stat.comments', { 'data-amt': stats.comments||0 }, com.icon('comment'))
  )

  // handlers

  function onupvote (e) {
    vote(e, upvote, 1)
  }

  function ondownvote (e) {
    vote(e, downvote, -1)
  }

  var voting = false
  function vote (e, el, btnVote) {
    e.preventDefault()
    e.stopPropagation()
    if (voting)
      return // wait please
    voting = true

    // get current state by checking if the control is selected
    // this won't always be the most recent info, but it will be close and harmless to get wrong,
    // plus it will reflect what the user expects to happen happening
    var wasSelected = el.classList.contains('selected')
    var newvote = (wasSelected) ? 0 : btnVote // toggle behavior: unset
    el.classList.toggle('selected') // optimistice ui update
    // :TODO: use msg-schemas
    app.ssb.publish({ type: 'vote', subject: { msg: msg.key }, vote: newvote }, function (err) {
      voting = false
      if (err) {
        el.classList.toggle('selected') // undo
        swal('Error While Publishing', err.message, 'error')
      } else {
        // update ui
        var delta = newvote - (stats.uservote || 0)
        votes.dataset.amt = stats.votes = stats.votes + delta
        stats.uservote = newvote

        var up   = (newvote === 1)  ? 'add' : 'remove'
        var down = (newvote === -1) ? 'add' : 'remove'
        upvote.classList[up]('selected')
        downvote.classList[down]('selected')
      }
    })
  }
}