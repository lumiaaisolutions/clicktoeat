// auth.jsx — Login screen for admin (split layout, premium).

function AdminLogin({ onLogin }) {
  return (
    <div style={{
      width: '100%', height: '100%',
      background: 'var(--ce-bg)',
      color: 'var(--ce-ink)',
      fontFamily: 'var(--font-sans)',
      display: 'grid',
      gridTemplateColumns: '1fr 1.05fr',
      overflow: 'hidden',
    }}>
      {/* Left: form */}
      <div style={{ display: 'flex', flexDirection: 'column', padding: '36px 56px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 38, height: 38, borderRadius: 11,
            background: 'linear-gradient(135deg, var(--ce-red) 0%, var(--ce-red-deep) 100%)',
            color: 'white', display: 'grid', placeItems: 'center',
            fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 19,
            letterSpacing: '-0.04em',
          }}>C</div>
          <div className="ce-display" style={{ fontSize: 18, fontWeight: 800, letterSpacing: '-0.025em' }}>ClickEat</div>
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', maxWidth: 420, marginInline: 'auto', width: '100%' }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--ce-red)', marginBottom: 12 }}>Panel Administrador</div>
          <h1 className="ce-display" style={{ margin: 0, fontSize: 36, fontWeight: 700, letterSpacing: '-0.035em', lineHeight: 1.05 }}>
            Hola de nuevo,<br/>bienvenido a ClickEat.
          </h1>
          <p style={{ fontSize: 14, color: 'var(--ce-muted)', marginTop: 12, lineHeight: 1.55, maxWidth: 380 }}>
            Administra tus locales, productos y pedidos desde un solo panel.
          </p>

          <div style={{ marginTop: 28, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <span className="field-lbl" style={{ color: 'var(--ce-muted)' }}>Correo</span>
              <input className="field" placeholder="jorge@clickeat.mx" defaultValue="jorge@clickeat.mx" style={{ background: 'white' }} />
            </div>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span className="field-lbl" style={{ color: 'var(--ce-muted)' }}>Contraseña</span>
                <a href="#" onClick={(e) => e.preventDefault()} style={{ fontSize: 11, color: 'var(--ce-red)', fontWeight: 600, textDecoration: 'none' }}>¿Olvidaste tu contraseña?</a>
              </div>
              <input type="password" className="field" defaultValue="••••••••••••" style={{ background: 'white' }} />
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--ce-ink)', cursor: 'pointer' }}>
              <input type="checkbox" defaultChecked style={{ accentColor: 'var(--ce-red)' }} />
              Mantener sesión iniciada
            </label>
            <button onClick={onLogin} className="btn btn-primary" style={{ background: 'var(--ce-ink)', padding: '14px 16px', fontSize: 14, marginTop: 4 }}>
              Iniciar sesión <I.chevR size={16} />
            </button>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: 14, color: 'var(--ce-muted)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 6 }}>
              <span style={{ height: 1, background: 'var(--ce-line)' }} /> O <span style={{ height: 1, background: 'var(--ce-line)' }} />
            </div>
            <button className="btn btn-outline" style={{ background: 'white', padding: '12px 16px', fontSize: 13 }}>
              <i className="fab fa-google" style={{ fontSize: 14 }}></i> Continuar con Google
            </button>
          </div>

          <div style={{ marginTop: 22, fontSize: 13, color: 'var(--ce-muted)' }}>
            ¿Nuevo en ClickEat? <a href="#" onClick={(e) => e.preventDefault()} style={{ color: 'var(--ce-ink)', fontWeight: 600 }}>Crea una cuenta</a>
          </div>
        </div>

        <div style={{ fontSize: 11, color: 'var(--ce-muted)', display: 'flex', justifyContent: 'space-between' }}>
          <span>© 2026 ClickEat MX</span>
          <span style={{ display: 'inline-flex', gap: 14 }}>
            <a href="#" onClick={(e) => e.preventDefault()} style={{ color: 'inherit', textDecoration: 'none' }}>Términos</a>
            <a href="#" onClick={(e) => e.preventDefault()} style={{ color: 'inherit', textDecoration: 'none' }}>Privacidad</a>
            <a href="#" onClick={(e) => e.preventDefault()} style={{ color: 'inherit', textDecoration: 'none' }}>Soporte</a>
          </span>
        </div>
      </div>

      {/* Right: hero */}
      <div style={{
        position: 'relative',
        backgroundImage: 'linear-gradient(140deg, rgba(184,21,21,.9), rgba(11,11,15,.85)), url(https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1400&q=80&auto=format&fit=crop)',
        backgroundSize: 'cover', backgroundPosition: 'center',
        padding: '36px 44px', color: 'white',
        display: 'flex', flexDirection: 'column',
      }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', maxWidth: 480 }}>
          <span style={{ display: 'inline-flex', width: 'fit-content', padding: '5px 10px', borderRadius: 99, background: 'rgba(255,255,255,.18)', backdropFilter: 'blur(10px)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            <span style={{ width: 6, height: 6, borderRadius: 99, background: '#22C55E', marginRight: 7, alignSelf: 'center' }} /> 142 locales activos
          </span>
          <h2 className="ce-display" style={{ margin: '18px 0 12px', fontSize: 40, fontWeight: 700, letterSpacing: '-0.035em', lineHeight: 1.05, textWrap: 'pretty' }}>
            Tu cadena de locales, en una sola plataforma.
          </h2>
          <p style={{ fontSize: 14, opacity: 0.85, lineHeight: 1.55, maxWidth: 400 }}>
            Gestiona menús, recibe pedidos por WhatsApp y personaliza cada landing en minutos. Sin código.
          </p>

          {/* Stat tile */}
          <div style={{
            marginTop: 22,
            padding: 16, borderRadius: 18,
            background: 'rgba(255,255,255,.10)',
            border: '1px solid rgba(255,255,255,.18)',
            backdropFilter: 'blur(20px) saturate(140%)',
            display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14,
          }}>
            <MiniStat n="2.4k" l="Pedidos / día" />
            <MiniStat n="$182k" l="GMV mensual" />
            <MiniStat n="4.8★" l="Rating promedio" />
          </div>
        </div>
      </div>
    </div>
  );
}

function MiniStat({ n, l }) {
  return (
    <div>
      <div className="ce-display" style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.025em' }}>{n}</div>
      <div style={{ fontSize: 11, opacity: 0.75, marginTop: 2 }}>{l}</div>
    </div>
  );
}

Object.assign(window, { AdminLogin });
