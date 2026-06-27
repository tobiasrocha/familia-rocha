import { initializeApp } from "firebase/app";
import { getAuth, sendPasswordResetEmail } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDJ77PMuCEohZjlWYp2qGuFLoVZMR9JLuU",
  authDomain: "familia-rocha-7ea1a.firebaseapp.com",
  projectId: "familia-rocha-7ea1a"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

async function test() {
  try {
    console.log("Enviando e-mail para tobiasrocha@gmail.com...");
    await sendPasswordResetEmail(auth, "tobiasrocha@gmail.com");
    console.log("SUCESSO: E-mail enviado sem erros.");
  } catch (error) {
    console.error("ERRO FIREBASE:", error.code, error.message);
  }
}

test();
