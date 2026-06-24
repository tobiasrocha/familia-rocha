// frontend/src/hooks/useFirestore.js
import { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebaseConfig'; 

export const useFirestore = (colecao) => {
  const [dados, setDados] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);

  const buscarDados = async () => {
    setCarregando(true);
    try {
      const colRef = collection(db, colecao);
      const snapshot = await getDocs(colRef);
      const lista = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setDados(lista);
    } catch (err) {
      console.error("Erro ao buscar no Firestore:", err);
      setErro(err.message);
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    buscarDados();
  }, [colecao]);

  return { dados, carregando, erro, recarregar: buscarDados };
};