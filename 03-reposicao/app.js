// Este arquivo controla compras e reposição. Exemplo: peça 10 e receba 4. Só as 4 recebidas vão para o estoque e o pedido continua com 6 pendentes.
const config = {"kind":"orders"};

// Cada cenário aceita tipos diferentes. O valor à esquerda é salvo nos dados e o texto à direita aparece na tela.
const operations = {
    almox: { entrada: "Entrada", saida: "Saída" },
    tools: { retirada: "Retirada", devolucao: "Devolução" },
    orders: { consumo: "Consumo", pedido: "Pedido", recebimento: "Recebimento", cancelamento: "Cancelamento" }
}[config.kind];

// Uma operação de origem é o registro anterior que esta ação precisa consultar. Uma devolução, por exemplo, aponta para uma retirada.
const linkedOperations = { devolucao: "retirada", recebimento: "pedido", cancelamento: "pedido" };
// Set é uma lista sem repetição. Aqui ele indica quais operações exigem que a pessoa informe responsável ou fornecedor.
const requiredActor = new Set(["retirada", "pedido"]);
// Estas verificações são usadas também para revisar um backup. trim() tira espaços das pontas e isSafeInteger() exige um inteiro representável com precisão.
const isText = value => typeof value === "string" && value.trim().length > 0;
const isCount = value => Number.isSafeInteger(value) && value >= 0;

// Se a condição falhar, o erro interrompe a função e a mensagem chega ao formulário ou à importação.
function ensure(condition, message) {
    if (!condition) throw new Error(message);
}

// O estado salvo contém os itens e o histórico. Esta função recomeça no saldo inicial de cada item e reaplica as operações na ordem em que aconteceram.
// Ela monta cópias com saldo calculado e um mapa de pendências. Pode ser chamada para conferir dados sem mexer no estado salvo.
function derive(state) {
    ensure(state?.version === 1 && state.project === config.kind &&
        Array.isArray(state.items) && Array.isArray(state.events), "Backup incompatível com este projeto.");
    const items = new Map();
    const codes = new Set();
    const pending = new Map();

    // O Map permite encontrar um item pelo ID. O Set de códigos compara a versão em maiúsculas para detectar duplicatas como abc e ABC.
    for (const item of state.items) {
        ensure(item && isText(item.id) && !items.has(item.id) && isText(item.code) &&
            isText(item.name) && isText(item.group) && isCount(item.initial) && isCount(item.minimum),
            "Preencha código, nome, categoria e quantidades inteiras não negativas.");
        const code = item.code.trim().toUpperCase();
        ensure(!codes.has(code), "Já existe um item com esse código.");
        codes.add(code);
        items.set(item.id, { ...item, stock: item.initial });
    }

    // O índice é a posição no histórico, começando em zero. A tela mostra índice + 1, então a primeira operação aparece como #1.
    for (const [index, event] of state.events.entries()) {
        ensure(event && Object.hasOwn(operations, event.type) && items.has(event.itemId) &&
            isCount(event.amount) && event.amount > 0 && typeof event.actor === "string" &&
            typeof event.note === "string" && isText(event.date) &&
            Number.isFinite(Date.parse(event.date)), "Movimentação inválida.");
        ensure(!requiredActor.has(event.type) || isText(event.actor), "Informe o responsável ou fornecedor.");
        const item = items.get(event.itemId);
        const sourceType = linkedOperations[event.type];

        // A origem precisa estar aberta, ser do tipo esperado e pertencer ao mesmo item. Só o saldo ainda pendente pode ser baixado.
        if (sourceType) {
            const source = pending.get(event.source);
            ensure(source?.event.type === sourceType && source.event.itemId === item.id &&
                source.remaining >= event.amount, "Selecione uma operação aberta com saldo suficiente.");
            if (event.type === "cancelamento") {
                ensure(event.amount === source.remaining, "O cancelamento deve encerrar todo o saldo do pedido.");
            }
            source.remaining -= event.amount;
        }

        // Retirada e pedido abrem uma pendência. Receber ou devolver uma parte diminui a pendência da origem.
        if (event.type === "retirada" || event.type === "pedido") {
            pending.set(index, { event, remaining: event.amount });
        }
        // Aqui fica a regra do saldo físico. Pedido e cancelamento só mudam a pendência. O saldo final precisa continuar inteiro e não negativo.
        if (["saida", "retirada", "consumo"].includes(event.type)) item.stock -= event.amount;
        if (["entrada", "devolucao", "recebimento"].includes(event.type)) item.stock += event.amount;
        ensure(isCount(item.stock), "Saldo insuficiente ou acima do limite numérico.");
    }
    return { items, pending };
}

