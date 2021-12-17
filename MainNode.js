const socket = require('ws');
const crypto = require('crypto');

const wss = new socket.Server(
  {port: 4000, maxReceivedFrameSize: 13107, maxPayload: 99999,
  maxReceivedMessageSize: 99999, autoAcceptConnections: false
});

console.log('Runnig server on port 4000');
let __BEST_NODE__ = [];
let __LARGEST_CHAIN__ = [];
let __PENDING_TRANSACTIONS__ = [];
let __ACTUAL_NONCE__ = null;
let __ACTUAL_DIFFICULT__ = null;
let __NUMBER_OF_NODES_ONLINE__ = 0;
let __KITAAB__ = 0;
let __MINER_BLOCKED__ = 0;

wss.on('connection', socket => {
  __NUMBER_OF_NODES_ONLINE__ = [...wss.clients.keys()].length;
  console.log('New node connected:', `${__NUMBER_OF_NODES_ONLINE__} Connected!`);
  socket.on('message', event => {
    let data = JSON.parse(event.toString());
    if (data.Roll === "__MINER_NODE__") {
        switch(data.Type) {
            case "__HANDSHAKE__":
                if ([ ...wss.clients.keys() ].length > 1) {
                    [ ...wss.clients.keys() ].forEach(peer => {
                        if (peer !== socket) {peer.send(JSON.stringify({Type: "__MAIN_NODE_REQUESTING_FOR_UPDATED_DATA__", NodeID: data.NodeID}))};
                    }); setTimeout(() => { 
                        __BEST_NODE__[0].SocketAddress.send(JSON.stringify({Type: "__NODE_SELECTED_TO_SHARE_CHAIN__"}));
                        setTimeout(() => {
                            socket.send(JSON.stringify({Type: "__UPDATED_BLOCKCHAIN__", Chain: __LARGEST_CHAIN__, Transactions: __PENDING_TRANSACTIONS__, 
                            Nonce: __ACTUAL_NONCE__, Difficult: __ACTUAL_DIFFICULT__}));
                            __BEST_NODE__ = [];
                            __LARGEST_CHAIN__ = [];
                            __PENDING_TRANSACTIONS__ = [];
                            __ACTUAL_NONCE__ = null;
                            __ACTUAL_DIFFICULT__ = null;
                        }, 1000)
                    }, 3000);
                } else { socket.send(JSON.stringify({Type: "__MINER_ALONE__"})) }
                break;
            case "__NODE_CHAIN_LENGTH__":
                if (__BEST_NODE__.length === 0) { __BEST_NODE__.push({SocketAddress: socket, 
                    NodeID: data.NodeID, ChainLength: data.ChainLength}); __KITAAB__ += 1; }
                else if (parseInt(data.ChainLength) > __BEST_NODE__[0].ChainLength) {
                    __BEST_NODE__[0] = { SocketAddress: socket, NodeID: data.NodeID, ChainLength: data.ChainLength }
                    __KITAAB__ += 1;
                }
                break;
            case "__SELECTED_NODE_UPDATED_DATA__":
                let updatedData = data.updatedChainData;
                __LARGEST_CHAIN__ = updatedData.chain;
                __PENDING_TRANSACTIONS__ = updatedData.transactions;
                __ACTUAL_NONCE__ = updatedData.nonce;
                __ACTUAL_DIFFICULT__ = updatedData.difficult;
                break;
            case "__VALIDATE_TRANSACTION__":
                console.log("Validating");
                [ ...wss.clients.keys() ].forEach(peer => {
                    if (peer !== socket) { peer.send(JSON.stringify({Type: "__VALIDATE_TRANSACTION__",
                    Transaction: data.Transaction})) }
                });
                break;
            case "__NODE_TRANSACTION_VALIDATION__":
                console.log("sending validations");
                [ ...wss.clients.keys() ].forEach(peer => {
                    if (peer !== socket) { 
                        peer.send(JSON.stringify({Type: "__RECEIVE_CONFIRMATIONS__", 
                        Hash: data.Hash, NumberOfNodes: __NUMBER_OF_NODES_ONLINE__})) 
                    }
                })
                break;
            case "__I_HAVE_MINED_A_BLOCK__":
                __MINER_BLOCKED__ = __MINER_BLOCKED__ === 0 ? data.MinedTimestamp : __MINER_BLOCKED__;
                if (data.MinedTimestamp <= __MINER_BLOCKED__) {
                    [...wss.clients.keys()].forEach(peer => peer.send(JSON.stringify({Type: "__UPDATED_CHAIN_AFTER_BLOCKED_MINED__", 
                    NodeID: data.NodeID, Chain: data.UpdatedChain, Transactions: data.Transactions, Nonce: data.Nonce, 
                    Difficult: data.Difficult, Milliseconds: data.Milliseconds})));
                }
                break;
        }
    } else if (data.Roll === "__VALIDATOR_NODE__") {
        null;
    } else if (data.Roll === "__VIEWER_NODE__") {
        console.log("viewer node")
        switch (data.Type) {
            case "__GET_INFO_BY_HASH__":
                [...wss.clients.keys()].forEach(peer => {
                    if (peer !== socket) {
                        peer.send(JSON.stringify({Type: "__GET_INFO_BY_HASH__", data: data}));
                    }
                })
        }
    } 
  });

  socket.on('disconnected', socket => {
    __NUMBER_OF_NODES_ONLINE__ -= 1;
    console.log('One Node left:', `${__NUMBER_OF_NODES_ONLINE__} Connected!`);
  })
  
  socket.on('close', socket => {
    __NUMBER_OF_NODES_ONLINE__ -= 1;
    console.log('One Node left:', `${__NUMBER_OF_NODES_ONLINE__} Connected!`);
  })
});