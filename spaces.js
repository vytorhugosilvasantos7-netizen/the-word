const spaceSections = { treinos: 'visao', estudos: 'visao' };
const spaceConfig = {
  treinos: {
    name: 'Treinos', workspace: 'TRAINING / 01', icon: '✚', menu: 'SEUS TREINOS',
    subtitle: 'Cuide de você, um treino de cada vez.',
    sections: { visao: ['Visão geral', 'Acompanhe sua rotina e suas conquistas.'], rotina: ['Minha rotina', 'Monte e acompanhe seus exercícios.'] }
  },
  estudos: {
    name: 'Estudos', workspace: 'STUDY / 02', icon: '✎', menu: 'SEUS ESTUDOS',
    subtitle: 'Todo conhecimento começa com um passo.',
    sections: { visao: ['Visão geral', 'Seu espaço para aprender e acompanhar seus planos.'], compromissos: ['Compromissos', 'Organize suas atividades, provas e estudos.'], calendario: ['Calendário', 'Visualize os dias com compromissos.'] }
  }
};

function renderPersonalSpace() {
  const config = spaceConfig[activeArea];
  const section = spaceSections[activeArea];
  const [title, description] = config.sections[section];
  const navigation = Object.entries(config.sections).map(([key, values]) =>
    `<button data-space-section="${key}"><span>${key === 'visao' ? '◫' : key === 'calendario' ? '▦' : '☑'}</span> ${values[0]}</button>`
  ).join('');
  content.innerHTML = `<div class="office personal-space ${activeArea}">
    <aside class="office-sidebar"><div class="office-brand"><span>${config.icon}</span><div><strong>NOIRVERSE</strong><small>${config.workspace}</small></div></div>
      <div class="office-menu-label">${config.menu}</div><nav class="office-nav" aria-label="Navegação de ${config.name}">${navigation}
        ${activeArea === 'estudos' ? '<a class="college-nav-link" href="https://novoportal.cruzeirodosul.edu.br/gfa/home" target="_blank" rel="noopener noreferrer"><span>↗</span> Entrar na faculdade</a>' : ''}</nav>
      <div class="office-sidebar-bottom"><span>✦</span><p>${config.subtitle}</p></div>
      <button id="space-exit" class="office-exit">← &nbsp; Voltar ao mundo</button></aside>
    <div class="office-main"><header class="office-top"><span>SEU ESPAÇO / <b>${title.toUpperCase()}</b></span><span class="office-save">● &nbsp; DADOS NESTE NAVEGADOR</span><button id="space-close" aria-label="Sair de ${config.name}">✕</button></header>
      <div class="office-page"><div class="office-heading"><div><span class="office-eyebrow">${config.menu} ✦</span><h2>${title}</h2><p>${description}</p></div><div class="office-heading-icon">${config.icon}</div></div>
        <div id="space-panel"></div></div></div></div>`;
  content.querySelectorAll('[data-space-section]').forEach(button => {
    if (button.dataset.spaceSection === section) {
      button.classList.add('selected');
      button.setAttribute('aria-current', 'page');
    }
    button.addEventListener('click', () => {
      spaceSections[activeArea] = button.dataset.spaceSection;
      renderArea();
    });
  });
  content.querySelector('#space-exit').addEventListener('click', () => dialog.close());
  content.querySelector('#space-close').addEventListener('click', () => dialog.close());
  const panel = content.querySelector('#space-panel');
  if (section === 'visao') renderSpaceOverview(panel, config);
  else if (section === 'calendario') renderStudyCalendar(panel);
  else renderSpaceEntries(panel);
}

