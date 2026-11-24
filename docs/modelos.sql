-- SQLite. Cada prefixo representa um cenário independente.
-- O aplicativo web usa armazenamento no navegador. Este script é uma base
-- para implementar uma versão relacional. Implemente as regras de saldo
-- e o fechamento das operações dentro de transações na aplicação.
-- Ligue a checagem de chaves estrangeiras. Um vínculo com um ID que não existe deve ser rejeitado.
PRAGMA foreign_keys = ON;

-- Almoxarifado. Cadastre a categoria primeiro e use o ID dela como categoria_id no item.
CREATE TABLE almox_categoria (
    id INTEGER PRIMARY KEY,
    nome TEXT NOT NULL UNIQUE
);

-- O código identifica o item no uso do dia a dia. UNIQUE evita repetições e COLLATE NOCASE ignora diferença de maiúsculas e minúsculas ASCII.
CREATE TABLE almox_item (
    id INTEGER PRIMARY KEY,
    codigo TEXT NOT NULL COLLATE NOCASE UNIQUE,
    nome TEXT NOT NULL,
    categoria_id INTEGER NOT NULL REFERENCES almox_categoria(id),
    saldo_inicial INTEGER NOT NULL CHECK (saldo_inicial >= 0),
    estoque_minimo INTEGER NOT NULL CHECK (estoque_minimo >= 0)
);

-- Cada linha se liga a um item e guarda uma entrada ou saída. O CHECK da quantidade exige um valor maior que zero.
CREATE TABLE almox_movimentacao (
    id INTEGER PRIMARY KEY,
    item_id INTEGER NOT NULL REFERENCES almox_item(id),
    tipo TEXT NOT NULL CHECK (tipo IN ('ENTRADA', 'SAIDA')),
    quantidade INTEGER NOT NULL CHECK (quantidade > 0),
    responsavel TEXT,
    observacao TEXT,
    criado_em TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Ferramentas. Use o mesmo padrão de categorias e itens, com um histórico específico de empréstimos.
CREATE TABLE ferramenta_categoria (
    id INTEGER PRIMARY KEY,
    nome TEXT NOT NULL UNIQUE
);

CREATE TABLE ferramenta_item (
    id INTEGER PRIMARY KEY,
    codigo TEXT NOT NULL COLLATE NOCASE UNIQUE,
    nome TEXT NOT NULL,
    categoria_id INTEGER NOT NULL REFERENCES ferramenta_categoria(id),
    saldo_inicial INTEGER NOT NULL CHECK (saldo_inicial >= 0),
    estoque_minimo INTEGER NOT NULL CHECK (estoque_minimo >= 0)
);

-- Uma devolução indica a retirada em origem_id. O vínculo checa se o registro existe. A aplicação confere se é a retirada certa e se ainda há unidades a devolver.
CREATE TABLE ferramenta_movimentacao (
    id INTEGER PRIMARY KEY,
    item_id INTEGER NOT NULL REFERENCES ferramenta_item(id),
    tipo TEXT NOT NULL CHECK (tipo IN ('RETIRADA', 'DEVOLUCAO')),
    quantidade INTEGER NOT NULL CHECK (quantidade > 0),
    responsavel TEXT,
    origem_id INTEGER REFERENCES ferramenta_movimentacao(id),
    observacao TEXT,
    criado_em TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Compras. Separe categorias de insumos e vincule pedidos e recebimentos ao item.
CREATE TABLE reposicao_categoria (
    id INTEGER PRIMARY KEY,
    nome TEXT NOT NULL UNIQUE
);

CREATE TABLE reposicao_item (
    id INTEGER PRIMARY KEY,
    codigo TEXT NOT NULL COLLATE NOCASE UNIQUE,
    nome TEXT NOT NULL,
    categoria_id INTEGER NOT NULL REFERENCES reposicao_categoria(id),
    saldo_inicial INTEGER NOT NULL CHECK (saldo_inicial >= 0),
    estoque_minimo INTEGER NOT NULL CHECK (estoque_minimo >= 0)
);

-- Recebimento e cancelamento apontam para o pedido em origem_id. A aplicação controla quanto ainda está pendente e atualiza o estoque dentro de uma transação.
CREATE TABLE reposicao_movimentacao (
    id INTEGER PRIMARY KEY,
    item_id INTEGER NOT NULL REFERENCES reposicao_item(id),
    tipo TEXT NOT NULL CHECK (tipo IN ('CONSUMO', 'PEDIDO', 'RECEBIMENTO', 'CANCELAMENTO')),
    quantidade INTEGER NOT NULL CHECK (quantidade > 0),
    fornecedor TEXT,
    origem_id INTEGER REFERENCES reposicao_movimentacao(id),
    observacao TEXT,
    criado_em TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
