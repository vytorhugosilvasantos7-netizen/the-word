let officeSection = 'visao';
const officeSections = {
  visao: ['Visão geral', 'Seu espaço para tirar ideias do papel.'],
  projetos: ['Projetos', 'Acompanhe seus projetos do planejamento à entrega.'],
  tarefas: ['Tarefas', 'Organize o que precisa ser feito.'],
  portfolio: ['Portfólio', 'Reúna os projetos que você quer mostrar.'],
  certificados: ['Certificados', 'Planeje e acompanhe suas certificações.'],
  financas: ['Finanças', 'Acompanhe as entradas e saídas do seu negócio.']
};
const projectStatuses = { planejado: 'Planejado', andamento: 'Em andamento', concluido: 'Concluído' };
const certificateStatuses = { planejado: 'Planejado', andamento: 'Em andamento', concluido: 'Concluído' };

function officeTotals() {
  const income = data.financas.filter(item => item.type === 'entrada').reduce((sum, item) => sum + item.amount, 0);
  const expense = data.financas.filter(item => item.type === 'saida').reduce((sum, item) => sum + item.amount, 0);
  return { income, expense, balance: income - expense };
}

function renderOffice() {
  const [title, description] = officeSections[officeSection];
  content.innerHTML = `<div class="office">
    <aside class="office-sidebar"><div class="office-brand"><span>✳</span><div><strong>NOIRVERSE</strong><small>WORKSPACE / 03</small></div></div>
      <div class="office-menu-label">SEU ESCRITÓRIO</div><nav class="office-nav" aria-label="Navegação do escritório">
        <button data-section="visao"><span>◫</span> Visão geral</button>
        <button data-section="projetos"><span>◈</span> Projetos</button>
        <button data-section="tarefas"><span>☑</span> Tarefas</button>
        <button data-section="portfolio"><span>▣</span> Portfólio</button>
        <button data-section="certificados"><span>✧</span> Certificados</button>
        <button data-section="financas"><span>＄</span> Finanças</button>
      </nav><div class="office-sidebar-bottom"><span>✦</span><p>Grandes ideias começam<br>com um primeiro passo.</p></div>
      <button id="office-exit" class="office-exit">← &nbsp; Voltar ao mundo</button>
    </aside>
    <div class="office-main"><header class="office-top"><span>SEU ESPAÇO / <b id="office-breadcrumb"></b></span><span class="office-save">● &nbsp; SALVO NESTE NAVEGADOR</span><button id="office-close" aria-label="Sair do escritório">✕</button></header>
      <div class="office-page"><div class="office-heading"><div><span class="office-eyebrow">SEU MUNDO. SEUS PLANOS. ✦</span><h2 id="office-title"></h2><p id="office-description"></p></div><div class="office-heading-icon">✳</div></div>
        <div id="office-panel"></div>
      </div>
    </div>
  </div>`;
  document.querySelector('#office-breadcrumb').textContent = title.toUpperCase();
  document.querySelector('#office-title').textContent = title;
  document.querySelector('#office-description').textContent = description;
  document.querySelectorAll('[data-section]').forEach(button => {
    if (button.dataset.section === officeSection) {
      button.classList.add('selected');
      button.setAttribute('aria-current', 'page');
    }
    button.addEventListener('click', () => {
      officeSection = button.dataset.section;
      renderOffice();
    });
  });
  document.querySelector('#office-exit').addEventListener('click', () => dialog.close());
  document.querySelector('#office-close').addEventListener('click', () => dialog.close());
  const panel = document.querySelector('#office-panel');
  if (officeSection === 'visao') renderOfficeOverview(panel);
  if (officeSection === 'projetos') renderProjects(panel, false);
  if (officeSection === 'portfolio') renderProjects(panel, true);
  if (officeSection === 'tarefas') renderOfficeTasks(panel);
  if (officeSection === 'certificados') renderCertificates(panel);
  if (officeSection === 'financas') renderOfficeFinance(panel);
}

