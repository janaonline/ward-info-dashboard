const NAV_ITEMS = [
  { view: 'home', label: 'Home' },
  { view: 'methodology', label: 'Methodology' },
  { view: 'voter-faq', label: 'Voter FAQs' },
];

const BACK_ICON = '<svg aria-hidden="true" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M11 18l-6-6 6-6"/></svg>';
const MENU_ICON = '<svg aria-hidden="true" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M3 12h18M3 18h18"/></svg>';

const VIEW_TITLES = {
  home: '',
  methodology: 'Methodology',
  'voter-faq': 'Voter FAQs',
  ward: '',
};

function navLinksHtml(extraClass = '') {
  return NAV_ITEMS.map(item => `<a href="#" class="${extraClass}" data-view="${item.view}">${item.label}</a>`).join('')
    + `<a href="https://opencity.in/" class="${extraClass}" target="_blank" rel="noopener">OpenCity</a>`;
}

export function initHeader({ onNavigate, onBack }) {
  const header = document.getElementById('siteHeader');
  header.innerHTML = `
    <div class="site-header-inner container">
      <div class="site-header-brand">
        <button type="button" class="site-header-back" id="headerBack" aria-label="Back" hidden>${BACK_ICON}</button>
        <a href="#" class="site-header-logo" id="headerLogo" data-view="home">
          <span class="site-header-logo-badge" aria-hidden="true">W</span> Ward Info
        </a>
        <span class="site-header-title" id="headerTitle" hidden></span>
      </div>
      <nav class="site-header-nav" id="headerNav" aria-label="Primary">${navLinksHtml()}</nav>
      <div class="site-header-actions">
        <button type="button" class="site-header-menu-btn" id="headerMenuBtn" aria-label="Menu" aria-expanded="false">${MENU_ICON}</button>
      </div>
    </div>
    <div class="site-header-mobile-menu" id="headerMobileMenu" hidden>${navLinksHtml()}</div>
  `;

  const backBtn = document.getElementById('headerBack');
  const menuBtn = document.getElementById('headerMenuBtn');
  const mobileMenu = document.getElementById('headerMobileMenu');

  backBtn.addEventListener('click', onBack);

  header.querySelectorAll('[data-view]').forEach(el => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      mobileMenu.hidden = true;
      menuBtn.setAttribute('aria-expanded', 'false');
      onNavigate(el.dataset.view);
    });
  });

  menuBtn.addEventListener('click', () => {
    const open = mobileMenu.hidden;
    mobileMenu.hidden = !open;
    menuBtn.setAttribute('aria-expanded', String(open));
  });
}

export function setHeaderState(view, title) {
  const backBtn = document.getElementById('headerBack');
  const logo = document.getElementById('headerLogo');
  const titleEl = document.getElementById('headerTitle');
  const isHome = view === 'home';

  backBtn.hidden = isHome;
  logo.hidden = !isHome;
  titleEl.hidden = isHome;
  titleEl.textContent = title || VIEW_TITLES[view] || '';

  document.querySelectorAll('#headerNav [data-view], #headerMobileMenu [data-view]').forEach(a => {
    a.classList.toggle('active', a.dataset.view === view);
  });

  document.getElementById('headerMobileMenu').hidden = true;
  document.getElementById('headerMenuBtn').setAttribute('aria-expanded', 'false');
}
