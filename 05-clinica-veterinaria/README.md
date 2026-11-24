# Clínica veterinária | Treino SAEP

Sistema local para cadastro de tutores e pets e atendimento por agendamento. O projeto usa Node.js e SQLite e roda offline, sem instalar pacotes.

## Executar

Requer Node.js 24 ou superior. A partir da raiz do repositório:

```bash
cd 05-clinica-veterinaria
node sistema/server.js
```

Abra <http://127.0.0.1:3005>. Entre com **`recepcao`** e senha **`SAEP2026!`**. Os usuários de treino `veterinario` e `gestao` usam a mesma senha. A sessão dura 30 minutos e pode ser encerrada pelo botão **Sair**.

O servidor executa o SQL no primeiro início e cria `clinica.sqlite` e `clinica.sqlite.chave`. Ao fazer uma cópia de uma instalação, guarde o banco e a chave correspondente. A chave fica fora do Git.

## Arquivos de treino

| Arquivo | Conteúdo |
| --- | --- |
| [documentacao.pdf](documentacao.pdf) | Requisitos funcionais e infraestrutura |
| [der.png](der.png) | Entidades, chaves e cardinalidades |
| [saep_db.sql](saep_db.sql) | Criação e carga de três registros fictícios por tabela |
| [sistema](sistema/) | Código do login, da tela principal e dos três módulos |

Para reproduzir o formato pedido no caderno, compacte `documentacao.pdf`, `der.png`, `saep_db.sql` e a pasta `sistema` na raiz do ZIP. Coloque seu nome no arquivo ao montar a sua entrega.

## Como o código se encaixa

- `index.html` monta as telas. O `app.js` pega os valores dos formulários, consulta a API e atualiza as tabelas.
- `server.js` recebe as chamadas e controla login, expiração e logout. `clinica.js` valida os dados e consulta o SQLite.
- O banco guarda CPFs com AES-256-GCM e usa um índice HMAC para evitar duplicatas. A primeira execução troca a chave pública dos exemplos pela chave local da instalação. Senhas são verificadas por hash com scrypt.

## Demonstração

1. Tente entrar com uma senha incorreta. Em seguida, use a conta de treino e confira o nome na tela.
2. Abra **Tutores**, busque por *Marina*, edite seu telefone e recarregue para conferir a gravação.
3. Abra **Pets** e cadastre um animal ligado a um tutor.
4. Abra **Agendamentos**, cadastre um horário e altere a data. Confira a ordem da lista e os dados associados.
5. Clique em **Sair** e entre de novo para conferir a persistência.
