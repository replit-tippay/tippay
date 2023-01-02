const fetch = require(`node-fetch`)

module.exports = (replID) => {
  return new Promise((resolve, reject) => {
    fetch(`https://replit.com/graphql`, {
      method: "POST",
      "cache": "no-cache",
      "headers": {
        'User-Agent': 'Mozilla/5.0',
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        'Referrer': 'https://replit.com/',
        'Cookie': '',
      },
      body: JSON.stringify({
        "operationName": "TipRepl",
        "variables": {
          "id": replID
        },
        "query": "query TipRepl($id: String!) {\n  repl(id: $id) {\n    ... on Repl {\n      user {\n        ... on User {\n          id\n          ...TipSurfaceOwnerFragment\n          __typename\n        }\n        __typename\n      }\n      ...TipReplFragment\n      ...TopTipperReplLeaderboard\n      __typename\n    }\n    __typename\n  }\n  currentUser {\n    id\n    ...IsTippingAvailableForSender\n    __typename\n  }\n}\n\nfragment TipSurfaceOwnerFragment on User {\n  id\n  username\n  ...IsTippingAvailableForRecipient\n  __typename\n}\n\nfragment IsTippingAvailableForRecipient on User {\n  id\n  hasPrivacyRole\n  isVerified\n  isGated: gate(feature: \"flag-tip-repl\")\n  __typename\n}\n\nfragment TipReplFragment on Repl {\n  id\n  slug\n  user {\n    id\n    __typename\n  }\n  totalCyclesTips\n  currentUserTotalTips\n  __typename\n}\n\nfragment TopTipperReplLeaderboard on Repl {\n  id\n  topTippers {\n    ...TopTippersFragment\n    __typename\n  }\n  __typename\n}\n\nfragment TopTippersFragment on TipperUser {\n  user {\n    id\n    username\n    url\n    image\n    __typename\n  }\n  totalCyclesTipped\n  __typename\n}\n\nfragment IsTippingAvailableForSender on CurrentUser {\n  id\n  hasPrivacyRole\n  isVerified\n  __typename\n}\n"
      })
    }).then(async (r) => {
      let j = await r.json()

      if (j.data && j.data.repl) {
        resolve(j.data.repl.topTippers)
      } else {
        reject()
      }
    }).catch(reject)
  })
}