// No Node, dá para importar a função de regras para testar com objetos. No navegador, document existe e o trecho da tela roda.
if (typeof module !== "undefined") module.exports = { config, derive };

if (typeof document !== "undefined") {
    // localStorage guarda texto no navegador. Cada cenário tem sua chave para manter os dados separados.
    const key = "setup-saep:" + config.kind + ":v1";
    // $("catalog") é um atalho para encontrar o elemento com id="catalog" no HTML.
    const $ = id => document.getElementById(id);
    const blank = { version: 1, project: config.kind, items: [], events: [] };
    let state = blank;
    let storageReadFailed = false;

    function message(text, error = false) {
        $("status").textContent = text;
        $("status").classList.toggle("error", error);
    }

    try {
        // JSON.parse converte o texto salvo num objeto. derive() verifica os dados antes de abrir a tela com eles.
        const saved = localStorage.getItem(key);
        if (saved) {
            const candidate = JSON.parse(saved);
            derive(candidate);
            state = candidate;
        }
    } catch {
        // Se a leitura falhar, impeça gravações comuns para preservar os dados até recuperar um backup.
        storageReadFailed = true;
        message("Falha ao ler os dados locais. Importe um backup válido para recuperar o projeto.", true);
    }

    // Valide a mudança proposta antes de salvar. Só troque o estado em memória e redesenhe a tela depois de conseguir gravar no navegador.
    function commit(candidate, importing = false) {
        ensure(importing || !storageReadFailed, "Importe um backup válido antes de alterar os dados.");
        derive(candidate);
        localStorage.setItem(key, JSON.stringify(candidate));
        storageReadFailed = false;
        state = candidate;
        render();
    }

    function option(select, value, label) {
        select.add(new Option(label, value));
    }

    // Crie uma linha e preencha células como texto. Assim, o que a pessoa digita aparece como texto mesmo que contenha caracteres de HTML.
    function row(table, values) {
        const tr = $(table).insertRow();
        for (const value of values) tr.insertCell().textContent = value;
        return tr;
    }

    // Ao mudar o item ou o tipo, recalcule as origens disponíveis. O campo fica obrigatório apenas quando a operação usa uma origem.
    function refreshSource() {
        const type = $("type").value;
        const sourceType = linkedOperations[type];
        $("source-field").hidden = !sourceType;
        $("source").required = Boolean(sourceType);
        $("source").replaceChildren();
        option($("source"), "", "Selecione uma operação");
        if (!sourceType) return;
        const { pending } = derive(state);
        for (const [index, entry] of pending) {
            if (entry.event.type === sourceType && entry.event.itemId === $("item").value && entry.remaining > 0) {
                option($("source"), index, "#" + (index + 1) + " · " + entry.event.actor + " · saldo " + entry.remaining);
            }
        }
    }

    // Atualize catálogo, indicadores, seletores e histórico a partir dos dados. A busca limita as linhas visíveis do catálogo.
    function render() {
        const { items, pending } = derive(state);
        const previousItem = $("item").value;
        const search = $("search").value.trim().toLowerCase();
        $("catalog").replaceChildren();
        $("history").replaceChildren();
        $("open").replaceChildren();
        $("item").replaceChildren();
        option($("item"), "", "Selecione um item");
        let low = 0;

        for (const item of items.values()) {
            option($("item"), item.id, item.code + " · " + item.name);
            const below = item.stock <= item.minimum;
            if (below) low++;
            if (![item.code, item.name, item.group].some(value => value.toLowerCase().includes(search))) continue;
            const tr = row("catalog", [item.code, item.name, item.group, item.stock, item.minimum, below ? "Estoque baixo" : "Em dia"]);
            if (below) tr.classList.add("low");
            const edit = document.createElement("button");
            edit.type = "button";
            edit.textContent = "Editar";
            // Editar preenche o formulário com o ID existente. O saldo inicial fica bloqueado para preservar o cálculo do histórico.
            edit.addEventListener("click", () => {
                const form = $("item-form");
                for (const field of ["id", "code", "name", "group", "initial", "minimum"]) {
                    form.elements.namedItem(field).value = item[field];
                }
                form.elements.namedItem("initial").disabled = true;
                $("save-item").textContent = "Salvar edição";
                form.elements.namedItem("name").focus();
            });
            tr.insertCell().append(edit);
        }
        if (!$("catalog").rows.length) row("catalog", ["Nenhum item encontrado"]);
        $("item").value = items.has(previousItem) ? previousItem : "";
        $("items-count").textContent = items.size;
        $("low-count").textContent = low;
        $("events-count").textContent = state.events.length;

        for (const [index, entry] of pending) {
            if (entry.remaining > 0) {
                row("open", ["#" + (index + 1), items.get(entry.event.itemId).name, entry.event.actor, entry.remaining]);
            }
        }
        if (!$("open").rows.length) row("open", ["Nenhuma operação em aberto"]);

        // Mostre as últimas operações primeiro. reverse() atua na cópia para manter a ordem original usada no cálculo.
        for (const [index, event] of [...state.events.entries()].reverse()) {
            const actor = event.actor || state.events[event.source]?.actor || "—";
            row("history", ["#" + (index + 1), new Date(event.date).toLocaleString("pt-BR"),
                items.get(event.itemId).name, operations[event.type], event.amount, actor,
                event.source === null ? "—" : "#" + (event.source + 1), event.note || "—"]);
        }
        if (!$("history").rows.length) row("history", ["Nenhuma movimentação registrada"]);
        refreshSource();
    }

    // Limpe também o ID oculto. Sem esse ID, o próximo envio cria um item em vez de editar outro.
    function resetItem() {
        const form = $("item-form");
        form.reset();
        form.elements.namedItem("id").value = "";
        form.elements.namedItem("initial").disabled = false;
        $("save-item").textContent = "Cadastrar item";
    }

    // Monte as opções válidas deste cenário e ligue os campos às ações de busca, seleção e limpeza.
    for (const [value, label] of Object.entries(operations)) option($("type"), value, label);
    $("type").addEventListener("change", refreshSource);
    $("item").addEventListener("change", refreshSource);
    $("search").addEventListener("input", render);
    $("cancel-edit").addEventListener("click", resetItem);

    // preventDefault() impede o recarregamento. FormData lê os campos pelo atributo name. Um ID existente indica edição.
    $("item-form").addEventListener("submit", event => {
        event.preventDefault();
        const fields = new FormData(event.currentTarget);
        const editing = state.items.find(item => item.id === fields.get("id"));
        const item = {
            id: editing?.id ?? String(Date.now()) + "-" + state.items.length,
            code: fields.get("code").trim().toUpperCase(),
            name: fields.get("name").trim(),
            group: fields.get("group").trim(),
            initial: editing?.initial ?? Number(fields.get("initial")),
            minimum: Number(fields.get("minimum"))
        };
        try {
            const items = editing ? state.items.map(current => current.id === item.id ? item : current) : [...state.items, item];
            commit({ ...state, items });
            resetItem();
            message("Cadastro salvo.");
        } catch (error) {
            message(error.message, true);
        }
    });

    // Converta a quantidade digitada em número e acrescente um registro ao histórico. commit() confere o histórico inteiro antes de aceitar.
    $("event-form").addEventListener("submit", event => {
        event.preventDefault();
        const fields = new FormData(event.currentTarget);
        const type = fields.get("type");
        const source = fields.get("source");
        try {
            commit({ ...state, events: [...state.events, {
                type, itemId: fields.get("item"), amount: Number(fields.get("amount")),
                actor: fields.get("actor").trim(), note: fields.get("note").trim(),
                date: new Date().toISOString(), source: linkedOperations[type] && source !== "" ? Number(source) : null
            }] });
            event.currentTarget.reset();
            refreshSource();
            message("Movimentação registrada.");
        } catch (error) {
            message(error.message, true);
        }
    });

    // Transforme o estado em texto JSON e use um link temporário para o navegador baixar o arquivo.
    $("export").addEventListener("click", () => {
        const url = URL.createObjectURL(new Blob([JSON.stringify(state, null, 2)], { type: "application/json" }));
        const link = document.createElement("a");
        link.href = url;
        link.download = config.kind + "-backup.json";
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    });

    // Leia o arquivo, valide o cenário e as regras e confirme a substituição dos dados existentes antes de gravar.
    $("import").addEventListener("change", async event => {
        const input = event.currentTarget;
        const file = input.files[0];
        if (!file) return;
        try {
            const candidate = JSON.parse(await file.text());
            derive(candidate);
            if (state.items.length || state.events.length) {
                if (!confirm("A importação substituirá os dados atuais. Continuar?")) return;
            }
            commit(candidate, true);
            resetItem();
            message("Backup importado.");
        } catch (error) {
            message(error.message, true);
        } finally {
            input.value = "";
        }
    });

    render();
}
