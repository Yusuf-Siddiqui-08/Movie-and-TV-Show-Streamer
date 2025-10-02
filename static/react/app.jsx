/* global React, ReactDOM */
const { useState, useEffect, useMemo } = React;

function useHashRoute() {
  const [hash, setHash] = useState(() => window.location.hash || '#/');
  useEffect(() => {
    const onHash = () => setHash(window.location.hash || '#/');
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);
  return hash;
}

function parseQuery(qs) {
  const out = {};
  const s = qs.startsWith('?') ? qs.slice(1) : qs;
  for (const part of s.split('&')) {
    if (!part) continue;
    const [k, v = ''] = part.split('=');
    out[decodeURIComponent(k)] = decodeURIComponent(v);
  }
  return out;
}

function buildQuery(params) {
  const usp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') usp.set(k, v);
  });
  const s = usp.toString();
  return s ? `?${s}` : '';
}

function useRoute() {
  const hash = useHashRoute();
  // Supported routes:
  // #/ => home
  // #/search/movie/:title/:page?sort=&order=
  // #/search/tv/:title/:page?sort=&order=
  // #/watch/movie/:id
  // #/watch/tv/:id
  return useMemo(() => {
    const clean = hash.replace(/^#/, '');
    const [path, qs = ''] = clean.split('?');
    const parts = path.split('/').filter(Boolean);
    const query = parseQuery(qs || '');
    if (parts.length === 0) return { name: 'home', params: {}, query };
    if (parts[0] === '') return { name: 'home', params: {}, query };
    if (parts[0] === 'search' && (parts[1] === 'movie' || parts[1] === 'tv')) {
      const kind = parts[1];
      const title = decodeURIComponent(parts[2] || '');
      const page = parseInt(parts[3] || '1', 10) || 1;
      return { name: 'search', params: { kind, title, page }, query };
    }
    if (parts[0] === 'watch' && (parts[1] === 'movie' || parts[1] === 'tv')) {
      const kind = parts[1];
      const id = parts[2];
      return { name: 'watch', params: { kind, id }, query };
    }
    return { name: 'home', params: {}, query };
  }, [hash]);
}

function Home() {
  const [title, setTitle] = useState('');
  const [type, setType] = useState('Movie');

  function onSubmit(e) {
    e.preventDefault();
    const t = (title || '').trim();
    if (!t) { alert('Please enter a title.'); return; }
    const enc = encodeURIComponent(t);
    if (type === 'Movie') {
      window.location.hash = `#/search/movie/${enc}/1`;
    } else {
      window.location.hash = `#/search/tv/${enc}/1`;
    }
  }

  return (
    <section className="grid grid-2">
      <div className="card">
        <div className="card-inner">
          <div className="kicker">Welcome</div>
          <h1>Streaming Service</h1>
          <p className="muted">Search for movies and TV shows. Please use an ad-blocker for your safety.</p>
          <div className="alert" role="alert">Warning: If a viewer opens a new link, close it immediately.</div>
        </div>
      </div>
      <div className="card">
        <div className="card-inner">
          <h2>Find something to watch</h2>
          <form className="grid" onSubmit={onSubmit}>
            <div>
              <label htmlFor="title"><span className="badge">Title</span></label>
              <input type="text" id="title" name="title" className="input" placeholder="e.g., Inception"
                     value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div>
              <span className="badge">Type</span>
              <div style={{display:'flex', gap:'12px', marginTop:'8px'}}>
                <label><input type="radio" name="type" value="Movie" checked={type==='Movie'} onChange={() => setType('Movie')} /> Movie</label>
                <label><input type="radio" name="type" value="TV Series" checked={type==='TV Series'} onChange={() => setType('TV Series')} /> TV Series</label>
              </div>
            </div>
            <div>
              <button className="btn" id="search-btn" type="submit">Search</button>
            </div>
          </form>
        </div>
      </div>
    </section>
  );
}

function SortLinks({ sort, order, onChange }) {
  const mk = (text, s, o) => (
    <button className={"btn " + (o === 'asc' ? 'btn-secondary' : 'btn-secondary')} style={{marginRight:8}}
            onClick={() => onChange(s, o)}>
      {text}{sort===s && order===o ? ' ✓' : ''}
    </button>
  );
  return (
    <div style={{margin:'8px 0'}}>
      <strong>Sort:</strong>{' '}
      {mk('Most popular', 'popularity', 'desc')}
      {mk('Least popular', 'popularity', 'asc')}
      {mk('Highest rated', 'rating', 'desc')}
      {mk('Lowest rated', 'rating', 'asc')}
      {mk('A–Z', 'name', 'asc')}
      {mk('Newest', 'year', 'desc')}
      {mk('Oldest', 'year', 'asc')}
    </div>
  );
}

// Helpers for truncation and sections inside the expandable details
function TruncatedList({ items = [], initialCount = 8 }) {
  // New behavior: show by number of lines, not item count. initialCount kept for backward compat but ignored.
  const [linesShown, setLinesShown] = useState(1);
  const [chipH, setChipH] = useState(0);
  const [rowGap, setRowGap] = useState(6);
  const [totalLines, setTotalLines] = useState(1);
  const wrapRef = React.useRef(null);

  if (!items || items.length === 0) return <span className="muted">Unknown</span>;

  // Measure heights to derive total line count
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const firstChip = el.querySelector('.chip');
    const h = firstChip ? firstChip.offsetHeight : 22;
    setChipH(h);
    try {
      const cs = window.getComputedStyle(el);
      const g = parseInt(cs.rowGap || cs.gap || '6', 10);
      setRowGap(Number.isFinite(g) ? g : 6);
    } catch (_) {}
    const compute = () => {
      const full = el.scrollHeight; // full content height regardless of max-height
      const perLine = h + rowGap;
      if (perLine <= 0) { setTotalLines(1); return; }
      // Estimate lines: include gap on all but last row
      const lines = Math.max(1, Math.round((full + rowGap) / perLine));
      setTotalLines(lines);
      // Keep linesShown within bounds
      setLinesShown(ls => Math.max(1, Math.min(lines, ls)));
    };
    compute();

    const onResize = () => compute();
    window.addEventListener('resize', onResize);
    // Mutation observer to handle font load/async layout
    const mo = new MutationObserver(compute);
    mo.observe(el, { childList: true, subtree: true });
    setTimeout(compute, 0);
    return () => { window.removeEventListener('resize', onResize); mo.disconnect(); };
  }, [items]);

  const maxH = linesShown * chipH + Math.max(0, (linesShown - 1) * rowGap);
  const atEnd = linesShown >= totalLines;
  const onClick = () => {
    if (atEnd) setLinesShown(1); else setLinesShown(n => Math.min(totalLines, n + 1));
  };

  return (
    <div>
      <div className="chips" ref={wrapRef} style={{overflow: 'hidden', maxHeight: chipH ? maxH : undefined}}>
        {items.map((nm, i) => <span key={i} className="chip">{nm}</span>)}
      </div>
      {totalLines > 1 ? (
        <button className="link-btn" onClick={onClick}>
          {atEnd ? 'View less' : 'View more'}
        </button>
      ) : null}
    </div>
  );
}

