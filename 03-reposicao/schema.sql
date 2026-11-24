-- O usuário inicial é criado pelo servidor. O banco recebe só o hash e o sal da senha.
CREATE TABLE IF NOT EXISTS usuarios (
    id INTEGER PRIMARY KEY,
    login TEXT NOT NULL COLLATE NOCASE UNIQUE,
    sal TEXT NOT NULL,
    senha_hash TEXT NOT NULL
) STRICT;

-- O projeto reaproveita o JSON de estoque e de backup. A revisão impede que
-- duas abas salvem versões antigas uma por cima da outra.
CREATE TABLE IF NOT EXISTS estoque (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    dados TEXT NOT NULL,
    revisao INTEGER NOT NULL DEFAULT 0
) STRICT;
