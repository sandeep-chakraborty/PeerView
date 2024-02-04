const admin = require('firebase-admin');
const serviceAccount = require('./peerview-49f5a-firebase-adminsdk-7r6dk-5435f5b1e2.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: 'https://peerview-49f5a-default-rtdb.firebaseio.com',
    storageBucket: 'peerview-49f5a.appspot.com'
});

const database = admin.database();
const storage = admin.storage();

console.log('Firebase initialized successfully');

module.exports = { database, storage, firebaseAdmin: admin };
