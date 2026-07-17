import { loadData } from './data-loader.js';
import { initTheme } from './theme.js';
import { initHomeView, resizeHomeMap } from './home-view.js';
import { initWardView, openWard, resizeWardMap } from './ward-view.js';
import { initMethodologyView } from './methodology-view.js';
import { initVoterFaqView } from './voter-faq-view.js';
import { initFooter, setFooterView, setFooterWard } from './footer.js';
import { initBackButton, setBackButtonVisible } from './back-button.js';

let currentView = 'home';
const viewStack = [];

function showView(name) {
  document.querySelectorAll('.view').forEach(el => el.classList.remove('view--active'));
  document.getElementById(`view-${name}`).classList.add('view--active');
  currentView = name;
  window.scrollTo(0, 0);

  if (name === 'home') resizeHomeMap();
  if (name === 'ward') resizeWardMap();
  setFooterView(name);
  setBackButtonVisible(name !== 'home');

  const fab = document.getElementById('voterFaqFab');
  if (fab) fab.hidden = name === 'voter-faq';
}

function navigateTo(name) {
  if (name === currentView) return;
  viewStack.push(currentView);
  showView(name);
}

function goBack() {
  showView(viewStack.pop() || 'home');
}

async function boot() {
  const loadingIndicator = document.getElementById('loadingIndicator');
  initTheme();

  let data;
  try {
    data = await loadData();
  } catch (err) {
    loadingIndicator.innerHTML = `<p>Could not load ward data. Please refresh the page.</p>`;
    throw err;
  }

  const { W, meta } = data;

  const handleOpenWard = (uid) => {
    openWard(uid, { onOpenWard: handleOpenWard });
    setFooterWard(uid, W[uid].ward_name);
    navigateTo('ward');
  };

  initHomeView({ W, meta }, { onOpenWard: handleOpenWard });

  initWardView({ W });

  initMethodologyView({ meta });

  initVoterFaqView();

  initFooter({ onMethodology: () => navigateTo('methodology') });

  initBackButton(goBack);

  const voterFaqFab = document.getElementById('voterFaqFab');
  voterFaqFab.addEventListener('click', (e) => {
    e.preventDefault();
    navigateTo('voter-faq');
  });

  loadingIndicator.setAttribute('hidden', '');

  const hashMatch = location.hash.match(/^#ward=(.+)$/);
  if (hashMatch && W[hashMatch[1]]) {
    handleOpenWard(hashMatch[1]);
  } else {
    showView('home');
  }
}

boot();
