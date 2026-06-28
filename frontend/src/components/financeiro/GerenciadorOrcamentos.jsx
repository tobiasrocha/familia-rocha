import React from 'react';

export default function GerenciadorOrcamentos({ orcamentos, despesasPorCategoria }) {
  if (!orcamentos || Object.keys(orcamentos).length === 0) return null;

  return (
    <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '15px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', marginTop: '20px' }}>
      <h3 style={{ margin: '0 0 15px 0', color: '#333' }}>🎯 Progresso dos Orçamentos (Mês Atual)</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '15px' }}>
        
        {Object.entries(orcamentos).map(([categoria, limite]) => {
          if (!limite || limite <= 0) return null;
          
          const itemDespesa = despesasPorCategoria.find(d => d.name === categoria);
          const gasto = itemDespesa ? itemDespesa.valor : 0;
          const percentual = Math.min((gasto / limite) * 100, 100);
          
          let corBarra = '#28a745'; // Verde
          if (percentual >= 90) corBarra = '#dc3545'; // Vermelho
          else if (percentual >= 70) corBarra = '#fd7e14'; // Laranja

          return (
            <div key={categoria} style={{ padding: '15px', backgroundColor: '#fdfcfe', border: '1px solid #eee', borderRadius: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <strong style={{ color: '#444' }}>{categoria}</strong>
                <span style={{ fontSize: '14px', color: '#666' }}>
                  {gasto.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} / {limite.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </span>
              </div>
              <div style={{ width: '100%', height: '8px', backgroundColor: '#e9ecef', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ width: `${percentual}%`, height: '100%', backgroundColor: corBarra, transition: 'width 0.5s' }} />
              </div>
              <div style={{ textAlign: 'right', marginTop: '5px', fontSize: '12px', color: corBarra, fontWeight: 'bold' }}>
                {percentual.toFixed(1)}% utilizado
              </div>
            </div>
          );
        })}

      </div>
    </div>
  );
}
