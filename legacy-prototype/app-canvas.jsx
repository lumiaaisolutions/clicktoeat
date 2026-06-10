// app.jsx — Top-level: DesignCanvas assembling all screens + TweaksPanel.

const { useState: appState, useMemo: appMemo } = React;

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "primaryColor": "#E11D2E",
  "accentColor": "#FFC629",
  "dark": false,
  "cardStyle": "rounded",
  "density": "regular",
  "hero": "photo",
  "featured": "tacos-el-gordo"
}/*EDITMODE-END*/;

const PRIMARY_OPTS = ['#E11D2E', '#FF3D2E', '#B23A1A', '#0EA5E9', '#7C2D12', '#3A2418', '#0F766E'];
const ACCENT_OPTS = ['#FFC629', '#FCD34D', '#84CC16', '#FB7185', '#D4A24C', '#10B981'];

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const locales = window.CE_DATA.locales;
  const featured = appMemo(() => window.CE_DATA.byId[t.featured] || locales[0], [t.featured]);

  // Build a demo cart shared by the "Pedido en curso" artboards
  const demoCart = appMemo(() => {
    const f = featured;
    return [
      { id: 'd1', qty: 2, product: f.products[0], extras: f.products[0].extras ? [f.products[0].extras[0].items[0]] : [], notes: '' },
      { id: 'd2', qty: 1, product: f.products[2] || f.products[1], extras: [], notes: 'Bien doradito' },
      { id: 'd3', qty: 1, product: f.products.find(p => p.cat === 'bebidas' || p.cat === 'cafe' || p.cat === 'matcha') || f.products[1], extras: [], notes: '' },
    ];
  }, [featured]);

  // CSS overrides for the featured local (so tweaks reflect there)
  const featuredOverride = {
    '--t-primary': t.primaryColor,
    '--t-primary-deep': t.primaryColor,
    '--t-primary-soft': hexToSoft(t.primaryColor),
    '--t-primary-ink': '#FFFFFF',
    '--t-accent': t.accentColor,
    '--t-accent-ink': '#0B0B0F',
  };

  return (
    <DesignCanvas>
      <DCSection id="landing" title="Cliente · Landing pública" subtitle="Una sola plataforma · cada local con su URL y branding propio">
        <DCArtboard id="featured" label={`${featured.name}  ·  clickeat.mx/${featured.slug}`} width={390} height={844}>
          <div style={featuredOverride}>
            <Landing local={featured} density={t.density} cardStyle={t.cardStyle} hero={t.hero} dark={t.dark} />
          </div>
        </DCArtboard>
        {locales.filter(l => l.id !== featured.id).map((l) => (
          <DCArtboard key={l.id} id={l.id} label={`${l.name}  ·  clickeat.mx/${l.slug}`} width={390} height={844}>
            <Landing local={l} density={t.density} cardStyle={t.cardStyle} hero="photo" />
          </DCArtboard>
        ))}
      </DCSection>

      <DCSection id="flow" title="Cliente · Flujo de pedido" subtitle="Producto → carrito → datos → mensaje WhatsApp">
        <DCArtboard id="product-modal" label="Detalle de producto · extras + notas" width={390} height={844}>
          <div style={featuredOverride}>
            <Landing local={featured} density={t.density} cardStyle={t.cardStyle} hero={t.hero} dark={t.dark} forceProductModal={featured.products[0]} />
          </div>
        </DCArtboard>
        <DCArtboard id="cart" label="Carrito" width={390} height={844}>
          <div style={featuredOverride}>
            <Landing local={featured} density={t.density} cardStyle={t.cardStyle} hero={t.hero} dark={t.dark} forceCartOpen demoCart={demoCart} />
          </div>
        </DCArtboard>
        <DCArtboard id="checkout" label="Datos del cliente" width={390} height={844}>
          <div style={featuredOverride}>
            <Landing local={featured} density={t.density} cardStyle={t.cardStyle} hero={t.hero} dark={t.dark} forceCheckout demoCart={demoCart} initialView="checkout" />
          </div>
        </DCArtboard>
        <DCArtboard id="wa-confirm" label="Confirmar por WhatsApp" width={390} height={844}>
          <div style={featuredOverride}>
            <Landing local={featured} density={t.density} cardStyle={t.cardStyle} hero={t.hero} dark={t.dark} forceWAConfirm demoCart={demoCart} initialView="wa" />
          </div>
        </DCArtboard>
      </DCSection>

      <DCSection id="admin-global" title="Admin · Panel global" subtitle="Para el operador de la plataforma — alta de locales, planes, métricas">
        <DCArtboard id="login" label="Login admin" width={1180} height={760}>
          <AdminLogin />
        </DCArtboard>
        <DCArtboard id="admin-locales" label="Dashboard de locales" width={1380} height={860}>
          <AdminGlobal />
        </DCArtboard>
      </DCSection>

      <DCSection id="admin-local" title="Admin · Por local" subtitle="Cada local administra su menú, promos y branding">
        <DCArtboard id="admin-menu" label="Menú y productos" width={1380} height={860}>
          <AdminLocal local={locales[0]} />
        </DCArtboard>
        <DCArtboard id="admin-branding" label="Branding y theme customizer" width={1380} height={860}>
          <AdminBranding local={locales[0]} />
        </DCArtboard>
      </DCSection>

      <DCSection id="extras" title="Extras" subtitle="QR de menú compartible, listo para imprimir o pegar en mesa">
        <DCArtboard id="qr" label={`QR · ${featured.name}`} width={520} height={780}>
          <QRShare local={featured} />
        </DCArtboard>
      </DCSection>

      <TweaksPanel>
        <TweakSection label="Local destacado" />
        <TweakSelect
          label="Local"
          value={t.featured}
          options={locales.map(l => ({ value: l.id, label: l.name }))}
          onChange={(v) => setTweak('featured', v)}
        />
        <TweakSection label="Branding del local" />
        <TweakColor
          label="Color primario"
          value={t.primaryColor}
          options={PRIMARY_OPTS}
          onChange={(v) => setTweak('primaryColor', v)}
        />
        <TweakColor
          label="Acento"
          value={t.accentColor}
          options={ACCENT_OPTS}
          onChange={(v) => setTweak('accentColor', v)}
        />
        <TweakToggle
          label="Modo oscuro"
          value={t.dark}
          onChange={(v) => setTweak('dark', v)}
        />
        <TweakSection label="Estilo" />
        <TweakRadio
          label="Cards"
          value={t.cardStyle}
          options={['square', 'rounded', 'glass']}
          onChange={(v) => setTweak('cardStyle', v)}
        />
        <TweakRadio
          label="Densidad"
          value={t.density}
          options={['compact', 'regular', 'comfy']}
          onChange={(v) => setTweak('density', v)}
        />
        <TweakRadio
          label="Hero"
          value={t.hero}
          options={['photo', 'gradient']}
          onChange={(v) => setTweak('hero', v)}
        />
      </TweaksPanel>
    </DesignCanvas>
  );
}

// Make a light tinted version of a hex (for primary-soft)
function hexToSoft(hex) {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0,2), 16);
  const g = parseInt(h.slice(2,4), 16);
  const b = parseInt(h.slice(4,6), 16);
  const blend = (c) => Math.round(c + (255 - c) * 0.88);
  return `rgb(${blend(r)}, ${blend(g)}, ${blend(b)})`;
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
