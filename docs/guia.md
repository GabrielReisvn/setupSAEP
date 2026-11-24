# Guia rápido de documentação para o SAEP

Comece pelo enunciado. Identifique os arquivos obrigatórios, os nomes exigidos e as evidências que o avaliador deve conseguir conferir.

| Se a atividade pedir | Registre |
| --- | --- |
| README | Objetivo, tecnologias, como executar e roteiro curto de demonstração |
| Requisitos | IDs numerados, verbo observável e regra correspondente |
| DER | Entidades, chaves primárias, estrangeiras e cardinalidades |
| Banco SQL | DDL que roda em banco limpo e dados de exemplo, se pedidos |
| Evidência de teste | Entrada, resultado esperado, resultado observado e arquivo da captura, se exigida |

> RF é uma ação que o sistema permite fazer. RN é uma condição que muda o resultado. Por exemplo, registrar saída é RF. Bloquear saída acima do saldo é RN.

## Modelo para copiar

~~~markdown
# [Nome do sistema]

## Objetivo
[Quem usa e qual problema o sistema resolve.]

## Como executar
1. [Pré-requisitos e versões.]
2. [Comando ou arquivo para abrir.]
3. [Onde acessar e como preparar o banco.]

## Requisitos e regras
- RF01 — [Ação observável realizada pelo usuário.]
- RN01 — [Condição precisa e resultado.]

## Dados
[Diagrama, caminho do script ou descrição da persistência.]

## Testes
| ID | Ação | Resultado esperado | Resultado observado |
| --- | --- | --- | --- |
| T01 | [Fluxo válido] | [Efeito esperado] | [Preencher após executar] |
| T02 | [Tentativa inválida] | [Mensagem e estado esperado] | [Preencher após executar] |
~~~

> Preencha os campos entre colchetes com o seu conteúdo. Na coluna de resultado observado, escreva o que viu durante o teste.

## Conferência antes da entrega

1. Abra a pasta que será entregue e execute a aplicação a partir dela.
2. Demonstre um caso válido, um bloqueio de regra e persistência após reabrir.
3. Confira se diagramas, SQL e documentação usam os mesmos nomes do sistema.
4. Se o enunciado pedir um diagrama como arquivo, exporte para o formato solicitado enquanto as ferramentas estiverem disponíveis. O código Mermaid continua legível como texto offline.