function renderSpaceOverview(panel, config) {
  const items = data[activeArea];
  const completed = items.filter(item => item.done).length;
  const pending = items.length - completed;
  panel.innerHTML = `<div class="office-stats" id="space-stats"></div>
    <div class="office-overview-grid"><section class="office-box office-welcome"><span class="office-box-kicker">SEU PRÓXIMO PASSO</span>
      <h3>${activeArea === 'treinos' ? 'Sua rotina.<br><em>Sua evolução.</em>' : 'Suas ideias.<br><em>Seu futuro.</em>'}</h3>
      <p>${config.subtitle} Organize seus planos e acompanhe cada conquista.</p>
      <button class="office-action" id="space-manage">${activeArea === 'treinos' ? 'ORGANIZAR TREINOS' : 'ORGANIZAR ESTUDOS'} ↗</button><div class="welcome-orbit">${config.icon}</div></section>
      <section class="office-box"><div class="office-box-heading"><div><span class="office-box-kicker">EM FOCO</span><h3>${activeArea === 'treinos' ? 'Exercícios pendentes' : 'Compromissos pendentes'}</h3></div><button class="office-text-button" id="space-view-all">Ver todos ↗</button></div><div id="space-pending" class="office-list"></div></section></div>`;
  if (activeArea === 'estudos') {
    panel.insertAdjacentHTML('beforeend', `<section class="office-box college-portal">
      <div><span class="office-box-kicker">SEU PORTAL ACADÊMICO</span><h3>Minha faculdade</h3><p>Acesse o portal da Cruzeiro do Sul em uma nova aba.</p></div>
      <a class="office-action" href="https://novoportal.cruzeirodosul.edu.br/gfa/home" target="_blank" rel="noopener noreferrer">ENTRAR NA FACULDADE ↗</a></section>`);
  }
  const stats = panel.querySelector('#space-stats');
  stats.append(
    officeCard('TOTAL', String(items.length).padStart(2, '0'), activeArea === 'treinos' ? 'Exercícios na rotina' : 'Compromissos registrados', 'stat-blue'),
    officeCard('PENDENTES', String(pending).padStart(2, '0'), 'Para fazer no seu ritmo', 'stat-peach'),
    officeCard('CONCLUÍDOS', String(completed).padStart(2, '0'), 'Suas conquistas', 'stat-mint'),
    officeCard('PROGRESSO', `${items.length ? Math.round(completed / items.length * 100) : 0}%`, 'Do total concluído', 'stat-lavender')
  );
  const list = panel.querySelector('#space-pending');
  const pendingItems = items.filter(item => !item.done).slice(0, 4);
  if (!pendingItems.length) addEmpty(list, 'Nenhum item pendente por aqui.');
  pendingItems.forEach(item => {
    const row = document.createElement('div');
    row.className = 'office-mini-task';
    const icon = document.createElement('span');
    icon.textContent = '○';
    const text = document.createElement('strong');
    text.textContent = item.title;
    const detail = document.createElement('small');
    detail.textContent = activeArea === 'treinos' ? (item.day || 'SEM DIA') : (formatDate(item.date) || 'SEM DATA');
    row.append(icon, text, detail);
    list.append(row);
  });
  const manage = () => {
    spaceSections[activeArea] = activeArea === 'treinos' ? 'rotina' : 'compromissos';
    renderArea();
  };
  panel.querySelector('#space-manage').addEventListener('click', manage);
  panel.querySelector('#space-view-all').addEventListener('click', manage);
}

function renderSpaceEntries(panel) {
  const training = activeArea === 'treinos';
  panel.innerHTML = `<div class="office-content-grid"><section class="office-box"><span class="office-box-kicker">${training ? 'SUA ROTINA' : 'SEU PRÓXIMO PASSO'}</span>
    <h3>${training ? 'Adicionar exercício' : 'Adicionar compromisso'}</h3>
    <form class="office-form" id="entry-form">
      <label>${training ? 'Exercício' : 'Compromisso'}<input name="title" aria-label="${training ? 'Nome do exercício' : 'Nome do compromisso'}" maxlength="100" placeholder="${training ? 'Ex.: Agachamento' : 'Ex.: Estudar matemática'}" required></label>
      ${training
        ? '<label>Séries e repetições<input name="details" aria-label="Séries e repetições" maxlength="100" placeholder="Ex.: 3 séries de 12"></label><label>Dia do treino<input name="day" aria-label="Dia do treino" maxlength="60" placeholder="Ex.: Segunda-feira"></label>'
        : '<label>Tipo de compromisso<select name="category" aria-label="Tipo de compromisso"><option>Atividade</option><option>Prova</option><option>Estudo</option></select></label><label>Data <span>(opcional)</span><input type="date" name="date" aria-label="Data do compromisso"></label>'}
      <button class="office-action" type="submit">${training ? '+ ADICIONAR TREINO' : '+ ADICIONAR COMPROMISSO'}</button>
    </form></section><section class="office-box"><div class="office-box-heading"><div><span class="office-box-kicker">${training ? 'SEUS EXERCÍCIOS' : 'SEUS PLANOS'}</span><h3>${training ? 'Minha rotina' : 'Meus compromissos'}</h3></div><span class="office-count">${data[activeArea].length}</span></div><div class="office-items" id="items"></div></section></div>`;
  panel.querySelector('#entry-form').addEventListener('submit', addItem);
  renderItems();
}

function renderStudyCalendar(panel) {
  panel.innerHTML = `<div class="office-content-grid"><section class="office-box"><div class="calendar-heading"><h3>Calendário</h3><div><button type="button" id="previous-month" aria-label="Mês anterior">‹</button><strong id="calendar-month"></strong><button type="button" id="next-month" aria-label="Próximo mês">›</button></div></div>
    <div class="calendar" id="calendar"></div><p class="calendar-legend"><span>●</span> Dia com compromisso</p></section>
    <section class="office-box"><div class="office-box-heading"><div><span class="office-box-kicker">SEUS PLANOS</span><h3>Meus compromissos</h3></div><span class="office-count">${data.estudos.length}</span></div><div id="items" class="office-items"></div></section></div>`;
  renderCalendar();
  renderItems();
}
