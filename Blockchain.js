/**
 * Procedure to follow to create the blockchain:
 * 1) Receive transaction from any node
 */
const crypto = require('crypto');

class Blockchain {
    constructor(_chain, _transactions, _nonce, _dificulty) {
        this._chain = _chain;
        this._mineRate = 3000;
        this._transactions = _transactions; //List of pending transactions
        this._maximum_block_size = 100; //Maximum block size, once 2000 transaction are reached,  block is added to the chain
        this._nonce = null;
        this._dificulty = _dificulty;
        this._Create_And_Add_Block("__MAIN__");
    }

    _Create_Genesys_Block(miner) {
        let date = new Date();
        let block = new Object();
        block['block'] = new Object();
        block['block']['_block_index'] = this._chain.length + 1;
        block['block']['_block_miner'] = miner;
        block['block']['_block_timestamp'] = date.toUTCString();
        block['block']['_block_milliseconds_timestamp'] = Date.now();
        block['block']['_block_body'] = this._transactions;
        block['block']['_block_transactions_number'] = block['block']['_block_body'].length;
        block['block']['_body_size'] = Buffer.byteLength(JSON.stringify(this._transactions));
        let result = this._Proof_Of_Work(block['block'], "__NONE__", 1, {block: {_difficulty: this._dificulty, _block_timestamp: Date.now()}});
        block['block'] = result['_block'];
        block['_hashBlock'] = result['_blockHash'];
        this._chain.push(block);
    }

    _Create_And_Add_Block(miner) {
        if (this._chain.length !== 0) {
            let date = new Date();
            let block = new Object();
            block['block'] = new Object();
            block['block']['_block_index'] = this._chain.length + 1;
            block['block']['_block_miner'] = miner;
            block['block']['_block_timestamp'] = date.toUTCString();
            block['block']['_block_milliseconds_timestamp'] = Date.now();
            block['block']['_block_body'] = this._transactions;
            block['block']['_block_transactions_number'] = block['block']['_block_body'].length;
            block['block']['_body_size'] = Buffer.byteLength(JSON.stringify(this._transactions));
            let result = this._Proof_Of_Work(block['block'], this._chain[this._chain.length - 1]['hashBlock'], 
            this._chain[this._chain.length - 1]['block']['_block_nonce'], this._chain[this._chain.length - 1]);
            block['block'] = result['_block'];
            block['_hashBlock'] = result['_blockHash'];
            this._chain.push(block);
        } else { this._Create_Genesys_Block(miner) }
    }

    _Validate_Chain(_largestBlockChain) {
        let reversedChain = _largestBlockChain.reverse();
        for (let i = 0; i < reversedChain.length; i++) {
            if (reversedChain[i + 1]['_hashBlock'].substring(0, reversedChain[i + 1]['block']['_difficulty']) === 
            "0".repeat(reversedChain[i + 1]['block']['_difficulty'])) {
                let hash = crypto.createHash('sha256');
                let _block = JSON.stringify(reversedChain[i + 1]['block']);
                let _nonce = reversedChain[i + 1]['block']['_block_nonce'];
                let _previuosHash = reversedChain[i]['_hashBlock'];
                let data = hash.update(`${_nonce.toString()}${_block}${_previuosHash}__RaNdNuMbErIcOnIc__`, 'utf-8');
                let gen_hash = data.digest('hex');
                reversedChain[i]['_hashBlock'] = gen_hash;
                let lastBlockHash = reversedChain[i]['_previous_block_hash'];
                if (lastBlockHash !== gen_hash) {
                    return { Type: "__WRONG_CHAIN__", BrokenChainLink: reversedChain[i] }
                } else if (lastBlockHash === gen_hash) { return { Type: "__CORRECT_CHAIN__" } }
            }
        }
    }

    _Proof_Of_Work(_block, _previousHash, _lastNonce, _lastBlock) {
        let _nonce = 1, _proof = false, block = { ..._block };
        block['_difficulty'] = this._dificulty;
        var initialTime = new Date().getTime();
        var finalTime = 0;
        while(!_proof) {
            finalTime = new Date().getTime();
            block['_block_nonce'] = _nonce;
            block['_block_processTime'] = finalTime - initialTime;
            block['_previous_block_hash'] = this._chain.length === 0 ? "__GENESYS_BLOCK__" : this._chain[this._chain.length - 1]['_hashBlock'];
            let blockString = JSON.stringify(block);
            var hash = crypto.createHash('sha256');
            hash = hash.update(`${_nonce.toString()}${blockString}${_previousHash}__RaNdNuMbErIcOnIc__`, 'utf-8');
            var gen_hash = hash.digest('hex');
            var dif = this._AdjustDifficulty(_lastBlock, finalTime);
            if (gen_hash.substring(0, dif) === "0".repeat(dif)) {
                _proof = true; this._dificulty = dif;
                return { _solved: true, _block: block, _blockHash: gen_hash }
            } else { _nonce++; }
        }
    }

    _AdjustDifficulty(_lastBlock, _currentTime) {
        let difficulty = _lastBlock['block']['_difficulty'];
        let timeStamp = _lastBlock['block']['_block_milliseconds_timestamp'];
        return timeStamp + this._mineRate > _currentTime ? difficulty + 1 : difficulty - 1;
    }
}

module.exports = Blockchain;