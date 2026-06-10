// qr.jsx — QR share page for a tenant menu.

function QRShare({ local }) {
  const url = `clickeat.mx/${local.slug}`;
  return (
    <div style={{ width: '100%', height: '100%', background: 'var(--ce-bg)', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '36px 28px', fontFamily: 'var(--font-sans)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
        <div style={{ width: 34, height: 34, borderRadius: 9, background: 'linear-gradient(135deg, var(--ce-red), var(--ce-red-deep))', color: 'white', display: 'grid', placeItems: 'center', fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 16 }}>C</div>
        <div className="ce-display" style={{ fontSize: 15, fontWeight: 800, letterSpacing: '-0.02em' }}>ClickEat</div>
      </div>

      <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--ce-red)', marginBottom: 8 }}>Menú digital</div>
      <h1 className="ce-display" style={{ margin: 0, fontSize: 30, fontWeight: 700, letterSpacing: '-0.03em', textAlign: 'center', lineHeight: 1.05 }}>{local.name}</h1>
      <div style={{ fontSize: 13, color: 'var(--ce-muted)', marginTop: 6, textAlign: 'center' }}>Escanea para ver el menú y pedir por WhatsApp</div>

      {/* QR card */}
      <div className={local.themeClass} style={{
        marginTop: 26,
        padding: 28, borderRadius: 28,
        background: 'white',
        border: '1px solid var(--ce-line)',
        boxShadow: '0 30px 60px -20px rgba(0,0,0,.15)',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        position: 'relative',
      }}>
        {/* Logo strip */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
          <div style={{ width: 42, height: 42, borderRadius: 11, background: 'var(--t-primary)', color: 'var(--t-primary-ink)', display: 'grid', placeItems: 'center', fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 18 }}>{local.logoMonogram}</div>
          <div>
            <div className="ce-display" style={{ fontSize: 17, fontWeight: 700, letterSpacing: '-0.02em' }}>{local.name}</div>
            <div className="ce-mono" style={{ fontSize: 11, color: 'var(--ce-muted)' }}>{url}</div>
          </div>
        </div>

        <FakeQR />

        <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
          <span className="chip"><I.bike size={11} /> {local.deliveryMin} min</span>
          <span className="chip"><I.star size={11} filled style={{ color: '#FFB400' }} /> {local.rating}</span>
          <span className="chip"><I.clock size={11} /> Abierto</span>
        </div>

        <div style={{ marginTop: 18, fontSize: 12, color: 'var(--ce-muted)', textAlign: 'center' }}>
          O entra a <span className="ce-mono" style={{ color: 'var(--ce-ink)', fontWeight: 600 }}>{url}</span>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, marginTop: 22 }}>
        <button className="btn btn-outline" style={{ background: 'white' }}><I.share size={15} /> Compartir</button>
        <button className="btn btn-primary" style={{ background: 'var(--ce-ink)' }}><I.upload size={15} /> Descargar PNG</button>
        <button className="btn btn-outline" style={{ background: 'white' }}><i className="fas fa-print" style={{ fontSize: 13 }}></i> Imprimir</button>
      </div>
    </div>
  );
}

// Decorative QR (procedural — not a real one)
function FakeQR() {
  const size = 21;
  const cells = React.useMemo(() => {
    const g = [];
    let seed = 91;
    const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed; };
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        g.push((rnd() % 100) > 52 ? 1 : 0);
      }
    }
    // Position markers (3 corners)
    const setMarker = (px, py) => {
      for (let y = 0; y < 7; y++) for (let x = 0; x < 7; x++) {
        const i = (py + y) * size + (px + x);
        const e = (y === 0 || y === 6 || x === 0 || x === 6);
        const c = (y >= 2 && y <= 4 && x >= 2 && x <= 4);
        g[i] = (e || c) ? 1 : 0;
      }
    };
    setMarker(0, 0); setMarker(size - 7, 0); setMarker(0, size - 7);
    return g;
  }, []);

  return (
    <div style={{
      padding: 14, background: 'white', borderRadius: 18, border: '1px solid var(--ce-line)',
      display: 'grid', gridTemplateColumns: `repeat(${size}, 1fr)`, gap: 0,
      width: 210, height: 210,
    }}>
      {cells.map((c, i) => (
        <span key={i} style={{ background: c ? 'var(--ce-ink)' : 'transparent', aspectRatio: '1/1' }} />
      ))}
    </div>
  );
}

Object.assign(window, { QRShare });
