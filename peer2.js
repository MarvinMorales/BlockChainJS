const WebSocket = require('ws');
let address = process.env.address ? process.env.address : process.env.address = "";

let StartServerSide = () => {
    const serverSide = new WebSocket.Server(
        {port: 4001, maxReceivedFrameSize: 13107299, maxPayload: 999999999999,
        maxReceivedMessageSize: 999999999, autoAcceptConnections: false
    }); serverSide.on('connection', (socket, req) => {
        socket.onmessage = msg => console.log(msg.data);
        let adds = req.socket.remoteAddress;
        let peerIsIn = [ ...serverSide.clients.keys() ]; 
        peerIsIn = peerIsIn.includes(socket);
        if (!peerIsIn) { StartClientSide(adds.startsWith(":") ? "192.168.100.51" : adds) }
    });
}

let StartClientSide = (address) => {
    const clientSide = new WebSocket(`ws://${address}:4000`);
    clientSide.onopen = connection => {
        clientSide.send("Hi from Peer 2...");
    }
}

StartServerSide();
if (address !== "") { StartClientSide(address) }