const STORAGE_KEY = 'meu-mundo-dados-v1';
const names = { treinos: 'Treinos', estudos: 'Estudos', financas: 'Negócios pessoais', argos: 'Argos' };
const descriptions = {
  treinos: ['CUIDE DE VOCÊ', 'Treinos', 'Monte sua rotina e acompanhe cada conquista.'],
  estudos: ['EXPLORE IDEIAS', 'Estudos', 'Organize suas atividades, provas e próximos passos.'],
  financas: ['SEU ESPAÇO', 'Negócios pessoais', 'Organize seus negócios, projetos e finanças pessoais.'],
  argos: ['CONSTRUA SEU FUTURO', 'Argos', 'Organize os negócios, projetos e finanças da Argos.']
};
const emptyOffice = () => ({ financas: [], projetos: [], tarefas: [], certificados: [] });
const emptyData = () => ({ treinos: [], estudos: [], ...emptyOffice(), argos: emptyOffice() });
let data = emptyData();
let activeArea = null;
let calendarMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
let noticeTimer;
let canSave = true;

const dialog = document.querySelector('#area-dialog');
const content = document.querySelector('#area-content');
const notice = document.querySelector('#notice');

function notify(message) {
  const avatarDialog = document.querySelector('#avatar-dialog');
  (dialog.open ? dialog : avatarDialog.open ? avatarDialog : document.body).append(notice);
  notice.textContent = message;
  notice.classList.add('visible');
  clearTimeout(noticeTimer);
  noticeTimer = setTimeout(() => notice.classList.remove('visible'), 6000);
}

function loadData() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return;
    const parsed = JSON.parse(saved);
    if (!parsed || !['treinos', 'estudos', 'financas'].every(key => Array.isArray(parsed[key]))) {
      throw new Error('Dados em formato inválido');
    }
    for (const key of ['projetos', 'tarefas', 'certificados']) {
      if (parsed[key] === undefined) parsed[key] = [];
      else if (!Array.isArray(parsed[key])) throw new Error(`Dados inválidos: ${key}`);
    }
    if (parsed.argos === undefined) parsed.argos = emptyOffice();
    else if (!parsed.argos || typeof parsed.argos !== 'object' ||
      !['financas', 'projetos', 'tarefas', 'certificados'].every(key => Array.isArray(parsed.argos[key]))) {
      throw new Error('Dados inválidos: Argos');
    }
    data = parsed;
  } catch (error) {
    console.error('Não foi possível carregar os dados:', error);
    canSave = false;
    notify('Não foi possível carregar seus dados. O salvamento foi desativado para protegê-los.');
  }
}

function saveData() {
  if (!canSave) {
    notify('Salvamento desativado: não foi possível carregar os dados existentes.');
    return false;
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch (error) {
    console.error('Não foi possível salvar os dados:', error);
    notify('Não foi possível salvar. Suas alterações podem ser perdidas ao fechar a página.');
    return false;
  }
}

function updateProgress() {
  const missions = [...data.treinos, ...data.estudos, ...data.tarefas, ...data.argos.tarefas];
  const completed = missions.filter(item => item.done).length;
  const percent = missions.length ? Math.round(completed / missions.length * 100) : 0;
  const counter = document.querySelector('#hud-progress');
  counter.replaceChildren(document.createTextNode(`${completed} `));
  const total = document.createElement('small');
  total.textContent = `/ ${missions.length}`;
  counter.append(total);
  document.querySelector('#hud-progress-bar').style.width = `${percent}%`;
  if (window.refreshGameBoard) window.refreshGameBoard(completed, missions.length, percent);
}

function openArea(area) {
  if (!descriptions[area]) return;
  activeArea = area;
  if (area === 'financas' || area === 'argos') {
    officeData = area === 'argos' ? data.argos : data;
    officeSection = 'visao';
  }
  dialog.classList.add('office-dialog');
  dialog.setAttribute('aria-label', names[area]);
  const [kicker, title, description] = descriptions[area];
  document.querySelector('#dialog-kicker').textContent = kicker;
  document.querySelector('#dialog-title').textContent = title;
  document.querySelector('#dialog-description').textContent = description;
  renderArea();
  if (!dialog.open) dialog.showModal();
}

function formatDate(value) {
  if (!value) return '';
  const parts = value.split('-');
  return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : value;
}

function money(value) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

function renderArea() {
  const area = activeArea;
  if (area === 'financas' || area === 'argos') {
    renderOffice();
    return;
  }
  renderPersonalSpace();
}

function renderCalendar() {
  const year = calendarMonth.getFullYear();
  const month = calendarMonth.getMonth();
  document.querySelector('#calendar-month').textContent = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(calendarMonth);
  const calendar = document.querySelector('#calendar');
  ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].forEach(day => {
    const label = document.createElement('span');
    label.className = 'calendar-weekday';
    label.textContent = day;
    calendar.append(label);
  });
  for (let i = 0; i < new Date(year, month, 1).getDay(); i++) calendar.append(document.createElement('span'));
  const dates = new Set(data.estudos.map(item => item.date).filter(Boolean));
  for (let day = 1; day <= new Date(year, month + 1, 0).getDate(); day++) {
    const cell = document.createElement('span');
    const date = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    cell.textContent = day;
    if (dates.has(date)) {
      cell.className = 'has-event';
      cell.title = data.estudos.filter(item => item.date === date).map(item => item.title).join(', ');
      cell.setAttribute('aria-label', `${day}: ${cell.title}`);
    }
    calendar.append(cell);
  }
  document.querySelector('#previous-month').addEventListener('click', () => {
    calendarMonth = new Date(year, month - 1, 1);
    renderArea();
  });
  document.querySelector('#next-month').addEventListener('click', () => {
    calendarMonth = new Date(year, month + 1, 1);
    renderArea();
  });
}

