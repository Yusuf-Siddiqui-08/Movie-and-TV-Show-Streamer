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

function Results() {
  const route = useRoute();
  const { kind, title, page } = route.params;
  const [data, setData] = useState({ results: [], page, title, sort: 'popularity', order: 'desc', total_pages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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
                    <th>{kind === 'movie' ? 'Movie' : 'TV Series'}</th>
                    <th>Year</th>
                    <th>Popularity</th>
                    <th>Rating</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                {data.results.map((row) => (
                  <tr key={`${kind}-${row.id}`}>
                    <td className="cell-title"><a href={`#/watch/${kind}/${row.id}`}>{row.name}</a></td>
                    <td className="cell-year">{row.year}</td>
                    <td className="cell-popularity">{Number(row.popularity || 0).toFixed(1)}</td>
                    <td className="cell-rating">{Number(row.rating || 0).toFixed(1)}</td>
                    <td className="row-actions"><a className="btn btn-secondary" href={`#/watch/${kind}/${row.id}`}>Watch</a></td>
                  </tr>
                ))}
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
  const src = kind === 'movie' ? `https://www.2embed.cc/embed/${id}` : `https://www.2embed.cc/embedtvfull/${id}`;

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
  if (route.name === 'home') return <Home />;
  if (route.name === 'search') return <Results />;
  if (route.name === 'watch') return <Watch />;
  return <Home />;
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
