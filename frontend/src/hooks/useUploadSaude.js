import { useState } from 'react';
import { apiFetch } from '../config';

export function useUploadSaude() {
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState('');

  const enviarArquivo = async (file) => {
    if (!file) return null;
    setEnviando(true);
    setErro('');

    const formData = new FormData();
    formData.append('documento', file);

    try {
      const resposta = await apiFetch(`/upload-saude`, {
        method: 'POST',
        body: formData,
      });

      if (!resposta.ok) {
        const corpo = await resposta.json().catch(() => ({}));
        throw new Error(corpo.erro || 'Falha desconhecida no upload');
      }

      return await resposta.json();
    } catch (err) {
      const mensagem = err.message === 'Failed to fetch'
        ? 'Servidor indisponivel. Verifique se o backend esta rodando.'
        : err.message;
      setErro(mensagem);
      alert("Falha de conexao: " + mensagem);
      return null;
    } finally {
      setEnviando(false);
    }
  };

  return { enviando, erro, enviarArquivo };
}
