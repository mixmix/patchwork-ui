var mlib = require('ssb-msgs')

module.exports = function getVisuals (app, msg) {
  try {
    return ({
      post:   function () { return { cls: '.postmsg', icon: 'comment' } },
      advert: function () { return { cls: '.advertmsg', icon: 'bullhorn' } },
      init:   function () { return { cls: '.initmsg', icon: 'off' } },
      name:   function () { return { cls: '.namemsg', icon: 'tag' } },
      pub:    function () { return { cls: '.pubmsg', icon: 'cloud' } },
      follow: function () {
        if (msg.value.content.follow === true)
          return { cls: '.followmsg', icon: 'plus' }
        if (msg.value.content.follow === false)
          return { cls: '.unfollowmsg', icon: 'minus' }
        return { cls: '.rawmsg', icon: 'envelope' }
      },
      trust: function () { 
        if (msg.value.content.trust < 0)
          return { cls: '.flagmsg', icon: 'flag' }
        return { cls: '.trustmsg', icon: 'lock' }
      }
    })[msg.value.content.type]()
  } catch (e) { }

  return { cls: '.rawmsg', icon: 'envelope' }
}