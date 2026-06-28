// Script para definir senha do usuario no Firebase Auth
require('dotenv').config();
const { initializeApp, cert } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const fs = require('fs');

const credenciaisPath = './credenciais-google.json';
const serviceAccount = fs.existsSync(credenciaisPath) ? require(credenciaisPath) : null;

initializeApp({
  credential: serviceAccount ? cert(serviceAccount) : undefined,
});

const auth = getAuth();

async function main() {
  const email = 'tobiasrocha@gmail.com';
  
  try {
    const user = await auth.getUserByEmail(email);
    console.log('Usuario encontrado:', user.uid);
    console.log('Providers:', user.providerData.map(p => p.providerId));
    
    // Define uma senha para esse usuario
    const novaSenha = process.argv[2];
    if (!novaSenha || novaSenha.length < 6) {
      console.log('\nUso: node set-password.js <nova_senha>');
      console.log('A senha deve ter no minimo 6 caracteres.');
      return;
    }
    
    await auth.updateUser(user.uid, { password: novaSenha });
    console.log(`\nSenha definida com sucesso para ${email}!`);
    console.log('Agora voce pode logar com email + senha no sistema.');
  } catch (err) {
    console.error('Erro:', err.message);
  }
}

main();
