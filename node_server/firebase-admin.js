// node_server/firebaseAdmin.js
const admin = require('firebase-admin')
const serviceAccount = require('./firebase-key.json')  // this just works in CJS

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
})

module.exports = admin