function officeCard(label, value, note, color) {
  const card = document.createElement('div');
  card.className = `office-stat ${color}`;
  const heading = document.createElement('span');
  heading.textContent = label;
  const number = document.createElement('strong');
  number.textContent = value;
  const caption = document.createElement('small');
  caption.textContent = note;
  card.append(heading, number, caption);
  return card;
}

function renderOfficeOverview(panel) {
  const totals = officeTotals();
  const active = data.projetos.filter(item => item.status === 'andamento').length;
  const complete = data.projetos.filter(item => item.status === 'concluido').length;
  const pending = data.tarefas.filter(item => !item.done).length;
  panel.innerHTML = `<div class="office-stats" id="office-stats"></div>
    <div class="office-overview-grid"><section class="office-box office-welcome"><span class="office-box-kicker">SEU PRÓXIMO PASSO</span><h3>Ideias grandes.<br><em>Pequenos passos.</em></h3><p>Organize seus projetos, acompanhe suas conquistas e construa o seu futuro no seu ritmo.</p><button class="office-action" data-go="projetos">VER MEUS PROJETOS ↗</button><div class="welcome-orbit">✳</div></section>
    <section class="office-box"><div class="office-box-heading"><div><span class="office-box-kicker">EM FOCO</span><h3>Próximas tarefas</h3></div><button class="office-text-button" data-go="tarefas">Ver todas ↗</button></div><div id="overview-tasks" class="office-list"></div></section></div>`;
  const stats = panel.querySelector('#office-stats');
  stats.append(
    officeCard('PROJETOS EM ANDAMENTO', String(active).padStart(2, '0'), `${complete} concluído(s)`, 'stat-blue'),
    officeCard('TAREFAS PENDENTES', String(pending).padStart(2, '0'), 'Um passo de cada vez', 'stat-peach'),
    officeCard('CERTIFICADOS', String(data.certificados.length).padStart(2, '0'), 'Planejados e conquistados', 'stat-lavender'),
    officeCard('SALDO', money(totals.balance), 'Entradas menos saídas', 'stat-mint')
  );
  const list = panel.querySelector('#overview-tasks');
  const tasks = data.tarefas.filter(item => !item.done).slice(0, 4);
  if (!tasks.length) addEmpty(list, 'Nenhuma tarefa pendente por aqui.');
  tasks.forEach(item => {
    const row = document.createElement('div');
    row.className = 'office-mini-task';
    const dot = document.createElement('span');
    dot.textContent = '○';
    const text = document.createElement('strong');
    text.textContent = item.title;
    const date = document.createElement('small');
    date.textContent = item.date ? formatDate(item.date) : 'SEM DATA';
    row.append(dot, text, date);
    list.append(row);
  });
  panel.querySelectorAll('[data-go]').forEach(button => button.addEventListener('click', () => {
    officeSection = button.dataset.go;
    renderOffice();
  }));
}

function addEmpty(container, message) {
  const empty = document.createElement('div');
  empty.className = 'office-empty';
  empty.textContent = message;
  container.append(empty);
}

function createOfficeItem(title, detail) {
  const row = document.createElement('article');
  row.className = 'office-item';
  const info = document.createElement('div');
  info.className = 'office-item-info';
  const name = document.createElement('strong');
  name.textContent = title;
  const meta = document.createElement('small');
  meta.textContent = detail;
  info.append(name, meta);
  row.append(info);
  return row;
}

function removeButton(collection, item) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'office-remove';
  button.textContent = '×';
  button.setAttribute('aria-label', `Excluir ${item.title}`);
  button.addEventListener('click', () => {
    data[collection] = data[collection].filter(entry => entry !== item);
    saveData();
    updateProgress();
    renderOffice();
  });
  return button;
}

