// landing.jsx — Public landing for a tenant. Mobile-first, fully interactive.
// Flows: menu → product detail (extras+notes) → cart → checkout → WhatsApp.

const { useState: lsUse, useEffect: lsEff, useRef: lsRef, useMemo: lsMemo } = React;

// ─── Landing root ───────────────────────────────────────────────────
function Landing({ local, density = 'regular', cardStyle = 'rounded', hero = 'photo', dark = false, initialView = 'menu', forceProductModal = null, forceCartOpen = false, forceCheckout = false, forceWAConfirm = false, demoCart = null, standalone = false, onBack = null }) {
  const [view, setView] = lsUse(initialView); // 'menu' | 'checkout' | 'wa'
  const [activeCat, setActiveCat] = lsUse(local.categories[0]?.id);
  const [openProduct, setOpenProduct] = lsUse(forceProductModal);
  const [cartOpen, setCartOpen] = lsUse(forceCartOpen);
  const [cart, setCart] = lsUse(demoCart || []);
  const [toast, setToast] = lsUse(null);
  const [favs, setFavs] = lsUse(new Set());
  const bodyRef = lsRef(null);
  const sectionRefs = lsRef({});

  lsEff(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2200);
    return () => clearTimeout(t);
  }, [toast]);

  lsEff(() => {
    if (forceCheckout) setView('checkout');
    if (forceWAConfirm) setView('wa');
  }, [forceCheckout, forceWAConfirm]);

  const addToCart = (product, qty, extras, notes) => {
    setCart((c) => [...c, { id: 'line-' + Date.now() + Math.random(), product, qty, extras, notes }]);
    setToast({ icon: 'check', text: `${qty}× ${product.name} agregado al carrito` });
    setOpenProduct(null);
  };

  const removeFromCart = (lineId) => setCart((c) => c.filter((l) => l.id !== lineId));
  const updateQty = (lineId, qty) => setCart((c) => c.map((l) => l.id === lineId ? { ...l, qty: Math.max(1, qty) } : l));

  const cartCount = cart.reduce((s, l) => s + l.qty, 0);
  const subtotal = cart.reduce((s, l) => s + (l.product.price + (l.extras||[]).reduce((a,e)=>a+e.price,0)) * l.qty, 0);

  const themeCls = `${local.themeClass} ${dark ? 'theme-dark' : ''} style-${cardStyle} density-${density} hero-${hero}`;

  return (
    <div className={`phone ${themeCls}`}>
      {!standalone && <StatusBar />}

      {view === 'menu' && (
        <>
          <LandingHeader local={local} cartCount={cartCount} onOpenCart={() => setCartOpen(true)} onBack={onBack} />
          <div className="phone-body" ref={bodyRef}>
            <Hero local={local} variant={hero} />
            <DeliveryStrip local={local} />
            <CategoryRail local={local} active={activeCat} onPick={(id) => {
              setActiveCat(id);
              const el = sectionRefs.current[id];
              if (el && bodyRef.current) {
                bodyRef.current.scrollTo({ top: el.offsetTop - 110, behavior: 'smooth' });
              }
            }} />
            <PromosCarousel promos={local.promos} onPick={() => setToast({ icon: 'fire', text: '¡Promoción agregada!' })} />
            {local.categories.filter(c => c.id !== 'promos').map((cat) => (
              <CategorySection
                key={cat.id}
                cat={cat}
                products={local.products.filter(p => p.cat === cat.id)}
                onProduct={setOpenProduct}
                onFav={(id) => setFavs((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; })}
                favs={favs}
                sectionRef={(el) => (sectionRefs.current[cat.id] = el)}
              />
            ))}
            <InfoBlock local={local} />
            <ReviewsBlock local={local} />
            <Footer local={local} />
            <div style={{ height: 110 }} />
          </div>
          <FloatingCart count={cartCount} subtotal={subtotal} onClick={() => setCartOpen(true)} />
        </>
      )}

      {view === 'checkout' && (
        <Checkout local={local} cart={cart} subtotal={subtotal} onBack={() => setView('menu')} onConfirm={() => setView('wa')} />
      )}

      {view === 'wa' && (
        <WAConfirm local={local} cart={cart} subtotal={subtotal} onBack={() => setView('checkout')} />
      )}

      {openProduct && (
        <div className="modal-layer" style={{ position: 'absolute', inset: 0, zIndex: 100 }}>
          <ProductModal
            product={openProduct}
            onClose={() => setOpenProduct(null)}
            onAdd={addToCart}
          />
        </div>
      )}

      {cartOpen && (
        <div className="modal-layer" style={{ position: 'absolute', inset: 0, zIndex: 100 }}>
          <CartSheet
            local={local}
            cart={cart}
            subtotal={subtotal}
            onClose={() => setCartOpen(false)}
            onRemove={removeFromCart}
            onUpdateQty={updateQty}
            onCheckout={() => { setCartOpen(false); setView('checkout'); }}
          />
        </div>
      )}

      {toast && (
        <div className="toast">
          <span style={{ width: 26, height: 26, borderRadius: '50%', background: 'var(--t-primary)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
            {toast.icon === 'check' ? <I.check size={14} /> : <I.fire size={14} />}
          </span>
          <span>{toast.text}</span>
        </div>
      )}

      {!standalone && <BottomBar />}
    </div>
  );
}

// ─── Header ─────────────────────────────────────────────────────────
function LandingHeader({ local, cartCount, onOpenCart, onBack }) {
  return (
    <div style={{ padding: '8px 16px 6px', display: 'flex', alignItems: 'center', gap: 12, background: 'var(--t-bg)', position: 'sticky', top: 0, zIndex: 10 }}>
      <button onClick={onBack} className="btn btn-ghost" style={{ padding: 8, width: 38, height: 38, borderRadius: 12 }}>{onBack ? <I.arrowL /> : <I.menu />}</button>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10,
          background: 'var(--t-primary)', color: 'var(--t-primary-ink)',
          display: 'grid', placeItems: 'center',
          fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 14,
          letterSpacing: '-0.04em',
        }}>{local.logoMonogram}</div>
        <div style={{ minWidth: 0 }}>
          <div className="ce-display" style={{ fontSize: 15, lineHeight: 1, fontWeight: 700, letterSpacing: '-0.02em' }}>{local.name}</div>
          <div style={{ fontSize: 11, color: 'var(--t-muted)', marginTop: 2, display: 'flex', gap: 6, alignItems: 'center' }}>
            <I.star size={10} filled style={{ color: '#FFB400' }} />
            <span style={{ fontWeight: 600, color: 'var(--t-ink)' }}>{local.rating}</span>
            <span>·</span>
            <span>{local.reviewCount}+ reseñas</span>
          </div>
        </div>
      </div>
      <button
        onClick={onOpenCart}
        style={{
          position: 'relative',
          width: 40, height: 40, borderRadius: 14,
          background: 'var(--ce-ink)', color: 'white',
          border: 'none', display: 'grid', placeItems: 'center',
        }}>
        <I.bag size={18} />
        {cartCount > 0 && (
          <span style={{
            position: 'absolute', top: -4, right: -4,
            minWidth: 20, height: 20, padding: '0 5px',
            borderRadius: 99, background: 'var(--t-primary)', color: 'var(--t-primary-ink)',
            fontSize: 11, fontWeight: 700,
            display: 'grid', placeItems: 'center',
            border: '2px solid var(--t-bg)',
          }}>{cartCount}</span>
        )}
      </button>
    </div>
  );
}

