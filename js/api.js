// js/api.js — toda leitura de arquivo de dados passa por aqui.
// Este painel não tem backend: lê o pacote criptografado estático em front/dados/.

import { CONFIG } from "./config.js";

export async function buscarPacoteDados() {
  const resposta = await fetch(CONFIG.ARQUIVO_DADOS, { cache: "no-store" });
  if (!resposta.ok) {
    throw new Error(`arquivo (${resposta.status})`);
  }
  return resposta.json();
}
