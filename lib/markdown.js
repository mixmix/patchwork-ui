'use strict'
var emojiNamedCharacters = require('emoji-named-characters')
var marked = require('marked')
var isref = require('ssb-ref')

// override link render 
// - only external links or hashes
// - if external, always target=_blank
var renderer = new marked.Renderer();
renderer.link = function (href, title, text) {
  try {
    var prot = decodeURIComponent(unescape(href))
      .replace(/[^\w:]/g, '')
      .toLowerCase();
  } catch (e) {
    return '';
  }
  var ishash = isref(href)
  if (!ishash && prot.indexOf('http') !== 0) {
    return text;
  }
  var out = '<a href="' + href + '"';
  if (title) {
    out += ' title="' + title + '"';
  }
  if (!ishash)
    out += ' target="_blank"'
  out += '>' + text + '</a>';
  return out;
}

// inline images are not allowed - treat them like links
renderer.image = renderer.link

marked.setOptions({
  gfm: true,
  tables: true,
  breaks: true,
  pedantic: false,
  sanitize: true,
  smartLists: true,
  smartypants: false,
  emoji: renderEmoji,
  renderer: renderer
});

var markedOpts = {sanitize: true}
exports.block = function(text) {
  return marked(text||'', markedOpts)
}

var emojiRegex = /(\s|>|^)?:([A-z0-9_]+):(\s|<|$)/g;
exports.emojis = function (str) {
  return str.replace(emojiRegex, function(full, $1, $2, $3) {
    return ($1||'') + renderEmoji($2) + ($3||'')
  })
}

function renderEmoji (emoji) {
  return emoji in emojiNamedCharacters ?
      '<img src="./img/emoji/' + encodeURI(emoji) + '.png"'
      + ' alt=":' + escape(emoji) + ':"'
      + ' title=":' + escape(emoji) + ':"'
      + ' class="emoji" align="absmiddle" height="20" width="20">'
    : ':' + emoji + ':'
}

