# Setup SAEP — Projetos práticos

Cinco projetos independentes para praticar e adaptar conforme o enunciado e as regras do professor.

| Projeto | Funcionalidades |
| --- | --- |
| [01 — Almoxarifado](01-almoxarifado/index.html) | Produtos por categoria, entradas e saídas, estoque mínimo e histórico |
| [02 — Empréstimo de ferramentas](02-ferramentas/index.html) | Retirada por responsável, devolução vinculada ao empréstimo e saldo disponível |
| [03 — Compras e reposição](docs/reposicao.md) | Login, consumo, pedidos, recebimento e cancelamento com SQLite |
| [04 — Almoxarifado com API e SQLite](04-almoxarifado-api/README.md) | API REST, estoque e histórico em banco local |
| [05 — Clínica veterinária](05-clinica-veterinaria/README.md) | Login com expiração, tutores, pets e agendamentos com SQLite |

> Para ler o código, comece em `index.html`. Os atributos `id` ligam os elementos da página ao `app.js`. Nos projetos 03 e 04, siga o `fetch()` do JavaScript até a rota em `server.js` e depois veja a tabela em `schema.sql`.

## Rodar offline

Clone enquanto houver acesso ao GitHub. Nos projetos 01 e 02, abra o `index.html` da pasta escolhida em Edge ou Chrome. Todos os arquivos são locais e esses dois projetos rodam sem instalação. Os dados ficam no armazenamento local do navegador e cada tela permite exportar e importar um backup JSON. A pasta e o perfil do navegador influenciam onde os dados ficam disponíveis, então exporte antes de trocar de máquina ou mover o projeto.

No projeto 03, use Node.js 24+ e execute `node server.js` dentro de `03-reposicao`. Acesse <http://127.0.0.1:3003> e use o [usuário inicial descrito no guia](docs/reposicao.md#execução). Para popular um banco vazio com 3 pedidos de exemplo, pare o servidor e execute `node seed.js` na pasta do projeto.

No projeto 04, use Node.js 24+ e execute `node server.js` dentro de `04-almoxarifado-api`. Acesse `http://127.0.0.1:3000`. O projeto grava em SQLite local e roda sem instalar pacotes.

No projeto 05, entre em `05-clinica-veterinaria` e execute `node sistema/server.js` com Node.js 24+. Acesse <http://127.0.0.1:3005> e use a [conta de treino](05-clinica-veterinaria/README.md#executar).

> Quando adaptar um projeto, atualize a documentação para explicar como rodar a sua versão e como demonstrar uma regra do enunciado.

## Documentação

- [Guia rápido de entrega](docs/guia.md)
- [Modelo preenchido — Almoxarifado](docs/almoxarifado.md)
- [Modelo preenchido — Ferramentas](docs/ferramentas.md)
- [Modelo preenchido — Reposição](docs/reposicao.md)
- [Modelos SQL dos três cenários](docs/modelos.sql)
