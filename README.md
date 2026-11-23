# Setup SAEP — Gestão de estoque

Três projetos independentes para praticar e adaptar conforme o enunciado e as regras do professor.

| Projeto | Funcionalidades |
| --- | --- |
| [01 — Almoxarifado](01-almoxarifado/index.html) | Produtos por categoria, entradas e saídas, estoque mínimo e histórico |
| [02 — Empréstimo de ferramentas](02-ferramentas/index.html) | Retirada por responsável, devolução vinculada ao empréstimo e saldo disponível |
| [03 — Compras e reposição](03-reposicao/index.html) | Consumo, pedidos por fornecedor, recebimento e cancelamento |

## Rodar offline

Clone enquanto houver acesso ao GitHub. Abra o `index.html` da pasta escolhida em Edge ou Chrome. Todos os arquivos são locais e cada projeto roda sem instalação. Os dados ficam no armazenamento local do navegador e cada tela permite exportar e importar um backup JSON. A pasta e o perfil do navegador influenciam onde os dados ficam disponíveis, então exporte antes de trocar de máquina ou mover o projeto.

Os exemplos usam JavaScript e armazenamento no navegador. Se o enunciado exigir API ou banco relacional, use [os modelos SQL](docs/modelos.sql) como ponto de partida e implemente a persistência exigida.

## Documentação

- [Guia rápido de entrega](docs/guia.md)
- [Modelo preenchido — Almoxarifado](docs/almoxarifado.md)
- [Modelo preenchido — Ferramentas](docs/ferramentas.md)
- [Modelo preenchido — Reposição](docs/reposicao.md)
- [Modelos SQL dos três cenários](docs/modelos.sql)
