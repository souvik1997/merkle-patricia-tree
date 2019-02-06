const assert = require('assert')
const grpc = require('grpc')
const ethUtil = require('ethereumjs-util')
const protoDescriptor = require('./common.js')

function isFunction(functionToCheck) {
  return functionToCheck && {}.toString.call(functionToCheck) === '[object Function]';
}

class RPCClient {
  constructor (address, root, id) {
    if (!address) {
      address = 'localhost:50051'
    }
    this.address = address
    this.rpcClient = new protoDescriptor.merklepatriciatree.MerklePatriciaTree(address, grpc.credentials.createInsecure())
    this._root = root
    this.id = id
    this.getRoot = this.getRoot.bind(this)
    this.setRoot = this.setRoot.bind(this)
    this.get = this.get.bind(this)
    this.getRaw = this.getRaw.bind(this)
    this.put = this.put.bind(this)
    this.putRaw = this.putRaw.bind(this)
    this.del = this.del.bind(this)
    this.createReadStream = this.createReadStream.bind(this)
    this.copy = this.copy.bind(this)
  }

  initialize (cb) {
    assert(isFunction(cb))
    this.rpcClient.initialize({}, function (err, initializeResult) {
      if (err) {
        cb(err, null)
        cb = null
      } else {
        this.id = initializeResult.id
        if (!this._root) {
          this.setRoot(initializeResult.root)
        }
        cb(null, this)
        cb = null
      }
    }.bind(this))
  }

  getRoot (cb) {
    assert(isFunction(cb))
    if (!this._root) {
      this.rpcClient.getRoot({ id: this.id }, function (err, getRootResult) {
        if (err) {
          cb(err, null)
          cb = null
        } else {
          this._root = getRootResult.root
          cb(null, getRootResult.root)
          cb = null
        }
      }.bind(this))
    } else {
      cb(null, this._root)
      cb = null
    }
  }

  setRoot (newRoot) {
    if (newRoot) {
      this._root = ethUtil.toBuffer(newRoot)
      assert(this._root.length === 32, 'Invalid root length. Roots are 32 bytes')
    } else {
      this._root = ethUtil.SHA3_RLP /* Empty root */
    }
  }

  get (key, cb) {
    assert(isFunction(cb))
    this.getRoot(function (err, root) {
      this.rpcClient.get({ id: this.id, root: root, key: ethUtil.toBuffer(key) }, function (err, getResult) {
        if (err) {
          cb(err, null)
          cb = null
        } else {
          cb(null, getResult.success ? getResult.value : null)
          cb = null
        }
      })
    }.bind(this))
  }

  getRaw (key, cb) {
    assert(isFunction(cb))
    this.getRoot(function (err, root) {
      this.rpcClient.getRaw({ id: this.id, root: root, key: ethUtil.toBuffer(key) }, function (err, getRawResult) {
        if (err) {
          cb(err, null)
          cb = null
        } else {
          cb(null, getRawResult.success ? getRawResult.value : null)
          cb = null
        }
      })
    }.bind(this))
  }

  put (key, value, cb) {
    assert(isFunction(cb))
    this.getRoot(function (err, root) {
      this.rpcClient.put({ id: this.id, root: root, key: ethUtil.toBuffer(key), value: ethUtil.toBuffer(value) }, function (err, putResult) {
        if (err) {
          cb(err, null)
          cb = null
        } else {
          this.setRoot(putResult.newRoot)
          cb(null)
          cb = null
        }
      }.bind(this))
    }.bind(this))
  }

  putRaw (key, value, cb) {
    assert(isFunction(cb))
    this.getRoot(function (err, root) {
      this.rpcClient.putRaw({ id: this.id, root: root, key: ethUtil.toBuffer(key), value: ethUtil.toBuffer(value) }, function (err, putRawResult) {
        if (err) {
          cb(err, null)
          cb = null
        } else {
          cb(null)
          cb = null
        }
      })
    }.bind(this))
  }

  del (key, cb) {
    assert(isFunction(cb))
    this.getRoot(function (err, root) {
      this.rpcClient.del({ id: this.id, root: root, key: ethUtil.toBuffer(key) }, function (err, delResult) {
        if (err) {
          cb(err)
          cb = null
        } else {
          this.setRoot(delResult.newRoot)
          cb(null)
          cb = null
        }
      }.bind(this))
    }.bind(this))
  }

  createReadStream () {
    return this.rpcClient.readStream({ id: this.id, root: this._root })
  }

  copy (cb) {
    assert(isFunction(cb))
    this.rpcClient.copy({ id: this.id }, function (err, copyResult) {
      if (err) {
        cb(err, null)
        cb = null
      } else {
        cb(null, new RPCClient(this.address, this._root, this.id))
        cb = null
      }
    }.bind(this))
  }

  checkRoot (root, cb) {
    assert(isFunction(cb))
    this.rpcClient.checkRoot({ id: this.id, root: root }, function (err, checkRootResult) {
      if (err) {
        cb(err, false)
        cb = null
      } else {
        cb(null, checkRootResult.validRoot)
        cb = null
      }
    })
  }

  checkpoint (cb) {
    assert(isFunction(cb))
    this.rpcClient.checkpoint({ id: this.id }, function (err, checkpointResult) {
      if (err) {
        cb(err, null)
        cb = null
      } else {
        cb(null, this)
        cb = null
      }
    }.bind(this))
  }

  commit (cb) {
    assert(isFunction(cb))
    this.rpcClient.commit({ id: this.id }, function (err, commitResult) {
      if (err) {
        cb(err, null)
        cb = null
      } else {
        cb(null, this)
        cb = null
      }
    }.bind(this))
  }

  inCheckpoint (cb) {
    assert(isFunction(cb))
    this.rpcClient.inCheckpoint({ id: this.id }, function (err, inCheckpointResult) {
      if (err) {
        cb(err, null)
        cb = null
      } else {
        cb(null, inCheckpointResult.result)
        cb = null
      }
    })
  }

  revert (cb) {
    assert(isFunction(cb))
    this.rpcClient.revert({ id: this.id }, function (err, revertResult) {
      if (err) {
        cb(err, null)
        cb = null
      } else {
        cb(null, this)
        cb = null
      }
    }.bind(this))
  }
}

function createRPCClient (cb, ...args) {
  let instance = new RPCClient(...args)
  instance.initialize(function (err, initializedInstance) {
    if (err) {
      cb(err, null)
      cb = null
    } else {
      cb(null, initializedInstance)
      cb = null
    }
  })
}

module.exports = createRPCClient
