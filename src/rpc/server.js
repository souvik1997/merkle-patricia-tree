const grpc = require('grpc')
const protoDescriptor = require('./common.js')
const Trie = require('../secure.js')

const BAD_ID_ERR = 'Bad Trie ID'

module.exports = class RPCServer {
  constructor (address, ...args) {
    if (!address) {
      address = '0.0.0.0:50051'
    }

    this.server = new grpc.Server()
    this.server.addService(protoDescriptor.merklepatriciatree.MerklePatriciaTree.service, {
      Initialize: this.initialize.bind(this),
      Get: this.get.bind(this),
      GetRaw: this.getRaw.bind(this),
      Put: this.put.bind(this),
      PutRaw: this.putRaw.bind(this),
      Del: this.del.bind(this),
      CheckRoot: this.checkRoot.bind(this),
      ReadStream: this.readStream.bind(this),
      GetRoot: this.getRoot.bind(this),
      Copy: this.copy.bind(this),
      Checkpoint: this.checkpoint.bind(this),
      InCheckpoint: this.inCheckpoint.bind(this),
      Commit: this.commit.bind(this),
      Revert: this.revert.bind(this)
    })

    this.server.bind(address, grpc.ServerCredentials.createInsecure())
    this.server.start()
    this.tries = []
    this.trieArgs = args
  }

  _trieRoot (requestedRoot) {
    if (requestedRoot.length === 0) {
      return this.EMPTY_TRIE_ROOT
    } else {
      return requestedRoot
    }
  }

  initialize (call, cb) {
    const newLength = this.tries.push(new Trie(...this.trieArgs))
    cb(null, {
      root: this.tries[newLength - 1].root,
      id: newLength - 1
    })
  }

  get (call, cb) {
    const root = this._trieRoot(call.request.root)
    const key = call.request.key
    const trie = this.tries[call.request.id]

    if (trie === undefined) {
      cb(BAD_ID_ERR, null)
    }

    if (trie.root !== root) {
      trie.root = root
    }

    trie.get(key, function (err, value) {
      if (err) {
        cb(err, {
          success: false,
          value: null
        })
      } else {
        cb(null, {
          success: value !== null,
          value: value
        })
      }
    })
  }

  getRaw (call, cb) {
    const root = this._trieRoot(call.request.root)
    const key = call.request.key
    const trie = this.tries[call.request.id]

    if (trie === undefined) {
      cb(BAD_ID_ERR, null)
    }

    if (trie.root !== root) {
      trie.root = root
    }

    trie.db.get(key, function (err, value) {
      if (err) {
        cb(err, {
          success: false,
          value: null
        })
      } else {
        cb(null, {
          success: value !== null,
          value: value
        })
      }
    })
  }

  put (call, cb) {
    const root = this._trieRoot(call.request.root)
    const key = call.request.key
    const value = call.request.value

    const trie = this.tries[call.request.id]

    if (trie === undefined) {
      cb(BAD_ID_ERR, null)
    }

    if (trie.root !== root) {
      trie.root = root
    }

    trie.put(key, value, function (err, value) {
      if (err) {
        cb(err, {
          success: false,
          value: null
        })
      } else {
        cb(null, {
          success: true,
          value: value,
          newRoot: trie.root
        })
      }
    })
  }

  putRaw (call, cb) {
    const root = this._trieRoot(call.request.root)
    const key = call.request.key
    const value = call.request.value
    const trie = this.tries[call.request.id]

    if (trie === undefined) {
      cb(BAD_ID_ERR, null)
    }

    if (trie.root !== root) {
      trie.root = root
    }

    trie.db.put(key, value, function (err, value) {
      if (err) {
        cb(err, {
          success: false,
          value: null
        })
      } else {
        cb(null, {
          success: true,
          value: value
        })
      }
    })
  }

  del (call, cb) {
    const root = this._trieRoot(call.request.root)
    const key = call.request.key
    const trie = this.tries[call.request.id]

    if (trie === undefined) {
      cb(BAD_ID_ERR, null)
    }

    if (trie.root !== root) {
      trie.root = root
    }

    trie.del(key, function (err, value) {
      if (err) {
        cb(err, {
          success: false,
          value: null
        })
      } else {
        cb(null, {
          success: true,
          value: value,
          newRoot: trie.root
        })
      }
    })
  }

  checkRoot (call, cb) {
    const root = this._trieRoot(call.request.root)
    const trie = this.tries[call.request.id]

    if (trie === undefined) {
      cb(BAD_ID_ERR, null)
    }

    trie.checkRoot(root, function (err, value) {
      if (err) {
        cb(err, {
          success: false,
          validRoot: false
        })
      } else {
        cb(err, {
          success: value,
          validRoot: value
        })
      }
    })
  }

  readStream (call, cb) {
    const root = this._trieRoot(call.request.root)
    const trie = this.tries[call.request.id]

    if (trie === undefined) {
      cb(BAD_ID_ERR, null)
    }

    if (trie.root !== root) {
      trie.root = root
    }
    let stream = trie.createReadStream()
    stream.on('data', function (data) {
      call.write({ value: data })
    })
    stream.on('end', function () {
      call.end()
    })
  }

  getRoot (call, cb) {
    const trie = this.tries[call.request.id]

    if (trie === undefined) {
      cb(BAD_ID_ERR, null)
    }

    console.log(trie.root)
    cb(null, { root: trie.root })
  }

  copy (call, cb) {
    const trie = this.tries[call.request.id]

    if (trie === undefined) {
      cb(BAD_ID_ERR, null)
    }
    const newLength = this.tries.push(trie.copy())

    cb(null, {
      id: newLength - 1
    })
  }

  checkpoint (call, cb) {
    const trie = this.tries[call.request.id]

    if (trie === undefined) {
      cb(BAD_ID_ERR, null)
    }

    trie.checkpoint()
    cb(null, {})
  }

  inCheckpoint (call, cb) {
    const trie = this.tries[call.request.id]

    if (trie === undefined) {
      cb(BAD_ID_ERR, null)
    }

    cb(null, {
      result: trie.isCheckpoint
    })
  }

  commit (call, cb) {
    const trie = this.tries[call.request.id]

    if (trie === undefined) {
      cb(BAD_ID_ERR, null)
    }

    trie.commit(function () {
      cb(null, {})
    })
  }

  revert (call, cb) {
    const trie = this.tries[call.request.id]

    if (trie === undefined) {
      cb(BAD_ID_ERR, null)
    }

    trie.revert(function () {
      cb(null, {})
    })
  }
}
