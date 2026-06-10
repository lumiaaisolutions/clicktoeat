// admin.jsx — Admin global (gestión de locales) + Admin local (productos / theme).

const { useState: adState } = React;

// ─── Shared: Sidebar ────────────────────────────────────────────────
function AdminSidebar({ scope = 'global', active, go }) {
  const itemsGlobal = [
    { id: 'dashboard', label: 'Dashboard', icon: 'fa-house' },
    { id: 'locales', label: 'Locales', icon: 'fa-store', badge: 12 },
    { id: 'pedidos', label: 'Pedidos', icon: 'fa-receipt' },
    { id: 'clientes', label: 'Clientes', icon: 'fa-users' },
    { id: 'plans', label: 'Planes', icon: 'fa-credit-card' },
    { id: 'analytics', label: 'Analítica', icon: 'fa-chart-line' },
    { id: 'settings', label: 'Ajustes', icon: 'fa-gear' },
  ];
  const itemsLocal = [
    { id: 'home', label: 'Resumen', icon: 'fa-gauge' },
    { id: 'menu', label: 'Menú', icon: 'fa-bowl-food' },
    { id: 'categorias', label: 'Categorías', icon: 'fa-list' },
    { id: 'promos', label: 'Promociones', icon: 'fa-tag' },
    { id: 'pedidos', label: 'Pedidos', icon: 'fa-receipt' },
    { id: 'reseñas', label: 'Reseñas', icon: 'fa-star' },
    { id: 'branding', label: 'Branding', icon: 'fa-palette' },
    { id: 'ajustes', label: 'Ajustes', icon: 'fa-gear' },
  ];
  const items = scope === 'global' ? itemsGlobal : itemsLocal;

  return (
    <aside className="admin-side">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 8px 22px', cursor: 'pointer' }} onClick={() => go && go(scope === 'global' ? '/admin' : '/admin')}>
        <div style={{
          width: 36, height: 36, borderRadius: 10,
          background: 'linear-gradient(135deg, var(--ce-red) 0%, var(--ce-red-deep) 100%)',
          color: 'white', display: 'grid', placeItems: 'center',
          fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 17,
          letterSpacing: '-0.04em',
        }}>C</div>
        <div>
          <div className="ce-display" style={{ fontSize: 15, fontWeight: 800, color: 'white', letterSpacing: '-0.02em' }}>ClickEat</div>
          <div style={{ fontSize: 10, color: '#9A9694', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>
            {scope === 'global' ? 'Panel global' : 'Tacos El Gordo'}
          </div>
        </div>
      </div>

      {scope === 'local' && (
        <div style={{ marginBottom: 14 }}>
          <button style={{
            width: '100%', padding: '8px 10px', borderRadius: 10,
            background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.06)',
            color: '#E4E2DC', fontSize: 12, fontWeight: 500, textAlign: 'left',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer',
          }}>
            <span>Tacos El Gordo</span>
            <I.chevD size={14} />
          </button>
        </div>
      )}

      <nav style={{ display: 'flex', flexDirection: 'column', gap: 2, marginTop: 4 }}>
        {items.map((it) => {
          const on = active === it.id;
          const handleClick = () => {
            if (!go) return;
            if (scope === 'global') {
              if (it.id === 'locales') go('/admin');
            } else {
              if (it.id === 'menu') go(window.__currentAdminPath ? window.__currentAdminPath.replace(/\/(branding|home)$/, '/menu') : null);
              if (it.id === 'branding') go(window.__currentAdminPath ? window.__currentAdminPath.replace(/\/(menu|home)$/, '/branding') : null);
            }
          };
          return (
            <button key={it.id} onClick={handleClick} style={{
              display: 'flex', alignItems: 'center', gap: 11,
              padding: '9px 12px', borderRadius: 10,
              background: on ? 'var(--ce-red)' : 'transparent',
              color: on ? 'white' : '#C9C7C0',
              border: 'none', cursor: 'pointer',
              fontSize: 13, fontWeight: on ? 600 : 500,
              textAlign: 'left',
              transition: 'background .12s, color .12s',
            }}>
              <i className={`fas ${it.icon}`} style={{ width: 16, fontSize: 13, opacity: on ? 1 : 0.7 }}></i>
              <span style={{ flex: 1 }}>{it.label}</span>
              {it.badge && <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 99, background: on ? 'rgba(0,0,0,.25)' : 'rgba(255,255,255,.06)' }}>{it.badge}</span>}
            </button>
          );
        })}
      </nav>

      <div style={{ marginTop: 'auto', paddingTop: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 8px', borderTop: '1px solid rgba(255,255,255,.06)' }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#E4E2DC', color: 'var(--ce-ink)', display: 'grid', placeItems: 'center', fontSize: 12, fontWeight: 700 }}>JM</div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'white' }}>Jorge Martínez</div>
            <div style={{ fontSize: 10, color: '#9A9694' }}>admin@clickeat.mx</div>
          </div>
          <button style={{ background: 'transparent', border: 'none', color: '#9A9694' }}><I.more size={16} /></button>
        </div>
      </div>
    </aside>
  );
}

