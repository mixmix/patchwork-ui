var mlib = require('ssb-msgs')
var refs = require('ssb-ref')
var app = require('./app')

var mentionRegex = 
exports.regex = /([^A-z0-9_-]|^)@([A-z0-9\._\-+=\/]*[A-z0-9_\-+=\/])/g

var replace =
exports.replace = function (str, each, spansOnly) {
  return str.replace(mentionRegex, function(full, $1, name) {
    // give cb functions for found/notfound
    return each(name, 
      function (id, name) {
        if (spansOnly)
          return ($1||'') + '<strong class="user-link">@'+(name||id)+'</strong>'
        return ($1||'') + '<a class="user-link" href="#/profile/'+id+'">@' + name + '</a>'
      },
      function () {
        return ($1||'') + '<abbr class="text-danger" title="User not found">@'+name+'</abbr>'
      }
    )
  })
}

exports.extract = function (text, cb) {
  app.ssb.phoenix.getIdsByName(function (err, idsByName) {
    if (err)
      return cb(err)

    // collect any mentions
    var match
    var mentions = [], mentionedIds = {}
    while ((match = mentionRegex.exec(text))) {
      var name = match[2]
      var id = idsByName[name]

      // name conflict? abort
      if (Array.isArray(id))
        return cb({ conflict: true, name: name })

      if (refs.isFeedId(id)) {
        // mapped to a valid id?
        if (!mentionedIds[id]) {
          mentions.push({ link: id, name: name })
          mentionedIds[id] = true
        }
      } else if (refs.isFeedId(name)) {
        // is a valid id?
        if (!mentionedIds[name]) {
          mentions.push({ link: name })
          mentionedIds[name] = true
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
    if (refs.isFeedId(name))
      id = name
    else {
      for (var i = 0; i < mentions.length; i++) {
        if (mentions[i].name === name) {
          id = mentions[i].link
          break
        }
      }
    }

    // render
    if (!id)
      return notfound()
    name = app.users.names[id] || name // try to use locally-assigned name
    return found(id, name)
  }, spansOnly)
}

exports.preview = function (str, nameList) {
  return replace(str, function (name, found, notfound) {
    if (refs.isFeedId(name))
      return found(name, name)
    if (name in nameList)
      return found(name, name)
    return notfound()
  }, true)
}