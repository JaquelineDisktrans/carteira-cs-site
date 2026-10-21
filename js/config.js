// js/config.js — VERSIONADO. Apenas configuração PÚBLICA.
// Nenhuma chave, token ou senha aqui.

export const CONFIG = {
  AMBIENTE: "local",

  // Pacote criptografado gerado por back/pipeline/criptografar.py
  ARQUIVO_DADOS: "dados/painel.enc.json",

  // Supabase: só guarda roteirização, acionamentos e plano 5W2H (dados editáveis).
  // URL e chave publicável são públicas por natureza; o acesso é barrado por RLS
  // e só a conta da equipe (login com a senha da equipe) lê e grava.
  SUPABASE: {
    url: "https://bihhqpumfksrjdgwvpxr.supabase.co",
    chavePublicavel: "sb_publishable_RjbJgmKx1_3UVg7hmTznaQ_3K6NZIXB",
    emailEquipe: "carteira.cs@disktrans.com.br",
  },

  // SLA de cada etapa do kanban de acionamentos, em dias úteis (provisório)
  SLA_ETAPA: { aberto: 1, andamento: 3, cliente: 5 },

  // Bibliotecas de exportação, carregadas só quando o usuário gera um arquivo.
  // Versão fixada + hash de integridade (SRI).
  BIBLIOTECAS: {
    xlsx: {
      url: "https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js",
      integridade: "sha384-vtjasyidUo0kW94K5MXDXntzOJpQgBKXmE7e2Ga4LG0skTTLeBi97eFAXsqewJjw",
    },
    supabase: {
      url: "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.js",
      integridade: "sha384-0w2KAL2YHP6wKOkUDzkCDGgVvfmHnj02DHeQ6XcHOgTfFsGyonKOpShMH1x6nk9o",
    },
    pptx: {
      url: "https://cdn.jsdelivr.net/npm/pptxgenjs@3.12.0/dist/pptxgen.bundle.js",
      integridade: "sha384-Cck14aA9cifjYolcnjebXRfWGkz5ltHMBiG4px/j8GS+xQcb7OhNQWZYyWjQ+UwQ",
    },
  },
};
