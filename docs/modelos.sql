-- SQLite. Cada prefixo representa um cenário independente.
-- O aplicativo web usa armazenamento no navegador. Este script é uma base
-- para implementar uma versão relacional. Implemente as regras de saldo
-- e o fechamento das operações dentro de transações na aplicação.
PRAGMA foreign_keys = ON;

CREATE TABLE almox_categoria (
    id INTEGER PRIMARY KEY,
    nome TEXT NOT NULL UNIQUE
);

CREATE TABLE almox_item (
    id INTEGER PRIMARY KEY,
    codigo TEXT NOT NULL COLLATE NOCASE UNIQUE,
    nome TEXT NOT NULL,
    categoria_id INTEGER NOT NULL REFERENCES almox_categoria(id),
    saldo_inicial INTEGER NOT NULL CHECK (saldo_inicial >= 0),
    estoque_minimo INTEGER NOT NULL CHECK (estoque_minimo >= 0)
);

CREATE TABLE almox_movimentacao (
    id INTEGER PRIMARY KEY,
    item_id INTEGER NOT NULL REFERENCES almox_item(id),
    tipo TEXT NOT NULL CHECK (tipo IN ('ENTRADA', 'SAIDA')),
    quantidade INTEGER NOT NULL CHECK (quantidade > 0),
    responsavel TEXT,
    observacao TEXT,
    criado_em TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

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
