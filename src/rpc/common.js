/*
 * A gRPC wrapper around ethereumjs/merkle-patricia-tree
 */

const grpc = require('grpc')
const protoLoader = require('@grpc/proto-loader')

const packageDefinition = protoLoader.loadSync(__dirname + '/../src/rpc/rpc.proto',
  {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true
  })

module.exports = grpc.loadPackageDefinition(packageDefinition)
