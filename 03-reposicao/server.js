const { createServer } = require("node:http");
const { randomBytes, scryptSync, timingSafeEqual } = require("node:crypto");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const { DatabaseSync } = require("node:sqlite");
const { config, derive } = require("./app");

const banco = new DatabaseSync(process.env.REPOSICAO_DB || join(__dirname, "reposicao.sqlite"));
banco.exec(readFileSync(join(__dirname, "schema.sql"), "utf8"));

// Crie o usuário de treino no primeiro uso. A senha só é usada para calcular o hash.
const loginInicial = "operador";
if (!banco.prepare("SELECT id FROM usuarios WHERE login = ?").get(loginInicial)) {
    const senha = process.env.REPOSICAO_SENHA_INICIAL ?? "SAEP2026!";
    if (senha.length < 8 || senha.length > 128) {
        throw new Error("A senha inicial deve ter entre 8 e 128 caracteres.");
    }
    const sal = randomBytes(16).toString("hex");
    const hash = scryptSync(senha, sal, 64).toString("hex");
    banco.prepare("INSERT OR IGNORE INTO usuarios (login, sal, senha_hash) VALUES (?, ?, ?)")
        .run(loginInicial, sal, hash);
}

const estoqueVazio = { version: 1, project: config.kind, items: [], events: [] };
banco.prepare("INSERT OR IGNORE INTO estoque (id, dados) VALUES (1, ?)").run(JSON.stringify(estoqueVazio));

const duracao = 12 * 60 * 60;
const sessoes = new Map();
const nomeCookie = "reposicao_sessao";
const arquivos = {
    "/style.css": ["style.css", "text/css"],
    "/app.js": ["app.js", "text/javascript"]
};
const paginaLogin = readFileSync(join(__dirname, "login.html"), "utf8");

function enviar(res, status, tipo, corpo) {
    res.writeHead(status, { "Content-Type": tipo + "; charset=utf-8" });
    res.end(corpo);
}

function json(res, status, dados) {
    enviar(res, status, "application/json", JSON.stringify(dados));
}

function redirecionar(res) {
    res.writeHead(303, { Location: "/" });
    res.end();
}

function tokenDaRequisicao(req) {
    const prefixo = nomeCookie + "=";
    const cookie = req.headers.cookie?.split(";").map(parte => parte.trim())
        .find(parte => parte.startsWith(prefixo));
    return cookie?.slice(prefixo.length);
}

function lerSessao(token) {
    const sessao = sessoes.get(token);
    if (sessao && sessao.expira > Date.now()) return sessao;
    sessoes.delete(token);
}

function definirCookie(res, token, idade) {
    // HttpOnly deixa a leitura do cookie com o navegador e o envio com o HTTP.
    // O servidor roda em HTTP no loopback, por isso o cookie não usa Secure.
    res.setHeader("Set-Cookie", nomeCookie + "=" + token + "; Path=/; HttpOnly; SameSite=Strict; Max-Age=" + idade);
}

function falhar(status, mensagem) {
    throw Object.assign(new Error(mensagem), { status });
}

async function lerCorpo(req, limite) {
    const partes = [];
    let tamanho = 0;
    for await (const parte of req) {
        tamanho += parte.length;
        if (tamanho <= limite) partes.push(parte);
    }
    if (tamanho > limite) falhar(413, "Arquivo ou dados acima do limite permitido.");
    return Buffer.concat(partes).toString("utf8");
}

function tipoDoCorpo(req, tipo) {
    return req.headers["content-type"]?.split(";")[0].trim().toLowerCase() === tipo;
}

async function entrar(req, res, tokenAtual) {
    if (!tipoDoCorpo(req, "application/x-www-form-urlencoded")) falhar(415, "Envie o formulário de login.");
    const formulario = new URLSearchParams(await lerCorpo(req, 4096));
    const login = (formulario.get("login") ?? "").trim();
    const senha = formulario.get("senha") ?? "";
    const usuario = login.length <= 60 && banco.prepare("SELECT login, sal, senha_hash FROM usuarios WHERE login = ?").get(login);
    if (!usuario || !senha || senha.length > 128 ||
        !timingSafeEqual(scryptSync(senha, usuario.sal, 64), Buffer.from(usuario.senha_hash, "hex"))) {
        return enviar(res, 401, "text/html", paginaLogin.replace(
            "<!-- mensagem do servidor -->", '<p class="error" role="alert">Usuário ou senha incorretos.</p>'
        ));
    }

    // O token aleatório liga o navegador à sessão. Sair apaga o token também no servidor.
    for (const token of sessoes.keys()) lerSessao(token);
    sessoes.delete(tokenAtual);
    const token = randomBytes(32).toString("hex");
    sessoes.set(token, { login: usuario.login, expira: Date.now() + duracao * 1000 });
    definirCookie(res, token, duracao);
    redirecionar(res);
}

