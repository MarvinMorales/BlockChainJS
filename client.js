const WebSocket = require('ws')
const wss = new WebSocket('wss://61d7-2800-bf0-8002-e6c-b122-84e3-d1a6-62fe.ngrok.io');

wss.onopen = socket => {
  wss.onmessage = event => {
    console.log(event.data)
  }
}