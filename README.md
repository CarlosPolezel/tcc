# ServiçoJá

API de um protótipo de TCC para divulgação e agendamento de serviços locais. O repositório contém o backend em Node.js, Express e MongoDB com Mongoose.

- Cadastro de prestadores e serviços.
- Consulta de horários considerando a duração do atendimento e as reservas existentes.
- Registro e acompanhamento de agendamentos.

## Executar localmente

Com Node.js 24 e o MongoDB local em execução, abra a pasta do repositório:

```powershell
cd backend
npm ci
Copy-Item .env.example .env
npm start
```

No Linux ou macOS, use `cp .env.example .env` no lugar de `Copy-Item`. Para listar os serviços cadastrados, abra [a rota de serviços](http://127.0.0.1:3001/api/servicos) no navegador ou execute:

```bash
curl http://127.0.0.1:3001/api/servicos
```

A API é um protótipo local sem autenticação. Use dados fictícios para demonstrar o fluxo.

## Testes da agenda

Na pasta `backend`, execute `npm ci` e `npm test`. Os testes simulam as consultas e gravações de agendamentos, por isso rodam sem MongoDB. Eles cobrem horário livre, sobreposição, reservas adjacentes e o limite do expediente.

[GitHub Actions](https://github.com/CarlosPolezel/tcc/actions/workflows/backend-tests.yml) · [Documentação do backend](backend/README.md) · [Rotas e exemplos da API](backend/docs/api.md)
