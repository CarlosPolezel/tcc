const servicos = [
  { id: 'corte', titulo: 'Corte de cabelo', profissional: 'Ana Lima', categoria: 'Beleza', preco: 40, minutos: 30 },
  { id: 'penteado', titulo: 'Penteado', profissional: 'Ana Lima', categoria: 'Beleza', preco: 85, minutos: 60 },
  { id: 'informatica', titulo: 'Aula de informática', profissional: 'Pedro Alves', categoria: 'Aulas', preco: 55, minutos: 60 }
];
const $ = id => document.getElementById(id);
const chave = 'servicoja.esboco.v1';
const pedidos = () => JSON.parse(localStorage.getItem(chave) || '[]');
const salvar = lista => localStorage.setItem(chave, JSON.stringify(lista));
const preco = valor => valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const hora = minutos => [Math.floor(minutos / 60), minutos % 60].map(n => String(n).padStart(2, '0')).join(':');
const dataLocal = data => [data.getFullYear(), String(data.getMonth() + 1).padStart(2, '0'), String(data.getDate()).padStart(2, '0')].join('-');
const diaUtil = data => [1, 2, 3, 4, 5].includes(data.getDay());
const dataBR = data => data.split('-').reverse().join('/');
let categoria = 'Todos';
let aba = 'hoje';
let atual;
let inicio;

function elemento(tag, texto, classe) {
  const item = document.createElement(tag);
  item.textContent = texto;
  if (classe) item.className = classe;
  return item;
}

function opcao(texto, ativo, acao) {
  const botao = elemento('button', texto);
  botao.type = 'button';
  botao.setAttribute('aria-pressed', ativo);
  botao.onclick = acao;
  return botao;
}

function catalogo() {
  const categorias = ['Todos', ...new Set(servicos.map(s => s.categoria))];
  $('categorias').replaceChildren(...categorias.map(c => opcao(c, c === categoria, () => {
    categoria = c;
    catalogo();
    $('categorias').querySelector('[aria-pressed=true]').focus();
  })));
  const busca = $('busca').value.trim().toLocaleLowerCase('pt-BR');
  const cards = servicos.filter(s => (categoria === 'Todos' || s.categoria === categoria) &&
    s.titulo.toLocaleLowerCase('pt-BR').includes(busca)).map(s => {
    const card = elemento('article', '');
    const link = elemento('a', 'Ver horários', 'primary');
    link.href = '#servico/' + s.id;
    link.setAttribute('aria-label', 'Ver horários para ' + s.titulo);
    card.append(elemento('small', s.categoria), elemento('h2', s.titulo), elemento('p', s.profissional),
      elemento('strong', preco(s.preco) + ' · ' + s.minutos + ' min'), elemento('br', ''), link);
    return card;
  });
  $('cards').replaceChildren(...(cards.length ? cards : [elemento('p', 'Nenhum serviço encontrado. Tente outro título ou categoria.')]));
}

function vagas(data) {
  if (!data || !diaUtil(new Date(data + 'T12:00'))) return [];
  const ocupados = pedidos().filter(p => p.profissional === atual.profissional && p.data === data && p.status !== 'Cancelado');
  const livres = [];
  for (let t = 480; t + atual.minutos <= 1080; t += 30) {
    if (new Date(data + 'T' + hora(t)) <= new Date()) continue;
    if (!ocupados.some(p => t < p.fim && t + atual.minutos > p.inicio)) livres.push(t);
  }
  return livres;
}

function horarios() {
  const livres = vagas($('data').value);
  if (!livres.includes(inicio)) inicio = null;
  $('cliente').hidden = inicio === null;
  $('horarios').replaceChildren();
  if (!livres.length) $('horarios').append(elemento('p', 'Sem horários disponíveis. Escolha outra data.'));
  for (const turno of ['Manhã', 'Tarde']) {
    const grupo = livres.filter(t => (t < 720) === (turno === 'Manhã'));
    if (!grupo.length) continue;
    const opcoes = elemento('div', '', 'choices');
    for (const t of grupo) {
      opcoes.append(opcao(hora(t), inicio === t, () => {
        inicio = t;
        horarios();
        $('horarios').querySelector('[aria-pressed=true]').focus();
      }));
    }
    $('horarios').append(elemento('h3', turno), opcoes);
  }
  if (inicio !== null) $('intervalo').textContent = 'Das ' + hora(inicio) + ' às ' + hora(inicio + atual.minutos);
}

