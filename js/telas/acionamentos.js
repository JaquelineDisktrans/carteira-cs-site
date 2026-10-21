// js/telas/acionamentos.js — kanban de acionamentos da carteira.

import { CONFIG } from "../config.js";
import * as estado from "../estado.js";
import * as f from "../formato.js";
import { botaoBaixarAlteracoes } from "../exportar/arquivo.js";
import { parametroRota } from "../navegacao.js";
import { cabecalhoTela, campoTexto, etiqueta, h, pilulas, selecao, trocar } from "../ui.js";

export const ETAPAS = [["aberto", "Aberto"], ["andamento", "Em atendimento"], ["cliente", "Aguardando cliente"], ["concluido", "Concluído"]];
export const TIPOS = ["Troca", "Novo", "Devolução", "Proposta", "Chamado técnico", "Reclamação"];
const COR_TIPO = { Troca: "azul", Novo: "laranja", Devolução: "", Proposta: "atencao", Reclamação: "risco", "Chamado técnico": "navy" };

/** Dias úteis do cartão na etapa atual. */
export function diasNaEtapa(cartao, hoje = f.hojeIso()) {
  return f.diasUteis(cartao.etapaDesde, hoje);
}

export function atrasadoNaEtapa(cartao, hoje = f.hojeIso()) {
  return cartao.etapa !== "concluido" && diasNaEtapa(cartao, hoje) > CONFIG.SLA_ETAPA[cartao.etapa];
}

