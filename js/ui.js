// js/ui.js — construção de elementos de tela (DOM).
// Nunca usa innerHTML: todo texto entra como textContent (proteção contra XSS).

/**
 * Cria um elemento. Atributos especiais:
 *   class, text, on: { evento: função }, style: { --variavel: valor }, dataset
 * Demais chaves viram atributos (ou propriedades, para value/checked/disabled).
 */
export function h(tag, atributos = {}, ...filhos) {
  const el = document.createElement(tag);
  Object.entries(atributos || {}).forEach(([chave, valor]) => {
    if (valor === undefined || valor === null || valor === false) return;
    if (chave === "class") el.className = valor;
    else if (chave === "text") el.textContent = String(valor);
    else if (chave === "on") Object.entries(valor).forEach(([evento, fn]) => el.addEventListener(evento, fn));
    else if (chave === "style") Object.entries(valor).forEach(([prop, v]) => el.style.setProperty(prop, String(v)));
    else if (chave === "value" || chave === "checked" || chave === "disabled") el[chave] = valor;
    else el.setAttribute(chave, valor === true ? "" : String(valor));
  });
  anexar(el, filhos);
  return el;
}

function anexar(pai, filhos) {
  filhos.flat(Infinity).forEach((filho) => {
    if (filho === undefined || filho === null || filho === false) return;
    pai.append(filho instanceof Node ? filho : document.createTextNode(String(filho)));
  });
}

export function limpar(el) {
  while (el.firstChild) el.removeChild(el.firstChild);
}

/** Troca todo o conteúdo de um elemento. */
export function trocar(el, ...filhos) {
  limpar(el);
  anexar(el, filhos);
}

const SVG = "http://www.w3.org/2000/svg";

/** Ícone de traço simples. `formas` = lista de [tag, atributos]. */
export function icone(formas, classe = "menu__icone") {
  const svg = document.createElementNS(SVG, "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("fill", "none");
  svg.setAttribute("stroke", "currentColor");
  svg.setAttribute("stroke-width", "1.8");
  svg.setAttribute("stroke-linecap", "round");
  svg.setAttribute("stroke-linejoin", "round");
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("class", classe);
  formas.forEach(([tag, attrs]) => {
    const forma = document.createElementNS(SVG, tag);
    Object.entries(attrs).forEach(([k, v]) => forma.setAttribute(k, v));
    svg.append(forma);
  });
  return svg;
}

export function cabecalhoTela(sobretitulo, titulo, ...acoes) {
  return h("header", { class: "cabecalho-tela" },
    h("div", { class: "cabecalho-tela__titulos" },
      h("span", { class: "cabecalho-tela__sobretitulo", text: sobretitulo }),
      h("h1", { text: titulo }),
      h("span", { class: "cabecalho-tela__traco" })),
    acoes.length ? h("div", { class: "cabecalho-tela__acoes" }, acoes) : null);
}

/** Grupo de filtros em pílula. opcoes = [[valor, rótulo]] */
export function pilulas(rotuloAcessivel, opcoes, selecionado, aoEscolher) {
  return h("div", { class: "pilulas", role: "group", "aria-label": rotuloAcessivel },
    opcoes.map(([valor, rotulo]) => h("button", {
      type: "button", class: "pilula", text: rotulo, "aria-pressed": valor === selecionado ? "true" : "false",
      on: { click: () => aoEscolher(valor) },
    })));
}

export function etiqueta(texto, variacao = "") {
  return h("span", { class: `etiqueta${variacao ? ` etiqueta--${variacao}` : ""}`, text: texto });
}

export function barra(fracao, cor) {
  return h("span", { class: "barra" },
    h("span", { class: "barra__preenchimento", style: { "--largura": `${Math.max(0, Math.min(100, fracao * 100))}%`, ...(cor ? { "--cor-barra": cor } : {}) } }));
}

export function barraEmpilhada(partes) {
  return h("div", { class: "barra-empilhada", role: "img", "aria-label": partes.map((p) => `${p.rotulo}: ${p.valor}`).join(", ") },
    partes.map((p) => h("span", { class: "barra-empilhada__parte", style: { "--peso": p.valor, "--cor-barra": p.cor } })));
}

export function legenda(itens) {
  return h("div", { class: "legenda" },
    itens.map(([cor, texto]) => h("span", { class: "legenda__item" },
      h("span", { class: "legenda__cor", style: { "--cor-barra": cor } }), texto)));
}

export function selecao(rotulo, opcoes, valor, aoMudar, classeCampo = "campo") {
  const id = `sel-${Math.random().toString(36).slice(2, 9)}`;
  return h("label", { class: classeCampo, for: id }, rotulo,
    h("select", { class: "campo__entrada", id, on: { change: (e) => aoMudar(e.target.value) } },
      opcoes.map(([v, r]) => h("option", { value: v, text: r, selected: v === valor ? true : null }))));
}

export function campoTexto(rotulo, atributos = {}, classeCampo = "campo") {
  const id = `cmp-${Math.random().toString(36).slice(2, 9)}`;
  const tag = atributos.multilinha ? "textarea" : "input";
  const { multilinha, ...resto } = atributos;
  const entrada = h(tag, { class: `campo__entrada${multilinha ? " campo__entrada--texto-longo" : ""}`, id, ...resto });
  return { rotulo: h("label", { class: classeCampo, for: id }, rotulo, entrada), entrada };
}

/** Card com título opcional. */
export function card(titulo, ...filhos) {
  return h("section", { class: "card", "aria-label": titulo || undefined },
    titulo ? h("h2", { text: titulo }) : null, filhos);
}

export function indicador({ rotulo, valor, unidade, detalhe, destaque, risco, largo }) {
  const classes = ["indicador", destaque ? "indicador--destaque" : "", largo ? "indicador--largo" : ""].filter(Boolean).join(" ");
  return h("div", { class: classes },
    h("span", { class: "indicador__rotulo", text: rotulo }),
    h("span", { class: `indicador__valor${risco ? " indicador__valor--risco" : ""}` }, valor, unidade ? h("span", { class: "indicador__unidade", text: ` ${unidade}` }) : null),
    detalhe instanceof Node ? detalhe : (detalhe ? h("span", { class: "indicador__detalhe", text: detalhe }) : null));
}
