const config = {"kind":"tools"};

const operations = {
    almox: { entrada: "Entrada", saida: "Saída" },
    tools: { retirada: "Retirada", devolucao: "Devolução" },
    orders: { consumo: "Consumo", pedido: "Pedido", recebimento: "Recebimento", cancelamento: "Cancelamento" }
}[config.kind];

const linkedOperations = { devolucao: "retirada", recebimento: "pedido", cancelamento: "pedido" };
const requiredActor = new Set(["retirada", "pedido"]);
const isText = value => typeof value === "string" && value.trim().length > 0;
const isCount = value => Number.isSafeInteger(value) && value >= 0;

function ensure(condition, message) {
    if (!condition) throw new Error(message);
}

function derive(state) {
    ensure(state?.version === 1 && state.project === config.kind &&
        Array.isArray(state.items) && Array.isArray(state.events), "Backup incompatível com este projeto.");
    const items = new Map();
    const codes = new Set();
    const pending = new Map();

    for (const item of state.items) {
        ensure(item && isText(item.id) && !items.has(item.id) && isText(item.code) &&
            isText(item.name) && isText(item.group) && isCount(item.initial) && isCount(item.minimum),
            "Preencha código, nome, categoria e quantidades inteiras não negativas.");
        const code = item.code.trim().toUpperCase();
        ensure(!codes.has(code), "Já existe um item com esse código.");
        codes.add(code);
        items.set(item.id, { ...item, stock: item.initial });
    }

    for (const [index, event] of state.events.entries()) {
        ensure(event && Object.hasOwn(operations, event.type) && items.has(event.itemId) &&
            isCount(event.amount) && event.amount > 0 && typeof event.actor === "string" &&
            typeof event.note === "string" && isText(event.date) &&
            Number.isFinite(Date.parse(event.date)), "Movimentação inválida.");
        ensure(!requiredActor.has(event.type) || isText(event.actor), "Informe o responsável ou fornecedor.");
        const item = items.get(event.itemId);
        const sourceType = linkedOperations[event.type];

        if (sourceType) {
            const source = pending.get(event.source);
            ensure(source?.event.type === sourceType && source.event.itemId === item.id &&
                source.remaining >= event.amount, "Selecione uma operação aberta com saldo suficiente.");
            if (event.type === "cancelamento") {
                ensure(event.amount === source.remaining, "O cancelamento deve encerrar todo o saldo do pedido.");
            }
            source.remaining -= event.amount;
        }

        if (event.type === "retirada" || event.type === "pedido") {
            pending.set(index, { event, remaining: event.amount });
        }
        if (["saida", "retirada", "consumo"].includes(event.type)) item.stock -= event.amount;
        if (["entrada", "devolucao", "recebimento"].includes(event.type)) item.stock += event.amount;
        ensure(isCount(item.stock), "Saldo insuficiente ou acima do limite numérico.");
    }
    return { items, pending };
}

if (typeof module !== "undefined") module.exports = { config, derive };

if (typeof document !== "undefined") {
    const key = "setup-saep:" + config.kind + ":v1";
    const $ = id => document.getElementById(id);
    const blank = { version: 1, project: config.kind, items: [], events: [] };
    let state = blank;
    let storageReadFailed = false;

    function message(text, error = false) {
        $("status").textContent = text;
        $("status").classList.toggle("error", error);
    }

    try {
        const saved = localStorage.getItem(key);
        if (saved) {
            const candidate = JSON.parse(saved);
            derive(candidate);
            state = candidate;
        }
    } catch {
        storageReadFailed = true;
        message("Falha ao ler os dados locais. Importe um backup válido para recuperar o projeto.", true);
    }

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

    function row(table, values) {
        const tr = $(table).insertRow();
        for (const value of values) tr.insertCell().textContent = value;
        return tr;
    }

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

        for (const [index, event] of [...state.events.entries()].reverse()) {
            const actor = event.actor || state.events[event.source]?.actor || "—";
            row("history", ["#" + (index + 1), new Date(event.date).toLocaleString("pt-BR"),
                items.get(event.itemId).name, operations[event.type], event.amount, actor,
                event.source === null ? "—" : "#" + (event.source + 1), event.note || "—"]);
        }
        if (!$("history").rows.length) row("history", ["Nenhuma movimentação registrada"]);
        refreshSource();
    }

    function resetItem() {
        const form = $("item-form");
        form.reset();
        form.elements.namedItem("id").value = "";
        form.elements.namedItem("initial").disabled = false;
        $("save-item").textContent = "Cadastrar item";
    }

    for (const [value, label] of Object.entries(operations)) option($("type"), value, label);
    $("type").addEventListener("change", refreshSource);
    $("item").addEventListener("change", refreshSource);
    $("search").addEventListener("input", render);
    $("cancel-edit").addEventListener("click", resetItem);

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

    $("export").addEventListener("click", () => {
        const url = URL.createObjectURL(new Blob([JSON.stringify(state, null, 2)], { type: "application/json" }));
        const link = document.createElement("a");
        link.href = url;
        link.download = config.kind + "-backup.json";
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    });

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
