// frontend/src/hooks/useFirestore.js
import { useState, useEffect, useCallback } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebaseConfig'; 

export const useFirestore = (colecao) => {
  const [dados, setDados] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);

  const buscarDados = useCallback(async () => {
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
  }, [colecao]);

  useEffect(() => {
    let ignore = false;

    async function fetchData() {
      setCarregando(true);
      try {
        const colRef = collection(db, colecao);
        const snapshot = await getDocs(colRef);
        if (!ignore) {
          const lista = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setDados(lista);
        }
      } catch (err) {
        if (!ignore) {
          console.error("Erro ao buscar no Firestore:", err);
          setErro(err.message);
        }
      } finally {
        if (!ignore) setCarregando(false);
      }
    }

    fetchData();
    return () => { ignore = true; };
  }, [colecao]);

  return { dados, carregando, erro, recarregar: buscarDados };
};