// ─── Hero ───────────────────────────────────────────────────────────
function Hero({ local, variant }) {
  return (
    <div style={{ padding: '0 16px 16px' }}>
      <div className="hero-canvas" style={{
        position: 'relative',
        height: 220, borderRadius: 26,
        overflow: 'hidden',
        backgroundImage: variant === 'photo' ? `url(${local.hero})` : undefined,
        backgroundSize: 'cover', backgroundPosition: 'center',
        backgroundColor: variant !== 'photo' ? 'var(--t-primary)' : undefined,
      }}>
        {/* Scrim */}
        {variant === 'photo' && (
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,0) 30%, rgba(0,0,0,.65) 100%)' }} />
        )}
        {variant === 'gradient' && (
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(140deg, var(--t-primary) 0%, var(--t-primary-deep) 100%)' }}>
            <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 20% 30%, color-mix(in srgb, var(--t-accent) 60%, transparent), transparent 50%), radial-gradient(circle at 80% 70%, rgba(255,255,255,.15), transparent 50%)' }} />
          </div>
        )}
        {/* Open pill */}
        <div style={{ position: 'absolute', top: 14, left: 14 }}>
          <span className="live-pill live-pill-open" style={{ background: 'rgba(255,255,255,.95)' }}>Abierto · cierra {local.hours.close}:00</span>
        </div>
        {/* Bottom block */}
        <div style={{ position: 'absolute', bottom: 16, left: 16, right: 16, color: 'white' }}>
          <div className="ce-display" style={{ fontSize: 28, lineHeight: 1.05, letterSpacing: '-0.025em', textWrap: 'pretty', maxWidth: 280 }}>
            {local.tagline}
          </div>
          <div style={{ display: 'flex', gap: 14, marginTop: 12, fontSize: 12, opacity: 0.95, fontWeight: 500 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><I.clock size={13} /> {local.deliveryMin} min</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><I.bike size={13} /> Envío {money(local.deliveryFee)}</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><I.star size={12} filled /> {local.rating}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Delivery strip (search + utilities) ────────────────────────────
function DeliveryStrip({ local }) {
  return (
    <div style={{ padding: '0 16px 14px' }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '12px 14px',
        background: 'var(--t-surface)',
        border: '1px solid var(--t-line)',
        borderRadius: 16,
      }}>
        <I.search size={16} style={{ color: 'var(--t-muted)' }} />
        <input
          placeholder={`Buscar en ${local.name}…`}
          style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: 14, color: 'var(--t-ink)' }}
        />
        <span className="ce-mono" style={{ fontSize: 11, padding: '4px 8px', borderRadius: 99, background: 'var(--t-surface-2, #F5F2EC)', color: 'var(--t-muted)' }}>⌘K</span>
      </div>
    </div>
  );
}

