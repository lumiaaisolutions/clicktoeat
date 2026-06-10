// app.jsx — Hash-based router for the working ClickEat prototype.
//
// Routes
//   /                          PlatformHome (marketing + tenant picker)
//   /login                     Admin login
//   /admin                     Admin global — list of locales
//   /admin/:slug/menu          Admin del local — menú
//   /admin/:slug/branding      Admin del local — theme customizer
//   /r/:slug                   Public landing for a tenant
//   /r/:slug/qr                QR share page

const { useState: rState, useEffect: rEffect } = React;

function parseHash() {
  const h = (window.location.hash || '#/').replace(/^#/, '');
  // Strip query
  const path = h.split('?')[0] || '/';
  return path;
}

function useRoute() {
  const [path, setPath] = rState(parseHash());
  rEffect(() => {
    const onHash = () => setPath(parseHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);
  const go = (to) => {
    if (!to) return;
    window.location.hash = '#' + to;
    // Smooth scroll to top on navigation
    window.scrollTo(0, 0);
  };
  return [path, go];
}

function NotFound({ go }) {
  return (
    <div style={{ minHeight: '100vh', background: '#0B0B0F', color: 'white', display: 'grid', placeItems: 'center', textAlign: 'center', padding: 40 }}>
      <div>
        <div className="ce-display" style={{ fontSize: 88, fontWeight: 700, letterSpacing: '-0.04em', opacity: 0.4 }}>404</div>
        <div className="ce-display" style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em', marginTop: 6 }}>No encontramos esta página</div>
        <button onClick={() => go('/')} className="btn btn-primary" style={{ background: 'white', color: 'var(--ce-ink)', marginTop: 20 }}>Volver al inicio</button>
      </div>
    </div>
  );
}

function App() {
  const [path, go] = useRoute();
  const data = window.CE_DATA;

  // Expose current admin path for sidebar nav rewriting
  window.__currentAdminPath = path.startsWith('/admin/') ? path : null;

  // Route matching
  if (path === '/' || path === '') {
    return <PlatformHome go={go} />;
  }

  if (path === '/login') {
    return <AdminLogin onLogin={() => go('/admin')} />;
  }

  if (path === '/admin' || path === '/admin/') {
    return <AdminGlobal go={go} />;
  }

  // /admin/:slug/(menu|branding|...)
  const adminMatch = path.match(/^\/admin\/([^/]+)(?:\/(\w+))?$/);
  if (adminMatch) {
    const slug = adminMatch[1];
    const tab = adminMatch[2] || 'menu';
    const local = data.byId[slug] || data.locales.find(l => l.slug === slug);
    if (!local) return <NotFound go={go} />;
    if (tab === 'branding') return <AdminBranding local={local} go={go} />;
    return <AdminLocal local={local} go={go} />;
  }

  // /r/:slug or /r/:slug/qr
  const tenantMatch = path.match(/^\/r\/([^/]+)(?:\/(\w+))?$/);
  if (tenantMatch) {
    const slug = tenantMatch[1];
    const sub = tenantMatch[2];
    const local = data.byId[slug] || data.locales.find(l => l.slug === slug);
    if (!local) return <NotFound go={go} />;
    if (sub === 'qr') {
      return (
        <div style={{ minHeight: '100vh', background: 'var(--ce-bg)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 18px', background: 'white', borderBottom: '1px solid var(--ce-line)' }}>
            <button onClick={() => go('/r/' + slug)} className="btn btn-ghost" style={{ padding: 8, width: 38, height: 38, borderRadius: 12 }}><I.arrowL /></button>
            <div className="ce-display" style={{ fontSize: 15, fontWeight: 700 }}>QR del menú</div>
          </div>
          <QRShare local={local} />
        </div>
      );
    }
    return (
      <div className="shell">
        <Landing local={local} standalone onBack={() => go('/')} />
      </div>
    );
  }

  return <NotFound go={go} />;
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