function statusSelect(item, statuses) {
  const select = document.createElement('select');
  select.className = 'office-status';
  select.setAttribute('aria-label', `Status de ${item.title}`);
  for (const [value, label] of Object.entries(statuses)) select.add(new Option(label, value));
  select.value = item.status;
  select.addEventListener('change', () => {
    item.status = select.value;
    saveData();
    renderOffice();
  });
  return select;
}

function validLink(value) {
  if (!value) return true;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}

function showLinkError(input) {
  input.setCustomValidity('Informe um link completo começando com https:// ou http://.');
  input.reportValidity();
  input.addEventListener('input', () => input.setCustomValidity(''), { once: true });
}

function renderProjects(panel, portfolio) {
  if (portfolio) {
    panel.innerHTML = `<div class="office-section-head"><div><h3>Projetos em destaque</h3><p>Marque projetos em “Projetos” para organizá-los aqui. Seus links ficam disponíveis neste navegador.</p></div><button class="office-action" id="manage-projects">GERENCIAR PROJETOS ↗</button></div><div id="office-items" class="office-items"></div>`;
    panel.querySelector('#manage-projects').addEventListener('click', () => { officeSection = 'projetos'; renderOffice(); });
  } else {
    panel.innerHTML = `<div class="office-content-grid"><section class="office-box"><span class="office-box-kicker">NOVA IDEIA</span><h3>Adicionar projeto</h3><form id="office-form" class="office-form">
      <label>Nome do projeto<input name="title" maxlength="100" placeholder="Ex.: Site da minha empresa" required></label>
      <label>Descrição<input name="description" maxlength="160" placeholder="Sobre o que é este projeto?"></label>
      <label>Status<select name="status"><option value="planejado">Planejado</option><option value="andamento">Em andamento</option><option value="concluido">Concluído</option></select></label>
      <label>Link do projeto <span>(opcional)</span><input name="link" type="url" placeholder="https://..."></label>
      <label class="office-check"><input name="featured" type="checkbox"> Mostrar no portfólio</label>
      <button class="office-action" type="submit">+ ADICIONAR PROJETO</button></form></section>
      <section class="office-box"><div class="office-box-heading"><div><span class="office-box-kicker">SEUS PLANOS</span><h3>Meus projetos</h3></div><span class="office-count">${data.projetos.length}</span></div><div id="office-items" class="office-items"></div></section></div>`;
    panel.querySelector('#office-form').addEventListener('submit', event => {
      event.preventDefault();
      const form = event.currentTarget;
      const values = new FormData(form);
      const title = values.get('title').trim();
      if (!title) return invalidTitle(form);
      const link = values.get('link').trim();
      if (!validLink(link)) return showLinkError(form.elements.link);
      data.projetos.push({ title, description: values.get('description').trim(), status: values.get('status'), link, featured: values.has('featured') });
      saveData();
      renderOffice();
    });
  }
  const list = panel.querySelector('#office-items');
  const items = portfolio ? data.projetos.filter(item => item.featured) : data.projetos;
  if (!items.length) addEmpty(list, portfolio ? 'Nenhum projeto em destaque. Marque um projeto para adicioná-lo ao portfólio.' : 'Seus projetos vão aparecer aqui.');
  [...items].reverse().forEach(item => {
    const row = createOfficeItem(item.title, item.description || 'Sem descrição');
    const actions = document.createElement('div');
    actions.className = 'office-item-actions';
    if (portfolio) {
      const status = document.createElement('span');
      status.className = 'office-tag';
      status.textContent = projectStatuses[item.status];
      actions.append(status);
      if (item.link && validLink(item.link)) {
        const link = document.createElement('a');
        link.className = 'office-link';
        link.href = item.link;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.textContent = 'Abrir projeto ↗';
        actions.append(link);
      } else {
        const noLink = document.createElement('small');
        noLink.textContent = 'Sem link';
        actions.append(noLink);
      }
    } else {
      actions.append(statusSelect(item, projectStatuses));
      const featured = document.createElement('label');
      featured.className = 'office-check';
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = Boolean(item.featured);
      checkbox.setAttribute('aria-label', `Mostrar ${item.title} no portfólio`);
      checkbox.addEventListener('change', () => { item.featured = checkbox.checked; saveData(); });
      featured.append(checkbox, document.createTextNode(' Portfólio'));
      actions.append(featured, removeButton('projetos', item));
      const linkLabel = document.createElement('label');
      linkLabel.className = 'office-edit-link';
      linkLabel.textContent = 'Link do projeto';
      const linkInput = document.createElement('input');
      linkInput.type = 'url';
      linkInput.placeholder = 'https://...';
      linkInput.value = item.link || '';
      linkInput.setAttribute('aria-label', `Link de ${item.title}`);
      linkInput.addEventListener('change', () => {
        const link = linkInput.value.trim();
        if (!validLink(link)) { showLinkError(linkInput); return; }
        linkInput.setCustomValidity('');
        item.link = link;
        saveData();
      });
      linkLabel.append(linkInput);
      row.append(linkLabel);
    }
    row.append(actions);
    list.append(row);
  });
}

