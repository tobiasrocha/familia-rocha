import { useState } from 'react';
import { API_BASE } from '../config';

export function useUploadOcr() {
  const [extraindo, setExtraindo] = useState(false);
  const [erro, setErro] = useState('');
  const [dadosExtraidos, setDadosExtraidos] = useState(null);

  const extrairDados = async (file) => {
    if (!file) return null;
    setExtraindo(true);
    setErro('');
    setDadosExtraidos(null);

    const formData = new FormData();
    formData.append('documento', file);

    try {
      const resposta = await fetch(`${API_BASE}/extrair-boleto`, {
        method: 'POST',
        body: formData,
      });

      if (!resposta.ok) {
        const corpo = await resposta.json().catch(() => ({}));
        throw new Error(corpo.erro || `Erro HTTP ${resposta.status}`);
      }

      const dados = await resposta.json();
      setDadosExtraidos(dados);
      return dados;
    } catch (err) {
      const mensagem = err.message === 'Failed to fetch'
        ? 'Servidor indisponível. Verifique se o backend está rodando na porta 3000.'
        : err.message;
      setErro(mensagem);
      return null;
    } finally {
      setExtraindo(false);
    }
  };

  return { extraindo, erro, dadosExtraidos, extrairDados };
}
