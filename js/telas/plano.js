// js/telas/plano.js — plano de ação 5W2H alimentado pelo kanban de acionamentos.

import * as estado from "../estado.js";
import * as f from "../formato.js";
import { botaoBaixarAlteracoes } from "../exportar/arquivo.js";
import { cabecalhoTela, h, trocar } from "../ui.js";

const POR_QUE = { Troca: "Equipamento parado no cliente / SLA de troca", Novo: "Entrega de encomenda fora do prazo", Devolução: "Retirada pendente", Proposta: "Oportunidade de expansão", Reclamação: "Insatisfação do cliente", "Chamado técnico": "Reincidência de quebra" };
const COMO = { Troca: "Cobrar a unidade de atendimento e confirmar rota", Novo: "Validar estoque e romaneio com a unidade", Devolução: "Agendar coleta com o cliente", Proposta: "Montar proposta com o comercial", Reclamação: "Retorno ao gestor do cliente com plano", "Chamado técnico": "Visita técnica e laudo dos equipamentos" };
const COLUNAS = [["oque", "O quê", "what", true], ["porque", "Por quê", "why", true], ["onde", "Onde", "where"], ["quem", "Quem", "who"], ["quando", "Quando", "when"], ["como", "Como", "how", true], ["quanto", "Quanto", "how much"]];

/** Converte um cartão do kanban em ação do plano. */
export function acaoDoCartao(k) {
  return {
    id: `P-${k.id}`, origem: k.id, cli: k.cli, rotuloOrigem: `Kanban #${k.id} · ${k.cliente}`,
    oque: k.desc, porque: POR_QUE[k.tipo] || "", onde: k.local, quem: k.resp, quando: k.prazo,
    como: COMO[k.tipo] || "", quanto: "Sem custo", feito: k.etapa === "concluido", criado: k.criado,
  };
}

function ordenar(acoes) {
  return [...acoes].sort((a, b) => {
    if (a.feito !== b.feito) return a.feito ? 1 : -1;
    return String(a.quando || "9999").localeCompare(String(b.quando || "9999")) || String(b.criado).localeCompare(String(a.criado));
  });
}

export function renderizarPlano(conteudo) {
  const corpo = h("tbody");
  const botaoPuxar = h("button", { type: "button", class: "botao botao--secundario" });

  function atualizar(id, campo, valor) {
    estado.salvar("plano", estado.plano().map((p) => (p.id === id ? { ...p, [campo]: valor } : p)));
    desenhar();
  }

  function novosDoKanban() {
    const jaNoPlano = new Set(estado.plano().map((p) => p.origem).filter(Boolean));
    return estado.acionamentos().filter((k) => !jaNoPlano.has(k.id));
  }

  function desenhar() {
    const hoje = f.hojeIso();
    const novos = novosDoKanban().length;
    botaoPuxar.textContent = novos ? `Puxar do kanban (${novos} novos)` : "Kanban em dia";
    botaoPuxar.disabled = !novos;
    trocar(corpo, ordenar(estado.plano()).map((p) => linha(p, hoje, atualizar)));
  }

  botaoPuxar.addEventListener("click", () => {
    estado.salvar("plano", [...novosDoKanban().map(acaoDoCartao), ...estado.plano()]);
    desenhar();
  });

  function novaAcao() {
    const agora = new Date().toISOString();
    estado.salvar("plano", [{ id: `P-${Date.now()}`, origem: "", cli: "", rotuloOrigem: "Ação avulsa", oque: "", porque: "", onde: "", quem: "", quando: f.hojeIso(), como: "", quanto: "", feito: false, criado: agora }, ...estado.plano()]);
    desenhar();
    const primeiro = corpo.querySelector("textarea");
    if (primeiro) primeiro.focus();
  }

  desenhar();
  trocar(conteudo,
    cabecalhoTela("Plano de ação da carteira", "Plano 5W2H",
      botaoBaixarAlteracoes(), botaoPuxar,
      h("button", { type: "button", class: "botao botao--primario", text: "+ Nova ação", on: { click: novaAcao } })),
    h("p", { class: "card__nota", text: "Cada linha nasce de um cartão do kanban de Acionamentos (o quê, onde, quem e quando vêm do cartão). Ajuste qualquer campo direto na tabela; a ordem se atualiza quando você sai do campo." }),
    h("section", { class: "card card--sem-padding", "aria-label": "Plano de ação" },
      h("div", { class: "tabela-rolagem" },
        h("table", { class: "tabela tabela-5w2h" },
          h("thead", {}, h("tr", {}, h("th", { text: "Feito" }),
            COLUNAS.map(([, nome, ingles]) => h("th", {}, nome, h("span", { class: "texto-apagado", text: ` (${ingles})` }))))),
          corpo)),
      h("p", { class: "card__nota card__nota--com-padding", text: "Ordem automática: abertas primeiro, do prazo mais curto para o mais longo (empate: a mais nova em cima). Concluídas descem para o fim." })));
}

function linha(p, hoje, atualizar) {
  const dias = p.quando ? f.diasEntre(hoje, p.quando) : null;
  const vencida = !p.feito && dias !== null && dias < 0;
  const situacao = p.feito ? "Concluída" : (dias === null ? "Sem prazo" : (dias < 0 ? `Vencida há ${-dias} dia(s)` : (dias === 0 ? "Vence hoje" : `Faltam ${dias} dia(s)`)));
  const classe = p.feito ? "tabela-5w2h__linha--feita" : (vencida ? "tabela-5w2h__linha--vencida" : "");

  const campo = ([chave, nome, , longo]) => {
    const atributos = {
      class: `campo__entrada${longo ? " campo__entrada--texto-longo" : ""}`, "aria-label": `${nome} · ${p.oque || "nova ação"}`,
      value: p[chave] || "", on: { change: (e) => atualizar(p.id, chave, e.target.value) },
    };
    if (chave === "quando") atributos.type = "date";
    else if (!longo) atributos.type = "text";
    else atributos.rows = 2;
    return h("td", {}, h(longo ? "textarea" : "input", atributos),
      chave === "oque" ? h("span", { class: "texto-pequeno texto-apagado", text: p.rotuloOrigem }) : null,
      chave === "quando" ? h("span", { class: `texto-pequeno ${vencida || dias === 0 ? "texto-risco" : "texto-apagado"}`, text: situacao }) : null);
  };

  return h("tr", { class: classe },
    h("td", { class: "tabela__centro" },
      h("label", { class: "caixa-marcar" },
        h("span", { class: "visualmente-oculto", text: `Concluir ${p.oque || "ação"}` }),
        h("input", { type: "checkbox", class: "caixa-marcar__entrada", checked: Boolean(p.feito), on: { change: (e) => atualizar(p.id, "feito", e.target.checked) } }))),
    COLUNAS.map(campo));
}