function invalidTitle(form) {
  const input = form.elements.title;
  input.setCustomValidity('Digite um nome.');
  input.reportValidity();
  input.addEventListener('input', () => input.setCustomValidity(''), { once: true });
}

function renderOfficeTasks(panel) {
  panel.innerHTML = `<div class="office-content-grid"><section class="office-box"><span class="office-box-kicker">PRÓXIMO PASSO</span><h3>Nova tarefa</h3>
    <form id="office-form" class="office-form"><label>O que precisa ser feito?<input name="title" maxlength="100" placeholder="Ex.: Preparar apresentação" required></label>
    <label>Prazo <span>(opcional)</span><input name="date" type="date"></label><button class="office-action" type="submit">+ ADICIONAR TAREFA</button></form></section>
    <section class="office-box"><div class="office-box-heading"><div><span class="office-box-kicker">UM PASSO DE CADA VEZ</span><h3>Minhas tarefas</h3></div><span class="office-count">${data.tarefas.filter(item => !item.done).length} pendentes</span></div><div id="office-items" class="office-items"></div></section></div>`;
  panel.querySelector('#office-form').addEventListener('submit', event => {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    const title = values.get('title').trim();
    if (!title) return invalidTitle(form);
    data.tarefas.push({ title, date: values.get('date'), done: false });
    saveData();
    updateProgress();
    renderOffice();
  });
  const list = panel.querySelector('#office-items');
  if (!data.tarefas.length) addEmpty(list, 'Adicione uma tarefa para começar.');
  [...data.tarefas].reverse().forEach(item => {
    const row = createOfficeItem(item.title, item.date ? `Prazo: ${formatDate(item.date)}` : 'Sem prazo');
    if (item.done) row.classList.add('office-done');
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = Boolean(item.done);
    checkbox.setAttribute('aria-label', `Marcar ${item.title} como concluída`);
    checkbox.addEventListener('change', () => { item.done = checkbox.checked; saveData(); updateProgress(); renderOffice(); });
    row.prepend(checkbox);
    row.append(removeButton('tarefas', item));
    list.append(row);
  });
}