function reservar(evento) {
  evento.preventDefault();
  const data = $('data').value;
  if (!vagas(data).includes(inicio)) {
    $('aviso').textContent = 'Esse horário ficou indisponível. Escolha outro.';
    horarios();
    return;
  }
  const pedido = { id: crypto.randomUUID(), profissional: atual.profissional, titulo: atual.titulo, data, inicio,
    fim: inicio + atual.minutos, nome: $('nome').value.trim(), telefone: $('telefone').value.trim(), status: 'Pendente' };
  if (!pedido.nome || !pedido.telefone) {
    $('aviso').textContent = 'Preencha o nome e o telefone fictícios.';
    return;
  }
  salvar([...pedidos(), pedido]);
  $('pedido').hidden = true;
  $('aviso').textContent = 'Solicitação enviada para ' + dataBR(data) + ', das ' + hora(inicio) + ' às ' + hora(pedido.fim) + '. Aguardando confirmação.';
}

function agenda() {
  const lista = pedidos().filter(p => p.profissional === $('profissional').value &&
    (aba === 'hoje' ? p.data === dataLocal(new Date()) : p.status === 'Pendente'));
  lista.sort((a, b) => a.data.localeCompare(b.data) || a.inicio - b.inicio);
  for (const botao of $('abas').children) botao.setAttribute('aria-pressed', botao.dataset.tab === aba);
  $('atendimentos').replaceChildren();
  if (!lista.length) $('atendimentos').append(elemento('p', aba === 'hoje' ? 'Nenhum atendimento hoje.' : 'Nenhuma solicitação pendente.'));
  for (const p of lista) {
    const card = elemento('article', '');
    card.append(elemento('small', dataBR(p.data) + ' · ' + p.status), elemento('h2', hora(p.inicio) + ' – ' + hora(p.fim)),
      elemento('p', p.titulo + ' · ' + p.nome));
    if (p.status === 'Pendente') {
      const acoes = elemento('div', '', 'choices');
      for (const [rotulo, status] of [['Confirmar', 'Confirmado'], ['Cancelar', 'Cancelado']]) {
        const botao = elemento('button', rotulo);
        botao.onclick = () => {
          salvar(pedidos().map(item => item.id === p.id && item.status === 'Pendente' ? { ...item, status } : item));
          agenda();
          $('atendimentos').prepend(elemento('p', p.titulo + ' · ' + p.nome + ' — ' + status));
        };
        acoes.append(botao);
      }
      card.append(acoes);
    }
    $('atendimentos').append(card);
  }
}

function navegar() {
  atual = servicos.find(s => location.hash === '#servico/' + s.id);
  const tela = atual ? 'reserva' : location.hash === '#agenda' ? 'agenda' : 'catalogo';
  for (const secao of document.querySelectorAll('main > section')) secao.hidden = secao.id !== tela;
  if (atual) {
    const dia = new Date();
    while (!diaUtil(dia) || !vagas(dataLocal(dia)).length) dia.setDate(dia.getDate() + 1);
    $('pedido').reset();
    $('pedido').hidden = false;
    $('aviso').textContent = '';
    $('data').min = dataLocal(new Date());
    $('data').value = dataLocal(dia);
    inicio = null;
    $('resumo').textContent = [atual.titulo, atual.profissional, preco(atual.preco), atual.minutos + ' min'].join(' · ');
    horarios();
  } else if (tela === 'agenda') agenda();
  else catalogo();
  window.scrollTo(0, 0);
}

for (const nome of new Set(servicos.map(s => s.profissional))) $('profissional').add(new Option(nome, nome));
$('profissional').onchange = agenda;
$('busca').oninput = catalogo;
$('data').onchange = () => { inicio = null; horarios(); };
$('pedido').onsubmit = reservar;
for (const botao of $('abas').children) botao.onclick = () => { aba = botao.dataset.tab; agenda(); };
window.addEventListener('hashchange', navegar);
window.addEventListener('storage', event => {
  if (event.key !== chave) return;
  if (!$('agenda').hidden) agenda();
  if (!$('reserva').hidden && !$('pedido').hidden) horarios();
});
navegar();
