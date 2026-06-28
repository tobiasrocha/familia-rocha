import admin from 'firebase-admin';
import { readFileSync } from 'fs';
const serviceAccount = JSON.parse(readFileSync('./serviceAccountKey.json', 'utf8'));
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();
async function run() {
  const snap = await db.collection('usuarios').where('email', '==', 'tobiasrocha@gmail.com').get();
  if(!snap.empty){
    const doc = snap.docs[0];
    const p = doc.data().permissoes || {};
    p.pessoas = true;
    await doc.ref.update({permissoes: p});
    console.log('OK');
  }
  process.exit(0);
}
run();