function renderCertificates(panel) {
  panel.innerHTML = `<div class="office-content-grid"><section class="office-box"><span class="office-box-kicker">SEU DESENVOLVIMENTO</span><h3>Adicionar certificado</h3>
    <form id="office-form" class="office-form"><label>Nome<input name="title" maxlength="100" placeholder="Ex.: Certificação em design" required></label>
    <label>Instituição <span>(opcional)</span><input name="institution" maxlength="100" placeholder="Ex.: Nome da plataforma"></label>
    <label>Status<select name="status"><option value="planejado">Planejado</option><option value="andamento">Em andamento</option><option value="concluido">Concluído</option></select></label>
    <label>Data <span>(opcional)</span><input name="date" type="date"></label><button class="office-action" type="submit">+ ADICIONAR CERTIFICADO</button></form></section>
    <section class="office-box"><div class="office-box-heading"><div><span class="office-box-kicker">SUA JORNADA</span><h3>Meus certificados</h3></div><span class="office-count">${data.certificados.length}</span></div><div id="office-items" class="office-items"></div></section></div>`;
  panel.querySelector('#office-form').addEventListener('submit', event => {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    const title = values.get('title').trim();
    if (!title) return invalidTitle(form);
    data.certificados.push({ title, institution: values.get('institution').trim(), status: values.get('status'), date: values.get('date') });
    saveData();
    renderOffice();
  });
  const list = panel.querySelector('#office-items');
  if (!data.certificados.length) addEmpty(list, 'Suas certificações vão aparecer aqui.');
  [...data.certificados].reverse().forEach(item => {
    const row = createOfficeItem(item.title, [item.institution, formatDate(item.date)].filter(Boolean).join(' · ') || 'Sem detalhes');
    const actions = document.createElement('div');
    actions.className = 'office-item-actions';
    actions.append(statusSelect(item, certificateStatuses), removeButton('certificados', item));
    row.append(actions);
    list.append(row);
  });
}

function renderOfficeFinance(panel) {
  const totals = officeTotals();
  panel.innerHTML = `<div class="office-stats finance-stats" id="office-stats"></div><div class="office-content-grid"><section class="office-box"><span class="office-box-kicker">SEU CONTROLE</span><h3>Nova movimentação</h3>
    <form id="office-form" class="office-form"><label>Descrição<input name="title" maxlength="100" placeholder="Ex.: Venda ou ferramenta" required></label>
    <label>Tipo<select name="type"><option value="entrada">Entrada</option><option value="saida">Saída</option></select></label>
    <label>Valor em R$<input name="amount" type="number" min="0.01" step="0.01" placeholder="0,00" required></label>
    <label>Data <span>(opcional)</span><input name="date" type="date"></label><button class="office-action" type="submit">+ ADICIONAR MOVIMENTAÇÃO</button></form></section>
    <section class="office-box"><div class="office-box-heading"><div><span class="office-box-kicker">HISTÓRICO</span><h3>Movimentações</h3></div><span class="office-count">${data.financas.length}</span></div><div id="office-items" class="office-items"></div></section></div>`;
  panel.querySelector('#office-stats').append(
    officeCard('ENTRADAS', money(totals.income), 'Total recebido', 'stat-mint'),
    officeCard('SAÍDAS', money(totals.expense), 'Total registrado', 'stat-peach'),
    officeCard('SALDO', money(totals.balance), 'Entradas menos saídas', 'stat-blue')
  );
  panel.querySelector('#office-form').addEventListener('submit', event => {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    const title = values.get('title').trim();
    if (!title) return invalidTitle(form);
    const amount = Number(values.get('amount'));
    if (!Number.isFinite(amount) || amount <= 0) { notify('Informe um valor maior que zero.'); return; }
    data.financas.push({ title, amount, type: values.get('type'), date: values.get('date') });
    saveData();
    renderOffice();
  });
  const list = panel.querySelector('#office-items');
  if (!data.financas.length) addEmpty(list, 'Suas movimentações vão aparecer aqui.');
  [...data.financas].reverse().forEach(item => {
    const row = createOfficeItem(item.title, [item.type === 'entrada' ? 'Entrada' : 'Saída', formatDate(item.date)].filter(Boolean).join(' · '));
    const amount = document.createElement('strong');
    amount.className = item.type === 'entrada' ? 'office-income' : 'office-expense';
    amount.textContent = `${item.type === 'entrada' ? '+' : '−'} ${money(item.amount)}`;
    row.append(amount, removeButton('financas', item));
    list.append(row);
  });
}
