var mlib = require('ssb-msgs')
var ssbref = require('ssb-ref')
var app = require('./app')

var mentionRegex = 
exports.regex = /([^A-z0-9_\->\/]|^)([@%&](amp;)?[A-z0-9\._\-+=\/]*[A-z0-9_\-+=\/])/g

function shorten (hash) {
  return hash.slice(0, 8) + '..' + hash.slice(-11)
}

var replace =
exports.replace = function (str, each, spansOnly) {
  return str.replace(mentionRegex, function(full, $1, ref) {
    ref = ref.replace(/&amp;/g, '&')

    // give cb functions for found/notfound
    return each(ref, 
      function (id, name) {
        name = name || id
        if (ssbref.isLink(name))
          name = shorten(name)
        name = name.replace(/&/g, '&amp;')
        if (spansOnly)
          return ($1||'') + '<strong>'+(name||id)+'</strong>'
        if (ssbref.isFeedId(id))
          return ($1||'') + '<a href="#/profile/'+id+'">' + name + '</a>'
        if (ssbref.isBlobId(id))
          return ($1||'') + '<a href="#/webview/'+id+'">' + name + '</a>'
        if (ssbref.isMsgId(id))
          return ($1||'') + '<a href="#/msg/'+id+'">' + name + '</a>'
      },
      function () {
        ref = ref.replace(/&/g, '&amp;')
        return ($1||'') + '<abbr class="text-danger" title="Not found">'+ref+'</abbr>'
      }
    )
  })
}

exports.extract = function (text, cb) {
  app.ssb.patchwork.getIdsByName(function (err, idsByName) {
    if (err)
      return cb(err)

    // collect any mentions
    var match
    var mentions = [], mentionedIds = {}
    while ((match = mentionRegex.exec(text))) {
      var ref = match[2]
      ref = ref.replace(/&amp;/, '&')
      var name = ref.slice(1) // lose the @
      var id = idsByName[name]

      // name conflict? abort
      if (Array.isArray(id))
        return cb({ conflict: true, name: name })

      if (ssbref.isFeedId(id)) {
        // mapped to a valid id?
        if (!(id in mentionedIds))
          mentionedIds[id] = mentions.push({ link: id, name: name }) - 1
        else
          mentions[mentionedIds[id]].name = name // make sure the name is set
      } else if (ssbref.isLink(ref)) {
        // is a valid id?
        if (!(ref in mentionedIds)) {
          mentionedIds[ref] = mentions.push({ link: ref }) - 1
        }
      }
    }

    cb(null, mentions)
  })
}

exports.post = function (str, msg, spansOnly) {
  var mentions = mlib.links(msg.value.content.mentions, 'feed')
  return exports.render(str, mentions, spansOnly)
}

exports.render = function (str, mentions, spansOnly) {
  if (!mentions)
    return str
  return replace(str, function (name, found, notfound) {
    // find the id from the mention links
    var id
    if (ssbref.isLink(name))
      id = name
    else {
      var woAt = name.slice(1) // lose the @
      for (var i = 0; i < mentions.length; i++) {
        if (mentions[i].name === woAt) {
          id = mentions[i].link
          break
        }
      }
    }

    // render
    if (!id)
      return notfound()
    name = app.users.names[id] ? ('@'+app.users.names[id]) : name // try to use locally-assigned name
    return found(id, name)
  }, spansOnly)
}

exports.preview = function (str, nameList) {
  return replace(str, function (name, found, notfound) {
    if (ssbref.isLink(name))
      return found(name, name)
    if (name.slice(1) in nameList) // slice out the @
      return found(name, name)
    return notfound()
  }, true)
}