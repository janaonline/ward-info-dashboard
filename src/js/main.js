import { loadData } from './data-loader.js';
import { initTheme } from './theme.js';
import { initHomeView, resizeHomeMap } from './home-view.js';
import { initWardView, openWard, resizeWardMap } from './ward-view.js';
import { initMethodologyView } from './methodology-view.js';
import { initFooter, setFooterView, setFooterWard } from './footer.js';

let currentView = 'home';
const viewStack = [];

function showView(name) {
  document.querySelectorAll('.view').forEach(el => el.classList.remove('view--active'));
  document.getElementById(`view-${name}`).classList.add('view--active');
  currentView = name;

  if (name === 'home') resizeHomeMap();
  if (name === 'ward') resizeWardMap();
  setFooterView(name);
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

  const { W, A, meta } = data;

  const handleOpenWard = (uid) => {
    openWard(uid, { onOpenWard: handleOpenWard, onBack: goBack });
    setFooterWard(uid, W[uid].ward_name);
    navigateTo('ward');
  };

  initHomeView({ W, meta }, { onOpenWard: handleOpenWard });

  initWardView({ W, A });

  initMethodologyView({ meta }, { onBack: goBack });

  initFooter({ onMethodology: () => navigateTo('methodology') });

  loadingIndicator.setAttribute('hidden', '');

  const hashMatch = location.hash.match(/^#ward=(.+)$/);
  if (hashMatch && W[hashMatch[1]]) {
    handleOpenWard(hashMatch[1]);
  } else {
    showView('home');
  }
}

boot();
