# ServiçoJá — documentação do projeto de TCC

## Problema e objetivo

Um profissional que oferece corte e barba precisa administrar os dois serviços na mesma agenda. Se um corte ocupa das 10h às 11h, oferecer barba às 10h30 cria dois compromissos para a mesma pessoa. O ServiçoJá permite divulgar serviços, consultar horários compatíveis com a duração de cada atendimento e registrar a reserva na agenda do prestador.

A entrega documentada é uma API para demonstração local. Cliente e prestador representam papéis no fluxo de atendimento. O protótipo permite demonstrar ambos com dados fictícios e sem login.

## Como executar e verificar

Com Node.js 24 e o servidor MongoDB local em execução, abra o PowerShell na raiz do projeto. Na primeira configuração, execute:

```powershell
cd backend
npm ci
Copy-Item .env.example .env
npm start
```

Se o arquivo `.env` já estiver configurado, preserve-o. Em outro terminal, execute `Invoke-RestMethod http://127.0.0.1:3001/api/health`. Com a conexão ativa, a API responde com `{"status":"ok"}`. Para rodar os testes automatizados, execute `npm test` na pasta `backend`. Os testes simulam as operações dos modelos e podem rodar sem o MongoDB.

## Fluxo de atendimento

| Etapa | Quem atua | Resultado esperado |
|---|---|---|
| 1. Cadastrar prestador | Responsável pela demonstração | O cadastro gera o identificador usado para vincular serviços ao profissional. |
| 2. Publicar serviço | Prestador | O catálogo exibe o serviço ativo com categoria, preço e duração. |
| 3. Escolher data | Cliente | A consulta devolve as opções em que o atendimento inteiro cabe na agenda. |
| 4. Solicitar reserva | Cliente | A API verifica o intervalo novamente e registra a solicitação como pendente. |
| 5. Acompanhar atendimento | Prestador | O painel permite consultar as solicitações e atualizar o status conforme a etapa do atendimento. |

## Arquitetura e dados

O Express encaminha cada requisição ao controller da rota. O controller valida os dados recebidos e coordena a operação. Na consulta de disponibilidade e na criação de reservas, o serviço de agenda aplica as regras de horário. Os modelos Mongoose definem a estrutura dos documentos persistidos no MongoDB.

| Entidade | Dados principais | Relações |
|---|---|---|
| Prestador | Nome e descrição | Um profissional pode oferecer vários serviços. |
| Serviço | Título, categoria, preço, duração e indicador de atividade | Cada serviço pertence a um prestador. |
| Agendamento | Nome e telefone do cliente, início, fim, preço, status e observações | Cada reserva referencia o serviço e o prestador. |

A reserva guarda o preço e o intervalo definidos no momento da solicitação. Por isso, mudar o preço ou a duração de um serviço preserva as condições dos atendimentos já registrados. Desativar o serviço impede novas reservas e mantém o histórico. [Modelos de dados](../backend/src/models/index.js)

## Regras da agenda

- O expediente vai das 08h às 18h, de segunda a sexta, com deslocamento fixo UTC−03:00. Cada serviço dura de 15 a 480 minutos.
- A consulta sugere inícios a cada 30 minutos. A criação também aceita minutos intermediários se o intervalo for futuro, livre e couber no expediente.
- Reservas pendentes e confirmadas ocupam a agenda do prestador, inclusive quando o cliente escolhe outro serviço dele. O término de um atendimento pode coincidir com o início do próximo.
- Duas solicitações simultâneas para o mesmo prestador aguardam sua vez no processo do servidor. A segunda passa por nova verificação depois que a primeira termina. Esse controle atende à execução em uma única instância.

| Status atual | Alterações permitidas | Efeito na agenda |
|---|---|---|
| `pendente` | `confirmado` ou `cancelado` | A solicitação já ocupa o intervalo. |
| `confirmado` | `cancelado` ou `concluido` | O atendimento continua ocupando o intervalo. A conclusão exige que o término tenha chegado. |
| `cancelado` | Estado final | O período volta a ser oferecido se ainda for futuro e livre. |
| `concluido` | Estado final | O atendimento permanece registrado no histórico. |

## Roteiro para a banca

Use um dia útil futuro, um prestador fictício e dois serviços dele: corte de 60 minutos e barba de 30 minutos. O [contrato da API](../backend/docs/api.md) contém os campos e exemplos de requisição de cada etapa.

1. Consulte a disponibilidade da barba e escolha um dia com 10h30 e 11h livres.
2. Reserve o corte às 10h. Consulte a barba novamente. O horário das 10h30 deve desaparecer e o das 11h deve continuar disponível.
3. Tente reservar a barba às 10h30 diretamente pela API. A resposta esperada é HTTP 409. Isso demonstra que o servidor também verifica conflitos no momento da gravação.
4. Confirme o corte e tente concluí-lo antes do término. A resposta esperada é HTTP 409, e a reserva deve continuar confirmada.
5. Cancele o corte e consulte a barba. O retorno das 10h30 demonstra que o cancelamento libera o intervalo.
6. Reinicie a API mantendo o mesmo banco. Consulte o agendamento pelo painel e verifique que o cancelamento foi preservado.

## Escopo da demonstração

O protótipo cobre catálogo, disponibilidade e acompanhamento de reservas. A API usa um expediente comum aos prestadores e limita as listagens a 100 registros. O painel permite consultar contatos dos clientes sem autenticação. Para a apresentação local, use nomes e telefones fictícios. Pagamentos, notificações e reagendamento ficam fora desta versão.

[Guia de configuração do backend](../backend/README.md) · [Rotas e exemplos](../backend/docs/api.md) · [Testes da agenda](../backend/test/agenda.service.test.js)
