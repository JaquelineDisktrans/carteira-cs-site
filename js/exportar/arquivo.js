// js/exportar/arquivo.js — download de arquivos gerados no navegador e carga das bibliotecas de exportação.

import { CONFIG } from "../config.js";
import * as estado from "../estado.js";
import { hojeIso } from "../formato.js";
import { h } from "../ui.js";

export function baixar(nome, conteudo, tipo) {
  const blob = conteudo instanceof Blob ? conteudo : new Blob([conteudo], { type: tipo });
  const url = URL.createObjectURL(blob);
  const link = h("a", { href: url, download: nome });
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const carregadas = new Map();

/** Carrega uma biblioteca da CDN (versão fixa + SRI) só quando precisar. */
export function carregarBiblioteca(nome) {
  if (carregadas.has(nome)) return carregadas.get(nome);
  const { url, integridade } = CONFIG.BIBLIOTECAS[nome];
  const promessa = new Promise((resolver, rejeitar) => {
    const script = h("script", { src: url, integrity: integridade, crossorigin: "anonymous" });
    script.addEventListener("load", resolver);
    script.addEventListener("error", () => { carregadas.delete(nome); rejeitar(new Error("biblioteca")); });
    document.head.append(script);
  });
  carregadas.set(nome, promessa);
  return promessa;
}

/** Botão que baixa as edições da sessão para o responsável atualizar o pacote. */
export function botaoBaixarAlteracoes() {
  return h("button", {
    type: "button", class: "botao botao--secundario", text: "Baixar alterações",
    title: "Baixa um arquivo com roteirização, acionamentos e plano 5W2H editados nesta sessão",
    on: { click: () => baixar(`editaveis-${hojeIso()}.json`, JSON.stringify(estado.editaveis(), null, 2), "application/json") },
  });
}
