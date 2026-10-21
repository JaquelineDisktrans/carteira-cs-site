// js/filtro-carteira.js — barra de filtro comum às telas: CS responsável + botões de cliente.
// Sem CS escolhido = "Carteira geral" (todos os clientes ativos). Os botões aceitam
// mais de um cliente; nenhum marcado = todos os clientes daquele CS.

import * as estado from "./estado.js";
import { h, selecao, trocar } from "./ui.js";

/**
 * Monta a barra e chama `aoMudar()` sempre que o filtro mudar.
 * Devolve o elemento (que se redesenha sozinho).
 */
export function barraFiltroCarteira(aoMudar, { multiplos = true } = {}) {
  const barra = h("div", { class: "filtro-carteira" });

  function desenhar() {
    const f = estado.filtroCarteira();
    const opcoesCs = [["", "Carteira geral"], ...estado.responsaveis().map((r) => [r, r])];
    const clientes = estado.clientesDoCs();
    const todosLigado = f.clis.size === 0;

    const botoes = [
      h("button", {
        type: "button", class: "pilula", text: "Todos", "aria-pressed": todosLigado ? "true" : "false",
        on: { click: () => { estado.limparClientes(); desenhar(); aoMudar(); } },
      }),
      ...clientes.map((c) => h("button", {
        type: "button", class: "pilula", text: c.nome, "aria-pressed": f.clis.has(c.cli) ? "true" : "false",
        title: `${c.cli} · ${c.resp}`,
        on: {
          click: () => {
            if (!multiplos) estado.limparClientes();
            estado.alternarCliente(c.cli);
            desenhar();
            aoMudar();
          },
        },
      })),
    ];

    trocar(barra,
      selecao("CS responsável", opcoesCs, f.cs, (v) => { estado.escolherCs(v); desenhar(); aoMudar(); }, "campo filtro-carteira__cs"),
      h("div", { class: "pilulas", role: "group", "aria-label": multiplos ? "Clientes (pode marcar mais de um)" : "Cliente" }, botoes));
  }

  desenhar();
  return barra;
}
