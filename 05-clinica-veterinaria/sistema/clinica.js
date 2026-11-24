const { banco, chave } = require("./banco");
const { cifrarCpf, abrirCpf, identificarCpf } = require("./seguranca");

function erro(status, mensagem) {
    throw Object.assign(new Error(mensagem), { status });
}

function texto(valor, campo, limite = 100) {
    const limpo = typeof valor === "string" ? valor.trim() : "";
    if (!limpo || limpo.length > limite) erro(400, "Preencha " + campo + " com até " + limite + " caracteres.");
    return limpo;
}

function idValido(id) {
    if (!Number.isSafeInteger(id) || id < 1) erro(400, "Selecione um registro válido.");
    return id;
}

function conferirReferencia(tabela, id, nome) {
    idValido(id);
    // tabela vem das funções abaixo. O ID recebido é sempre passado como valor.
    if (!banco.prepare("SELECT id FROM " + tabela + " WHERE id = ?").get(id)) {
        erro(404, nome + " não encontrado.");
    }
}

function listarTutores() {
    return banco.prepare("SELECT id, nome, email, telefone, cpf_cifrado FROM tutores ORDER BY nome, id").all()
        .map(({ cpf_cifrado, ...tutor }) => ({ ...tutor, cpf: abrirCpf(cpf_cifrado, chave) }));
}

function salvarTutor(dados, id) {
    const nome = texto(dados.nome, "o nome");
    const email = texto(dados.email, "o e-mail", 150);
    const telefone = texto(dados.telefone, "o telefone", 30);
    const cpf = texto(dados.cpf, "o CPF", 20).replace(/[.\s-]/g, "");
    if (!/^\d{11}$/.test(cpf)) erro(400, "Informe um CPF com 11 dígitos.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) erro(400, "Informe um e-mail válido.");
    const parametros = [nome, email, telefone, cifrarCpf(cpf, chave), identificarCpf(cpf, chave)];

    try {
        if (id === undefined) {
            return banco.prepare("INSERT INTO tutores (nome, email, telefone, cpf_cifrado, cpf_indice) VALUES (?, ?, ?, ?, ?)")
                .run(...parametros).lastInsertRowid;
        }
        const resultado = banco.prepare("UPDATE tutores SET nome=?, email=?, telefone=?, cpf_cifrado=?, cpf_indice=? WHERE id=?")
            .run(...parametros, idValido(id));
        if (!resultado.changes) erro(404, "Tutor não encontrado.");
        return id;
    } catch (falha) {
        if (falha.errcode === 2067) erro(409, "CPF já cadastrado.");
        throw falha;
    }
}

function listarPets() {
    return banco.prepare(`
        SELECT p.*, t.nome AS tutor FROM pets p
        JOIN tutores t ON p.tutor_id = t.id ORDER BY p.nome, p.id
    `).all();
}

function salvarPet(dados, id) {
    conferirReferencia("tutores", dados.tutorId, "Tutor");
    const campos = [dados.tutorId, texto(dados.nome, "o nome"), texto(dados.especie, "a espécie"), texto(dados.raca, "a raça")];
    if (id === undefined) {
        return banco.prepare("INSERT INTO pets (tutor_id, nome, especie, raca) VALUES (?, ?, ?, ?)")
            .run(...campos).lastInsertRowid;
    }
    const resultado = banco.prepare("UPDATE pets SET tutor_id=?, nome=?, especie=?, raca=? WHERE id=?")
        .run(...campos, idValido(id));
    if (!resultado.changes) erro(404, "Pet não encontrado.");
    return id;
}

function listarAgenda() {
    // JOIN segue a relação agendamento → pet → tutor e traz os dados em uma consulta.
    return banco.prepare(`
        SELECT a.id, a.data_hora, a.motivo, p.id AS pet_id, p.nome AS pet, p.especie, p.raca,
            t.id AS tutor_id, t.nome AS tutor, t.email, t.telefone, t.cpf_cifrado
        FROM agendamentos a JOIN pets p ON a.pet_id = p.id JOIN tutores t ON p.tutor_id = t.id
        ORDER BY a.data_hora, a.id
    `).all().map(({ cpf_cifrado, ...registro }) => ({ ...registro, cpf: abrirCpf(cpf_cifrado, chave) }));
}

function salvarAgendamento(dados, id) {
    const data = dados.data_hora;
    if (typeof data !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(data)) {
        erro(400, "Informe uma data e hora válidas.");
    }
    const normalizada = new Date(data + "Z");
    if (Number.isNaN(normalizada.getTime()) || normalizada.toISOString().slice(0, 16) !== data) {
        erro(400, "Informe uma data e hora válidas.");
    }
    try {
        if (id === undefined) {
            conferirReferencia("pets", dados.petId, "Pet");
            return banco.prepare("INSERT INTO agendamentos (pet_id, data_hora, motivo) VALUES (?, ?, ?)")
                .run(dados.petId, data, texto(dados.motivo, "o motivo", 150)).lastInsertRowid;
        }
        const resultado = banco.prepare("UPDATE agendamentos SET data_hora=? WHERE id=?").run(data, idValido(id));
        if (!resultado.changes) erro(404, "Agendamento não encontrado.");
        return id;
    } catch (falha) {
        if (falha.errcode === 2067) erro(409, "Já existe um agendamento para este pet nesse horário.");
        throw falha;
    }
}

module.exports = { erro, listarTutores, salvarTutor, listarPets, salvarPet, listarAgenda, salvarAgendamento };
