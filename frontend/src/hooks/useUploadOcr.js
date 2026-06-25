import { useState } from 'react';
import { apiFetch } from '../config';

export function useUploadOcr() {
  const [extraindo, setExtraindo] = useState(false);
  const [erro, setErro] = useState('');
  const [progresso, setProgresso] = useState(0);
  const [dadosExtraidos, setDadosExtraidos] = useState(null);

  const extrairDados = async (file) => {
    if (!file) return null;
    setExtraindo(true);
    setErro('');
    setProgresso(0);
    setDadosExtraidos(null);

    // Simula progresso enquanto faz upload
    const intervalo = setInterval(() => setProgresso(p => Math.min(p + 15, 85)), 400);

    const formData = new FormData();
    formData.append('documento', file);

    try {
      const resposta = await apiFetch(`/extrair-boleto`, { method: 'POST', body: formData });
      setProgresso(100);

      if (!resposta.ok) {
        const corpo = await resposta.json().catch(() => ({}));
        throw new Error(corpo.erro || `Erro HTTP ${resposta.status}`);
      }

      const dados = await resposta.json();
      setDadosExtraidos(dados);
      return dados;
    } catch (err) {
      const mensagem = err.message === 'Failed to fetch'
        ? 'Servidor indisponível. Verifique se o backend está rodando.'
        : err.message;
      setErro(mensagem);
      return null;
    } finally {
      clearInterval(intervalo);
      setExtraindo(false);
    }
  };

  return { extraindo, erro, progresso, dadosExtraidos, extrairDados };
}
