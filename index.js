const Blockchain = require('./Blockchain');
const WebSocket = require('ws');
const fs = require('fs');
const crypto = require('crypto');
const _port_ = process.env._port_ || 4000;
const user = process.env.user ? process.env.user : "";
const _websocketURL_ = process.env._websocketURL_ ? process.env._websocketURL_ : "ws://127.0.0.1";

class Node_P2P_Centralized {
    constructor(_websokcetServer_url, _port, _nodeID, _roll) {
        this._websokcetServer_url = _websokcetServer_url;
        this._nodeID = _nodeID;
        this._roll = _roll;
        this._port = _port;
        this._pendingTransaction = [];
        this._wss = null;
        this._blockchain = null;
    }

    _Connect_To_Main_Node() {
        this._wss = new WebSocket(`${this._websokcetServer_url}:${this._port}`);
        this._blockchain = new Blockchain([], [], 1, 2);
        this._wss.onopen = socket => {
            this._wss.send(JSON.stringify({Type: "__HANDSHAKE__", Roll: this._roll, NodeID: this._nodeID}));
            this._wss.onmessage = message => {
                let data = JSON.parse(message.data);
                switch (data.Type) {
                    case "__MINER_ALONE":
                        break;
                    case "__GET_THE_UPDATED_CHAIN_DATA__":
                        let _updatedData = data.updatedChainData;
                        this._blockchain._chain = _updatedData.chain;
                        this._blockchain._transactions = _updatedData.transactions;
                        this._blockchain._nonce = _updatedData.nonce;
                        this._blockchain._dificulty = _updatedData.difficult;
                        break;
                    case "__MAIN_NODE_REQUESTING_FOR_UPDATED_DATA__":
                        this._wss.send(JSON.stringify({Type: "__NODE_CHAIN_LENGTH__",
                        NodeID: this._nodeID, ChainLength: this._blockchain._chain.length, Roll: this._roll}));
                        break;
                    case "__NODE_SELECTED_TO_SHARE_CHAIN__":
                        let Data = this._Prepare_Updated_Data();
                        this._wss.send(JSON.stringify({Type: "__SELECTED_NODE_UPDATED_DATA__", NodeID: this._nodeID,
                        Roll: this._roll, updatedChainData: Data }));
                        break;
                    case "__UPDATED_BLOCKCHAIN__":
                        this._Update_Blockchain(data.Chain, data.Transactions, data.Nonce, data.Difficult);
                        console.log("Updated Chain:", this._blockchain._chain)
                        break;
                    case "__VALIDATE_TRANSACTION__":
                        console.log("Validating")
                        let _date_now = new Date(); let _obj = new Object();
                        _obj['_timestamp'] = _date_now.toUTCString();
                        _obj['_timestamp_milliseconds'] = Date.now();
                        _obj['_hash'] = this._Validate_Transaction(data.Transaction);
                        _obj['_confirmations'] = 1;
                        _obj['_transaction'] = data.Transaction;
                        console.log("Transaction Hash", _obj['_hash'])
                        this._wss.send(JSON.stringify({Type: "__NODE_TRANSACTION_VALIDATION__", Roll: this._roll, Hash: this._Validate_Transaction(data.Transaction)}));
                        this._pendingTransaction.push(_obj);
                        break;
                    case "__UPDATED_CHAIN_AFTER_BLOCKED_MINED__":
                        let _dateNow = new Date();
                        if ((parseInt(_dateNow.getTime()) - data.Milliseconds) > 3600000) {
                            this._blockchain._chain = data.Chain;
                            this._blockchain._transactions = data.Transactions;
                            this._blockchain._nonce = data.Nonce;
                            this._blockchain._dificulty = data.Difficult;
                        } 
                        break;
                    case "__RECEIVE_CONFIRMATIONS__":
                        console.log("Receiving confirmations!")
                        let hash = data.Hash; let nodesOnline = data.NumberOfNodes;
                        this._pendingTransaction.map(transaction => {
                            if (transaction['_hash'] === hash) {
                                transaction['_confirmations'] += 1; 
                                console.log("Confirmations:", transaction['_confirmations'])
                                console.log("Nodes Online:", nodesOnline)
                                let percentage = (transaction['_confirmations']/nodesOnline) * 100;
                                console.log("Percentage:", percentage);
                                if (percentage > 51) {
                                    this._blockchain._transactions.push(transaction);
                                    let removed = this._pendingTransaction.indexOf(transaction);
                                    if (removed > -1) { this._pendingTransaction.splice(removed, 1) }
                                    let actualBodyChainSize = Buffer.byteLength(JSON.stringify(this._blockchain._transactions));
                                    if (actualBodyChainSize > this._blockchain._maximum_block_size) {
                                        this._blockchain._Create_And_Add_Block(this._nodeID);
                                        this._blockchain._transactions = [];
                                        let BlockTimeStamp = this._blockchain._chain[this._blockchain._chain.length - 1]['_block_time_milliseconds'];
                                        this._wss.send(JSON.stringify({Type: "__I_HAVE_MINED_A_BLOCK__", Roll: this._roll, UpdatedChain: this._blockchain._chain, 
                                        Difficult: this._blockchain._dificulty, NodeID: this._nodeID, Transactions: this._blockchain._transactions, 
                                        Nonce: this._blockchain._nonce, Milliseconds: parseInt(BlockTimeStamp), MinedTimestamp: Date.now()}));
                                    }
                                }
                                console.log("Transactions Length:", this._blockchain._transactions.length)
                            }
                        });
                        console.log(this._blockchain._chain)
                        break;
                    case "__GET_INFO_BY_HASH__":
                        let reversedChain = this._blockchain._chain;
                        let datas = data.data;
                        reversedChain.map(block => {
                            block['block']['_block_body'].map(transaction => {
                                if (transaction['_hash'] === datas.Hash) {
                                    let _transactionData = {Tittle: "__VIEWER_REQUESTING_DATA__", RequesterID: datas.NodeID, 
                                    HashRequested: datas.Hash, RequestedTime: datas.RequestedTime, DeliveredTime: Date.now()}
                                    this._Make_Transaction(_transactionData);
                                } else { this._wss.send(JSON.stringify({Found: false})) }
                            })
                        });
                        break;
                }
            }
            this._wss.onclose = event => { console.log(event.reason) }
            this._wss.onerror = err => { console.log(err.type) }
        }
    }

