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
        if (mlib.getLinks(msg.value.content, { tofeed: true, rel: 'follows' }).length)
          return { cls: '.followmsg', icon: 'plus' }
        if (mlib.getLinks(msg.value.content, { tofeed: true, rel: 'unfollows' }).length)
          return { cls: '.unfollowmsg', icon: 'minus' }
        return { cls: '.rawmsg', icon: 'envelope' }
      },
      trust: function () { 
        var l = mlib.getLinks(msg.value.content, { tofeed: true, rel: 'trusts' })[0]
        if (l.value < 0)
          return { cls: '.flagmsg', icon: 'flag' }
        return { cls: '.trustmsg', icon: 'lock' }
      }
    })[msg.value.content.type]()
  } catch (e) { }

  return { cls: '.rawmsg', icon: 'envelope' }
}