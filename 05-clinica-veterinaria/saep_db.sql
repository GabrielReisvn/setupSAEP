PRAGMA foreign_keys = ON;
BEGIN;

CREATE TABLE IF NOT EXISTS usuarios (
    id INTEGER PRIMARY KEY,
    nome TEXT NOT NULL,
    login TEXT NOT NULL COLLATE NOCASE UNIQUE,
    sal TEXT NOT NULL,
    senha_hash TEXT NOT NULL
) STRICT;

CREATE TABLE IF NOT EXISTS tutores (
    id INTEGER PRIMARY KEY,
    nome TEXT NOT NULL,
    telefone TEXT NOT NULL,
    email TEXT NOT NULL,
    cpf_cifrado TEXT NOT NULL,
    cpf_indice TEXT NOT NULL UNIQUE
) STRICT;

CREATE TABLE IF NOT EXISTS pets (
    id INTEGER PRIMARY KEY,
    tutor_id INTEGER NOT NULL REFERENCES tutores(id),
    nome TEXT NOT NULL,
    especie TEXT NOT NULL,
    raca TEXT NOT NULL
) STRICT;

CREATE TABLE IF NOT EXISTS agendamentos (
    id INTEGER PRIMARY KEY,
    pet_id INTEGER NOT NULL REFERENCES pets(id),
    data_hora TEXT NOT NULL,
    motivo TEXT NOT NULL,
    UNIQUE (pet_id, data_hora)
) STRICT;

CREATE INDEX IF NOT EXISTS pets_por_tutor ON pets(tutor_id);
CREATE INDEX IF NOT EXISTS agenda_por_data ON agendamentos(data_hora);

-- Os três registros de cada tabela são fictícios. A carga é repetível por ID.
-- A senha das contas de treino é SAEP2026!. O banco recebe sal e hash.
INSERT INTO usuarios (id, nome, login, sal, senha_hash) VALUES
    (1, 'Ana Recepção', 'recepcao', '9cedb80f71c3146887f99fb4f11040b3', '1821bbedc86d935825fa2517f576e3e8b26dfbc119f402e245b2a886bd4c0ca50943f7a630c319a27636076c991ebe0c8e93d7d78dfe1a512378f1bf30cb0778'),
    (2, 'Caio Veterinário', 'veterinario', '86e63c326ce6aa6f4bf4de9fc4ae4b40', 'd10e8fa37d6136de583b591a2d8e007946f6b194f98e280e99b3ed28bedcebe01a59734309ff972c6cc6dd21875adeba460bfeb8f3f09211c0e6744c51fa9b73'),
    (3, 'Lia Gestão', 'gestao', '86af2b99fe2c39fdf8e3dc485eea6ed3', 'fa85f388e9575bd07e58a7ed0ff464c35b91cb14623de3eedbf93319f852b88bbd6a6a5292099af7b98e5f6d7f76b6d886b85017173e32ee0329614601c15daf')
ON CONFLICT(id) DO NOTHING;

-- CPFs fictícios cifrados. O prefixo demo marca os dados de treinamento.
INSERT INTO tutores (id, nome, telefone, email, cpf_cifrado, cpf_indice) VALUES
    (1, 'Marina Exemplo', '(11) 90000-0001', 'marina@example.test', 'demo:2633a6f24b35c8c06453facd:a89275caaaad597915c7c265b8174e60:afe33e71dfaee3543ae4e1', 'ca012701c941f37b7a64f13fe9b0d977ea14c9dc0206c1b4db44ea7ea818eb52'),
    (2, 'Paulo Exemplo', '(11) 90000-0002', 'paulo@example.test', 'demo:46044e6bc99365891e790e5e:86abd68ecb9442682773c25b2f47ae94:f65da2ecd884e48116106a', 'e58f4b064d72156c5030dc57190e28ccecaedf439bfcfb5f92f85f52fb56a499'),
    (3, 'Rita Exemplo', '(11) 90000-0003', 'rita@example.test', 'demo:764f31b725bb83b9ece5cfaa:e8b3e9419ae50db0a54273865d75fec4:38a2bc4f034d8fb9cf04d4', '2fa4f130b29e4c4b00724477696411f18b6d35b8764fd3ecb1029862983e3d9b')
ON CONFLICT(id) DO NOTHING;

INSERT INTO pets (id, tutor_id, nome, especie, raca) VALUES
    (1, 1, 'Lua', 'Gato', 'Sem raça definida'),
    (2, 2, 'Bento', 'Cão', 'Vira-lata'),
    (3, 3, 'Nina', 'Cão', 'Poodle')
ON CONFLICT(id) DO NOTHING;

INSERT INTO agendamentos (id, pet_id, data_hora, motivo) VALUES
    (1, 1, '2026-12-05T09:00', 'Consulta de rotina'),
    (2, 2, '2026-12-03T10:30', 'Vacinação'),
    (3, 3, '2026-12-04T14:00', 'Retorno')
ON CONFLICT(id) DO NOTHING;

COMMIT;
