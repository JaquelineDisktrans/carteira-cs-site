// js/navegacao.js — menu lateral e rotas por hash (#/carteira, #/cliente360...).

import { h, icone, trocar } from "./ui.js";

export const ROTAS = [
  { id: "carteira", rotulo: "Carteira", formas: [["rect", { x: 3, y: 3, width: 7, height: 7, rx: 1 }], ["rect", { x: 14, y: 3, width: 7, height: 7, rx: 1 }], ["rect", { x: 3, y: 14, width: 7, height: 7, rx: 1 }], ["rect", { x: 14, y: 14, width: 7, height: 7, rx: 1 }]] },
  { id: "cliente360", rotulo: "Cliente 360", formas: [["circle", { cx: 12, cy: 8, r: 4 }], ["path", { d: "M4 21c0-4 4-6 8-6s8 2 8 6" }]] },
  { id: "acionamentos", rotulo: "Acionamentos", formas: [["path", { d: "M3 12h4l3-8 4 16 3-8h4" }]] },
  { id: "dashboard", rotulo: "Dashboard", formas: [["path", { d: "M4 20V10" }], ["path", { d: "M10 20V4" }], ["path", { d: "M16 20v-7" }], ["path", { d: "M22 20H2" }]] },
  { id: "plano", rotulo: "Plano 5W2H", formas: [["path", { d: "M9 6h11" }], ["path", { d: "M9 12h11" }], ["path", { d: "M9 18h11" }], ["path", { d: "M4 6l1 1 2-2" }], ["path", { d: "M4 12l1 1 2-2" }], ["path", { d: "M4 18l1 1 2-2" }]] },
  { id: "roteirizacao", rotulo: "Roteirização", formas: [["circle", { cx: 6, cy: 19, r: 2 }], ["circle", { cx: 18, cy: 5, r: 2 }], ["path", { d: "M8 19h7a3 3 0 0 0 0-6H9a3 3 0 0 1 0-6h7" }]] },
  { id: "relatorios", rotulo: "Relatórios", formas: [["path", { d: "M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8z" }], ["path", { d: "M14 3v5h5" }], ["path", { d: "M9 13h6" }], ["path", { d: "M9 17h6" }]] },
];

export function rotaAtual() {
  const id = (location.hash || "").replace(/^#\/?/, "").split("?")[0];
  return ROTAS.some((r) => r.id === id) ? id : "carteira";
}

/** Parâmetro opcional da rota (ex.: #/cliente360?cli=CLI580). */
export function parametroRota(nome) {
  const busca = (location.hash.split("?")[1] || "");
  return new URLSearchParams(busca).get(nome);
}

export function irPara(id, parametros = "") {
  location.hash = `#/${id}${parametros ? `?${parametros}` : ""}`;
}

export function montarMenu(menu, ativa, { nomeUsuario, aoSair }) {
  trocar(menu,
    h("img", { class: "menu__logo", src: "assets/img/logo-disktrans.svg", alt: "Disktrans" }),
    h("div", {},
      h("p", { class: "menu__rotulo", text: "Customer Success" }),
      h("ul", { class: "menu__lista" },
        ROTAS.map((r) => h("li", {},
          h("a", { class: `menu__link${r.id === ativa ? " menu__link--ativo" : ""}`, href: `#/${r.id}`, "aria-current": r.id === ativa ? "page" : null },
            icone(r.formas), r.rotulo))))),
    h("div", { class: "menu__usuario" },
      h("span", { class: "menu__usuario-nome", text: nomeUsuario }),
      h("span", { class: "menu__usuario-papel", text: "Customer Success" }),
      h("button", { type: "button", class: "menu__sair", text: "Sair", on: { click: aoSair } })));
}