export function renderizarAcionamentos(conteudo) {
  const filtro = { tipo: "Todos", cli: "todos", empresa: "todas", resp: "todos", atrasados: false };
  const clienteNovo = parametroRota("novo");
  const areaFormulario = h("div");
  const areaFiltros = h("section", { class: "card", "aria-label": "Filtros" });
  const areaQuadro = h("div", { class: "kanban" });

  function desenharTudo() {
    desenharFiltros();
    desenharQuadro();
  }

  function desenharFiltros() {
    const cartoes = estado.acionamentos();
    const clientes = estado.roteirizacao();
    const empresas = [...new Set(cartoes.map((k) => k.empresa).filter(Boolean))];
    const resps = [...new Set(cartoes.map((k) => k.resp).filter(Boolean))];
    const hoje = f.hojeIso();
    trocar(areaFiltros,
      pilulas("Filtrar por tipo", [["Todos", "Todos"], ...TIPOS.map((t) => [t, t])], filtro.tipo, (v) => { filtro.tipo = v; desenharTudo(); }),
      h("div", { class: "linha-campos" },
        selecao("Cliente (CLI)", [["todos", "Todos"], ...clientes.map((r) => [r.cli, `${r.cli} · ${r.nome}`])], filtro.cli, (v) => { filtro.cli = v; desenharQuadro(); }),
        selecao("Razão social (CNPJ)", [["todas", "Todas"], ...empresas.map((e) => [e, e])], filtro.empresa, (v) => { filtro.empresa = v; desenharQuadro(); }, "campo campo--largo"),
        selecao("CS responsável", [["todos", "Todos"], ...resps.map((r) => [r, r])], filtro.resp, (v) => { filtro.resp = v; desenharQuadro(); }),
        h("label", { class: "caixa-marcar caixa-marcar--risco" },
          h("input", { type: "checkbox", class: "caixa-marcar__entrada", checked: filtro.atrasados, on: { change: (e) => { filtro.atrasados = e.target.checked; desenharQuadro(); } } }),
          `Só atrasados na etapa (${cartoes.filter((k) => atrasadoNaEtapa(k, hoje)).length})`)),
      h("p", { class: "card__nota", text: `SLA da etapa (provisório): Aberto ${CONFIG.SLA_ETAPA.aberto} d.u. · Em atendimento ${CONFIG.SLA_ETAPA.andamento} d.u. · Aguardando cliente ${CONFIG.SLA_ETAPA.cliente} d.u. Conta os dias úteis desde que o cartão entrou na etapa, não o prazo do pedido.` }));
  }

  function mover(cartao, destino) {
    estado.salvar("acionamentos", estado.acionamentos().map((k) => (k.id === cartao.id ? { ...k, etapa: destino, etapaDesde: f.hojeIso() } : k)));
    desenharTudo();
  }

  function desenharQuadro() {
    const hoje = f.hojeIso();
    const visiveis = estado.acionamentos().filter((k) => (filtro.tipo === "Todos" || k.tipo === filtro.tipo)
      && (filtro.cli === "todos" || k.cli === filtro.cli) && (filtro.empresa === "todas" || k.empresa === filtro.empresa)
      && (filtro.resp === "todos" || k.resp === filtro.resp) && (!filtro.atrasados || atrasadoNaEtapa(k, hoje)));
    trocar(areaQuadro, h("div", { class: "kanban__colunas" },
      ETAPAS.map(([id, nome], i) => {
        const lista = visiveis.filter((k) => k.etapa === id)
          .sort((a, b) => (Number(atrasadoNaEtapa(b, hoje)) - Number(atrasadoNaEtapa(a, hoje))) || String(a.prazo).localeCompare(String(b.prazo)));
        return h("section", { class: "kanban__coluna", "aria-label": nome },
          h("div", { class: "kanban__topo" },
            h("div", {}, h("h2", { text: nome }), h("span", { class: "texto-pequeno texto-apagado", text: id === "concluido" ? "concluídos" : `SLA da etapa: ${CONFIG.SLA_ETAPA[id]} d.u.` })),
            h("span", { class: "kanban__contador", text: lista.length })),
          lista.map((k) => cartao(k, hoje, ETAPAS[i + 1], mover)));
      })));
  }

  function abrirFormulario(cli) {
    const ativos = estado.roteirizacao().filter((r) => r.ativo);
    const tipo = selecao("Tipo", TIPOS.map((t) => [t, t]), "Troca", () => {});
    const cliente = selecao("Cliente (CLI)", ativos.map((r) => [r.cli, `${r.cli} · ${r.nome}`]), cli || (ativos[0] && ativos[0].cli), () => {});
    const local = campoTexto("Loja ou unidade de atendimento", { type: "text", placeholder: "Ex.: Disktrans CD4 RJ" });
    const resp = campoTexto("Responsável", { type: "text", value: (ativos.find((r) => r.cli === cli) || ativos[0] || {}).resp || "" });
    const prazo = campoTexto("Prazo", { type: "date", value: f.hojeIso() });
    const desc = campoTexto("Descrição", { multilinha: true, rows: 2, placeholder: "O que precisa ser feito" }, "campo campo--largo");
    const erro = h("p", { class: "mensagem mensagem--erro", role: "alert", hidden: true });

    function salvarNovo() {
      const texto = desc.entrada.value.trim();
      if (!texto) {
        erro.textContent = "Descreva o acionamento.";
        erro.hidden = false;
        return;
      }
      const cliSel = cliente.querySelector("select").value;
      const rote = ativos.find((r) => r.cli === cliSel) || {};
      const lista = estado.acionamentos();
      const maior = Math.max(1000, ...lista.map((k) => Number(String(k.id).replace(/\D/g, "")) || 0));
      estado.salvar("acionamentos", [{
        id: `AC-${maior + 1}`, tipo: tipo.querySelector("select").value, cli: cliSel, cliente: rote.nome || cliSel, empresa: "",
        local: local.entrada.value.trim() || "—", desc: texto, resp: resp.entrada.value.trim() || rote.resp || "",
        prazo: prazo.entrada.value, etapa: "aberto", etapaDesde: f.hojeIso(), criado: f.hojeIso(),
      }, ...lista]);
      trocar(areaFormulario);
      desenharTudo();
    }

    trocar(areaFormulario, h("section", { class: "card", "aria-label": "Novo acionamento" },
      h("h2", { text: "Novo acionamento" }),
      h("div", { class: "linha-campos" }, tipo, cliente, local.rotulo, resp.rotulo, prazo.rotulo),
      h("div", { class: "linha-campos" }, desc.rotulo),
      erro,
      h("div", { class: "pilulas" },
        h("button", { type: "button", class: "botao botao--primario", text: "Salvar no Aberto", on: { click: salvarNovo } }),
        h("button", { type: "button", class: "botao botao--secundario", text: "Cancelar", on: { click: () => trocar(areaFormulario) } }))));
    desc.entrada.focus();
  }

  desenharTudo();
  trocar(conteudo,
    cabecalhoTela("Todos os clientes da carteira", "Acionamentos",
      botaoBaixarAlteracoes(),
      h("button", { type: "button", class: "botao botao--primario", text: "+ Novo acionamento", on: { click: () => abrirFormulario() } })),
    areaFormulario, areaFiltros, areaQuadro);
  if (clienteNovo) abrirFormulario(clienteNovo);
}

function cartao(k, hoje, proxima, mover) {
  const dias = diasNaEtapa(k, hoje);
  const atrasado = atrasadoNaEtapa(k, hoje);
  return h("article", { class: `cartao${atrasado ? " cartao--atrasado" : ""}` },
    h("div", { class: "cartao__topo" }, etiqueta(k.tipo, COR_TIPO[k.tipo] || ""), h("span", { class: "texto-pequeno texto-apagado", text: `#${k.id}` })),
    h("a", { class: "cartao__cliente", href: `#/cliente360?cli=${k.cli}` }, k.cliente, h("span", { class: "texto-pequeno texto-apagado", text: ` · ${k.cli}` })),
    h("span", { text: k.desc }),
    h("span", { class: "texto-pequeno texto-apagado", text: `${k.local} · ${k.resp}` }),
    h("div", { class: "cartao__rodape" },
      h("span", { class: atrasado ? "texto-risco" : "valor-forte", text: k.etapa === "concluido" ? "Concluído" : `${dias} d.u. na etapa · ${atrasado ? "atrasado" : "no prazo"}` }),
      h("span", { class: "texto-apagado", text: `Prazo ${f.diaMes(k.prazo)}` })),
    proxima ? h("button", { type: "button", class: "botao botao--pequeno", text: `Mover para ${proxima[1]} →`, on: { click: () => mover(k, proxima[0]) } }) : null);
}
