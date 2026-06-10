// home.jsx — ClickEat platform marketing landing & tenant picker.

function PlatformHome({ go }) {
  const locales = window.CE_DATA.locales;
  return (
    <div style={{ background: '#0B0B0F', color: 'white', minHeight: '100vh' }}>
      <PlatformNav go={go} />

      {/* Hero */}
      <section style={{ position: 'relative', overflow: 'hidden', padding: '90px 22px 70px' }}>
        <div style={{ position: 'absolute', inset: 0, background:
          'radial-gradient(circle at 15% 25%, rgba(255,45,45,.32), transparent 45%),' +
          'radial-gradient(circle at 85% 75%, rgba(255,203,5,.22), transparent 45%)' }} />
        <div style={{ position: 'relative', maxWidth: 1100, margin: '0 auto', textAlign: 'center' }}>
          <span style={{ display: 'inline-flex', padding: '5px 12px', borderRadius: 99, background: 'rgba(255,255,255,.08)', border: '1px solid rgba(255,255,255,.12)', fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            <span style={{ width: 6, height: 6, borderRadius: 99, background: '#22C55E', marginRight: 8, alignSelf: 'center', boxShadow: '0 0 0 4px rgba(34,197,94,.2)' }} />
            142 locales activos · CDMX · GDL · MTY
          </span>
          <h1 className="ce-display" style={{ margin: '20px auto 14px', fontSize: 'clamp(40px, 7vw, 80px)', fontWeight: 700, letterSpacing: '-0.04em', lineHeight: 0.98, maxWidth: 900 }}>
            Tu menú digital con<br />
            <span style={{ background: 'linear-gradient(120deg, #FF2D2D, #FFCB05)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>pedidos por WhatsApp.</span>
          </h1>
          <p style={{ fontSize: 17, opacity: 0.7, maxWidth: 540, margin: '0 auto', lineHeight: 1.55 }}>
            Cada local tiene su propia landing, branding, productos y carrito. Tus clientes piden en un tap, tú recibes el mensaje directo a WhatsApp.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 28, flexWrap: 'wrap' }}>
            <button onClick={() => go('/login')} className="btn btn-primary" style={{ background: 'white', color: 'var(--ce-ink)', padding: '14px 22px', fontSize: 14 }}>
              Comenzar gratis <I.chevR size={16} />
            </button>
            <button onClick={() => go('/r/' + locales[0].slug)} className="btn" style={{ background: 'rgba(255,255,255,.08)', color: 'white', border: '1px solid rgba(255,255,255,.15)', padding: '14px 22px', fontSize: 14 }}>
              Ver demo en vivo
            </button>
          </div>
          <div style={{ marginTop: 18, fontSize: 12, opacity: 0.5 }}>14 días gratis · sin tarjeta · listo en 5 minutos</div>
        </div>
      </section>

      {/* Locales en vivo */}
      <section style={{ maxWidth: 1180, margin: '0 auto', padding: '50px 22px 30px' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 22 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#FF8585', textTransform: 'uppercase', letterSpacing: '0.12em' }}>Locales en vivo</div>
            <h2 className="ce-display" style={{ margin: '6px 0 0', fontSize: 32, fontWeight: 700, letterSpacing: '-0.025em' }}>Pide ahora en estos locales</h2>
          </div>
          <a href="#/login" onClick={(e) => { e.preventDefault(); go('/login'); }} style={{ fontSize: 13, color: 'rgba(255,255,255,.6)', textDecoration: 'none' }}>Ver todos →</a>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
          {locales.map((l) => (
            <button
              key={l.id}
              onClick={() => go('/r/' + l.slug)}
              className={l.themeClass}
              style={{
                textAlign: 'left', border: 'none', cursor: 'pointer',
                background: 'rgba(255,255,255,.04)',
                borderRadius: 20, overflow: 'hidden',
                padding: 0, color: 'white',
                transition: 'transform .2s var(--ease-out), background .2s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.background = 'rgba(255,255,255,.07)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = ''; e.currentTarget.style.background = 'rgba(255,255,255,.04)'; }}
            >
              <div style={{ height: 160, backgroundImage: `url(${l.hero})`, backgroundSize: 'cover', backgroundPosition: 'center', position: 'relative' }}>
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, transparent 40%, rgba(0,0,0,.7))' }} />
                <div style={{ position: 'absolute', top: 12, left: 12 }}>
                  <span className="live-pill live-pill-open" style={{ background: 'rgba(255,255,255,.95)' }}>Abierto · {l.deliveryMin} min</span>
                </div>
                <div style={{ position: 'absolute', bottom: 12, left: 14, right: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 38, height: 38, borderRadius: 10, background: 'var(--t-primary)', color: 'var(--t-primary-ink)', display: 'grid', placeItems: 'center', fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 15 }}>{l.logoMonogram}</div>
                  <div>
                    <div className="ce-display" style={{ fontSize: 17, fontWeight: 700, letterSpacing: '-0.02em' }}>{l.name}</div>
                    <div style={{ fontSize: 11, opacity: 0.85 }}>★ {l.rating} · {l.reviewCount} reseñas</div>
                  </div>
                </div>
              </div>
              <div style={{ padding: '14px 16px', fontSize: 13, opacity: 0.75, lineHeight: 1.5 }}>{l.tagline}</div>
              <div style={{ padding: '0 16px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="ce-mono" style={{ fontSize: 12, opacity: 0.5 }}>clickeat.mx/{l.slug}</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: 'var(--t-accent, white)' }}>
                  Pedir <I.chevR size={14} />
                </span>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* Cómo funciona */}
      <section style={{ maxWidth: 1180, margin: '0 auto', padding: '50px 22px' }}>
        <h2 className="ce-display" style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.025em', textAlign: 'center', marginBottom: 32 }}>Listo en 5 minutos. En serio.</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
          {[
            { n: '01', t: 'Da de alta tu local', s: 'Sube tu logo, elige colores, escribe tu menú. Sin código.' },
            { n: '02', t: 'Comparte tu URL o QR', s: 'clickeat.mx/tu-local. Pega el QR en mesas o redes.' },
            { n: '03', t: 'Recibe pedidos por WhatsApp', s: 'El cliente arma su carrito y el mensaje llega directo a tu chat.' },
          ].map((s) => (
            <div key={s.n} style={{ background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.08)', padding: 22, borderRadius: 18 }}>
              <div className="ce-mono" style={{ fontSize: 11, color: '#FF8585', fontWeight: 700, letterSpacing: '0.08em' }}>{s.n}</div>
              <div className="ce-display" style={{ fontSize: 18, fontWeight: 700, marginTop: 8, letterSpacing: '-0.015em' }}>{s.t}</div>
              <div style={{ fontSize: 13, opacity: 0.7, marginTop: 6, lineHeight: 1.5 }}>{s.s}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid rgba(255,255,255,.08)', padding: '32px 22px', textAlign: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'center', marginBottom: 12 }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: 'linear-gradient(135deg, #FF2D2D, #B81515)', color: 'white', display: 'grid', placeItems: 'center', fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 14 }}>C</div>
          <div className="ce-display" style={{ fontWeight: 800, fontSize: 14, letterSpacing: '-0.02em' }}>ClickEat</div>
        </div>
        <div style={{ fontSize: 12, opacity: 0.5 }}>© 2026 ClickEat MX · Hecho para locales mexicanos</div>
      </footer>
    </div>
  );
}

function PlatformNav({ go }) {
  return (
    <div className="platform-bar">
      <button onClick={() => go('/')} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'transparent', border: 'none', cursor: 'pointer', color: 'white' }}>
        <div style={{ width: 30, height: 30, borderRadius: 9, background: 'linear-gradient(135deg, #FF2D2D, #B81515)', color: 'white', display: 'grid', placeItems: 'center', fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 16 }}>C</div>
        <span className="ce-display" style={{ fontWeight: 800, fontSize: 15, letterSpacing: '-0.02em' }}>ClickEat</span>
      </button>
      <nav style={{ display: 'flex', alignItems: 'center', gap: 22 }}>
        <a href="#/r/tacos-el-gordo" onClick={(e) => { e.preventDefault(); go('/r/tacos-el-gordo'); }}>Ver demo</a>
        <a href="#/login" onClick={(e) => { e.preventDefault(); go('/login'); }}>Iniciar sesión</a>
        <button onClick={() => go('/login')} className="btn btn-primary" style={{ background: 'white', color: 'var(--ce-ink)', padding: '8px 16px', fontSize: 13 }}>
          Crear cuenta
        </button>
      </nav>
    </div>
  );
}

window.PlatformHome = PlatformHome;
