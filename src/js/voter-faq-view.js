const CHEVRON = '<svg class="chevron" viewBox="0 0 8 12" fill="none" aria-hidden="true"><path d="M1 1l6 5-6 5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

// Every question/answer below is copied verbatim from Voter_FAQs.PDF — do not
// reword, shorten, or "fix" anything (e.g. "Specific Intensive Revision" is
// the source document's own wording, kept as-is).
const CATEGORIES = [
  {
    id: 'cat-1',
    nav: '1. About the GBA',
    heading: '1. About the GBA',
    items: [
      {
        q: 'What is the GBA?',
        a: `<p>The Greater Bengaluru Authority (GBA) is a metropolitan governance body established by the Greater Bengaluru Governance (GBG) Act, 2024 to replace and take over functions performed by the erstwhile Bruhat Bengaluru Mahanagara Palike (BBMP) like urban planning, financial strategy, etc. across the Greater Bengaluru Area. It collaborates with parastatal agencies like BESCOM, BWSSB, BMTC, etc. to address various issues and necessities across Bengaluru.</p>`,
      },
      {
        q: 'How is the GBA different from the BBMP?',
        a: `<p>The BBMP worked as Bengaluru's single local government unit, responsible for all kinda of tasks ranging from building roads to cleaning up parks. In an attempt to move toward better governance and service delivery, the erstwhile BBMP was split into five city corporations, the Bengaluru Central City Corporation (BCCC), the Bengaluru North City Corporation (BNCC), the Bengaluru East City Corporation (BECC), the Bengaluru South City Corporation (BSCC) and the Bengaluru West City Corporation (BWCC). Along with this, the GBA act also incorporated:</p>
        <ul>
          <li>Three-tier planning framework (Metropolitan, Municipal and Ward levels).</li>
          <li>Restructuring of internal boundaries from 225 to 369 wards.</li>
          <li>Improved accountability via more focused management of smaller corporations</li>
        </ul>`,
      },
    ],
  },
  {
    id: 'cat-2',
    nav: '2. Why elections matter',
    heading: '2. Why do these elections matter?',
    items: [
      {
        q: 'Why do these elections matter?',
        a: `<p>Bengaluru has operated without an elected civic government since 2015- that is, 11 years. It is about time that accountable leaders be established to ensure the city's needs are fulfilled immediately and efficiently. These elections will ensure that the citizens get a say in shaping how the city is governed again. The Election Commission is initiating these polls now to meet the strong public demand for direct neighborhood representation.</p>`,
      },
      {
        q: 'Why should I vote?',
        a: `<p>Your vote can directly influence the quality of life you experience in your ward! It ensures you gain a direct, accountable representative for daily needs, bringing governance to your doorstep.</p>`,
      },
    ],
  },
  {
    id: 'cat-3',
    nav: "3. Who you're voting for",
    heading: "3. Who am I voting for?",
    items: [
      {
        q: 'Who am I voting for?',
        a: `<p>In the upcoming elections, citizens will vote for their Ward Councillor (Corporator) only.</p>`,
      },
      {
        q: 'Who is a Ward Councillor (Corporator)?',
        a: `<p>A corporator represents your ward in the city council and oversees micro-local tasks- he/she will be your primary contact for neighbourhood issues like roads and streetlights. Corporators also play a role in planning ward budgets and prioritizing local projects, meaning that you, through your vote, will get a chance to determine what needs are met in your ward.</p>`,
      },
      {
        q: 'What is the difference between a corporator and a MLA?',
        a: `<p>Your Ward Councillor maps micro-local neighborhood needs and manages highly localized blocks. A Member of the Legislative Assembly (MLA) represents a larger Assembly Constituency at the state legislature level, focusing on broad lawmaking and macro state-wide budget management across multiple wards.</p>`,
      },
    ],
  },
  {
    id: 'cat-4',
    nav: '4. Candidates &amp; accountability',
    heading: '4. Candidates &amp; accountability',
    items: [
      {
        q: 'Who is running for the elections?',
        a: `<p>To find out who is contesting the elections in your ward, visit <a href="https://gba.karnataka.gov.in" target="_blank" rel="noopener">gba.karnataka.gov.in</a>, click on "GBA Election 2026", and search for your ward's candidate list.</p>`,
      },
      {
        q: "How do I assess the candidate's claims?",
        a: `<p>It is important to understand if your candidate's claims before the elections are grounded in reality or not. Firstly, it is important to realise the jurisdiction of your corporator. While promises of neighbourhood welfare and local garbage collection, etc. are well within your corporator's ability, any claims a candidate may make about state-level issues lie within the MLA's ambit. You can also:</p>
        <ul>
          <li>Check ward budgets to see if funds are available for proposed actions.</li>
          <li>Look into how the candidate has contributed/participated in Ward Committee meetings. (Check past works on <a href="https://gba.karnataka.gov.in" target="_blank" rel="noopener">gba.karnataka.gov.in</a> for ward budgets and project lists)</li>
          <li>Attend Ward Committee meetings, ask for Action Taken Reports (ATRs) to gauge whether promised works were fulfilled.</li>
          <li>Cross-reference city budget books and Detailed Project Reports (DPRs) on your corporation's website.</li>
          <li>Sites like <a href="https://ichangemycity.com" target="_blank" rel="noopener">IChangeMyCity.com</a> also provide neutral candidate profiles that help in comparison. You can even meet your candidates in person in "Meet Your Candidate" events hosted by Resident Welfare Associations (RWAs).</li>
        </ul>
        <p>Additionally, the GBA website officially lists all contestants, allowing you to make informed choices on casting your vote!</p>`,
      },
    ],
  },
  {
    id: 'cat-5',
    nav: '5. Ward &amp; polling station',
    heading: '5. Where am I voting?',
    items: [
      {
        q: 'Where am I voting?',
        a: `<p>Your ward determines who represents you (councillor), where you vote, and who you contact when something in your neighbourhood needs fixing. Because the shift from BBMP to GBA broke the old 1:1 mapping layout, you must lookup your records completely fresh:</p>
        <ul>
          <li>Log onto the dedicated portal: <a href="https://gba.karnataka.gov.in/electoral2026" target="_blank" rel="noopener">gba.karnataka.gov.in/electoral2026</a></li>
          <li>Use the "Search by Name" or "Draft Elector Roll" tool and enter your baseline EPIC (Voter ID) number.</li>
          <li>The framework will instantly render your specific assigned City Corporation, your updated Ward Number, and your exact Polling Station location.</li>
        </ul>`,
      },
      {
        q: 'Where can I access public data and engage with authorities?',
        a: `<p>All data sets concerning ward budgets, local taxes, public project sheets, and official Ward Committee proceeding books are public information. If online files are missing, you can formally contact the chief accounts officer or submit a digital application via the official RTI Online framework. Beyond election day, you can formally raise community problems by tracking and attending monthly Ward Committee Meetings, connecting with localized Resident Welfare Associations (RWAs), or utilizing municipal digital apps like Sahaaya 2.0 (Namma Bengaluru) and the automated Swachhata App to file and monitor grievances.</p>`,
      },
    ],
  },
  {
    id: 'cat-6',
    nav: '6. Key dates',
    heading: '6. When are the elections going to take place?',
    items: [
      {
        q: 'When are the elections going to take place?',
        a: `<p>Although specific scheduled dates are not available yet, the State Election Commission (SEC) formally publishes specific scheduled dates via local print dailies, mainstream news channels, and the official SEC digital notice board.</p>
        <p>For filing corrections, adding missing registrations, or shifting residential data points across updated ward boundaries, the critical ECI Claims and Objections window is strictly open from August 5 to September 4. (This is also the time for new voters to register!)</p>`,
      },
    ],
  },
  {
    id: 'cat-7',
    nav: '7. Registering to vote',
    heading: '7. How do I vote?',
    items: [
      {
        q: 'What is Specific Intensive Revision (SIR) and how does it work?',
        a: `<p>The SIR functions as an intensive nationwide verification drive conducted to optimize and cleanse the electoral roll by clearing out duplicate entries, non-citizens, and deceased records. It is being conducted by the Election Commission to ensure accuracy before future elections.</p>
        <ul>
          <li>In-person visit: A Booth Level Officer (BLO) will make up to three field visits to your home to distribute and verify enumeration forms. No physical documents are collected during this initial door-to-door phase. If nobody is home when the BLO visits, you can complete the Enumeration Form online via the ECI website. (<a href="https://voters.eci.gov.in" target="_blank" rel="noopener">voters.eci.gov.in</a>)</li>
          <li>The SIR only re-verifies existing voters on the 2025 electoral roll, it does not help new voters get added to the roll.</li>
        </ul>`,
      },
      {
        q: 'How do I modify my voter card details or register for the first time?',
        a: `<p>Your current voter identity card (EPIC number) remains active, but completing the mandatory SIR registration is required to vote in the GBA elections. To check if you are on the GBA electoral roll, you can click on "GBA Final Electoral List 2026" in the GBA website (<a href="https://gba.karnataka.gov.in" target="_blank" rel="noopener">gba.karnataka.gov.in</a>). All updates can be managed via <a href="https://voters.eci.gov.in" target="_blank" rel="noopener">voters.eci.gov.in</a> or the mobile Voter Helpline App.</p>
        <ul>
          <li>First time voters who have just turned 18 can submit Form 6 along with valid proof of identity, age and address on the above mentioned website/app during the designated Claims and Objections window (August 5th- September 4th) to get registered.</li>
          <li>For those who have shifted within Bengaluru: File Form 8 to shift your residency address on the active roll, then complete the SIR Enumeration Form to link your layout profile.</li>
        </ul>
        <p class="rule-chip">Remember! Fill Form 6 for new enrolments; Fill Form 8 for correction of details.</p>`,
      },
    ],
  },
  {
    id: 'cat-8',
    nav: '8. Casting your vote',
    heading: '8. How do I cast my ballot on Election Day?',
    items: [
      {
        q: 'How do I cast my ballot on Election Day?',
        a: `<ul>
          <li><strong>Arrival &amp; Check:</strong> Walk to your designated polling booth with your active physical Voter ID card (EPIC). Your identity must show up as active on the current electoral roll to vote. Use the Voter Helpline app or voters.eci.gov.in to confirm your registration and find your polling station.</li>
          <li><strong>The Shift to Paper Ballots:</strong> In a notable departure from electronic machines, the State Election Commission mandated that the GBA elections will use physical paper ballots instead of EVMs.</li>
          <li><strong>Casting Your Vote:</strong> Step into the private voting compartment, stamp your selected Ward Councillor's symbol on the sheet, and drop it into the ballot box.</li>
          <li><strong>No Mail-In Facility:</strong> General ordinary citizens are not legally permitted to use postal or mail-in ballots; you must vote in person. The entire workflow generally takes between 5 to 15 minutes during non-peak daytime hours.</li>
        </ul>`,
      },
    ],
  },
];

