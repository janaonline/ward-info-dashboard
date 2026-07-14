import { esc } from './format.js';

// Confirmed social URLs (Jul 2026).
const SOCIAL_LINKS = {
  janaagraha: {
    youtube: 'https://www.youtube.com/janaagraha',
    linkedin: 'https://www.linkedin.com/company/janaagraha/',
    x: 'https://x.com/Janaagraha1',
    instagram: 'https://www.instagram.com/janaagraha/?hl=en',
    facebook: 'https://www.facebook.com/janaagraha',
  },
  oorvani: {
    linkedin: 'https://www.linkedin.com/company/oorvani-foundation/',
    x: 'https://x.com/oorvani',
  },
};

const ORG_LABELS = { janaagraha: 'Janaagraha', oorvani: 'Oorvani Foundation' };
const NETWORK_LABELS = {
  youtube: 'YouTube',
  linkedin: 'LinkedIn',
  x: 'X (formerly Twitter)',
  instagram: 'Instagram',
  facebook: 'Facebook',
};

const SVG_OPEN = '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">';

const METHODOLOGY_ICON = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M7 3h7l4 4v14H7z"/><path d="M14 3v4h4"/><path d="M9 12h6M9 15.5h6M9 8.5h3"/></svg>';

const WHATSAPP_ICON = `${SVG_OPEN}<path d="M12 2a10 10 0 0 0-8.5 15.2L2 22l4.9-1.5A10 10 0 1 0 12 2zm0 18.2c-1.6 0-3.1-.4-4.4-1.2l-.3-.2-3 .9.9-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.4-.7-1.6-.8-.2-.1-.4-.1-.6.1-.2.2-.6.8-.8 1-.1.2-.3.2-.5.1-.2-.1-1-.4-1.9-1.2-.7-.6-1.2-1.4-1.3-1.6-.1-.2 0-.4.1-.5l.4-.5c.1-.1.2-.3.2-.4.1-.2 0-.3 0-.4-.1-.1-.6-1.4-.8-1.9-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.4.1-.6.3-.2.2-.8.8-.8 1.9 0 1.1.8 2.2.9 2.4.1.2 1.6 2.4 3.8 3.4.5.2.9.4 1.3.5.5.2 1 .1 1.4.1.4-.1 1.4-.6 1.6-1.1.2-.5.2-1 .1-1.1 0-.1-.2-.2-.4-.3z"/></svg>`;

const COPY_ICON = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1"/></svg>';

const SOCIAL_ICONS = {
  youtube: `${SVG_OPEN}<path d="M21.6 7.2a2.7 2.7 0 0 0-1.9-1.9C18 4.8 12 4.8 12 4.8s-6 0-7.7.5a2.7 2.7 0 0 0-1.9 1.9A28 28 0 0 0 2 12a28 28 0 0 0 .4 4.8 2.7 2.7 0 0 0 1.9 1.9c1.7.5 7.7.5 7.7.5s6 0 7.7-.5a2.7 2.7 0 0 0 1.9-1.9A28 28 0 0 0 22 12a28 28 0 0 0-.4-4.8zM10 15.3V8.7l5.6 3.3z"/></svg>`,
  linkedin: `${SVG_OPEN}<path d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zM3 9h4v12H3zm7 0h3.8v1.8h.05c.53-.98 1.83-2 3.77-2 4.03 0 4.78 2.5 4.78 5.75V21h-4v-5.6c0-1.34-.02-3.06-1.87-3.06-1.87 0-2.16 1.46-2.16 2.97V21h-4z"/></svg>`,
  x: `${SVG_OPEN}<path d="M17.5 3h3l-6.6 7.55L21.5 21h-6.1l-4.8-6.28L4.9 21H1.9l7.06-8.07L2 3h6.24l4.34 5.74L17.5 3zm-1.07 16.2h1.66L7.66 4.7H5.88z"/></svg>`,
  instagram: `${SVG_OPEN}<path d="M12 2c2.7 0 3.06.01 4.12.06 1.06.05 1.79.22 2.43.47a4.9 4.9 0 0 1 1.77 1.15 4.9 4.9 0 0 1 1.15 1.77c.25.64.42 1.37.47 2.43C21.99 8.94 22 9.3 22 12s-.01 3.06-.06 4.12c-.05 1.06-.22 1.79-.47 2.43a4.9 4.9 0 0 1-1.15 1.77 4.9 4.9 0 0 1-1.77 1.15c-.64.25-1.37.42-2.43.47C15.06 21.99 14.7 22 12 22s-3.06-.01-4.12-.06c-1.06-.05-1.79-.22-2.43-.47a4.9 4.9 0 0 1-1.77-1.15 4.9 4.9 0 0 1-1.15-1.77c-.25-.64-.42-1.37-.47-2.43C2.01 15.06 2 14.7 2 12s.01-3.06.06-4.12c.05-1.06.22-1.79.47-2.43a4.9 4.9 0 0 1 1.15-1.77A4.9 4.9 0 0 1 5.45 2.53c.64-.25 1.37-.42 2.43-.47C8.94 2.01 9.3 2 12 2zm0 5a5 5 0 1 0 0 10 5 5 0 0 0 0-10zm0 8.2a3.2 3.2 0 1 1 0-6.4 3.2 3.2 0 0 1 0 6.4zm5.2-8.4a1.17 1.17 0 1 0 0-2.33 1.17 1.17 0 0 0 0 2.33z"/></svg>`,
  facebook: `${SVG_OPEN}<path d="M13.5 22v-8.4h2.8l.42-3.26h-3.22V8.24c0-.95.26-1.59 1.62-1.59h1.73V3.7A23 23 0 0 0 14.3 3.5c-2.5 0-4.2 1.53-4.2 4.33v2.5H7.28v3.27h2.8V22z"/></svg>`,
};