// ─── Shared topbar ──────────────────────────────────────────────────
function AdminTopbar({ title, sub, action }) {
  return (
    <div className="admin-topbar">
      <div>
        <div style={{ fontSize: 11, color: 'var(--ce-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>{sub}</div>
        <div className="ce-display" style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em', marginTop: 1 }}>{title}</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '8px 12px', borderRadius: 10,
          background: 'var(--ce-surface-2)', border: '1px solid var(--ce-line)',
          fontSize: 13, color: 'var(--ce-muted)', width: 280,
        }}>
          <I.search size={15} />
          <input placeholder="Buscar locales, productos, pedidos…" style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: 13 }} />
          <span className="ce-mono" style={{ fontSize: 10, padding: '2px 6px', borderRadius: 5, background: 'white', border: '1px solid var(--ce-line)' }}>⌘K</span>
        </div>
        <button style={{ width: 38, height: 38, borderRadius: 10, background: 'var(--ce-surface)', border: '1px solid var(--ce-line)', display: 'grid', placeItems: 'center', position: 'relative', cursor: 'pointer' }}>
          <I.bell size={16} />
          <span style={{ position: 'absolute', top: 8, right: 9, width: 6, height: 6, borderRadius: 99, background: 'var(--ce-red)' }}></span>
        </button>
        {action}
      </div>
    </div>
  );
}

