// js/telas/dashboard.js — leitura em Z: N.S. e risco no topo, funis e participação no meio, rotinas embaixo.

import * as estado from "../estado.js";
import * as f from "../formato.js";
import { emRisco, nivelServicoCliente, somar, totalPulso } from "../indicadores.js";
import { barraFiltroCarteira } from "../filtro-carteira.js";
import { barra, cabecalhoTela, h, indicador, pilulas, trocar } from "../ui.js";
import { atrasadoNaEtapa } from "./acionamentos.js";

const PALETA = ["#022064", "#0a7ac9", "#8a93a4", "#6fa3d6", "#c2dcf1"];

export function renderizarDashboard(conteudo) {
  const d = estado.dados();
  let grupoFunil = "troca";
  const corpo = h("div", { class: "relatorio" });

  function desenhar() {
    const clientes = estado.clientesFiltrados();
    const cs = estado.filtroCarteira().cs || "Carteira geral";
    const clis = new Set(clientes.map((c) => c.cli));
    const cartoes = estado.acionamentos().filter((k) => clis.has(k.cli));
    const hoje = f.hojeIso();
    const tn = somar(clientes, (c) => c.abertos.troca.n + c.abertos.novo.n);
    const tl = somar(clientes, (c) => c.abertos.troca.late + c.abertos.novo.late);
    const risco = somar(clientes, emRisco);
    const valorRisco = somar(clientes, (c) => c.abertos.troca.valorRisco + c.abertos.novo.valorRisco);
    const atrasados = cartoes.filter((k) => atrasadoNaEtapa(k, hoje)).length;

    trocar(corpo,
      h("section", { class: "grade grade--kpis", "aria-label": "Indicadores principais" },
        indicador({ destaque: true, rotulo: "N.S. da carteira · em aberto", valor: tn ? f.percentual(1 - tl / tn) : "—", detalhe: `${f.numero(tn - tl)} de ${f.numero(tn)} trocas e novos no prazo · ${clientes.length} clientes` }),
        indicador({ rotulo: "Equipamentos em risco", valor: f.numero(risco), risco: risco > 0, detalhe: `5+ d.u. de atraso · ${f.dinheiro(valorRisco)}/mês em locação` }),
        indicador({ rotulo: "Em aberto agora", valor: f.numero(tn + somar(clientes, (c) => c.abertos.devol.n)), detalhe: `${f.numero(tl)} atrasados` }),
        indicador({ rotulo: "Entregues · 30 dias", valor: f.numero(somar(clientes, (c) => c.entregue30.troca + c.entregue30.novo + c.entregue30.devol)), detalhe: "troca, novo e devolução" }),
        indicador({ rotulo: "Acionamentos atrasados", valor: f.numero(atrasados), risco: atrasados > 0, detalhe: "fora do SLA da etapa" })),
      h("div", { class: "grade grade--larga" }, blocoFunil(clientes), blocoRosca(clientes, cs, risco)),
      h("div", { class: "grade grade--larga" }, blocoPropostas(), blocoNivelServico(clientes)),
      h("div", { class: "grade grade--media" }, blocoAcionamentos(cartoes, hoje, atrasados), blocoPlano(clis, hoje), blocoPulso(clientes)));
  }

  function blocoFunil(clientes) {
    const g = grupoFunil;
    const etapas = [
      ["Sem romaneio", somar(clientes, (c) => c.abertos[g].rom.sem), "#b7bdc9"],
      ["Aguardando rota", somar(clientes, (c) => c.abertos[g].rom.aguardando), "#0a7ac9"],
      ["Em controle de entrega", somar(clientes, (c) => c.abertos[g].rom.emrota), "#004c96"],
      ["Entregues · 30 dias", somar(clientes, (c) => c.entregue30[g]), "#022064"],
    ];
    const maior = Math.max(1, ...etapas.map((e) => e[1]));
    return h("section", { class: "card", "aria-label": "Funil de pedidos" },
      h("div", { class: "card__topo" },
        h("h2", { text: "Funil de pedidos por etapa" }),
        pilulas("Tipo de pedido", [["troca", "Troca"], ["novo", "Novo"], ["devol", "Devolução"]], g, (v) => { grupoFunil = v; desenhar(); })),
      etapas.map(([nome, valor, cor]) => h("div", { class: "funil__linha" },
        h("span", { text: nome }),
        h("span", { class: "funil__trilho" }, h("span", { class: "funil__barra", style: { "--largura": `${Math.max(2, Math.round((valor / maior) * 100))}%`, "--cor-barra": cor } })),
        h("span", { class: "funil__valor", text: f.numero(valor) }))),
      h("p", { class: "card__nota", text: "Em aberto hoje por situação do romaneio + entregues nos últimos 30 dias. 1 item = 1 equipamento." }));
  }

  desenhar();
  trocar(conteudo,
    cabecalhoTela("Desempenho da carteira", "Dashboard", h("span", { class: "fonte-dados", text: `Extraído em ${d.atualizado}` })),
    h("section", { class: "card", "aria-label": "Filtro da carteira" }, barraFiltroCarteira(desenhar)),
    corpo);
}