function TruncatedText({ text = '', initialChars = 240 }) {
  const [expanded, setExpanded] = useState(false);
  if (!text) return <span className="muted">No description available.</span>;
  let display = text;
  let truncated = false;
  if (!expanded && text.length > initialChars) {
    let cut = initialChars;
    const candidates = [text.lastIndexOf('. ', cut), text.lastIndexOf('! ', cut), text.lastIndexOf('? ', cut)];
    const best = Math.max(...candidates);
    if (best > 0) cut = best + 1;
    display = text.slice(0, cut).trim();
    truncated = true;
  }
  const toggle = () => setExpanded(!expanded);
  return (
    <span className="muted">
      {display}{truncated && !expanded ? '… ' : ' '}
      {text.length > display.length ? (
        <button className="link-btn" onClick={toggle}>{expanded ? 'View less' : 'View more'}</button>
      ) : null}
    </span>
  );
}

// Helpers for formatting
function formatDate(value) {
  if (!value) return 'Unknown';
  try {
    const d = new Date(value);
    if (isNaN(d.getTime())) return 'Unknown';
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
  } catch (_) {
    return 'Unknown';
  }
}

function formatRuntime(mins) {
  const n = parseInt(mins, 10);
  if (!Number.isFinite(n) || n <= 0) return 'Unknown';
  const h = Math.floor(n / 60);
  const m = n % 60;
  if (h && m) return `${h}h ${m}m`;
  if (h) return `${h}h`;
  return `${m}m`;
}

