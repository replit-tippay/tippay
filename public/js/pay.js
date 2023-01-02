const status = document.getElementById(`status`)

status.innerText = `Loading 0/3`

let socket = new WebSocket("wss://tippay.repl.co/socket");

let knownClosing = false

socket.onopen = function() {
  status.innerText = `Loading 1/3`
  socket.send(JSON.stringify({
    type: 1,
    data: config
  }))
};

socket.onmessage = function(event){
  let msg = event.data
  let decoded;
  
  try{
    decoded = JSON.parse(msg)

    switch(decoded.type){
      case 0:
        knownClosing = true
        status.innerText = `Error: ${decoded.error}`
        break;
      case 1:
        status.innerText = `Loading 2/3`
        break;
      case 2:
        status.innerHTML = `Tip ${config.price} or more cycles on <a href="https://replit.com/@${config.user}/${config.repl}?v=1" target="_blank">this Repl</a> to recieve ${config.item}. Leave this tab open.`
        break;
      case 3:
        status.innerHTML = `Finishing transaction...`
        break;
      case 4:
        status.innerHTML = `Transaction approved! Thanks for using tippay.`
        knownClosing = true

        setTimeout(()=>{
          window.location.href = decoded.redirect
        },3000)
        break;
    }
  }catch(e){
    console.error(e)
  }
}

socket.onclose = function() {
  if(!knownClosing) status.innerText = `Error: Connection closed`
};

socket.onerror = function(error) {
  console.error(error)
  
  status.innerText = `Error: ${error}`
};