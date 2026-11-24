const porId = id => document.getElementById(id);
const botoes = [...document.querySelectorAll("[data-pagina]")];
const configuracoes = [
    { id: "form-tutor", rota: "tutores", padrao: "Cadastrar tutor", editar: "Salvar tutor" },
    { id: "form-pet", rota: "pets", padrao: "Cadastrar pet", editar: "Salvar pet" },
    { id: "form-agenda", rota: "agendamentos", padrao: "Cadastrar agendamento", editar: "Salvar data" }
];

let dados = { tutores: [], pets: [], agendamentos: [] };
let termo = "";
let sessao;
let temporizador;

function mensagem(texto, erro = false) {
    porId("mensagem").textContent = texto;
    porId("mensagem").classList.toggle("erro", erro);
}

async function api(rota, metodo = "GET", corpo) {
    const resposta = await fetch("/api/" + rota, corpo === undefined ? { method: metodo } : {
        method: metodo,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(corpo)
    });
    const resultado = await resposta.json();
    if (!resposta.ok) {
        if (resposta.status === 401 && rota !== "login") mostrarLogin();
        throw new Error(resultado.erro);
    }
    return resultado;
}

function mostrarLogin() {
    clearTimeout(temporizador);
    sessao = undefined;
    dados = { tutores: [], pets: [], agendamentos: [] };
    termo = "";
    porId("usuario").textContent = "";
    porId("conta").hidden = true;
    porId("painel").hidden = true;
    for (const id of ["lista-tutores", "lista-pets", "lista-agendamentos"]) porId(id).replaceChildren();
    for (const config of configuracoes) limparForm(config);
    porId("form-pet").elements.namedItem("tutorId").replaceChildren();
    porId("form-agenda").elements.namedItem("petId").replaceChildren();
    porId("busca").reset();
    porId("login").reset();
    porId("entrada").hidden = false;
    porId("login").elements.namedItem("login").focus();
}

function mostrarPagina(pagina) {
    for (const botao of botoes) {
        const ativa = botao.dataset.pagina === pagina;
        botao.setAttribute("aria-current", ativa ? "page" : "false");
        porId(botao.dataset.pagina).hidden = !ativa;
    }
}

async function iniciarPainel(info) {
    clearTimeout(temporizador);
    sessao = info;
    temporizador = setTimeout(() => {
        mostrarLogin();
        mensagem("A sessão expirou. Entre novamente.", true);
    }, Math.max(0, info.expira - Date.now()));
    await carregar();
    if (sessao !== info) return;
    porId("entrada").hidden = true;
    porId("conta").hidden = false;
    porId("painel").hidden = false;
    porId("usuario").textContent = info.nome;
    mostrarPagina("agendamentos");
}

function limparForm(config) {
    const form = porId(config.id);
    form.reset();
    form.elements.namedItem("id").value = "";
    for (const campo of form.elements) campo.disabled = false;
    form.querySelector('button[type="submit"]').textContent = config.padrao;
}

function preencherForm(config, valores) {
    limparForm(config);
    const form = porId(config.id);
    for (const [campo, valor] of Object.entries(valores)) form.elements.namedItem(campo).value = valor;
    if (config.rota === "agendamentos") {
        form.elements.namedItem("petId").disabled = true;
        form.elements.namedItem("motivo").disabled = true;
    }
    form.querySelector('button[type="submit"]').textContent = config.editar;
    form.querySelector("input:not([type=hidden])").focus();
}

function linha(tabela, colunas, rotulo, acao) {
    const tr = porId(tabela).insertRow();
    // textContent mostra os valores como texto e não cria HTML a partir dos dados.
    for (const texto of colunas) tr.insertCell().textContent = texto;
    const botao = document.createElement("button");
    botao.type = "button";
    botao.textContent = rotulo;
    botao.addEventListener("click", acao);
    tr.insertCell().append(botao);
}

function tabelaVazia(id, colunas) {
    const tabela = porId(id);
    if (tabela.rows.length) return;
    const celula = tabela.insertRow().insertCell();
    celula.colSpan = colunas;
    celula.textContent = "Nenhum registro encontrado.";
}

function mascaraCpf(cpf) {
    return cpf.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, "$1.$2.$3-$4");
}

function renderizarTutores() {
    porId("lista-tutores").replaceChildren();
    for (const t of dados.tutores) {
        const cpf = mascaraCpf(t.cpf);
        if (![t.nome, t.email, t.telefone, t.cpf, cpf].some(campo => campo.toLocaleLowerCase("pt-BR").includes(termo))) continue;
        linha("lista-tutores", [t.nome, cpf, t.email, t.telefone], "Editar tutor", () => preencherForm(configuracoes[0], t));
    }
    tabelaVazia("lista-tutores", 5);
}

