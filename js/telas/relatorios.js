// js/telas/relatorios.js — glossário de relatórios com geração dos arquivos.

import * as estado from "../estado.js";
import { gerarBaseAberto, gerarCobrancaUnidades, gerarPlanoExcel } from "../exportar/excel.js";
import { gerarPdfCliente } from "../exportar/pdf.js";
import { gerarFechamento, gerarForum } from "../exportar/ppt.js";
import { cabecalhoTela, etiqueta, h, pilulas, selecao, trocar } from "../ui.js";

const COR_FORMATO = { PPT: "", PDF: "", EXCEL: "azul" };

const RELATORIOS = [
  { id: "semanal", nome: "Fechamento semanal da carteira", formato: "PPT", publico: "CS", freq: "Semanal", porCliente: false,
    para: "Reunião semanal do time de CS: o que mudou na carteira e onde agir.",
    itens: ["N.S. em aberto e saúde por cliente", "Aging de troca, novo e devolução", "Lojas com problema (ranking) por cliente", "Plano 5W2H aberto e vencido"] },
  { id: "mensal", nome: "Fechamento mensal da carteira", formato: "PPT", publico: "Gerência", freq: "Mensal", porCliente: false,
    para: "Visão do gerente de CS: evolução dos últimos 13 meses e movimento da frota.",
    itens: ["Tudo do semanal", "Solicitações por mês, no prazo × atrasadas, por cliente", "Encomendas × devoluções e saldo em R$"] },
  { id: "pdf", nome: "Fechamento semanal para o cliente", formato: "PDF", publico: "Cliente", freq: "Semanal", porCliente: true,
    para: "One page para o gestor do cliente, no padrão visual Disktrans. Abre a impressão: escolha \"Salvar como PDF\".",
    itens: ["Nível de serviço e pendências", "Lojas com atraso", "Pendências por unidade de atendimento", "Plano de ação combinado"] },
  { id: "forum", nome: "Fórum mensal com o cliente", formato: "PPT", publico: "Cliente", freq: "Mensal", porCliente: true,
    para: "Apresentação de resultados para a reunião de relacionamento.",
    itens: ["Resultados operacionais e SLA", "Evolução mensal", "Lojas com mais trocas e reincidência", "Expansão e próximos passos"] },
  { id: "cobranca", nome: "Cobrança das unidades de atendimento", formato: "EXCEL", publico: "Unidades", freq: "Diário", porCliente: false,
    para: "Uma aba por filial, CD ou concessionária com o que está em aberto, atrasados primeiro.",
    itens: ["Aba de resumo por unidade", "Equipamento a equipamento: loja, prazo, dias de atraso", "Status do romaneio e Nº Disk", "Coluna para o retorno da unidade"] },
  { id: "base", nome: "Base de solicitações em aberto", formato: "EXCEL", publico: "CS", freq: "Sob demanda", porCliente: false,
    para: "Base completa para análise ou conferência com o cliente.",
    itens: ["Uma linha por equipamento em aberto", "Cliente, loja, unidade e tipo", "Prazo, atraso e romaneio", "Valor mensal de locação"] },
  { id: "plano", nome: "Plano de ação 5W2H", formato: "EXCEL", publico: "Gerência", freq: "Semanal", porCliente: false,
    para: "Exportação do plano de ação para acompanhamento fora do painel.",
    itens: ["Ações abertas e concluídas", "Responsável e prazo", "Origem no kanban", "Status: no prazo, vencida, concluída"] },
];

export function renderizarRelatorios(conteudo) {
  const filtro = { cli: "todos", publico: "Todos" };
  const mensagem = h("p", { class: "mensagem", role: "status", hidden: true });
  const grade = h("div", { class: "grade grade--media" });
  const areaPublico = h("div");

  function avisar(texto, erro = false) {
    mensagem.textContent = texto;
    mensagem.className = `mensagem${erro ? " mensagem--erro" : ""}`;
    mensagem.hidden = false;
  }

  async function gerar(rel, botao) {
    const dados = estado.dados();
    const plano = estado.plano();
    const clientes = estado.clientesAtivos().filter((c) => filtro.cli === "todos" || c.cli === filtro.cli);
    const clis = new Set(clientes.map((c) => c.cli));
    const detalhe = dados.detalhe.filter((x) => clis.has(x.cli));
    const sufixo = filtro.cli === "todos" ? "carteira" : filtro.cli;
    if (rel.porCliente && filtro.cli === "todos") {
      avisar("Escolha um cliente no filtro acima para gerar este relatório.", true);
      return;
    }
    botao.disabled = true;
    botao.textContent = "Gerando…";
    try {
      if (rel.id === "semanal" || rel.id === "mensal") await gerarFechamento(rel.id, clientes, dados, plano.filter((p) => !p.cli || clis.has(p.cli)));
      else if (rel.id === "forum") await gerarForum(clientes[0], dados, plano);
      else if (rel.id === "pdf") gerarPdfCliente(clientes[0], dados, plano);
      else if (rel.id === "cobranca") await gerarCobrancaUnidades(detalhe, sufixo);
      else if (rel.id === "base") await gerarBaseAberto(detalhe, sufixo);
      else if (rel.id === "plano") await gerarPlanoExcel(plano.filter((p) => !p.cli || clis.has(p.cli)));
      avisar(`"${rel.nome}" gerado. Confira a pasta de downloads do navegador.`);
    } catch (falha) {
      avisar(falha.message === "biblioteca"
        ? "Não consegui carregar a biblioteca de exportação. Verifique a internet e tente de novo."
        : "Não foi possível gerar o arquivo. Tente de novo.", true);
    } finally {
      botao.disabled = false;
      botao.textContent = `Gerar ${rel.formato}`;
    }
  }

  function desenhar() {
    trocar(areaPublico, pilulas("Público", [["Todos", "Todos"], ["CS", "CS"], ["Gerência", "Gerência"], ["Cliente", "Cliente"], ["Unidades", "Unidades"]], filtro.publico, (v) => { filtro.publico = v; desenhar(); }));
    trocar(grade, RELATORIOS.filter((r) => filtro.publico === "Todos" || r.publico === filtro.publico).map((r) => {
      const botao = h("button", { type: "button", class: "botao botao--secundario relatorio__acao", text: `Gerar ${r.formato}` });
      botao.addEventListener("click", () => gerar(r, botao));
      return h("article", { class: "card relatorio" },
        h("div", { class: "card__topo" }, etiqueta(r.formato, COR_FORMATO[r.formato]), h("span", { class: "texto-pequeno texto-apagado", text: `${r.publico} · ${r.freq}${r.porCliente ? " · por cliente" : ""}` })),
        h("h2", { text: r.nome }),
        h("p", { class: "card__nota", text: r.para }),
        h("ul", { class: "relatorio__lista" }, r.itens.map((i) => h("li", { text: i }))),
        botao);
    }));
  }

  desenhar();
  trocar(conteudo,
    cabecalhoTela("Glossário de relatórios", "Relatórios"),
    h("section", { class: "card", "aria-label": "Filtros dos relatórios" },
      h("div", { class: "linha-campos" },
        selecao("Cliente", [["todos", "Toda a carteira"], ...estado.clientesAtivos().map((c) => [c.cli, c.nome])], filtro.cli, (v) => { filtro.cli = v; }),
        areaPublico)),
    mensagem,
    grade);
}
