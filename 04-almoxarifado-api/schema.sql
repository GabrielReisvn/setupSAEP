-- Habilite a confirmação de que toda movimentação aponta para um produto existente.
PRAGMA foreign_keys = ON;

-- Esta tabela guarda o cadastro e o saldo atual. O ID conecta tabelas. O SKU é o código que o usuário vê e precisa ser único.
CREATE TABLE IF NOT EXISTS produtos (
    id INTEGER PRIMARY KEY,
    sku TEXT NOT NULL COLLATE NOCASE UNIQUE,
    nome TEXT NOT NULL,
    categoria TEXT NOT NULL,
    -- Um produto novo começa em zero. CHECK limita os valores aceitos mesmo se alguém gravar dados direto no banco.
    estoque INTEGER NOT NULL DEFAULT 0 CHECK (estoque BETWEEN 0 AND 2147483647),
    minimo INTEGER NOT NULL CHECK (minimo BETWEEN 0 AND 2147483647)
) STRICT;

-- Cada linha registra uma entrada ou saída e referencia o produto. O servidor grava esta linha na mesma transação que altera o saldo.
CREATE TABLE IF NOT EXISTS movimentacoes (
    id INTEGER PRIMARY KEY,
    produto_id INTEGER NOT NULL REFERENCES produtos(id),
    tipo TEXT NOT NULL CHECK (tipo IN ('ENTRADA', 'SAIDA')),
    quantidade INTEGER NOT NULL CHECK (quantidade BETWEEN 1 AND 2147483647),
    observacao TEXT NOT NULL,
    -- O SQLite preenche a data e a hora em UTC ao inserir. STRICT pede que os dados respeitem os tipos declarados.
    data TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
) STRICT;