function Results() {
  const route = useRoute();
  const { kind, title, page } = route.params;
  const [data, setData] = useState({ results: [], page, title, sort: 'popularity', order: 'desc', total_pages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Expand/collapse state and per-item details cache
  const [expandedKeys, setExpandedKeys] = useState(new Set());
  const [detailsMap, setDetailsMap] = useState({}); // key -> { loading, error, data }

  const sort = route.query.sort || 'popularity';
  const order = route.query.order || 'desc';

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true); setError('');
      try {
        const qs = buildQuery({ title, page, sort, order });
        const resp = await fetch(`/api/search/${kind}${qs}`);
        const json = await resp.json();
        if (!resp.ok) throw new Error(json.error || 'Failed to load results');
        if (!cancelled) setData(json);
      } catch (e) {
        if (!cancelled) setError(String(e.message || e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; }
  }, [kind, title, page, sort, order]);

  function setSort(s, o) {
    const base = `#/search/${kind}/${encodeURIComponent(title)}/${page}`;
    window.location.hash = base + buildQuery({ sort: s, order: o });
  }
  function go(delta) {
    const next = Math.max(1, (parseInt(page,10)||1) + delta);
    if (delta > 0 && data.total_pages && next > data.total_pages) {
      alert(`There are no more pages! The last page was ${data.total_pages}!`);
      return;
    }
    const base = `#/search/${kind}/${encodeURIComponent(title)}/${next}`;
    window.location.hash = base + buildQuery({ sort, order });
  }

  function toggleExpand(row) {
    const key = `${kind}-${row.id}`;
    const isOpen = expandedKeys.has(key);
    const next = new Set(expandedKeys);
    if (isOpen) {
      next.delete(key);
      setExpandedKeys(next);
      return;
    }
    next.add(key);
    setExpandedKeys(next);
    if (!detailsMap[key]) {
      // Fetch details on first expand
      setDetailsMap(prev => ({ ...prev, [key]: { loading: true, error: '', data: null } }));
      (async () => {
        try {
          const resp = await fetch(`/api/details/${kind}/${row.id}`);
          const json = await resp.json();
          if (!resp.ok) throw new Error(json.error || 'Failed to load details');
          setDetailsMap(prev => ({ ...prev, [key]: { loading: false, error: '', data: json } }));
        } catch (e) {
          setDetailsMap(prev => ({ ...prev, [key]: { loading: false, error: String(e.message || e), data: null } }));
        }
      })();
    }
  }

  return (
    <div>
      <h1>{kind === 'movie' ? 'Movies' : 'TV shows'} matching “{title}”</h1>
      <SortLinks sort={sort} order={order} onChange={setSort} />
      <div className="card" style={{marginTop:8}}>
        <div className="card-inner">
          {loading ? (
            <p className="muted">Loading…</p>
          ) : error ? (
            <div className="alert" role="alert">{error}</div>
          ) : (
            <>
              <table className="table" id="resultsTable">
                <thead>
                  <tr>
                    <th style={{width:34}}></th>
                    <th>{kind === 'movie' ? 'Movie' : 'TV Series'}</th>
                    <th>Year</th>
                    <th>Popularity</th>
                    <th>Rating</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                {data.results.map((row) => {
                  const key = `${kind}-${row.id}`;
                  const isExpanded = expandedKeys.has(key);
                  const det = detailsMap[key];
                  return (
                    <React.Fragment key={`${kind}-${row.id}`}>
                      <tr>
                        <td className="cell-expander">
                          <button className={`expander-btn ${isExpanded ? 'open' : ''}`} aria-label={isExpanded ? 'Collapse details' : 'Expand details'} aria-expanded={isExpanded} onClick={() => toggleExpand(row)}>
                            <span className="chevron" aria-hidden="true"></span>
                          </button>
                        </td>
                        <td className="cell-title"><a href={`#/watch/${kind}/${row.id}`}>{row.name}</a></td>
                        <td className="cell-year">{row.year}</td>
                        <td className="cell-popularity">{Number(row.popularity || 0).toFixed(1)}</td>
                        <td className="cell-rating">{`${parseFloat(Number(row.rating || 0).toFixed(1))}/10`}</td>
                        <td className="row-actions"><a className="btn btn-secondary" href={`#/watch/${kind}/${row.id}`}>Watch</a></td>
                      </tr>
                      {isExpanded ? (
                        <tr className="details-row">
                          <td className="details-cell" colSpan={6}>
                            {!det || det.loading ? (
                              <p className="muted">Loading details…</p>
                            ) : det.error ? (
                              <div className="alert" role="alert">{det.error}</div>
                            ) : (
                              <div className="details-content">
                                {det.data && det.data.poster ? (
                                  <img className="poster-thumb" src={det.data.poster} alt={`${det.data.name} poster`} />
                                ) : (
                                  <div className="poster-thumb placeholder">No image</div>
                                )}
                                <div className="details-text">
                                  <div className="details-sections">
                                    <div className="section">
                                      <div className="section-title">Directors</div>
                                      <TruncatedList items={det.data && det.data.directors ? det.data.directors : []} initialCount={4} />
                                    </div>
                                    <div className="section">
                                      <div className="section-title">Actors</div>
                                      <TruncatedList items={det.data && det.data.actors ? det.data.actors : []} initialCount={10} />
                                    </div>
                                    <div className="section">
                                      <div className="section-title">Description</div>
                                      <TruncatedText text={det.data && det.data.overview ? det.data.overview : ''} initialChars={280} />
                                    </div>
                                    <div className="section">
                                      <div className="section-title">Genres</div>
                                      <TruncatedList items={(det.data && det.data.genres) ? det.data.genres : []} initialCount={6} />
                                    </div>
                                    <div className="section">
                                      <div className="section-title">Ratings</div>
                                      <div className="chips">
                                        <span className="chip">Rating: {det.data && det.data.vote_average != null ? `${Number(det.data.vote_average).toFixed(1)}/10` : 'Unknown'}</span>
                                        <span className="chip">Votes: {det.data && det.data.vote_count != null ? det.data.vote_count : 'Unknown'}</span>
                                      </div>
                                    </div>
                                    {det.data && det.data.kind === 'movie' ? (
                                      <div className="section">
                                        <div className="section-title">Movie facts</div>
                                        <div className="chips">
                                          <span className="chip">Runtime: {formatRuntime(det.data.runtime)}</span>
                                          <span className="chip">Release date: {formatDate(det.data.release_date)}</span>
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="section">
                                        <div className="section-title">TV facts</div>
                                        <div className="chips">
                                          <span className="chip">First air: {formatDate(det.data.first_air_date)}</span>
                                          <span className="chip">Last air: {formatDate(det.data.last_air_date)}</span>
                                          <span className="chip">In production: {det.data && det.data.in_production ? 'Yes' : (det.data && det.data.in_production === false ? 'No' : 'Unknown')}</span>
                                          <span className="chip">Seasons: {det.data && det.data.number_of_seasons != null ? det.data.number_of_seasons : 'Unknown'}</span>
                                          <span className="chip">Episodes: {det.data && det.data.number_of_episodes != null ? det.data.number_of_episodes : 'Unknown'}</span>
                                          <span className="chip">Type: {det.data && det.data.series_type ? det.data.series_type : 'Unknown'}</span>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            )}
                          </td>
                        </tr>
                      ) : null}
                    </React.Fragment>
                  );
                })}
                </tbody>
              </table>
              <div className="pager">
                <button className="btn btn-secondary" onClick={() => go(-1)}>Prev</button>
                <span className="badge">Page {data.page}</span>
                <button className="btn" onClick={() => go(1)}>Next</button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Watch() {
  const route = useRoute();
  const { kind, id } = route.params;
    const safeId = encodeURIComponent(id);
  const src = kind === 'movie'
    ? `https://www.2embed.skin/embed/${safeId}`
    : `https://www.2embed.skin/embedtv/${safeId}&s=1&e=1`;

  useEffect(() => {
    setTimeout(() => alert('WARNING: USE AN AD-BLOCKER!'), 0);
  }, []);

  return (
    <div>
      <div className="alert" role="alert">Warning: Use an ad-blocker. If a new tab opens, close it immediately.</div>
      {kind === 'tv' ? (<p className="kicker">Other episodes are usually available via the player menu.</p>) : null}
      <div className="iframe-wrap" style={{marginTop: kind==='tv' ? 12 : 16}}>
        <div className="iframe-box">
          <iframe id="movie" src={src} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen></iframe>
        </div>
      </div>
    </div>
  );
}

function App() {
  const route = useRoute();

  // Ensure the browser URL path is normalized when viewing Home
  useEffect(() => {
    if (route.name === 'home') {
      const path = window.location.pathname || '/';
      if (path !== '/' && path !== '/home') {
        try {
          // Keep it as a soft replace to avoid history entry and page reload
          window.history.replaceState(null, '', '/');
        } catch (e) {
          // Fallback: direct assignment (may reload)
          window.location.assign('/');
        }
      }
    }
  }, [route.name]);

  if (route.name === 'home') return <Home />;
  if (route.name === 'search') return <Results />;
  if (route.name === 'watch') return <Watch />;
  return <Home />;
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
