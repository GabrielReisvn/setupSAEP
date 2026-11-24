const $ = id => document.getElementById(id);
const produtoForm = $("produto");
const movimentoForm = $("movimento");
let produtos = [];

async function api(rota, metodo = "GET", dados) {
    const resposta = await fetch("/api/" + rota, dados === undefined ? { method: metodo } : {
        method: metodo,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dados)
    });
    const resultado = await resposta.json();
    if (!resposta.ok) throw new Error(resultado.erro);
    return resultado;
}

function linha(tabela, valores) {
    const linha = $(tabela).insertRow();
    for (const valor of valores) linha.insertCell().textContent = valor;
    return linha;
}

function catalogo() {
    $("catalogo").replaceChildren();
    const busca = $("busca").value.trim().toLowerCase();
    for (const produto of produtos) {
        if (![produto.sku, produto.nome, produto.categoria].some(valor => valor.toLowerCase().includes(busca))) continue;
        const baixo = produto.estoque <= produto.minimo;
        const tr = linha("catalogo", [produto.sku, produto.nome, produto.categoria, produto.estoque, produto.minimo, baixo ? "Estoque baixo" : "Em dia"]);
        tr.classList.toggle("baixo", baixo);
        const editar = document.createElement("button");
        editar.textContent = "Editar";
        editar.addEventListener("click", () => {
            for (const campo of ["id", "sku", "nome", "categoria", "minimo"]) {
                produtoForm.elements.namedItem(campo).value = produto[campo];
            }
            $("salvar").textContent = "Salvar edição";
            produtoForm.elements.namedItem("nome").focus();
        });
        tr.insertCell().append(editar);
    }
    if (!$("catalogo").rows.length) linha("catalogo", ["Nenhum produto encontrado"]).cells[0].colSpan = 7;
}

async function carregar() {
    const [lista, historico] = await Promise.all([api("produtos"), api("movimentacoes")]);
    produtos = lista;
    const seletor = movimentoForm.elements.namedItem("produtoId");
    const anterior = seletor.value;
    seletor.replaceChildren(new Option("Selecione um produto", ""));
    for (const produto of produtos) seletor.add(new Option(produto.sku + " · " + produto.nome, produto.id));
    seletor.value = produtos.some(p => String(p.id) === anterior) ? anterior : "";
    catalogo();

    $("historico").replaceChildren();
    for (const m of historico) linha("historico", [m.data, m.sku, m.produto, m.tipo, m.quantidade, m.observacao || "—"]);
    if (!historico.length) linha("historico", ["Nenhuma movimentação registrada"]).cells[0].colSpan = 6;
}

function limparProduto() {
    produtoForm.reset();
    produtoForm.elements.namedItem("id").value = "";
    $("salvar").textContent = "Cadastrar produto";
}

function mostrarErro(erro) {
    $("status").textContent = erro.message;
}

function aoEnviar(form, salvar, limpar, mensagem) {
    form.addEventListener("submit", async evento => {
        evento.preventDefault();
        const botao = evento.submitter || form.querySelector("button");
        botao.disabled = true;
        try {
            await salvar(Object.fromEntries(new FormData(form)));
            limpar();
            $("status").textContent = mensagem;
            try {
                await carregar();
            } catch {
                $("status").textContent += " Atualize a página para consultar os dados.";
            }
        } catch (erro) {
            mostrarErro(erro);
        } finally {
            botao.disabled = false;
        }
    });
}

$("limpar").addEventListener("click", limparProduto);
$("busca").addEventListener("input", catalogo);
aoEnviar(produtoForm, ({ id, minimo, ...campos }) =>
    api(id ? "produtos/" + id : "produtos", id ? "PUT" : "POST", { ...campos, minimo: Number(minimo) }),
    limparProduto, "Produto salvo.");
aoEnviar(movimentoForm, dados => api("movimentacoes", "POST", {
    ...dados, produtoId: Number(dados.produtoId), quantidade: Number(dados.quantidade)
}), () => movimentoForm.reset(), "Movimentação registrada.");
carregar().catch(mostrarErro);
