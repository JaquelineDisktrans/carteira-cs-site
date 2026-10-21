// js/telas/roteirizacao.js — quem acompanha cada CLI e quais clientes estão ativos no painel.

import * as estado from "../estado.js";
import * as f from "../formato.js";
import { botaoBaixarAlteracoes } from "../exportar/arquivo.js";
import { cabecalhoTela, campoTexto, h, trocar } from "../ui.js";

export function renderizarRoteirizacao(conteudo) {
  const corpo = h("tbody");
  const areaFormulario = h("div");
  const porCli = new Map(estado.dados().clientes.map((c) => [c.cli, c]));

  function atualizar(cli, mudanca) {
    estado.salvar("roteirizacao", estado.roteirizacao().map((r) => (r.cli === cli ? { ...r, ...mudanca } : r)));
    desenhar();
  }

  function desenhar() {
    trocar(corpo, estado.roteirizacao().map((r) => {
      const c = porCli.get(r.cli);
      const responsavel = h("input", {
        class: "campo__entrada", type: "text", value: r.resp, "aria-label": `Responsável por ${r.nome}`,
        on: { change: (e) => atualizar(r.cli, { resp: e.target.value.trim() }) },
      });
      return h("tr", {},
        h("td", { class: "valor-forte", text: r.cli }),
        h("td", { text: r.nome }),
        h("td", {}, responsavel),
        h("td", { class: "tabela__num", text: c ? f.numero(c.lojasFrota) : "—" }),
        h("td", { class: "tabela__num", text: c ? f.numero(c.frota.total) : "entra na próxima atualização" }),
        h("td", { class: "tabela__centro" },
          h("button", {
            type: "button", class: "interruptor", role: "switch", "aria-checked": r.ativo ? "true" : "false",
            "aria-label": `${r.ativo ? "Desativar" : "Ativar"} ${r.nome}`, on: { click: () => atualizar(r.cli, { ativo: !r.ativo }) },
          }, h("span", { class: "interruptor__bola" })),
          h("div", { class: `texto-pequeno ${r.ativo ? "valor-forte" : "texto-apagado"}`, text: r.ativo ? "Ativo" : "Desativado" })));
    }));
  }

  function abrirFormulario() {
    const cli = campoTexto("CLI", { type: "text", placeholder: "CLI000" });
    const nome = campoTexto("Nome do cliente", { type: "text" }, "campo campo--largo");
    const resp = campoTexto("Responsável", { type: "text" }, "campo campo--largo");
    const erro = h("p", { class: "mensagem mensagem--erro", role: "alert", hidden: true });
    const salvar = () => {
      const codigo = cli.entrada.value.trim().toUpperCase();
      if (!/^CLI\d{3,}$/.test(codigo)) {
        erro.textContent = "Informe o código do grupo no formato CLI000.";
        erro.hidden = false;
        return;
      }
      if (estado.roteirizacao().some((r) => r.cli === codigo)) {
        erro.textContent = "Esse CLI já está na roteirização.";
        erro.hidden = false;
        return;
      }
      estado.salvar("roteirizacao", [...estado.roteirizacao(), { cli: codigo, nome: nome.entrada.value.trim() || codigo, resp: resp.entrada.value.trim(), ativo: false }]);
      trocar(areaFormulario);
      desenhar();
    };
    trocar(areaFormulario, h("section", { class: "card", "aria-label": "Adicionar CLI" },
      h("div", { class: "linha-campos" }, cli.rotulo, nome.rotulo, resp.rotulo,
        h("button", { type: "button", class: "botao botao--primario", text: "Salvar (desativado)", on: { click: salvar } })),
      erro));
    cli.entrada.focus();
  }

  desenhar();
  trocar(conteudo,
    cabecalhoTela("Quem acompanha cada cliente", "Roteirização",
      botaoBaixarAlteracoes(),
      h("button", { type: "button", class: "botao botao--primario", text: "+ Adicionar CLI", on: { click: abrirFormulario } })),
    h("p", { class: "card__nota", text: "Só os clientes ativos entram na Carteira, no Cliente 360, no Dashboard e nos relatórios. Um CLI novo só traz números depois da próxima atualização dos dados do Fabric." }),
    areaFormulario,
    h("section", { class: "card card--sem-padding", "aria-label": "Roteirização de clientes" },
      h("div", { class: "tabela-rolagem" },
        h("table", { class: "tabela tabela--estreita" },
          h("thead", {}, h("tr", {},
            h("th", { text: "CLI" }), h("th", { text: "Nome do cliente" }), h("th", { text: "Responsável pelo CLI" }),
            h("th", { class: "tabela__num", text: "Lojas com frota" }), h("th", { class: "tabela__num", text: "Frota" }), h("th", { class: "tabela__centro", text: "Ativo" }))),
          corpo))));
}