function preencherOpcoes(select, registros, rotulo) {
    const selecao = select.value;
    select.replaceChildren(new Option("Selecione", ""));
    for (const registro of registros) select.add(new Option(rotulo(registro), registro.id));
    select.value = registros.some(registro => String(registro.id) === selecao) ? selecao : "";
}

async function carregar() {
    const atual = sessao;
    const [tutores, pets, agendamentos] = await Promise.all(configuracoes.map(config => api(config.rota)));
    if (atual !== sessao) return;
    dados = { tutores, pets, agendamentos };
    renderizarTutores();

    preencherOpcoes(porId("form-pet").elements.namedItem("tutorId"), tutores, t => t.nome);
    preencherOpcoes(porId("form-agenda").elements.namedItem("petId"), pets, p => p.nome + " · " + p.tutor);

    porId("lista-pets").replaceChildren();
    for (const p of pets) {
        linha("lista-pets", [p.nome, p.especie, p.raca, p.tutor], "Editar pet", () => preencherForm(
            configuracoes[1], { id: p.id, nome: p.nome, especie: p.especie, raca: p.raca, tutorId: p.tutor_id }
        ));
    }
    tabelaVazia("lista-pets", 5);

    porId("lista-agendamentos").replaceChildren();
    for (const a of agendamentos) {
        const [dia, hora] = a.data_hora.split("T");
        linha("lista-agendamentos", [
            dia.split("-").reverse().join("/") + " " + hora,
            a.motivo,
            a.pet + " · " + a.especie + " · " + a.raca,
            [a.tutor, mascaraCpf(a.cpf), a.telefone, a.email].join(" · ")
        ], "Editar data", () => preencherForm(
            configuracoes[2], { id: a.id, petId: a.pet_id, data_hora: a.data_hora, motivo: a.motivo }
        ));
    }
    tabelaVazia("lista-agendamentos", 5);
}

// Aguarde o retorno do servidor para confirmar a gravação na tela.
for (const config of configuracoes) {
    const form = porId(config.id);
    form.querySelector("[data-limpar]").addEventListener("click", () => limparForm(config));
    form.addEventListener("submit", async evento => {
        evento.preventDefault();
        const botao = form.querySelector('button[type="submit"]');
        if (botao.disabled) return;
        botao.disabled = true;
        const { id, ...campos } = Object.fromEntries(new FormData(form));
        for (const campo of ["tutorId", "petId"]) if (Object.hasOwn(campos, campo)) campos[campo] = Number(campos[campo]);
        const rota = id ? config.rota + "/" + id : config.rota;
        try {
            await api(rota, id ? "PUT" : "POST", campos);
            limparForm(config);
            mensagem("Registro salvo.");
            try {
                await carregar();
            } catch (erro) {
                if (sessao) mensagem("Registro salvo. Recarregue a página para atualizar a lista.", true);
            }
        } catch (erro) {
            mensagem(erro.message, true);
        } finally {
            botao.disabled = false;
        }
    });
}

for (const botao of botoes) botao.addEventListener("click", () => mostrarPagina(botao.dataset.pagina));
porId("busca").addEventListener("submit", evento => {
    evento.preventDefault();
    termo = new FormData(evento.currentTarget).get("termo").trim().toLocaleLowerCase("pt-BR");
    renderizarTutores();
});
porId("busca").addEventListener("reset", () => {
    termo = "";
    renderizarTutores();
});

porId("login").addEventListener("submit", async evento => {
    evento.preventDefault();
    const form = evento.currentTarget;
    const botao = form.querySelector("button");
    botao.disabled = true;
    try {
        const info = await api("login", "POST", Object.fromEntries(new FormData(form)));
        form.reset();
        await iniciarPainel(info);
        if (sessao === info) mensagem("");
    } catch (erro) {
        mensagem(erro.message, true);
    } finally {
        botao.disabled = false;
    }
});

porId("sair").addEventListener("click", async () => {
    try {
        await api("logout", "POST");
        mostrarLogin();
        mensagem("Sessão encerrada.");
    } catch (erro) {
        mensagem(erro.message, true);
    }
});

api("sessao").then(iniciarPainel).catch(erro => {
    mostrarLogin();
    if (erro.message !== "Entre para acessar os dados da clínica.") mensagem(erro.message, true);
});