function blocoRosca(clientes, cs, riscoTotal) {
  let inicio = 0;
  const fatias = clientes.map((c, i) => {
    const r = emRisco(c);
    const parte = riscoTotal ? r / riscoTotal : 0;
    const fatia = { c, r, parte, cor: PALETA[i % PALETA.length], de: inicio, ate: inicio + parte };
    inicio += parte;
    return fatia;
  });
  const gradiente = riscoTotal
    ? `conic-gradient(${fatias.map((x) => `${x.cor} ${Math.round(x.de * 360)}deg ${Math.round(x.ate * 360)}deg`).join(", ")})`
    : "conic-gradient(#e9ecf1 0deg 360deg)";
  return h("section", { class: "card", "aria-label": "Participação no risco" },
    h("h2", { text: `Participação de cada cliente no risco · ${cs}` }),
    h("div", { class: "rosca" },
      h("div", { class: "rosca__circulo", role: "img", style: { "--gradiente": gradiente }, "aria-label": `Participação no risco: ${fatias.map((x) => `${x.c.nome} ${f.percentualInteiro(x.parte)}`).join(", ")}` },
        h("div", { class: "rosca__miolo" }, h("span", { class: "numero-grande", text: f.numero(riscoTotal) }), h("span", { class: "texto-pequeno texto-apagado", text: "em risco" }))),
      h("ul", { class: "lista-simples" },
        fatias.map((x) => h("li", { class: "rosca__item" },
          h("span", { class: "legenda__item" }, h("span", { class: "legenda__cor", style: { "--cor-barra": x.cor } }), h("strong", { class: "valor-forte", text: f.percentualInteiro(x.parte) })),
          h("span", {}, h("span", { class: "valor-forte", text: x.c.nome }), h("br"),
            h("span", { class: "texto-pequeno texto-apagado", text: `${f.numero(x.r)} em risco de ${f.numero(x.c.abertos.troca.n + x.c.abertos.novo.n)} em aberto` })))))),
    h("p", { class: "card__nota", text: "Risco = equipamentos em aberto (troca + novo) com 5 ou mais dias úteis de atraso." }));
}

function blocoPropostas() {
  const etapas = [["Solicitadas", 21, 21, "#8a93a4"], ["Enviadas", 16, 21, "#0a7ac9"], ["Aprovadas", 9, 21, "#004c96"], ["Recusadas", 4, 21, "#c8362b"], ["Equip. aprovados", 140, 140, "#022064"], ["Equip. efetivados", 101, 140, "#6fa3d6"]];
  return h("section", { class: "card", "aria-label": "Funil de propostas" },
    h("div", { class: "card__topo" }, h("h2", { text: "Funil de propostas" }), h("span", { class: "etiqueta etiqueta--atencao", text: "Ilustrativo · conectar Portal de pedidos Shopee" })),
    etapas.map(([nome, v, base, cor]) => h("div", { class: "funil__linha" },
      h("span", { text: nome }),
      h("span", { class: "funil__trilho funil__trilho--esquerda" }, h("span", { class: "funil__barra", style: { "--largura": `${Math.round((v / base) * 100)}%`, "--cor-barra": cor } })),
      h("span", { class: "funil__valor", text: f.numero(v) }))),
    h("p", { class: "card__nota", text: "Números de exemplo até ligar a fonte de propostas." }));
}