    _Prepare_Updated_Data() {
        let updatedChainData = new Object();
        updatedChainData['chain'] = this._blockchain._chain;
        updatedChainData['transactions'] = this._blockchain._transactions;
        updatedChainData['nonce'] = this._blockchain._nonce;
        updatedChainData['difficult'] = this._blockchain._dificulty;
        return updatedChainData;
    }

    _Update_Blockchain(_chain, _transactions, _nonce, _difficult) {
        this._blockchain._chain = _chain;
        this._blockchain._transactions = _transactions;
        this._blockchain._nonce = _nonce;
        this._blockchain._dificulty = _difficult;
    }

    _Make_Transaction(_transaction_data) {
        this._wss.send(JSON.stringify({Type: "__VALIDATE_TRANSACTION__",
        Transaction: _transaction_data, Roll: this._roll, NodeID: this._nodeID}));
    }

    _Validate_Transaction(_transaction_data) {
        let hash = crypto.createHash('sha256');
        let string = JSON.stringify(_transaction_data);
        let data = hash.update(string, 'utf-8');
        let gen_hash = data.digest('hex');
        return gen_hash;
    }
}

const NodeP2P = new Node_P2P_Centralized(_websocketURL_, _port_, user, "__MINER_NODE__");
NodeP2P._Connect_To_Main_Node();