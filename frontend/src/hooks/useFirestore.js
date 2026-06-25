import { useState, useEffect, useCallback } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../firebaseConfig';

export const useFirestore = (colecao) => {
  const [dados, setDados] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);

  useEffect(() => {
    const colRef = collection(db, colecao);
    const unsub = onSnapshot(colRef,
      (snapshot) => {
        const lista = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setDados(lista);
        setCarregando(false);
      },
      (err) => {
        console.error("Erro no Firestore:", err);
        setErro(err.message);
        setCarregando(false);
      }
    );
    return () => unsub();
  }, [colecao]);

  const recarregar = useCallback(() => {}, []);

  return { dados, carregando, erro, recarregar };
};
