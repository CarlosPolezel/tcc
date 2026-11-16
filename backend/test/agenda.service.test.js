const assert = require('node:assert/strict');
const { beforeEach, test } = require('node:test');

const { Agendamento } = require('../src/models');
const {
  consultarDisponibilidade,
  criarReserva,
} = require('../src/services/agenda.service');

const data = '2026-11-16';
const servico = {
  _id: '507f1f77bcf86cd799439011',
  prestador: '507f1f77bcf86cd799439012',
  duracao: 60,
  preco: 80,
};

function instante(horario) {
  return new Date(`${data}T${horario}:00-03:00`);
}

function simularAgenda(t, ocupados) {
  const selecionar = { lean: async () => ocupados };
  return t.mock.method(Agendamento, 'find', () => ({
    select: () => selecionar,
  }));
}

function reservar(horario) {
  return criarReserva({
    servico,
    nomeCliente: 'Cliente de teste',
    telefoneCliente: '00000000000',
    data,
    horario,
  });
}

beforeEach((t) => {
  t.mock.timers.enable({ apis: ['Date'], now: instante('07:00') });
});

test('oferece um horário livre e grava a reserva com início e fim corretos', async (t) => {
  simularAgenda(t, []);
  const consultarConflito = t.mock.method(Agendamento, 'exists', async () => null);
  const gravar = t.mock.method(Agendamento, 'create', async (dados) => dados);

  const disponibilidade = await consultarDisponibilidade(servico, data);
  assert.ok(disponibilidade.horarios.includes('09:00'));

  const reserva = await reservar('09:00');

  assert.equal(gravar.mock.callCount(), 1);
  assert.equal(reserva.servico, servico._id);
  assert.equal(reserva.prestador, servico.prestador);
  assert.deepEqual(reserva.inicio, instante('09:00'));
  assert.deepEqual(reserva.fim, instante('10:00'));
  assert.deepEqual(consultarConflito.mock.calls[0].arguments[0], {
    prestador: servico.prestador,
    status: { $in: ['pendente', 'confirmado'] },
    inicio: { $lt: instante('10:00') },
    fim: { $gt: instante('09:00') },
  });
});

test('retira o horário sobreposto da agenda e rejeita a tentativa de reserva', async (t) => {
  const ocupacao = { inicio: instante('09:00'), fim: instante('10:00') };
  simularAgenda(t, [ocupacao]);
  t.mock.method(Agendamento, 'exists', async () => ({ _id: 'reserva-existente' }));
  const gravar = t.mock.method(Agendamento, 'create', async (dados) => dados);

  const disponibilidade = await consultarDisponibilidade(servico, data);
  assert.ok(!disponibilidade.horarios.includes('09:30'));
  await assert.rejects(reservar('09:30'), { status: 409 });
  assert.equal(gravar.mock.callCount(), 0);
});

test('aceita horários adjacentes, antes e depois de uma reserva existente', async (t) => {
  simularAgenda(t, [{ inicio: instante('09:00'), fim: instante('10:00') }]);
  t.mock.method(Agendamento, 'exists', async () => null);
  t.mock.method(Agendamento, 'create', async (dados) => dados);

  const disponibilidade = await consultarDisponibilidade(servico, data);
  assert.ok(disponibilidade.horarios.includes('08:00'));
  assert.ok(disponibilidade.horarios.includes('10:00'));

  const antes = await reservar('08:00');
  const depois = await reservar('10:00');
  assert.deepEqual(antes.fim, instante('09:00'));
  assert.deepEqual(depois.inicio, instante('10:00'));
});

test('aceita o fim às 18h e rejeita reservas que ultrapassam o expediente', async (t) => {
  simularAgenda(t, []);
  t.mock.method(Agendamento, 'exists', async () => null);
  const gravar = t.mock.method(Agendamento, 'create', async (dados) => dados);

  const disponibilidade = await consultarDisponibilidade(servico, data);
  assert.ok(disponibilidade.horarios.includes('17:00'));
  assert.ok(!disponibilidade.horarios.includes('17:30'));

  const ultimaReserva = await reservar('17:00');
  assert.deepEqual(ultimaReserva.fim, instante('18:00'));
  await assert.rejects(reservar('17:30'), { status: 400 });
  assert.equal(gravar.mock.callCount(), 1);
});