// ─── ADMIN GLOBAL ───────────────────────────────────────────────────
function AdminGlobal({ go }) {
  const locales = window.CE_DATA.locales;
  // Augmented mock data for the global admin
  const extra = [
    { name: 'Burger House Roma', slug: 'burger-house-roma', themeClass: 'theme-tacos', rating: 4.6, status: 'active', plan: 'Pro', orders: 142, mrr: 1290 },
    { name: 'Sushi Don Pepe', slug: 'sushi-don-pepe', themeClass: 'theme-cafe', rating: 4.7, status: 'active', plan: 'Pro', orders: 89, mrr: 1290 },
    { name: 'La Antojería', slug: 'la-antojeria', themeClass: 'theme-tacos', rating: 4.4, status: 'suspended', plan: 'Free', orders: 0, mrr: 0 },
  ];
  const rows = [
    ...locales.map((l, i) => ({ name: l.name, slug: l.slug, themeClass: l.themeClass, rating: l.rating, status: 'active', plan: ['Plus', 'Pro', 'Pro', 'Plus'][i] || 'Pro', orders: [218, 184, 96, 142][i] || 50, mrr: [990, 1290, 1290, 990][i] || 590 })),
    ...extra,
  ];
  const total = rows.length;
  const active = rows.filter(r => r.status === 'active').length;
  const totalOrders = rows.reduce((s, r) => s + r.orders, 0);
  const mrr = rows.reduce((s, r) => s + r.mrr, 0);

  return (
    <div className="admin">
      <AdminSidebar scope="global" active="locales" go={go} />
      <div className="admin-main">
        <AdminTopbar
          sub="ClickEat · Plataforma"
          title="Locales"
          action={<button className="btn btn-primary" style={{ background: 'var(--ce-ink)', padding: '10px 16px' }}><I.plus size={16} /> Nuevo local</button>}
        />
        <div className="admin-content">
          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 22 }}>
            <Stat label="Locales totales" value={total} delta="+2 este mes" trend="up" />
            <Stat label="Locales activos" value={active} delta={`${active}/${total}`} trend="flat" />
            <Stat label="Pedidos hoy" value={totalOrders} delta="+18% vs ayer" trend="up" />
            <Stat label="MRR" value={`$${mrr.toLocaleString()}`} delta="+$890 este mes" trend="up" />
          </div>

          {/* Table */}
          <div className="admin-card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--ce-line)' }}>
              <div className="ce-display" style={{ fontSize: 15, fontWeight: 700, letterSpacing: '-0.015em' }}>Todos los locales</div>
              <div style={{ display: 'flex', gap: 6 }}>
                {['Todos', 'Activos', 'Suspendidos', 'Free', 'Pro'].map((f, i) => (
                  <span key={f} className="chip" style={{ fontSize: 11, background: i === 0 ? 'var(--ce-ink)' : 'var(--ce-surface)', color: i === 0 ? 'white' : 'var(--ce-ink)', borderColor: i === 0 ? 'var(--ce-ink)' : 'var(--ce-line)' }}>{f}</span>
                ))}
              </div>
            </div>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Local</th>
                  <th>Slug</th>
                  <th>Plan</th>
                  <th style={{ textAlign: 'right' }}>Pedidos hoy</th>
                  <th style={{ textAlign: 'right' }}>Calificación</th>
                  <th>Estado</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.slug} onClick={() => go && go(`/admin/${r.slug}/menu`)} style={{ cursor: 'pointer' }}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div className={r.themeClass} style={{
                          width: 32, height: 32, borderRadius: 8,
                          background: 'var(--t-primary)', color: 'var(--t-primary-ink)',
                          display: 'grid', placeItems: 'center',
                          fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 12,
                        }}>{r.name.split(' ').map(w => w[0]).slice(0,2).join('')}</div>
                        <div style={{ fontWeight: 600, color: 'var(--ce-ink)' }}>{r.name}</div>
                      </div>
                    </td>
                    <td><span className="ce-mono" style={{ fontSize: 12, color: 'var(--ce-muted)' }}>clickeat.mx/{r.slug}</span></td>
                    <td><span className="chip" style={{ fontSize: 11, padding: '3px 9px', background: r.plan === 'Plus' ? '#FFF4E1' : r.plan === 'Pro' ? '#E8F1FF' : 'var(--ce-surface-2)', borderColor: 'transparent', color: r.plan === 'Plus' ? '#92400E' : r.plan === 'Pro' ? '#1E40AF' : 'var(--ce-muted)', fontWeight: 700 }}>{r.plan}</span></td>
                    <td style={{ textAlign: 'right' }}><span className="ce-mono" style={{ fontWeight: 600 }}>{r.orders}</span></td>
                    <td style={{ textAlign: 'right' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 600 }}>
                        <I.star size={12} filled style={{ color: '#FFB400' }} /> {r.rating}
                      </span>
                    </td>
                    <td>
                      <span className={`live-pill ${r.status === 'active' ? 'live-pill-open' : 'live-pill-closed'}`}>
                        {r.status === 'active' ? 'Activo' : 'Suspendido'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: 4 }}>
                        <button style={{ width: 28, height: 28, borderRadius: 7, background: 'transparent', border: '1px solid var(--ce-line)', color: 'var(--ce-muted)', display: 'grid', placeItems: 'center', cursor: 'pointer' }}><I.edit size={12} /></button>
                        <button style={{ width: 28, height: 28, borderRadius: 7, background: 'transparent', border: '1px solid var(--ce-line)', color: 'var(--ce-muted)', display: 'grid', placeItems: 'center', cursor: 'pointer' }}><I.more size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, delta, trend }) {
  const color = trend === 'up' ? '#15803D' : trend === 'down' ? '#B91C1C' : 'var(--ce-muted)';
  const arrow = trend === 'up' ? '↑' : trend === 'down' ? '↓' : '·';
  return (
    <div className="admin-stat">
      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ce-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</div>
      <div className="ce-display" style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.025em', marginTop: 5 }}>{value}</div>
      <div style={{ fontSize: 12, color, marginTop: 4, fontWeight: 500 }}>{arrow} {delta}</div>
    </div>
  );
}