function renderItems() {
  const list = document.querySelector('#items');
  const items = data[activeArea];
  if (!items.length) {
    addEmpty(list, 'Ainda não há nada por aqui. Que tal começar agora?');
    return;
  }
  [...items].reverse().forEach(item => {
    const row = document.createElement('div');
    row.className = `office-item${item.done ? ' office-done' : ''}`;
    if (activeArea !== 'financas') {
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = Boolean(item.done);
      checkbox.setAttribute('aria-label', `Marcar ${item.title} como concluído`);
      checkbox.addEventListener('change', () => {
        item.done = checkbox.checked;
        saveData();
        updateProgress();
        renderArea();
      });
      row.append(checkbox);
    }
    const main = document.createElement('div');
    main.className = 'office-item-info';
    const title = document.createElement('strong');
    title.textContent = item.title;
    const detail = document.createElement('small');
    if (activeArea === 'treinos') detail.textContent = [item.details, item.day].filter(Boolean).join(' · ') || 'Treino';
    if (activeArea === 'estudos') detail.textContent = [item.category, formatDate(item.date)].filter(Boolean).join(' · ');
    if (activeArea === 'financas') detail.textContent = [item.type === 'entrada' ? 'Entrada' : 'Saída', money(item.amount), formatDate(item.date)].filter(Boolean).join(' · ');
    main.append(title, detail);
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'office-remove';
    remove.textContent = '×';
    remove.setAttribute('aria-label', `Excluir ${item.title}`);
    remove.addEventListener('click', () => {
      data[activeArea] = data[activeArea].filter(entry => entry !== item);
      saveData();
      updateProgress();
      renderArea();
    });
    row.append(main, remove);
    list.append(row);
  });
}

function addItem(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const values = new FormData(form);
  const title = values.get('title').trim();
  if (!title) {
    form.elements.title.setCustomValidity('Digite um nome.');
    form.elements.title.reportValidity();
    form.elements.title.addEventListener('input', () => form.elements.title.setCustomValidity(''), { once: true });
    return;
  }
  const item = { title };
  if (activeArea === 'treinos') {
    item.details = values.get('details').trim();
    item.day = values.get('day').trim();
    item.done = false;
  } else if (activeArea === 'estudos') {
    item.category = values.get('category');
    item.date = values.get('date');
    item.done = false;
  } else {
    item.type = values.get('type');
    item.amount = Number(values.get('amount'));
    item.date = values.get('date');
    if (!Number.isFinite(item.amount) || item.amount <= 0) {
      notify('Informe um valor maior que zero.');
      return;
    }
  }
  data[activeArea].push(item);
  saveData();
  updateProgress();
  renderArea();
}

document.querySelector('#close-dialog').addEventListener('click', () => dialog.close());
document.querySelector('#back-button').addEventListener('click', () => dialog.close());
dialog.addEventListener('close', () => document.body.append(notice));
document.querySelector('#avatar-dialog').addEventListener('close', () => document.body.append(notice));
loadData();
updateProgress();
