// js/cripto.js — descriptografa o pacote de dados com a senha da equipe.
// Formato gerado por back/pipeline/criptografar.py:
//   PBKDF2-SHA256 (sal aleatório) → chave AES-256-GCM → dados em JSON.
// A senha nunca sai do navegador e não é guardada.

function base64ParaBytes(texto) {
  const binario = atob(texto);
  const bytes = new Uint8Array(binario.length);
  for (let i = 0; i < binario.length; i += 1) bytes[i] = binario.charCodeAt(i);
  return bytes;
}

async function derivarChave(senha, sal, iteracoes) {
  const material = await crypto.subtle.importKey("raw", new TextEncoder().encode(senha), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: sal, iterations: iteracoes, hash: "SHA-256" },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["decrypt"],
  );
}

/**
 * Devolve o objeto de dados ou lança Error("senha") se a senha não confere.
 */
export async function descriptografar(pacote, senha) {
  if (!globalThis.crypto || !crypto.subtle) {
    throw new Error("contexto");
  }
  const chave = await derivarChave(senha, base64ParaBytes(pacote.sal), pacote.iteracoes);
  try {
    const claro = await crypto.subtle.decrypt({ name: "AES-GCM", iv: base64ParaBytes(pacote.iv) }, chave, base64ParaBytes(pacote.dados));
    return JSON.parse(new TextDecoder().decode(claro));
  } catch {
    throw new Error("senha");
  }
}
