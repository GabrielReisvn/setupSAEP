const { createCipheriv, createDecipheriv, createHmac, randomBytes, scryptSync, timingSafeEqual } = require("node:crypto");

const algoritmo = "aes-256-gcm";
// Esta chave pública só abre os três CPFs fictícios do script SQL. Na primeira
// execução o servidor cifra esses registros novamente com a chave da instalação.
const chaveExemplo = Buffer.from("00".repeat(32), "hex");

function cifrarCpf(cpf, chave) {
    const iv = randomBytes(12);
    const cifra = createCipheriv(algoritmo, chave, iv);
    const dados = Buffer.concat([cifra.update(cpf, "utf8"), cifra.final()]);
    return [iv, cifra.getAuthTag(), dados].map(parte => parte.toString("hex")).join(":");
}

function abrirCpf(valor, chave) {
    const [iv, autenticador, dados] = valor.split(":").map(parte => Buffer.from(parte, "hex"));
    const cifra = createDecipheriv(algoritmo, chave, iv);
    cifra.setAuthTag(autenticador);
    return Buffer.concat([cifra.update(dados), cifra.final()]).toString("utf8");
}

// O HMAC permite barrar duplicatas sem guardar o CPF puro ou usar uma cifra fixa.
function identificarCpf(cpf, chave) {
    return createHmac("sha256", chave).update("cpf:" + cpf).digest("hex");
}

function verificarSenha(senha, usuario) {
    const sal = usuario?.sal ?? "00".repeat(16);
    const esperado = Buffer.from(usuario?.senha_hash ?? "00".repeat(64), "hex");
    const calculado = scryptSync(senha, sal, 64);
    return timingSafeEqual(esperado, calculado) && Boolean(usuario);
}

module.exports = { chaveExemplo, cifrarCpf, abrirCpf, identificarCpf, verificarSenha };