function blocoNivelServico(clientes) {
  const cor = (v) => (v < 0.7 ? "#c8362b" : (v < 0.85 ? "#ee9f95" : "#004c96"));
  return h("section", { class: "card", "aria-label": "Nível de serviço por cliente" },
    h("h2", { text: "Nível de serviço por cliente" }),
    clientes.map((c) => {
      const a = nivelServicoCliente(c) ?? 1;
      const t = c.atual.todas;
      const b = 1 - t.late / Math.max(1, t.n);
      return h("div", { class: "relatorio" },
        h("div", { class: "card__topo" }, h("a", { class: "valor-forte", href: `#/cliente360?cli=${c.cli}`, text: c.nome }), h("span", { class: "texto-pequeno texto-apagado", text: `${f.numero(c.abertos.troca.n + c.abertos.novo.n)} em aberto · ${f.numero(t.n)} solicitações em 90d` })),
        h("div", { class: "funil__linha" }, h("span", { class: "texto-apagado", text: "Em aberto" }), barra(a, cor(a)), h("span", { class: "tabela__num valor-forte", text: f.percentual(a) })),
        h("div", { class: "funil__linha" }, h("span", { class: "texto-apagado", text: "90 dias" }), barra(b, cor(b)), h("span", { class: "tabela__num valor-forte", text: f.percentual(b) })));
    }),
    h("p", { class: "card__nota", text: "Em aberto = no prazo ÷ em aberto hoje. 90 dias = solicitações no prazo ÷ abertas nos últimos 90 dias (todas as operações)." }));
}

function linhasValor(itens) {
  return itens.map(([rotulo, valor, risco]) => h("div", { class: "linha-valor" }, h("span", { text: rotulo }), h("span", { class: risco && valor ? "texto-risco" : "valor-forte", text: f.numero(valor) })));
}

function blocoAcionamentos(cartoes, hoje, atrasados) {
  const conta = (e) => cartoes.filter((k) => k.etapa === e).length;
  return h("section", { class: "card", "aria-label": "Acionamentos" },
    h("h2", { text: "Acionamentos por etapa" }),
    linhasValor([["Aberto", conta("aberto")], ["Em atendimento", conta("andamento")], ["Aguardando cliente", conta("cliente")], ["Fora do SLA da etapa", atrasados, true]]),
    h("a", { href: "#/acionamentos", text: "Abrir acionamentos →" }));
}

function blocoPlano(clis, hoje) {
  const acoes = estado.plano().filter((p) => !p.cli || clis.has(p.cli));
  const abertas = acoes.filter((p) => !p.feito);
  const vencidas = abertas.filter((p) => p.quando && p.quando < hoje).length;
  return h("section", { class: "card", "aria-label": "Plano de ação 5W2H" },
    h("h2", { text: "Plano de ação (5W2H)" }),
    linhasValor([["No prazo", abertas.length - vencidas], ["Vencidas", vencidas, true], ["Concluídas", acoes.length - abertas.length]]),
    h("a", { href: "#/plano", text: "Abrir plano 5W2H →" }));
}

function blocoPulso(clientes) {
  return h("section", { class: "card", "aria-label": "Encomendas e devoluções" },
    h("h2", { text: "Encomendas × devoluções · 12 meses" }),
    clientes.map((c) => {
      const e = totalPulso(c.pulso.enc);
      const dv = totalPulso(c.pulso.dev);
      return h("div", { class: "linha-valor" },
        h("span", {}, h("span", { class: "valor-forte", text: c.nome }), h("br"), h("span", { class: "texto-pequeno texto-apagado", text: `${f.numero(e)} encomendas · ${f.numero(dv)} devoluções · saldo ${f.dinheiro(c.pulso.encValor - c.pulso.devValor)}/mês` })),
        h("span", { class: e - dv >= 0 ? "valor-forte" : "texto-risco", text: `${e - dv >= 0 ? "+" : ""}${f.numero(e - dv)}` }));
    }));
}
