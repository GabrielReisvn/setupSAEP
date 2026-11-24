const { createServer } = require("node:http");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const { DatabaseSync } = require("node:sqlite");

const banco = new DatabaseSync(process.env.ESTOQUE_DB || join(__dirname, "estoque.sqlite"));
banco.exec(readFileSync(join(__dirname, "schema.sql"), "utf8"));

const arquivos = {
    "/": ["index.html", "text/html; charset=utf-8"],
    "/app.js": ["app.js", "text/javascript; charset=utf-8"],
    "/style.css": ["style.css", "text/css; charset=utf-8"]
};

function json(res, status, dados) {
    res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify(dados));
}

function falhar(status, mensagem) {
    throw Object.assign(new Error(mensagem), { status });
}

async function lerJson(req) {
    let tamanho = 0;
    const partes = [];
    for await (const parte of req) {
        tamanho += parte.length;
        if (tamanho <= 8192) partes.push(parte);
    }
    if (tamanho > 8192) falhar(413, "Dados acima do limite.");
    try {
        const dados = JSON.parse(Buffer.concat(partes).toString("utf8"));
        if (dados && typeof dados === "object" && !Array.isArray(dados)) return dados;
    } catch {
        // A mesma mensagem cobre JSON inválido e valores que não são objetos.
    }
    falhar(400, "Envie um objeto JSON válido.");
}

function texto(valor, limite) {
    return typeof valor === "string" && valor.trim().length <= limite ? valor.trim() : "";
}

function inteiro(valor, minimo) {
    return Number.isInteger(valor) && valor >= minimo && valor <= 2147483647;
}

function salvarProduto(dados, id) {
    const sku = texto(dados.sku, 30).toUpperCase();
    const nome = texto(dados.nome, 100);
    const categoria = texto(dados.categoria, 60);
    const minimo = dados.minimo;
    if (!sku || sku.length > 30 || !nome || !categoria || !inteiro(minimo, 0)) {
        falhar(400, "Preencha SKU, nome, categoria e estoque mínimo inteiro não negativo.");
    }
    try {
        if (id === undefined) {
            return banco.prepare("INSERT INTO produtos (sku,nome,categoria,minimo) VALUES (?,?,?,?)")
                .run(sku, nome, categoria, minimo).lastInsertRowid;
        }
        const resultado = banco.prepare("UPDATE produtos SET sku=?, nome=?, categoria=?, minimo=? WHERE id=?")
            .run(sku, nome, categoria, minimo, id);
        if (!resultado.changes) falhar(404, "Produto não encontrado.");
        return id;
    } catch (erro) {
        if (erro.errcode === 2067) falhar(409, "SKU já cadastrado.");
        throw erro;
    }
}

function movimentar(dados) {
    const { produtoId, tipo, quantidade } = dados;
    const observacao = texto(dados.observacao, 200);
    if (!inteiro(produtoId, 1) || !inteiro(quantidade, 1) || !["ENTRADA", "SAIDA"].includes(tipo)) {
        falhar(400, "Informe produto, tipo e quantidade inteira positiva.");
    }
    if (dados.observacao !== undefined &&
        (typeof dados.observacao !== "string" || dados.observacao.trim().length > 200)) {
        falhar(400, "Use até 200 caracteres na observação.");
    }

    banco.exec("BEGIN IMMEDIATE");
    try {
        const produto = banco.prepare("SELECT estoque FROM produtos WHERE id=?").get(produtoId);
        if (!produto) falhar(404, "Produto não encontrado.");
        const estoque = produto.estoque + (tipo === "ENTRADA" ? quantidade : -quantidade);
        if (!inteiro(estoque, 0)) falhar(409, estoque < 0 ? "Estoque insuficiente." : "Estoque acima do limite.");
        banco.prepare("UPDATE produtos SET estoque=? WHERE id=?").run(estoque, produtoId);
        const { lastInsertRowid: id } = banco.prepare(
            "INSERT INTO movimentacoes (produto_id,tipo,quantidade,observacao) VALUES (?,?,?,?)"
        ).run(produtoId, tipo, quantidade, observacao);
        banco.exec("COMMIT");
        return { id, estoque };
    } catch (erro) {
        banco.exec("ROLLBACK");
        throw erro;
    }
}

const servidor = createServer(async (req, res) => {
    try {
        const { pathname } = new URL(req.url, "http://localhost");
        const metodo = req.method;
        if (metodo === "GET" && Object.hasOwn(arquivos, pathname)) {
            const [arquivo, tipo] = arquivos[pathname];
            res.writeHead(200, { "Content-Type": tipo });
            return res.end(readFileSync(join(__dirname, "public", arquivo)));
        }
        if (pathname === "/api/produtos") {
            if (metodo === "GET") return json(res, 200, banco.prepare("SELECT * FROM produtos ORDER BY nome, id").all());
            if (metodo === "POST") return json(res, 201, { id: salvarProduto(await lerJson(req)) });
        }
        const produto = pathname.match(/^\/api\/produtos\/(\d+)$/);
        if (produto && metodo === "PUT") {
            const id = Number(produto[1]);
            if (!inteiro(id, 1)) falhar(400, "ID inválido.");
            return json(res, 200, { id: salvarProduto(await lerJson(req), id) });
        }
        if (pathname === "/api/movimentacoes") {
            if (metodo === "GET") return json(res, 200, banco.prepare(`
                SELECT m.*, p.nome AS produto, p.sku
                FROM movimentacoes m JOIN produtos p ON p.id = m.produto_id
                ORDER BY m.id DESC
            `).all());
            if (metodo === "POST") return json(res, 201, movimentar(await lerJson(req)));
        }
        json(res, 404, { erro: "Rota não encontrada." });
    } catch (erro) {
        if (!erro.status) console.error(erro);
        if (!res.headersSent) json(res, erro.status || 500, { erro: erro.status ? erro.message : "Erro interno." });
        else res.end();
    }
});

servidor.listen(Number(process.env.PORT ?? 3000), "127.0.0.1", () => {
    console.log("http://127.0.0.1:" + servidor.address().port);
});
