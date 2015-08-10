'use strict'
var emojiNamedCharacters = require('emoji-named-characters')
var marked = require('marked')
var ssbref = require('ssb-ref')

// override link render 
// - only external links or hashes
// - if external, always target=_blank
var renderer = new marked.Renderer();
renderer.link = function (href, title, text) {
  try {
    href = href.replace(/^&amp;/, '&')
    var prot = decodeURIComponent(unescape(href))
      .replace(/[^\w:]/g, '')
      .toLowerCase();
  } catch (e) {
    return '';
  }
  var islink = ssbref.isLink(href)
  if (islink) {
    if (ssbref.isFeedId(href))
      href = '#/profile/'+href
    else if (ssbref.isMsgId(href))
      href = '#/msg/'+href
    else if (ssbref.isBlobId(href))
      href = '#/webview/'+href
  }
  else if (prot.indexOf('http') !== 0) {
    return text;
  }
  var out = '<a href="' + href + '"';
  if (title) {
    out += ' title="' + title + '"';
  }
  if (!islink)
    out += ' target="_blank"'
  out += '>' + text + '</a>';
  return out;
}

renderer.image  = function (href, title, text) {
  href = href.replace(/^&amp;/, '&')
  if (ssbref.isLink(href)) {
    var out = '<video autoplay=1 loop=1 muted=1 src="http://localhost:7777/' + href + '" alt="' + text + '"'
    if (title) {
      out += ' title="' + title + '"'
    }
    out += '></video>'
    return out;
  }
  return text
}

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
  return marked(''+(text||''), markedOpts)
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