// ─── Category rail ──────────────────────────────────────────────────
function CategoryRail({ local, active, onPick }) {
  return (
    <div style={{ position: 'sticky', top: 54, background: 'var(--t-bg)', zIndex: 9, padding: '6px 0 10px' }}>
      <div className="no-bar" style={{ display: 'flex', gap: 8, overflowX: 'auto', padding: '0 16px', scrollSnapType: 'x mandatory' }}>
        {local.categories.map((c) => {
          const on = c.id === active;
          return (
            <button
              key={c.id}
              onClick={() => onPick(c.id)}
              style={{
                flexShrink: 0, scrollSnapAlign: 'start',
                padding: '8px 14px', borderRadius: 99,
                background: on ? 'var(--t-ink)' : 'var(--t-surface)',
                color: on ? 'var(--t-bg)' : 'var(--t-ink)',
                border: '1px solid ' + (on ? 'var(--t-ink)' : 'var(--t-line)'),
                fontSize: 13, fontWeight: 600,
                display: 'inline-flex', alignItems: 'center', gap: 7,
                transition: 'all .15s var(--ease-out)',
                letterSpacing: '-0.01em',
              }}
            >
              <i className={`fas ${c.icon}`} style={{ fontSize: 11, opacity: 0.85 }}></i>
              {c.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Promos carousel ────────────────────────────────────────────────
function PromosCarousel({ promos, onPick }) {
  if (!promos || !promos.length) return null;
  return (
    <div style={{ padding: '6px 0 18px' }}>
      <SectionTitle title="Promociones" sub="Ofertas activas hoy" />
      <div className="no-bar" style={{ display: 'flex', gap: 12, overflowX: 'auto', padding: '0 16px', scrollSnapType: 'x mandatory' }}>
        {promos.map((p) => (
          <div
            key={p.id}
            onClick={onPick}
            style={{
              flexShrink: 0, scrollSnapAlign: 'start',
              width: 260, height: 130,
              borderRadius: 20, overflow: 'hidden', position: 'relative',
              backgroundImage: `linear-gradient(180deg, rgba(0,0,0,0) 30%, rgba(0,0,0,.75) 100%), url(${p.cover})`,
              backgroundSize: 'cover', backgroundPosition: 'center',
              cursor: 'pointer',
            }}
          >
            <div style={{ position: 'absolute', top: 12, left: 12 }}>
              <span style={{ padding: '4px 10px', borderRadius: 99, background: 'var(--t-accent)', color: 'var(--t-accent-ink)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{p.badge}</span>
            </div>
            <div style={{ position: 'absolute', bottom: 12, left: 14, right: 14, color: 'white' }}>
              <div className="ce-display" style={{ fontSize: 17, lineHeight: 1.1, fontWeight: 700, letterSpacing: '-0.02em' }}>{p.title}</div>
              <div style={{ fontSize: 11, opacity: 0.85, marginTop: 3 }}>{p.sub}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SectionTitle({ title, sub }) {
  return (
    <div style={{ padding: '0 16px 12px' }}>
      <h2 className="ce-display" style={{ margin: 0, fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--t-ink)' }}>{title}</h2>
      {sub && <div style={{ fontSize: 12, color: 'var(--t-muted)', marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

// ─── Category section with products ─────────────────────────────────
function CategorySection({ cat, products, onProduct, onFav, favs, sectionRef }) {
  return (
    <div ref={sectionRef} style={{ padding: '6px 0 18px' }}>
      <SectionTitle title={cat.name} sub={`${products.length} ${products.length === 1 ? 'producto' : 'productos'}`} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--d-gap)', padding: '0 16px' }}>
        {products.map((p) => (
          <ProductCard key={p.id} product={p} onClick={() => p.available && onProduct(p)} onFav={() => onFav(p.id)} fav={favs.has(p.id)} />
        ))}
      </div>
    </div>
  );
}

// ─── Product card ───────────────────────────────────────────────────
function ProductCard({ product, onClick, onFav, fav }) {
  return (
    <div
      className="card product-card"
      onClick={onClick}
      style={{
        display: 'flex', gap: 12, padding: 12,
        cursor: product.available ? 'pointer' : 'not-allowed',
        opacity: product.available ? 1 : 0.55,
        position: 'relative',
        transition: 'transform .15s var(--ease-out), box-shadow .15s',
      }}
      onMouseEnter={(e) => { if (product.available) { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = 'var(--sh-md)'; } }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}
    >
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
          {product.tag && (
            <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--t-primary)' }}>
              <I.fire size={11} style={{ verticalAlign: -1, marginRight: 3 }} /> {product.tag}
            </span>
          )}
        </div>
        <div className="ce-display" style={{ fontSize: 15, fontWeight: 700, color: 'var(--t-ink)', letterSpacing: '-0.015em', lineHeight: 1.2 }}>
          {product.name}
        </div>
        <div style={{ fontSize: 12, color: 'var(--t-muted)', marginTop: 4, lineHeight: 1.4, textWrap: 'pretty', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {product.desc}
        </div>
        <div style={{ marginTop: 'auto', paddingTop: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div className="ce-mono" style={{ fontSize: 15, fontWeight: 700, color: 'var(--t-ink)' }}>{money(product.price)}</div>
          {!product.available && (
            <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--t-muted)', padding: '3px 8px', borderRadius: 99, background: 'var(--t-line)' }}>Agotado</span>
          )}
        </div>
      </div>
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <div style={{
          width: 96, height: 96,
          borderRadius: 14,
          backgroundImage: `url(${product.photo})`,
          backgroundSize: 'cover', backgroundPosition: 'center',
          background: `var(--t-line) url(${product.photo}) center/cover`,
        }} />
        {product.available && (
          <button
            onClick={(e) => { e.stopPropagation(); onClick(); }}
            style={{
              position: 'absolute', bottom: -6, right: -6,
              width: 30, height: 30, borderRadius: '50%',
              background: 'var(--t-primary)', color: 'var(--t-primary-ink)',
              border: '2px solid var(--t-surface)',
              display: 'grid', placeItems: 'center',
              boxShadow: '0 6px 14px -4px rgba(0,0,0,.25)',
            }}><I.plus size={16} weight={2.8} /></button>
        )}
      </div>
    </div>
  );
}

// ─── Info block (horarios, ubicación, redes) ────────────────────────
function InfoBlock({ local }) {
  return (
    <div style={{ padding: '6px 16px 18px' }}>
      <SectionTitle title="Información del local" />
      <div className="card" style={{ padding: 16, marginTop: -8 }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <span style={{ width: 32, height: 32, borderRadius: 10, background: 'var(--t-primary-soft)', color: 'var(--t-primary-deep)', display: 'grid', placeItems: 'center', flexShrink: 0 }}><I.pin size={16} /></span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--t-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Ubicación</div>
            <div style={{ fontSize: 13, marginTop: 2, color: 'var(--t-ink)', textWrap: 'pretty' }}>{local.address}</div>
          </div>
        </div>
        {/* Mini map */}
        <div style={{ marginTop: 12, height: 110, borderRadius: 14, overflow: 'hidden', position: 'relative', background: 'var(--t-surface-2, #EFE9DF)' }}>
          <MiniMap />
          <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center' }}>
            <span style={{ width: 32, height: 32, borderRadius: '50% 50% 50% 0', background: 'var(--t-primary)', color: 'var(--t-primary-ink)', display: 'grid', placeItems: 'center', transform: 'rotate(-45deg)', boxShadow: '0 6px 18px -4px rgba(0,0,0,.3)' }}>
              <span style={{ transform: 'rotate(45deg)', fontSize: 12 }}>📍</span>
            </span>
          </div>
        </div>

        <div style={{ height: 1, background: 'var(--t-line)', margin: '14px 0' }}></div>

        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <span style={{ width: 32, height: 32, borderRadius: 10, background: 'var(--t-primary-soft)', color: 'var(--t-primary-deep)', display: 'grid', placeItems: 'center', flexShrink: 0 }}><I.clock size={16} /></span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--t-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Horarios</div>
            <div style={{ fontSize: 13, marginTop: 2, color: 'var(--t-ink)' }}>Todos los días · {String(local.hours.open).padStart(2,'0')}:00 — {String(local.hours.close).padStart(2,'0')}:00</div>
            <span className="live-pill live-pill-open" style={{ marginTop: 8 }}>Abierto ahora</span>
          </div>
        </div>

        <div style={{ height: 1, background: 'var(--t-line)', margin: '14px 0' }}></div>

        <div style={{ display: 'flex', gap: 8 }}>
          {local.socials.ig && <SocialPill icon="instagram" label={'@' + local.socials.ig} />}
          {local.socials.fb && <SocialPill icon="facebook" label={local.socials.fb} />}
          {local.socials.tt && <SocialPill icon="tiktok" label={'@' + local.socials.tt} />}
        </div>
      </div>
    </div>
  );
}

function SocialPill({ icon, label }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 11px', borderRadius: 99, background: 'var(--t-surface-2, #F5F2EC)', fontSize: 12, color: 'var(--t-ink)', fontWeight: 500, border: '1px solid var(--t-line)' }}>
      <i className={`fab fa-${icon}`} style={{ fontSize: 12 }}></i>
      {label}
    </span>
  );
}

// SVG mini map (decorative)
function MiniMap() {
  return (
    <svg width="100%" height="100%" viewBox="0 0 320 110" preserveAspectRatio="xMidYMid slice" style={{ display: 'block' }}>
      <rect width="320" height="110" fill="var(--t-surface-2, #EFE9DF)" />
      {/* roads */}
      <path d="M-10 60 L330 70" stroke="var(--t-line)" strokeWidth="14" />
      <path d="M-10 30 L330 25" stroke="var(--t-line)" strokeWidth="8" />
      <path d="M-10 90 L330 95" stroke="var(--t-line)" strokeWidth="8" />
      <path d="M70 -10 L80 130" stroke="var(--t-line)" strokeWidth="10" />
      <path d="M180 -10 L195 130" stroke="var(--t-line)" strokeWidth="10" />
      <path d="M260 -10 L275 130" stroke="var(--t-line)" strokeWidth="8" />
      {/* park */}
      <rect x="100" y="35" width="60" height="32" rx="6" fill="color-mix(in srgb, var(--t-primary) 12%, var(--t-surface-2, #EFE9DF))" />
      <rect x="210" y="35" width="40" height="22" rx="4" fill="color-mix(in srgb, var(--t-primary) 8%, var(--t-surface-2, #EFE9DF))" />
    </svg>
  );
}

// ─── Reviews ────────────────────────────────────────────────────────
function ReviewsBlock({ local }) {
  if (!local.reviews?.length) return null;
  return (
    <div style={{ padding: '6px 0 18px' }}>
      <div style={{ padding: '0 16px 12px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <div>
          <h2 className="ce-display" style={{ margin: 0, fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em' }}>Opiniones</h2>
          <div style={{ fontSize: 12, color: 'var(--t-muted)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Stars rating={local.rating} size={13} />
            <span style={{ fontWeight: 600, color: 'var(--t-ink)' }}>{local.rating}</span>
            <span>· {local.reviewCount} reseñas</span>
          </div>
        </div>
        <button className="btn btn-ghost" style={{ fontSize: 12, padding: '6px 0' }}>Ver todas <I.chevR size={14} /></button>
      </div>
      <div className="no-bar" style={{ display: 'flex', gap: 12, overflowX: 'auto', padding: '0 16px' }}>
        {local.reviews.map((r, i) => (
          <div key={i} className="card" style={{ flexShrink: 0, width: 260, padding: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--t-primary-soft)', color: 'var(--t-primary-deep)', display: 'grid', placeItems: 'center', fontSize: 11, fontWeight: 700 }}>{r.name[0]}</span>
                <div style={{ fontSize: 12, fontWeight: 600 }}>{r.name}</div>
              </div>
              <Stars rating={r.rating} size={11} />
            </div>
            <div style={{ fontSize: 12, color: 'var(--t-ink)', opacity: 0.85, marginTop: 8, lineHeight: 1.45, textWrap: 'pretty' }}>"{r.text}"</div>
            <div style={{ fontSize: 11, color: 'var(--t-muted)', marginTop: 8 }}>{r.when}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Footer ─────────────────────────────────────────────────────────
function Footer({ local }) {
  return (
    <div style={{ padding: '20px 16px 24px', textAlign: 'center' }}>
      <div className="ce-display" style={{ fontSize: 14, fontWeight: 700, opacity: 0.5, letterSpacing: '-0.02em' }}>{local.name}</div>
      <div style={{ fontSize: 11, color: 'var(--t-muted)', marginTop: 4 }}>Pedidos vía clickeat.mx · {local.slug}</div>
    </div>
  );
}

// ─── Floating cart (sticky bottom) ──────────────────────────────────
function FloatingCart({ count, subtotal, onClick }) {
  if (!count) return (
    <div className="floating-cart" style={{ position: 'absolute', left: 16, right: 16, bottom: 30, display: 'flex', justifyContent: 'flex-end', pointerEvents: 'none' }}>
      <a
        href="#"
        onClick={(e) => e.preventDefault()}
        style={{
          pointerEvents: 'auto',
          width: 56, height: 56, borderRadius: '50%',
          background: '#25D366', color: 'white',
          display: 'grid', placeItems: 'center',
          boxShadow: '0 14px 28px -8px rgba(37,211,102,.55)',
          textDecoration: 'none',
        }}>
        <I.whatsapp size={26} />
      </a>
    </div>
  );
  return (
    <div className="floating-cart" style={{ position: 'absolute', left: 16, right: 16, bottom: 30, zIndex: 20 }}>
      <button
        onClick={onClick}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: 12, padding: '12px 14px 12px 16px',
          borderRadius: 99,
          background: 'var(--ce-ink)', color: 'white',
          border: 'none',
          boxShadow: '0 20px 40px -12px rgba(0,0,0,.45)',
          transition: 'transform .15s var(--ease-out)',
        }}
        onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
        onMouseLeave={(e) => e.currentTarget.style.transform = ''}
      >
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
          <span style={{ width: 26, height: 26, borderRadius: '50%', background: 'var(--t-primary)', color: 'var(--t-primary-ink)', display: 'grid', placeItems: 'center', fontSize: 12, fontWeight: 700 }}>{count}</span>
          <span style={{ fontSize: 14, fontWeight: 600 }}>Ver carrito</span>
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <span className="ce-mono" style={{ fontSize: 14, fontWeight: 700 }}>{money(subtotal)}</span>
          <I.chevR size={16} />
        </span>
      </button>
    </div>
  );
}

Object.assign(window, { Landing });
