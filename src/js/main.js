import { loadData } from './data-loader.js';
import { initHomeView, resizeHomeMap } from './home-view.js';
import { initWardView, openWard, resizeWardMap } from './ward-view.js';
import { initMethodologyView } from './methodology-view.js';
import { initVoterFaqView } from './voter-faq-view.js';
import { initFooter } from './footer.js';
import { initHeader, setHeaderState } from './header.js';
import { initAnalytics, trackEvent, wardAnalyticsAttrs } from './analytics.js';

let currentView = 'home';
let currentWardName = '';
const viewStack = [];

// Per-view document title — also reused as the spa_page_view "page_title"
// analytics param below, so both the browser tab and analytics report an
// accurate, human-readable page name instead of the site's static default.
const PAGE_TITLES = {
  home: () => 'Know Your Ward',
  ward: () => currentWardName ? `${currentWardName} — Know Your Ward` : 'Know Your Ward',
  methodology: () => 'Methodology — Know Your Ward',
  'voter-faq': () => 'Voter FAQs — Know Your Ward',
};

function showView(name) {
  document.querySelectorAll('.view').forEach(el => el.classList.remove('view--active'));
  document.getElementById(`view-${name}`).classList.add('view--active');
  currentView = name;
  window.scrollTo(0, 0);

  if (name === 'home') resizeHomeMap();
  if (name === 'ward') resizeWardMap();
  setHeaderState(name, name === 'ward' ? currentWardName : '');

  const pageTitle = (PAGE_TITLES[name] || PAGE_TITLES.home)();
  document.title = pageTitle;

  // --- analytics: virtual pageview ---
  const wardSuffix = name === 'ward' && location.hash ? location.hash : '';
  trackEvent('spa_page_view', {
    page_location: location.origin + location.pathname + wardSuffix,
    page_path: `/${name}${wardSuffix}`,
    page_title: pageTitle,
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

  const handleOpenWard = (uid, source = 'other') => {
    const w = W[uid];
    currentWardName = w.ward_name;
    // --- analytics: canonical "how a ward was chosen" signal — every ward-
    // open flow (list, search, map, corporation pill, geolocation, direct
    // link) funnels through this one function, so this is the single choke
    // point for selection_source. ---
    trackEvent('ward_selected', { ...wardAnalyticsAttrs(w), selection_source: source });
    openWard(uid, { onOpenWard: handleOpenWard, onNavigateHome: () => navigateTo('home'), source });
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
    handleOpenWard(hashMatch[1], 'direct');
  } else {
    showView('home');
  }
}

boot();
