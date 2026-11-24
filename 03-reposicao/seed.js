const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const { DatabaseSync } = require("node:sqlite");
const { config, derive } = require("./app");

const arquivoBanco = process.env.REPOSICAO_DB || join(__dirname, "reposicao.sqlite");
const banco = new DatabaseSync(arquivoBanco);

try {
    banco.exec(readFileSync(join(__dirname, "schema.sql"), "utf8"));

    // Permita rodar o seed antes de iniciar o servidor, criando um estoque vazio.
    const vazio = { version: 1, project: config.kind, items: [], events: [] };
    banco.prepare("INSERT OR IGNORE INTO estoque (id, dados) VALUES (1, ?)")
        .run(JSON.stringify(vazio));

    const registro = banco.prepare("SELECT dados, revisao FROM estoque WHERE id = 1").get();
    if (!registro) throw new Error("O registro de estoque não foi criado.");

    const atual = JSON.parse(registro.dados);
    derive(atual);

    if (atual.items.length || atual.events.length) {
        console.log("O estoque já tem dados. O seed não alterou o banco.");
        process.exitCode = 0;
    } else {
        const agora = new Date().toISOString();
        const estado = {
            version: 1,
            project: config.kind,
            items: [
                { id: "seed-item-1", code: "INS-001", name: "Papel A4", group: "Papelaria", initial: 4, minimum: 10 },
                { id: "seed-item-2", code: "INS-002", name: "Luva de proteção", group: "EPI", initial: 3, minimum: 8 },
                { id: "seed-item-3", code: "INS-003", name: "Toner preto", group: "Impressão", initial: 1, minimum: 5 }
            ],
            events: [
                { type: "pedido", itemId: "seed-item-1", amount: 30, actor: "Papelaria Central", note: "Reposição mensal", date: agora, source: null },
                { type: "pedido", itemId: "seed-item-2", amount: 20, actor: "Segurança & Cia", note: "Reposição de EPIs", date: agora, source: null },
                { type: "pedido", itemId: "seed-item-3", amount: 12, actor: "Suprimentos Office", note: "Reposição de toner", date: agora, source: null }
            ]
        };

        derive(estado);
        banco.exec("BEGIN IMMEDIATE");
        try {
            const resultado = banco.prepare(
                "UPDATE estoque SET dados = ?, revisao = revisao + 1 WHERE id = 1 AND revisao = ?"
            ).run(JSON.stringify(estado), registro.revisao);
            if (!resultado.changes) throw new Error("O estoque mudou enquanto o seed era preparado.");
            banco.exec("COMMIT");
        } catch (erro) {
            banco.exec("ROLLBACK");
            throw erro;
        }
        console.log("Seed concluído com 3 itens e 3 pedidos de reposição.");
    }
} finally {
    banco.close();
}