async function salvarEstoque(req, res, token) {
    if (!tipoDoCorpo(req, "application/json")) falhar(415, "Envie os dados em JSON.");
    const corpo = await lerCorpo(req, 4 * 1024 * 1024);
    if (!lerSessao(token)) falhar(401, "Entre para acessar o estoque.");
    let dados;
    try {
        dados = JSON.parse(corpo);
        derive(dados?.estado);
    } catch (erro) {
        falhar(400, erro instanceof SyntaxError ? "JSON inválido." : erro.message);
    }
    if (!Number.isSafeInteger(dados.revisao) || dados.revisao < 0) falhar(400, "Revisão inválida.");
    // O UPDATE só grava se ninguém salvou uma versão mais nova desde a leitura.
    const resultado = banco.prepare(
        "UPDATE estoque SET dados = ?, revisao = revisao + 1 WHERE id = 1 AND revisao = ?"
    ).run(JSON.stringify(dados.estado), dados.revisao);
    if (!resultado.changes) falhar(409, "O estoque mudou em outra aba. Recarregue a página e tente novamente.");
    json(res, 200, { revisao: dados.revisao + 1 });
}

const servidor = createServer(async (req, res) => {
    // O endereço é local. Rejeite cabeçalhos que apontem para outros sites.
    res.setHeader("Cache-Control", "no-store");
    const host = req.headers.host;
    const porta = servidor.address().port;
    const hosts = ["127.0.0.1:" + porta, "localhost:" + porta];
    if (!hosts.includes(host) || (req.headers.origin && req.headers.origin !== "http://" + host)) {
        return json(res, 403, { erro: "Acesso permitido apenas pelo endereço local do projeto." });
    }

    try {
        const { pathname } = new URL(req.url, "http://127.0.0.1");
        const token = tokenDaRequisicao(req);
        const sessao = lerSessao(token);

        if (pathname === "/login" && req.method === "POST") return await entrar(req, res, token);
        if (pathname === "/logout" && req.method === "POST") {
            sessoes.delete(token);
            definirCookie(res, "", 0);
            return redirecionar(res);
        }
        if (pathname === "/" && req.method === "GET") {
            const pagina = sessao ? readFileSync(join(__dirname, "index.html"), "utf8") : paginaLogin;
            return enviar(res, 200, "text/html", pagina);
        }
        if (pathname === "/index.html" && req.method === "GET") return redirecionar(res);
        if (req.method === "GET" && Object.hasOwn(arquivos, pathname) && (pathname === "/style.css" || sessao)) {
            const [arquivo, tipo] = arquivos[pathname];
            return enviar(res, 200, tipo, readFileSync(join(__dirname, arquivo), "utf8"));
        }
        if (pathname === "/api/estoque") {
            if (!sessao) falhar(401, "Entre para acessar o estoque.");
            if (req.method === "GET") {
                const { dados, revisao } = banco.prepare("SELECT dados, revisao FROM estoque WHERE id = 1").get();
                return json(res, 200, { estado: JSON.parse(dados), revisao, login: sessao.login });
            }
            if (req.method === "PUT") return await salvarEstoque(req, res, token);
            res.setHeader("Allow", "GET, PUT");
            return json(res, 405, { erro: "Método não permitido." });
        }
        json(res, 404, { erro: "Página não encontrada." });
    } catch (erro) {
        if (!erro.status) console.error(erro);
        json(res, erro.status || 500, { erro: erro.status ? erro.message : "Erro interno do servidor." });
    }
});

// Use outra porta porque o projeto 04 já usa a 3000.
servidor.listen(Number(process.env.PORT ?? 3003), "127.0.0.1", () => {
    console.log("http://127.0.0.1:" + servidor.address().port);
});