function socialRow(org) {
  const links = SOCIAL_LINKS[org];
  const order = org === 'janaagraha'
    ? ['youtube', 'linkedin', 'x', 'instagram', 'facebook']
    : ['linkedin', 'x'];
  return order
    .filter(k => links[k])
    .map(k => `<a class="footer-social-link" href="${esc(links[k])}" target="_blank" rel="noopener" aria-label="${ORG_LABELS[org]} on ${NETWORK_LABELS[k]}">${SOCIAL_ICONS[k]}</a>`)
    .join('');
}

function logoBlock(name, alt) {
  return `
    <span class="footer-org-badge">
      <img src="public/logos/${name}-logo.png" alt="${esc(alt)}" class="footer-logo"
           onerror="this.style.display='none';this.nextElementSibling.style.display='inline'">
      <span class="footer-org-fallback">${esc(alt)}</span>
    </span>
  `;
}

let onMethodologyRef = null;
let currentUid = null;
let currentWardName = null;

function shareHref() {
  if (!currentUid) return '#';
  const shareText = encodeURIComponent(`Check out ward info for ${currentWardName} on Nimma Ward, Nimma Vote: `);
  const shareUrl = encodeURIComponent(`${location.origin}${location.pathname}#ward=${currentUid}`);
  return `https://wa.me/?text=${shareText}${shareUrl}`;
}

function copyUrl() {
  return `${location.origin}${location.pathname}#ward=${currentUid}`;
}

export function setFooterView(viewName) {
  const shareRow = document.getElementById('footerShare');
  if (shareRow) shareRow.hidden = viewName !== 'ward';
}

export function setFooterWard(uid, wardName) {
  currentUid = uid;
  currentWardName = wardName;
  const whatsapp = document.getElementById('footerWhatsapp');
  if (whatsapp) whatsapp.href = shareHref();
}

export function initFooter({ onMethodology }) {
  onMethodologyRef = onMethodology;
  const container = document.getElementById('siteFooter');
  if (!container) return;

  container.innerHTML = `
    <div class="container footer-inner">
      <div class="footer-row footer-utility">
        <a href="#methodology" id="methodologyLink" class="footer-methodology">
          <span class="footer-methodology-icon" aria-hidden="true">${METHODOLOGY_ICON}</span>
          <span class="footer-methodology-text">
            <span class="footer-methodology-title">Methodology</span>
            <span class="footer-methodology-desc">Learn how the data is collected and calculated <span aria-hidden="true">&rarr;</span></span>
          </span>
        </a>
        <div class="footer-share" id="footerShare" hidden>
          <span class="footer-share-label">Share this ward</span>
          <div class="footer-share-actions">
            <a class="btn btn-whatsapp btn-sm" id="footerWhatsapp" target="_blank" rel="noopener" href="#"><span aria-hidden="true">${WHATSAPP_ICON}</span>Share on WhatsApp</a>
            <button class="btn btn-secondary btn-sm" id="copyLinkBtn" type="button"><span aria-hidden="true">${COPY_ICON}</span><span class="btn-label">Copy link</span></button>
          </div>
        </div>
      </div>
      <div class="footer-row footer-attribution">
        <span class="footer-heart-line">Made with <span class="footer-heart" aria-hidden="true">&#10084;&#65039;</span> for Bengaluru by:</span>
        <div class="footer-orgs">
          <div class="footer-org-group">
            ${logoBlock('janaagraha', 'Janaagraha')}
            <div class="footer-org-social" role="group" aria-label="${ORG_LABELS.janaagraha} social links">
              ${socialRow('janaagraha')}
            </div>
          </div>
          <div class="footer-org-divider" aria-hidden="true"></div>
          <div class="footer-org-group">
            ${logoBlock('oorvani', 'Oorvani Foundation')}
            <div class="footer-org-social" role="group" aria-label="${ORG_LABELS.oorvani} social links">
              ${socialRow('oorvani')}
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  document.getElementById('methodologyLink').addEventListener('click', (e) => {
    e.preventDefault();
    onMethodologyRef();
  });

  const copyBtn = document.getElementById('copyLinkBtn');
  const copyBtnLabel = copyBtn.querySelector('.btn-label');
  copyBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(copyUrl()).then(() => {
      copyBtnLabel.textContent = 'Copied!';
      setTimeout(() => { copyBtnLabel.textContent = 'Copy link'; }, 1500);
    });
  });
}