// ─── ADMIN LOCAL — Menú (productos) ─────────────────────────────────
function AdminLocal({ local, go }) {
  return (
    <div className="admin">
      <AdminSidebar scope="local" active="menu" go={go} />
      <div className="admin-main">
        <AdminTopbar
          sub={`${local.name} · Admin del local`}
          title="Menú & productos"
          action={
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-outline" onClick={() => go && go(`/r/${local.slug}/qr`)} style={{ padding: '9px 14px' }}><I.qr size={15} /> QR del menú</button>
              <button className="btn btn-outline" onClick={() => go && go(`/r/${local.slug}`)} style={{ padding: '9px 14px' }}><i className="fas fa-external-link-alt" style={{ fontSize: 11 }}></i> Ver landing</button>
              <button className="btn btn-primary" style={{ background: 'var(--ce-ink)', padding: '10px 16px' }}><I.plus size={16} /> Nuevo producto</button>
            </div>
          }
        />
        <div className="admin-content">
          <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: 22 }}>
            {/* Categories sidebar */}
            <div className="admin-card" style={{ padding: 14, height: 'fit-content' }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ce-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Categorías</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {local.categories.map((c, i) => (
                  <button key={c.id} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '8px 10px', borderRadius: 9,
                    background: i === 0 ? 'var(--ce-surface-2)' : 'transparent',
                    border: 'none', cursor: 'pointer',
                    fontSize: 13, fontWeight: i === 0 ? 600 : 500, color: 'var(--ce-ink)',
                    textAlign: 'left',
                  }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                      <i className={`fas ${c.icon}`} style={{ width: 14, fontSize: 12, color: 'var(--ce-muted)' }}></i>
                      {c.name}
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--ce-muted)' }}>{local.products.filter(p => p.cat === c.id).length}</span>
                  </button>
                ))}
              </div>
              <button style={{ marginTop: 10, padding: '8px 10px', width: '100%', borderRadius: 9, background: 'transparent', border: '1px dashed var(--ce-line)', color: 'var(--ce-muted)', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <I.plus size={14} /> Categoría
              </button>
            </div>

            {/* Products list */}
            <div className="admin-card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--ce-line)' }}>
                <div className="ce-display" style={{ fontSize: 15, fontWeight: 700, letterSpacing: '-0.015em' }}>Tacos · 4 productos</div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 12, color: 'var(--ce-muted)' }}>
                  <span>Ordenar:</span>
                  <button className="chip" style={{ fontSize: 11 }}>Manual <I.chevD size={11} /></button>
                </div>
              </div>
              <table className="admin-table">
                <thead>
                  <tr>
                    <th style={{ width: 60 }}></th>
                    <th>Producto</th>
                    <th style={{ textAlign: 'right' }}>Precio</th>
                    <th>Tag</th>
                    <th>Disponible</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {local.products.slice(0, 6).map((p) => (
                    <tr key={p.id}>
                      <td><div style={{ width: 44, height: 44, borderRadius: 8, backgroundImage: `url(${p.photo})`, backgroundSize: 'cover', backgroundPosition: 'center' }} /></td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{p.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--ce-muted)', marginTop: 2, maxWidth: 320, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.desc}</div>
                      </td>
                      <td style={{ textAlign: 'right' }}><span className="ce-mono" style={{ fontWeight: 600 }}>{money(p.price)}</span></td>
                      <td>{p.tag ? <span className="chip" style={{ fontSize: 11, padding: '3px 8px', background: '#FFF4E1', borderColor: 'transparent', color: '#92400E', fontWeight: 700 }}><I.fire size={10} /> {p.tag}</span> : <span style={{ color: 'var(--ce-muted-2)' }}>—</span>}</td>
                      <td>
                        <Toggle on={p.available} />
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: 4 }}>
                          <button style={{ width: 28, height: 28, borderRadius: 7, background: 'transparent', border: '1px solid var(--ce-line)', color: 'var(--ce-muted)', display: 'grid', placeItems: 'center', cursor: 'pointer' }}><I.edit size={12} /></button>
                          <button style={{ width: 28, height: 28, borderRadius: 7, background: 'transparent', border: '1px solid var(--ce-line)', color: '#B91C1C', display: 'grid', placeItems: 'center', cursor: 'pointer' }}><I.trash size={12} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Toggle({ on }) {
  const [v, setV] = adState(on);
  return (
    <button onClick={() => setV(!v)} style={{
      position: 'relative', width: 36, height: 20, borderRadius: 99,
      background: v ? '#15803D' : 'var(--ce-line)', border: 'none', padding: 0,
      transition: 'background .15s', cursor: 'pointer',
    }}>
      <span style={{
        position: 'absolute', top: 2, left: v ? 18 : 2, width: 16, height: 16, borderRadius: '50%',
        background: 'white', boxShadow: '0 1px 3px rgba(0,0,0,.15)',
        transition: 'left .15s var(--ease-spring)',
      }} />
    </button>
  );
}

// ─── ADMIN LOCAL — Branding / Theme customizer ──────────────────────
function AdminBranding({ local, go }) {
  const [primary, setPrimary] = adState('#E11D2E');
  const [accent, setAccent] = adState('#FFC629');
  const [font, setFont] = adState('display');
  const [card, setCard] = adState('rounded');
  const [hero, setHero] = adState('photo');

  return (
    <div className="admin">
      <AdminSidebar scope="local" active="branding" go={go} />
      <div className="admin-main">
        <AdminTopbar
          sub={`${local.name} · Branding`}
          title="Personaliza tu landing"
          action={
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-outline" onClick={() => go && go(`/r/${local.slug}`)} style={{ padding: '9px 14px' }}><i className="fas fa-external-link-alt" style={{ fontSize: 11 }}></i> Ver en vivo</button>
              <button className="btn btn-primary" style={{ background: 'var(--ce-red)', padding: '10px 16px' }}>Guardar cambios</button>
            </div>
          }
        />
        <div className="admin-content">
          <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: 22 }}>
            {/* Controls */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="admin-card">
                <SectionH>Logo & nombre</SectionH>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 12 }}>
                  <div style={{ width: 72, height: 72, borderRadius: 18, background: primary, color: 'white', display: 'grid', placeItems: 'center', fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 26, letterSpacing: '-0.04em' }}>TG</div>
                  <div style={{ flex: 1 }}>
                    <span className="field-lbl" style={{ color: 'var(--ce-muted)' }}>Nombre del local</span>
                    <input className="field" defaultValue={local.name} style={{ background: 'white' }} />
                    <button className="btn btn-outline" style={{ marginTop: 8, fontSize: 12, padding: '8px 12px' }}><I.upload size={14} /> Subir logo</button>
                  </div>
                </div>
              </div>

              <div className="admin-card">
                <SectionH>Paleta de colores</SectionH>
                <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <ColorRow label="Color primario" value={primary} onChange={setPrimary} options={['#E11D2E', '#FF3D2E', '#B23A1A', '#0EA5E9', '#3A2418', '#0F766E', '#7C2D12']} />
                  <ColorRow label="Acento" value={accent} onChange={setAccent} options={['#FFC629', '#FCD34D', '#84CC16', '#FB7185', '#D4A24C', '#10B981']} />
                </div>
              </div>

              <div className="admin-card">
                <SectionH>Tipografía</SectionH>
                <Seg value={font} onChange={setFont} options={[
                  { id: 'display', label: 'Display (Bricolage)' },
                  { id: 'sans', label: 'Sans (Geist)' },
                ]} />
              </div>

              <div className="admin-card">
                <SectionH>Estilo de cards</SectionH>
                <Seg value={card} onChange={setCard} options={[
                  { id: 'square', label: 'Cuadrado' },
                  { id: 'rounded', label: 'Redondeado' },
                  { id: 'glass', label: 'Glass' },
                ]} />
              </div>

              <div className="admin-card">
                <SectionH>Hero</SectionH>
                <Seg value={hero} onChange={setHero} options={[
                  { id: 'photo', label: 'Foto' },
                  { id: 'gradient', label: 'Gradiente' },
                ]} />
              </div>
            </div>

            {/* Live preview */}
            <div className="admin-card" style={{ padding: 0, overflow: 'hidden', position: 'sticky', top: 0 }}>
              <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--ce-line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div className="ce-display" style={{ fontSize: 14, fontWeight: 700, letterSpacing: '-0.015em' }}>Vista previa en vivo</div>
                  <div className="ce-mono" style={{ fontSize: 11, color: 'var(--ce-muted)', marginTop: 2 }}>clickeat.mx/{local.slug}</div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button className="chip" style={{ background: 'var(--ce-ink)', color: 'white', borderColor: 'transparent' }}><i className="fas fa-mobile-screen" style={{ fontSize: 11 }}></i> Mobile</button>
                  <button className="chip"><i className="fas fa-desktop" style={{ fontSize: 11 }}></i> Desktop</button>
                </div>
              </div>
              <div style={{ padding: 20, background: 'var(--ce-surface-2)', minHeight: 480, display: 'grid', placeItems: 'center' }}>
                <div style={{
                  width: 270, height: 560,
                  borderRadius: 28, overflow: 'hidden',
                  boxShadow: '0 30px 60px -20px rgba(0,0,0,.25)',
                  background: 'white',
                  ['--t-primary']: primary,
                  ['--t-primary-deep']: primary,
                  ['--t-primary-ink']: 'white',
                  ['--t-accent']: accent,
                  ['--t-accent-ink']: '#111',
                  position: 'relative',
                }} className={`${local.themeClass} style-${card} hero-${hero}`}>
                  <PreviewTile local={local} hero={hero} primary={primary} accent={accent} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PreviewTile({ local, hero, primary, accent }) {
  return (
    <div style={{ padding: '20px 14px', background: 'var(--t-bg)', height: '100%', display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{
        height: 130, borderRadius: 18, overflow: 'hidden', position: 'relative',
        backgroundImage: hero === 'photo' ? `url(${local.hero})` : undefined,
        background: hero !== 'photo' ? `linear-gradient(140deg, ${primary}, ${primary})` : undefined,
        backgroundSize: 'cover', backgroundPosition: 'center',
      }}>
        {hero === 'photo' && <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, transparent 40%, rgba(0,0,0,.6))' }} />}
        <div style={{ position: 'absolute', bottom: 10, left: 12, right: 12, color: 'white' }}>
          <div className="ce-display" style={{ fontSize: 14, fontWeight: 700, letterSpacing: '-0.015em' }}>{local.name}</div>
          <div style={{ fontSize: 9, opacity: 0.9, marginTop: 2 }}>⭐ {local.rating} · {local.deliveryMin} min</div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        {local.categories.slice(0, 3).map((c, i) => (
          <span key={c.id} style={{ padding: '5px 10px', borderRadius: 99, background: i === 0 ? primary : 'white', color: i === 0 ? 'white' : '#111', fontSize: 10, fontWeight: 600, border: '1px solid ' + (i === 0 ? primary : '#E8E5DE') }}>{c.name}</span>
        ))}
      </div>
      <div style={{ background: 'white', borderRadius: 14, padding: 10, display: 'flex', gap: 10, border: '1px solid #E8E5DE' }}>
        <div style={{ width: 60, height: 60, borderRadius: 10, backgroundImage: `url(${local.products[0].photo})`, backgroundSize: 'cover' }} />
        <div style={{ flex: 1 }}>
          <div className="ce-display" style={{ fontSize: 12, fontWeight: 700 }}>{local.products[0].name}</div>
          <div style={{ fontSize: 10, color: '#6B6B73', marginTop: 2, lineHeight: 1.35, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{local.products[0].desc}</div>
          <div className="ce-mono" style={{ fontSize: 12, fontWeight: 700, color: primary, marginTop: 4 }}>{money(local.products[0].price)}</div>
        </div>
      </div>
      <button style={{ marginTop: 'auto', width: '100%', padding: '11px 14px', borderRadius: 99, background: primary, color: 'white', border: 'none', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><span style={{ width: 18, height: 18, borderRadius: 99, background: 'rgba(0,0,0,.2)', display: 'grid', placeItems: 'center' }}>2</span> Carrito</span>
        <span className="ce-mono">$78</span>
      </button>
    </div>
  );
}

function SectionH({ children }) {
  return <div className="ce-display" style={{ fontSize: 13, fontWeight: 700, letterSpacing: '-0.01em' }}>{children}</div>;
}

function ColorRow({ label, value, onChange, options }) {
  return (
    <div>
      <span className="field-lbl" style={{ color: 'var(--ce-muted)' }}>{label}</span>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
        <span className="ce-mono" style={{ fontSize: 11, fontWeight: 600, padding: '5px 9px', borderRadius: 7, background: 'white', border: '1px solid var(--ce-line)' }}>{value}</span>
        {options.map((c) => (
          <button key={c} onClick={() => onChange(c)} style={{
            width: 28, height: 28, borderRadius: '50%', background: c, border: '2px solid ' + (value === c ? 'var(--ce-ink)' : 'white'),
            boxShadow: '0 0 0 1px var(--ce-line)', cursor: 'pointer',
          }} />
        ))}
      </div>
    </div>
  );
}

function Seg({ value, onChange, options }) {
  return (
    <div style={{ display: 'flex', padding: 3, background: 'var(--ce-surface-2)', borderRadius: 10, marginTop: 10 }}>
      {options.map((o) => {
        const on = value === o.id;
        return (
          <button key={o.id} onClick={() => onChange(o.id)} style={{
            flex: 1, padding: '8px 10px', borderRadius: 7,
            background: on ? 'white' : 'transparent',
            color: 'var(--ce-ink)',
            border: 'none', cursor: 'pointer',
            fontSize: 12, fontWeight: on ? 600 : 500,
            boxShadow: on ? '0 1px 2px rgba(0,0,0,.08)' : 'none',
            transition: 'all .15s',
          }}>{o.label}</button>
        );
      })}
    </div>
  );
}

Object.assign(window, { AdminGlobal, AdminLocal, AdminBranding });
