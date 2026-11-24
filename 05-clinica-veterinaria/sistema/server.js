const { createServer } = require("node:http");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const { randomBytes } = require("node:crypto");
const { banco } = require("./banco");
const { verificarSenha } = require("./seguranca");
const clinica = require("./clinica");

const recursos = {
    tutores: [clinica.listarTutores, clinica.salvarTutor],
    pets: [clinica.listarPets, clinica.salvarPet],
    agendamentos: [clinica.listarAgenda, clinica.salvarAgendamento]
};
const sessaoCookie = "clinica_saep";
const duracaoSessao = 30 * 60;
const sessoes = new Map();
const arquivos = {
    "/style.css": "text/css",
    "/app.js": "text/javascript"
};

function enviar(res, status, tipo, corpo) {
    res.writeHead(status, { "Content-Type": tipo + "; charset=utf-8" });
    res.end(corpo);
}

function json(res, status, dados) {
    enviar(res, status, "application/json", JSON.stringify(dados));
}

function arquivo(res, nome, tipo) {
    enviar(res, 200, tipo, readFileSync(join(__dirname, nome), "utf8"));
}

async function lerJson(req) {
    if (req.headers["content-type"]?.split(";")[0].trim() !== "application/json") {
        clinica.erro(415, "Envie um objeto JSON.");
    }
    let total = 0;
    const partes = [];
    for await (const parte of req) {
        total += parte.length;
        if (total <= 8192) partes.push(parte);
    }
    if (total > 8192) clinica.erro(413, "Dados acima do limite.");
    try {
        const dados = JSON.parse(Buffer.concat(partes).toString("utf8"));
        if (dados && typeof dados === "object" && !Array.isArray(dados)) return dados;
    } catch {
        // JSON malformado recebe a mesma mensagem de um valor que não é objeto.
    }
    clinica.erro(400, "Envie um objeto JSON válido.");
}

function tokenDoCookie(req) {
    return req.headers.cookie?.split(";").map(parte => parte.trim())
        .find(parte => parte.startsWith(sessaoCookie + "="))?.slice(sessaoCookie.length + 1);
}

function gravarCookie(res, token, idade) {
    res.setHeader("Set-Cookie", sessaoCookie + "=" + token + "; HttpOnly; SameSite=Strict; Path=/; Max-Age=" + idade);
}

// A sessão expira no servidor. O horário no navegador serve só para avisar a pessoa.
function consultarSessao(token) {
    const sessao = sessoes.get(token);
    if (sessao && sessao.expira > Date.now()) return sessao;
    sessoes.delete(token);
}

async function entrar(req, res, tokenAtual) {
    const { login, senha } = await lerJson(req);
    if (typeof login !== "string" || !login.trim() || login.length > 60 ||
        typeof senha !== "string" || !senha || senha.length > 128) {
        clinica.erro(400, "Preencha usuário e senha.");
    }
    const usuario = banco.prepare("SELECT * FROM usuarios WHERE login = ?").get(login.trim());
    if (!verificarSenha(senha, usuario)) clinica.erro(401, "Usuário ou senha incorretos.");

    for (const token of sessoes.keys()) consultarSessao(token);
    sessoes.delete(tokenAtual);
    const token = randomBytes(32).toString("hex");
    const sessao = { nome: usuario.nome, expira: Date.now() + duracaoSessao * 1000 };
    sessoes.set(token, sessao);
    gravarCookie(res, token, duracaoSessao);
    json(res, 200, sessao);
}

const servidor = createServer(async (req, res) => {
    res.setHeader("Cache-Control", "no-store");
    const host = req.headers.host;
    const porta = servidor.address().port;
    if (!["127.0.0.1:" + porta, "localhost:" + porta].includes(host) ||
        (req.headers.origin && req.headers.origin !== "http://" + host)) {
        return json(res, 403, { erro: "Acesse pelo endereço local do servidor." });
    }

    try {
        const { pathname } = new URL(req.url, "http://127.0.0.1");
        const metodo = req.method;
        if (metodo === "GET" && pathname === "/") return arquivo(res, "index.html", "text/html");
        if (metodo === "GET" && Object.hasOwn(arquivos, pathname)) return arquivo(res, pathname.slice(1), arquivos[pathname]);

        const token = tokenDoCookie(req);
        if (metodo === "POST" && pathname === "/api/login") return await entrar(req, res, token);
        if (metodo === "POST" && pathname === "/api/logout") {
            sessoes.delete(token);
            gravarCookie(res, "", 0);
            return json(res, 200, { encerrada: true });
        }

        const sessao = consultarSessao(token);
        if (!sessao) clinica.erro(401, "Entre para acessar os dados da clínica.");
        if (metodo === "GET" && pathname === "/api/sessao") return json(res, 200, sessao);
        const rota = pathname.match(/^\/api\/(tutores|pets|agendamentos)(?:\/(\d+))?$/);
        if (rota) {
            const [, recurso, id] = rota;
            const [listar, salvar] = recursos[recurso];
            if (metodo === "GET" && !id) return json(res, 200, listar());
            if ((metodo === "POST" && !id) || (metodo === "PUT" && id)) {
                const dados = await lerJson(req);
                if (!consultarSessao(token)) clinica.erro(401, "A sessão expirou.");
                return json(res, id ? 200 : 201, { id: salvar(dados, id ? Number(id) : undefined) });
            }
        }
        json(res, 404, { erro: "Rota não encontrada." });
    } catch (falha) {
        if (!falha.status) console.error(falha);
        json(res, falha.status || 500, { erro: falha.status ? falha.message : "Erro ao processar a solicitação." });
    }
});

servidor.listen(Number(process.env.PORT ?? 3005), "127.0.0.1", () => {
    console.log("http://127.0.0.1:" + servidor.address().port);
});
