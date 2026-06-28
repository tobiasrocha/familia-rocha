import admin from 'firebase-admin';
import { readFileSync } from 'fs';
const credenciaisPath = './credenciais-google.json';
const serviceAccount = JSON.parse(readFileSync(credenciaisPath, 'utf8'));
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();
async function run() {
  const snap = await db.collection('usuarios').get();
  for (const doc of snap.docs) {
    const p = doc.data().permissoes || {};
    p.pessoas = true;
    await doc.ref.update({permissoes: p});
  }
  console.log('Todos atualizados!');
  process.exit(0);
}
run();
