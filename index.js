// Require stuff
const { Base64 } = require('js-base64');
const fetch = require(`node-fetch`)
const check = require(`./check`)

// Set up express
const express = require(`express`)
const app = express()

require('express-ws')(app);

app.set(`view engine`, `ejs`)

app.use(express.static(`public`))

// Some token things

let checkTokens = []
function makeid(length) {
  let result = '';
  let characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let charactersLength = characters.length;
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}

// Express yay

app.get(`/`, (req,res)=>{
  res.render(`index`)
})

app.get(`/verify/:token`, (req, res) => {
  if (checkTokens.includes(req.params.token)) {
    res.send(`Yup`)
  } else {
    res.status(404).send(`Nope`)
  }
})

app.get(`/pay/:base64`, (req, res) => {
  let decoded;

  try {
    decoded = Base64.decode(req.params.base64).split("|")
  } catch {
    res.status(500).send(`Internal Server Error`)
  }

  if (decoded.length !== 4) {
    res.status(400).send(`Bad Request`)
    return;
  }

  if (req.headers['x-replit-user-name']) {
    res.render(`pay`, {
      user: decoded[0],
      repl: decoded[1],
      item: decoded[2],
      price: decoded[3]
    })
  } else {
    res.render(`login`, {
      user: decoded[0],
      repl: decoded[1],
      item: decoded[2],
      price: decoded[3]
    })
  }
})

let buying = []

app.ws('/socket', function(ws, req) {

  if (!req.headers['x-replit-user-name']) ws.terminate();

  let waiting, paid, item, repl, user, price, callback, replID, firstCheck;

  firstCheck = 0

  let username = req.headers['x-replit-user-name'];

  if (buying.includes(username)) {
    ws.send(JSON.stringify({
      type: 0,
      error: "You're already purchasing something"
    }))

    ws.close()
    return;
  }

  let checkInterval = setInterval(() => {
    if (waiting && !paid) {
      check(replID).then((r) => {
        for (let i = 0; i < r.length; i++) {
          if (r[i].user.username == username) {
            if (r[i].totalCyclesTipped - firstCheck >= price) {
              console.log(`${username} bought ${item} on ${repl} by ${user} for ${price} cycles!`)
              // PAID!!!
              paid = true;

              ws.send(JSON.stringify({
                type: 3
              }))

              token = makeid(50)

              checkTokens.push(token)

              fetch(`https://${repl}.${user}.repl.co/_tippay/complete/${username}/${token}/${item}`).then((re) => {
                if (re.status == 200) {
                  ws.send(JSON.stringify({
                    type: 4,
                    redirect: callback
                  }))

                  close(false)
                } else {
                  ws.send(JSON.stringify({
                    type: 0,
                    error: "Unable to reach application! So sorry about that."
                  }))

                  close(false)
                }
              }).catch(() => {
                ws.send(JSON.stringify({
                  type: 0,
                  error: "Unable to reach application! So sorry about that."
                }))

                close(false)
              })
            }
          }
        }
      }).catch((e) => {
        ws.send(JSON.stringify({
          type: 0,
          error: "Unable to reach Replit"
        }))

        close(false)
      })
    }
  }, 5000)

  function close(force) {
    buying = buying.filter(un => un !== username)

    clearInterval(checkInterval)

    if (force) ws.terminate()
    else ws.close()
  }

  buying.push(username)

  ws.on('close', () => {
    buying = buying.filter(un => un !== username)
  })

  ws.on('message', function(msg) {
    if (msg.length > 2000) close(true);

    let decoded;

    try {
      decoded = JSON.parse(msg)

      switch (decoded.type) {
        case 1:
          if (repl) break;

          ({ repl, user, price, item } = decoded.data);

          price = Number(price)

          if (isNaN(price)) close(false);

          ws.send(JSON.stringify({
            type: 1
          }))

          fetch(`https://${repl}.${user}.repl.co/_tippay/check`, {
            method: 'POST',
            body: JSON.stringify({
              item, price
            }),
            headers: {
              'Content-Type': 'application/json'
            }
          }).then(async (r) => {
            if (r.status == 200) {
              let args = await r.text()
              args = args.split("|||")

              callback = args[0]
              replID = args[1]

              check(replID).then((r) => {
                for (let e = 0; e < r.length; e++) {
                  if (r[e].user.username == username) firstCheck = r[e].totalCyclesTipped;
                }

                ws.send(JSON.stringify({
                  type: 2
                }))

                waiting = true
              }).catch(() => {
                ws.send(JSON.stringify({
                  type: 0,
                  error: "Unable to reach Replit"
                }))

                close(false)
              })
            } else {
              ws.send(JSON.stringify({
                type: 0,
                error: "Info incorrect"
              }))

              close(false)
            }
          }).catch((e) => {
            ws.send(JSON.stringify({
              type: 0,
              error: "Application unreachable"
            }))

            close(false)
          })
          break;
      }
    } catch {
      close(true)
    }
  });
});

app.listen()