var pull = require('pull-stream')

exports.getJson = function(path, cb) {
  var xhr = new XMLHttpRequest()
  xhr.open('GET', path, true)
  xhr.responseType = 'json'
  xhr.onreadystatechange = function() {
    if (xhr.readyState == 4) {
      var err
      if (xhr.status < 200 || xhr.status >= 400)
        err = new Error(xhr.status + ' ' + xhr.statusText)
      cb(err, xhr.response)
    }
  }
  xhr.send()
}

exports.postJson = function(path, obj, cb) {
  var xhr = new XMLHttpRequest()
  xhr.open('POST', path, true)
  xhr.setRequestHeader('Content-Type', 'application/json')
  xhr.responseType = 'json'
  xhr.onreadystatechange = function() {
    if (xhr.readyState == 4) {
      var err
      if (xhr.status < 200 || xhr.status >= 400)
        err = new Error(xhr.status + ' ' + xhr.statusText)
      cb(err, xhr.response)
    }
  }
  xhr.send(JSON.stringify(obj))
}

exports.prettydate = require('nicedate')

var escapePlain =
exports.escapePlain = function(str) {
  return (str||'')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

exports.shortString = function(str, len) {
  len = len || 6
  if (str.length - 3 > len)
    return str.slice(0, len) + '...'
  return str
}

var dataSizes = ['kb', 'mb', 'gb', 'tb', 'pb', 'eb', 'zb', 'yb']
exports.bytesHuman = function (nBytes) {
  var str = nBytes + 'b'
  for (var i = 0, nApprox = nBytes / 1024; nApprox > 1; nApprox /= 1024, i++) {
    str = nApprox.toFixed(2) + dataSizes[i]
  }
  return str
}

// http://stackoverflow.com/a/23329386
exports.stringByteLength = function (str) {
  // returns the byte length of an utf8 string
  var s = str.length;
  for (var i=str.length-1; i>=0; i--) {
    var code = str.charCodeAt(i);
    if (code > 0x7f && code <= 0x7ff) s++;
    else if (code > 0x7ff && code <= 0xffff) s+=2;
  }
  return s;
}

// https://stackoverflow.com/questions/2541481/get-average-color-of-image-via-javascript
exports.getAverageRGB = function (imgEl) {
    
  var blockSize = 5, // only visit every 5 pixels
    canvas = document.createElement('canvas'),
    context = canvas.getContext && canvas.getContext('2d'),
    data, width, height,
    i = -4,
    length,
    rgb = {r:0,g:0,b:0},
    count = 0

  if (!context) {
    return null
  }
  
  height = canvas.height = imgEl.naturalHeight || imgEl.offsetHeight || imgEl.height
  width = canvas.width = imgEl.naturalWidth || imgEl.offsetWidth || imgEl.width
  
  context.drawImage(imgEl, 0, 0)
  
  try {
    data = context.getImageData(0, 0, width, height)
  } catch(e) {
    return null
  }
  
  length = data.data.length  
  while ( (i += blockSize * 4) < length ) {
    ++count
    rgb.r += data.data[i]
    rgb.g += data.data[i+1]
    rgb.b += data.data[i+2]
  }
  
  rgb.r = (rgb.r/count)|0
  rgb.g = (rgb.g/count)|0
  rgb.b = (rgb.b/count)|0
  
  return rgb
}

function votesFetcher (fetchFn) {
  return function (app, voteTopic, cb) {
    var stats = { uservote: 0, voteTally: 0, votes: {}, upvoters: [], downvoters: [] }
    pull(
      app.ssb[fetchFn]({ id: voteTopic, rel: 'voteTopic' }), 
      pull.asyncMap(function (link, cb2) { app.ssb.get(link.message, cb2) }),
      pull.collect(function (err, voteMsgs) {
        if (err)
          return cb(err)
        // collect final votes
        voteMsgs.forEach(function (m) {
          if (m.content.type !== 'vote')
            return
          if (m.content.vote === 1 || m.content.vote === 0 || m.content.vote === -1)
            stats.votes[m.author] = m.content.vote
        })
        // tally the votes
        for (var author in stats.votes) {
          var v = stats.votes[author]
          if (v === 1) {
            stats.upvoters.push(author)
            stats.voteTally++
          }
          else if (v === -1) {
            stats.downvoters.push(author)
            stats.voteTally--
          }
        }
        stats.uservote = stats.votes[app.myid] || 0
        cb(null, stats)
      })
    )
  }
}

// :TODO: cant do fetchMsgVotes because the messagesLinkedToMessage fetcher works differently than all the others
//        see https://github.com/ssbc/secure-scuttlebutt/issues/99
exports.fetchFeedVotes = votesFetcher('messagesLinkedToFeed')
exports.fetchExtVotes  = votesFetcher('feedsLinkedToExternal')

exports.calcMessageStats = function (app, thread, opts) {
  var stats = { comments: 0, uservote: 0, voteTally: 0, votes: {} }

  function process (t, depth) {
    if (!t.related)
      return

    t.related.forEach(function (r) {
      var c = r.value.content

      // only process votes for immediate children
      if (depth === 0 && c.type === 'vote') {
        // track latest choice, dont tally yet in case multiple votes by one user
        stats.votes[r.value.author] = c.vote
      }
      else if (c.type !== 'vote') {
        // count non-votes as a comment
        stats.comments++
      }

      // recurse
      if (opts && opts.recursive)
        process(r)
    })
  }
  process(thread, 0)

  // now tally the votes
  for (var author in stats.votes) {
    var v = stats.votes[author]
    if (v === 1) {
      stats.voteTally++
    }
    else if (v === -1) {
      stats.voteTally--
    }
  }
  stats.uservote = stats.votes[app.myid] || 0

  return stats
}