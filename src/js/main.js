import { loadData } from './data-loader.js';
import { initTheme } from './theme.js';
import { initHomeView, resizeHomeMap } from './home-view.js';
import { initFindView, resizeFindMap } from './find-view.js';
import { initWardView, openWard, resizeWardMap } from './ward-view.js';
import { initMethodologyView } from './methodology-view.js';

let currentView = 'home';
let previousView = 'home';

function showView(name) {
  document.querySelectorAll('.view').forEach(el => el.classList.remove('view--active'));
  document.getElementById(`view-${name}`).classList.add('view--active');
  previousView = currentView;
  currentView = name;

  if (name === 'home') resizeHomeMap();
  if (name === 'find') resizeFindMap();
  if (name === 'ward') resizeWardMap();
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

  const { W, nameIndex, A, meta } = data;

  const handleOpenWard = (uid) => {
    openWard(uid, { onOpenWard: handleOpenWard, onBack: () => showView(previousView === 'ward' ? 'find' : previousView) });
    showView('ward');
  };

  initHomeView({ W, meta }, {
    onFindWard: () => showView('find'),
    onOpenWard: handleOpenWard,
  });

  initFindView({ W, nameIndex }, { onOpenWard: handleOpenWard });

  initWardView({ W, A });

  initMethodologyView({ meta }, {
    getPreviousView: () => previousView,
    onBack: (target) => showView(target),
  });

  document.getElementById('methodologyLink').addEventListener('click', (e) => {
    e.preventDefault();
    showView('methodology');
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
