import { loadData } from './data-loader.js';
import { initHomeView, resizeHomeMap } from './home-view.js';
import { initWardView, openWard, resizeWardMap } from './ward-view.js';
import { initMethodologyView } from './methodology-view.js';
import { initVoterFaqView } from './voter-faq-view.js';
import { initFooter } from './footer.js';
import { initHeader, setHeaderState } from './header.js';
import { initAnalytics } from './analytics.js';

let currentView = 'home';
let currentWardName = '';
const viewStack = [];

function showView(name) {
  document.querySelectorAll('.view').forEach(el => el.classList.remove('view--active'));
  document.getElementById(`view-${name}`).classList.add('view--active');
  currentView = name;
  window.scrollTo(0, 0);

  if (name === 'home') resizeHomeMap();
  if (name === 'ward') resizeWardMap();
  setHeaderState(name, name === 'ward' ? currentWardName : '');

  // --- analytics: virtual pageview ---
  const wardSuffix = name === 'ward' && location.hash ? location.hash : '';
  window.dataLayer?.push({
    event: 'spa_page_view',
    page_location: location.origin + location.pathname + wardSuffix,
    page_path: `/${name}${wardSuffix}`,
    page_title: document.title,
  });
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

  let data;
  try {
    data = await loadData();
  } catch (err) {
    loadingIndicator.innerHTML = `<p>Could not load ward data. Please refresh the page.</p>`;
    throw err;
  }

  const { W, meta, benchmarks } = data;

  const handleOpenWard = (uid) => {
    currentWardName = W[uid].ward_name;
    openWard(uid, { onOpenWard: handleOpenWard, onNavigateHome: () => navigateTo('home') });
    navigateTo('ward');
  };

  initHeader({ onNavigate: navigateTo, onBack: goBack });

  initHomeView({ W, meta }, { onOpenWard: handleOpenWard, onMethodology: () => navigateTo('methodology') });

  initWardView({ W, benchmarks });

  initMethodologyView({ meta });

  initVoterFaqView();

  initFooter({ onNavigate: navigateTo, onMethodology: () => navigateTo('methodology') });

  initAnalytics({ getCurrentView: () => currentView });

  loadingIndicator.setAttribute('hidden', '');

  const hashMatch = location.hash.match(/^#ward=(.+)$/);
  if (hashMatch && W[hashMatch[1]]) {
    handleOpenWard(hashMatch[1]);
  } else {
    showView('home');
  }
}

boot();
