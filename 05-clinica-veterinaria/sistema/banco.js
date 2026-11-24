const { DatabaseSync } = require("node:sqlite");
const { existsSync, readFileSync, writeFileSync } = require("node:fs");
const { randomBytes } = require("node:crypto");
const { join } = require("node:path");
const { chaveExemplo, cifrarCpf, abrirCpf, identificarCpf } = require("./seguranca");

const pasta = join(__dirname, "..");
const arquivoBanco = process.env.CLINICA_DB || join(pasta, "clinica.sqlite");
const arquivoChave = arquivoBanco + ".chave";
const banco = new DatabaseSync(arquivoBanco, { timeout: 5000 });
banco.exec(readFileSync(join(pasta, "saep_db.sql"), "utf8"));

// A chave acompanha a instalação, mas permanece em arquivo separado do banco.
banco.exec("BEGIN IMMEDIATE");
let chave;
try {
    if (!existsSync(arquivoChave)) {
        const { total } = banco.prepare("SELECT COUNT(*) AS total FROM tutores WHERE cpf_cifrado NOT LIKE 'demo:%'").get();
        if (total) throw new Error("Chave ausente. Restaure o arquivo .chave correspondente a este banco.");
        writeFileSync(arquivoChave, randomBytes(32).toString("hex"), { flag: "wx", mode: 0o600 });
    }
    const texto = readFileSync(arquivoChave, "utf8").trim();
    if (!/^[0-9a-f]{64}$/i.test(texto)) throw new Error("Arquivo de chave inválido.");
    chave = Buffer.from(texto, "hex");
    const exemplos = banco.prepare("SELECT id, cpf_cifrado FROM tutores WHERE cpf_cifrado LIKE 'demo:%'").all();
    const atualizar = banco.prepare("UPDATE tutores SET cpf_cifrado = ?, cpf_indice = ? WHERE id = ?");
    for (const tutor of exemplos) {
        const cpf = abrirCpf(tutor.cpf_cifrado.slice(5), chaveExemplo);
        atualizar.run(cifrarCpf(cpf, chave), identificarCpf(cpf, chave), tutor.id);
    }
    banco.exec("COMMIT");
} catch (erro) {
    banco.exec("ROLLBACK");
    throw erro;
}

module.exports = { banco, chave };