function renderCategory(cat) {
  const items = cat.items.map((item, i) => `
    <div class="accordion-item">
      <button class="accordion-trigger" type="button" id="${cat.id}-trigger-${i}" aria-controls="${cat.id}-panel-${i}">
        <span>${item.q}</span>
        ${CHEVRON}
      </button>
      <div class="accordion-panel" id="${cat.id}-panel-${i}" role="region" aria-labelledby="${cat.id}-trigger-${i}">
        <div class="accordion-panel-inner">${item.a}</div>
      </div>
    </div>
  `).join('');

  return `
    <section class="sec category" id="${cat.id}">
      <h3>${cat.heading}</h3>
      ${items}
    </section>
  `;
}

export function initVoterFaqView({ onBack }) {
  const container = document.getElementById('voterFaqContainer');

  container.innerHTML = `
    <button class="back-link" id="voterFaqBack" type="button">&larr; Back</button>

    <div class="cover">
      <div class="eyebrow"><span class="eyebrow-dot"></span> Voter FAQs</div>
      <h1 class="headline">Everything you need to know before you <mark>vote</mark>.</h1>
      <p class="faq-lede">Bengaluru is electing its Ward Councillors for the first time under the Greater Bengaluru Authority. Here's what the GBA is, who you're voting for, and how to cast your ballot.</p>
      <div class="cta-row">
        <a href="https://voters.eci.gov.in" target="_blank" rel="noopener" class="btn btn-primary">Check my voter status &rarr;</a>
        <a href="https://gba.karnataka.gov.in/electoral2026" target="_blank" rel="noopener" class="btn btn-secondary">Find my ward &amp; polling booth</a>
      </div>
    </div>

    <div class="callout">
      <span class="callout-icon" aria-hidden="true"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 8v5l3 2"/></svg></span>
      <p>For filing corrections, adding missing registrations, or shifting residential data points across updated ward boundaries, the critical ECI Claims and Objections window is strictly open from <mark>August 5</mark> to <mark>September 4</mark>. (This is also the time for new voters to register!)</p>
    </div>

    <section class="faq-section">
      <div class="faq-intro">
        <h2>Browse by topic</h2>
        <p>Grouped by what you actually need to figure out &mdash; jump to a section below.</p>
      </div>

      <div class="faq-layout">
        <nav class="cat-nav" aria-label="FAQ categories">
          ${CATEGORIES.map((c, i) => `<button type="button" data-target="${c.id}" class="${i === 0 ? 'active' : ''}">${c.nav}</button>`).join('')}
        </nav>
        <div>
          ${CATEGORIES.map(renderCategory).join('')}
        </div>
      </div>
    </section>
  `;

  document.getElementById('voterFaqBack').addEventListener('click', () => onBack());

  container.querySelectorAll('.accordion-item').forEach(item => {
    const trigger = item.querySelector('.accordion-trigger');
    const panel = item.querySelector('.accordion-panel');
    trigger.setAttribute('aria-expanded', 'false');
    trigger.addEventListener('click', () => {
      const isOpen = item.getAttribute('data-open') === 'true';
      item.setAttribute('data-open', String(!isOpen));
      trigger.setAttribute('aria-expanded', String(!isOpen));
      panel.style.maxHeight = isOpen ? '0px' : `${panel.scrollHeight}px`;
    });
  });

  const navEl = container.querySelector('.cat-nav');
  const catButtons = navEl.querySelectorAll('button');
  const sections = [...container.querySelectorAll('.category')];

  let activeId = 'cat-1'; // matches the .active class already in the initial markup
  let suppressScrollSpy = false;
  let releaseSuppressTimer;

  function setActive(id) {
    if (id === activeId) return;
    activeId = id;
    catButtons.forEach(b => b.classList.toggle('active', b.dataset.target === id));
    // Keep the active chip visible/centered in the horizontally scrolling
    // nav. Scoped to .cat-nav itself: overflow-x:auto makes its paired
    // overflow-y compute to auto too (per the CSS overflow spec), so it's
    // its own nearest scrolling ancestor on both axes — block:'nearest'
    // can't leak into scrolling the page itself.
    navEl.querySelector(`button[data-target="${id}"]`)
      ?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }

  // IntersectionObserver's rootMargin shrinks the viewport to a thin band
  // roughly 40% down from the top — near the very top or bottom of the page
  // no section falls inside that band at all, so isIntersecting never fires
  // true for anything there and a naive "highlight whatever last reported
  // isIntersecting" approach leaves a stale category highlighted once you
  // scroll back up past it. Instead, use the observer purely as an efficient
  // "something changed, recompute" trigger, and resolve the answer directly
  // each time: the active category is the last one whose top has scrolled
  // above that same 40% line (falling back to the first category before
  // anything has scrolled that far, and staying on the last category past
  // the final one — both correct, deterministic outcomes).
  function updateActiveCategory() {
    // Suppressed while a clicked nav button's smooth scroll is still in
    // flight, so the sections it passes on the way there don't flicker
    // active for a moment (see the click handler below).
    if (suppressScrollSpy) return;
    const bandTop = window.innerHeight * 0.4;
    let current = sections[0];
    for (const s of sections) {
      if (s.getBoundingClientRect().top <= bandTop) current = s;
    }
    setActive(current.id);
  }

  function releaseScrollSpySuppression() {
    clearTimeout(releaseSuppressTimer);
    suppressScrollSpy = false;
    // Deliberately no forced updateActiveCategory() call here: the clicked
    // category was already set as active synchronously on click, and a
    // short section (e.g. "Key dates", one item) can land its scroll
    // position close enough to the next section that the 40%-band geometry
    // would immediately "correct" it to that neighbor — visibly fighting
    // the click the user just made. Leave the clicked category active until
    // the user's own further scrolling naturally moves it on.
  }
  window.addEventListener('scrollend', releaseScrollSpySuppression);

  catButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      suppressScrollSpy = true;
      setActive(btn.dataset.target); // highlight immediately, not once the scroll animation finishes
      document.getElementById(btn.dataset.target).scrollIntoView({ behavior: 'smooth', block: 'start' });
      // Fallback for browsers without the scrollend event, so suppression
      // can't get stuck on permanently.
      clearTimeout(releaseSuppressTimer);
      releaseSuppressTimer = setTimeout(releaseScrollSpySuppression, 1000);
    });
  });

  // The nav no longer wraps (always single-row, horizontal-scroll instead),
  // so its height is normally constant — still measured via ResizeObserver
  // rather than hardcoded, so this stays correct if content/font-loading
  // ever shifts it slightly, and .category's scroll-margin-top (components.css)
  // always clears however tall the docked nav currently is.
  function updateNavClearance() {
    const topOffset = parseFloat(getComputedStyle(navEl).top) || 0;
    const clearance = topOffset + navEl.getBoundingClientRect().height + 12;
    container.style.setProperty('--faq-nav-clearance', `${clearance}px`);
  }
  new ResizeObserver(updateNavClearance).observe(navEl);
  updateNavClearance();

  const observer = new IntersectionObserver(updateActiveCategory, { rootMargin: '-40% 0px -50% 0px' });
  sections.forEach(s => observer.observe(s));
}
