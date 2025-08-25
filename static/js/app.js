// Unified client-side behaviors for the Streaming Service
// No inline JavaScript is used in templates. All logic lives here.

(function () {
  function qs(selector, root) {
    return (root || document).querySelector(selector);
  }
  function qsa(selector, root) {
    return Array.from((root || document).querySelectorAll(selector));
  }

  // HOME PAGE: handle search form interactions
  function initHome() {
    const form = qs('form');
    const titleInput = qs('#title');
    const searchBtn = qs('#search-btn');
    if (!form || !titleInput || !searchBtn) return;

    function performSearch(evt) {
      if (evt) evt.preventDefault();
      const title = (titleInput.value || '').trim();
      const checked = qsa("input[name='type']").find(r => r.checked);
      const type = checked ? checked.value : null;
      if (!type) {
        alert('Please select a type!');
        return false;
      }
      if (!title) {
        alert('Please enter a title.');
        return false;
      }
      const encodedTitle = encodeURIComponent(title);
      if (type === 'Movie') {
        window.location.href = `/search/movie/${encodedTitle}/1/`;
      } else if (type === 'TV Series') {
        window.location.href = `/search/tv/${encodedTitle}/1/`;
      }
      return false;
    }

    form.addEventListener('submit', performSearch);
    searchBtn.addEventListener('click', performSearch);
  }

  // RESULTS PAGES: pagination controls
  function initResults() {
    const pager = qs('.pager');
    if (!pager) return;
    const { page, title, sort, order, kind } = pager.dataset;
    if (!page || !title || !sort || !order || !kind) return;

    const currentPage = parseInt(page, 10) || 1;
    const nextPage = currentPage + 1;
    const prevPage = currentPage - 1;

    const encTitle = encodeURIComponent(title);
    const qsParams = `?sort=${encodeURIComponent(sort)}&order=${encodeURIComponent(order)}`;

    const prevBtn = qs('#prev-btn', pager) || qs("button[data-action='prev']", pager);
    const nextBtn = qs('#next-btn', pager) || qs("button[data-action='next']", pager);

    function go(which) {
      if (which === 'next') {
        window.location.href = `/search/${kind}/${encTitle}/${nextPage}/${qsParams}`;
      } else {
        if (prevPage <= 0) {
          alert('This is the first page!');
        } else {
          window.location.href = `/search/${kind}/${encTitle}/${prevPage}/${qsParams}`;
        }
      }
    }

    if (prevBtn) prevBtn.addEventListener('click', () => go('prev'));
    if (nextBtn) nextBtn.addEventListener('click', () => go('next'));
  }

  // WATCH PAGES: focus iframe and show safety alert
  function initWatch() {
    const player = qs('#movie');
    if (!player) return;
    window.addEventListener('load', () => {
      try { player.focus(); } catch (e) { /* noop */ }
      alert('WARNING: USE AN AD-BLOCKER!');
    });
  }

  // Initialize all page modules
  function init() {
    initHome();
    initResults();
    initWatch();
  }

  // DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
