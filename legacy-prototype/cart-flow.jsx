// cart-flow.jsx — ProductModal, CartSheet, Checkout, WAConfirm.

const { useState: cfState, useEffect: cfEff, useMemo: cfMemo } = React;

// ─── Product detail modal (with extras + notes) ─────────────────────
function ProductModal({ product, onClose, onAdd }) {
  const [qty, setQty] = cfState(1);
  const [notes, setNotes] = cfState('');
  const [selected, setSelected] = cfState(() => {
    // Pre-select 'required one' defaults
    const init = {};
    (product.extras || []).forEach((g) => {
      if (g.kind === 'one' && g.required) init[g.group] = g.items[0].id;
      else if (g.kind === 'one') init[g.group] = null;
      else init[g.group] = new Set();
    });
    return init;
  });

  const groups = product.extras || [];

  const selectedExtras = cfMemo(() => {
    const out = [];
    groups.forEach((g) => {
      const sel = selected[g.group];
      if (g.kind === 'one') {
        if (sel) {
          const it = g.items.find((i) => i.id === sel);
          if (it) out.push({ ...it, group: g.group });
        }
      } else {
        (g.items || []).forEach((it) => {
          if (sel && sel.has(it.id)) out.push({ ...it, group: g.group });
        });
      }
    });
    return out;
  }, [selected, groups]);

  const extrasTotal = selectedExtras.reduce((s, e) => s + e.price, 0);
  const total = (product.price + extrasTotal) * qty;

  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 100,
      background: 'rgba(11,11,15,.55)',
      display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
      animation: 'fadein .2s var(--ease-out)',
    }}>
      <style>{`@keyframes fadein { from { opacity: 0; } to { opacity: 1; } }
              @keyframes slideup { from { transform: translateY(100%); } to { transform: translateY(0); } }`}</style>
      <div onClick={onClose} style={{ flex: 1 }} />
      <div style={{
        background: 'var(--t-bg)',
        borderTopLeftRadius: 28, borderTopRightRadius: 28,
        animation: 'slideup .3s var(--ease-out)',
        display: 'flex', flexDirection: 'column',
        maxHeight: '92%',
        boxShadow: '0 -20px 50px rgba(0,0,0,.25)',
      }}>
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {/* Hero photo */}
          <div style={{ position: 'relative' }}>
            <div style={{ height: 240, backgroundImage: `url(${product.photo})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
            <button onClick={onClose} style={{ position: 'absolute', top: 12, right: 12, width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,.95)', border: 'none', display: 'grid', placeItems: 'center', color: 'var(--ce-ink)' }}>
              <I.x size={18} />
            </button>
            <div style={{ position: 'absolute', top: 12, left: 12, display: 'flex', gap: 6 }}>
              {product.tag && <span className="chip chip-primary" style={{ fontSize: 11 }}><I.fire size={11} /> {product.tag}</span>}
            </div>
          </div>

          <div style={{ padding: '16px 18px' }}>
            <h2 className="ce-display" style={{ margin: 0, fontSize: 24, fontWeight: 700, letterSpacing: '-0.025em', lineHeight: 1.15 }}>{product.name}</h2>
            <div style={{ fontSize: 13, color: 'var(--t-muted)', marginTop: 6, lineHeight: 1.5, textWrap: 'pretty' }}>{product.desc}</div>
            <div className="ce-mono" style={{ fontSize: 22, fontWeight: 700, marginTop: 12, color: 'var(--t-primary)' }}>{money(product.price)}</div>
          </div>

          {/* Extras groups */}
          {groups.map((g) => (
            <div key={g.group} style={{ padding: '14px 18px', borderTop: '1px solid var(--t-line)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
                <h3 className="ce-display" style={{ margin: 0, fontSize: 15, fontWeight: 700, letterSpacing: '-0.015em' }}>{g.group}</h3>
                <span style={{ fontSize: 11, fontWeight: 600, color: g.required ? 'var(--t-primary)' : 'var(--t-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  {g.required ? 'Requerido' : (g.kind === 'one' ? 'Elige 1 (opcional)' : 'Múltiple')}
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {g.items.map((it) => {
                  const sel = selected[g.group];
                  const on = g.kind === 'one' ? sel === it.id : (sel && sel.has(it.id));
                  return (
                    <button
                      key={it.id}
                      onClick={() => {
                        if (g.kind === 'one') {
                          setSelected({ ...selected, [g.group]: it.id });
                        } else {
                          const next = new Set(selected[g.group] || []);
                          on ? next.delete(it.id) : next.add(it.id);
                          setSelected({ ...selected, [g.group]: next });
                        }
                      }}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '12px 14px', borderRadius: 14,
                        background: on ? 'var(--t-primary-soft)' : 'var(--t-surface)',
                        border: '1px solid ' + (on ? 'var(--t-primary)' : 'var(--t-line)'),
                        textAlign: 'left', cursor: 'pointer',
                        transition: 'all .12s',
                      }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
                        <span style={{
                          width: 18, height: 18, borderRadius: g.kind === 'one' ? '50%' : 5,
                          border: '2px solid ' + (on ? 'var(--t-primary)' : 'var(--t-line)'),
                          background: on ? 'var(--t-primary)' : 'transparent',
                          display: 'grid', placeItems: 'center',
                        }}>{on && <I.check size={10} style={{ color: 'var(--t-primary-ink)' }} />}</span>
                        <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--t-ink)' }}>{it.name}</span>
                      </span>
                      {it.price > 0 && <span className="ce-mono" style={{ fontSize: 13, fontWeight: 600, color: 'var(--t-muted)' }}>+{money(it.price)}</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Notes */}
          <div style={{ padding: '14px 18px', borderTop: '1px solid var(--t-line)' }}>
            <h3 className="ce-display" style={{ margin: '0 0 10px', fontSize: 15, fontWeight: 700, letterSpacing: '-0.015em' }}>Notas para la cocina</h3>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ej. sin cebolla, salsa aparte, etc."
              rows={2}
              className="field"
              style={{ resize: 'none', fontFamily: 'inherit' }}
            />
          </div>

          <div style={{ height: 14 }} />
        </div>

        {/* Sticky footer */}
        <div style={{ padding: '12px 18px 22px', background: 'var(--t-bg)', borderTop: '1px solid var(--t-line)', display: 'flex', gap: 12, alignItems: 'center' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 0, borderRadius: 99, background: 'var(--t-surface)', border: '1px solid var(--t-line)', padding: 4 }}>
            <button onClick={() => setQty(Math.max(1, qty - 1))} style={{ width: 34, height: 34, borderRadius: '50%', border: 'none', background: 'transparent', color: 'var(--t-ink)', display: 'grid', placeItems: 'center', cursor: 'pointer' }}>
              <I.minus size={16} />
            </button>
            <span className="ce-mono" style={{ width: 28, textAlign: 'center', fontSize: 15, fontWeight: 700 }}>{qty}</span>
            <button onClick={() => setQty(qty + 1)} style={{ width: 34, height: 34, borderRadius: '50%', border: 'none', background: 'var(--t-ink)', color: 'var(--t-bg)', display: 'grid', placeItems: 'center', cursor: 'pointer' }}>
              <I.plus size={16} />
            </button>
          </div>
          <button
            className="btn btn-primary"
            style={{ flex: 1, padding: '14px 16px', fontSize: 14 }}
            onClick={() => onAdd(product, qty, selectedExtras, notes)}
          >
            Agregar · <span className="ce-mono">{money(total)}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Cart sheet ─────────────────────────────────────────────────────
function CartSheet({ local, cart, subtotal, onClose, onRemove, onUpdateQty, onCheckout }) {
  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 100,
      background: 'rgba(11,11,15,.5)',
      display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
      animation: 'fadein .2s var(--ease-out)',
    }}>
      <div onClick={onClose} style={{ flex: 1 }} />
      <div style={{
        background: 'var(--t-bg)',
        borderTopLeftRadius: 28, borderTopRightRadius: 28,
        animation: 'slideup .3s var(--ease-out)',
        display: 'flex', flexDirection: 'column',
        maxHeight: '88%',
      }}>
        {/* Header */}
        <div style={{ padding: '16px 18px 8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h2 className="ce-display" style={{ margin: 0, fontSize: 22, fontWeight: 700, letterSpacing: '-0.025em' }}>Tu carrito</h2>
            <div style={{ fontSize: 12, color: 'var(--t-muted)', marginTop: 2 }}>{cart.length} {cart.length === 1 ? 'producto' : 'productos'} · {local.name}</div>
          </div>
          <button onClick={onClose} style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--t-surface)', border: '1px solid var(--t-line)', display: 'grid', placeItems: 'center' }}><I.x size={18} /></button>
        </div>

        {cart.length === 0 ? (
          <div style={{ padding: '40px 24px 60px', textAlign: 'center' }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--t-primary-soft)', color: 'var(--t-primary-deep)', margin: '0 auto', display: 'grid', placeItems: 'center' }}><I.bag size={28} /></div>
            <div className="ce-display" style={{ fontSize: 17, fontWeight: 700, marginTop: 14, letterSpacing: '-0.02em' }}>Tu carrito está vacío</div>
            <div style={{ fontSize: 13, color: 'var(--t-muted)', marginTop: 4 }}>Agrega tus platos favoritos para empezar</div>
            <button className="btn btn-primary" style={{ marginTop: 18 }} onClick={onClose}>Explorar menú</button>
          </div>
        ) : (
          <>
            <div style={{ overflowY: 'auto', padding: '8px 18px', flex: 1 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {cart.map((line) => (
                  <CartLine key={line.id} line={line} onRemove={() => onRemove(line.id)} onUpdateQty={(q) => onUpdateQty(line.id, q)} />
                ))}
              </div>
            </div>

            <div style={{ padding: '14px 18px', borderTop: '1px solid var(--t-line)', background: 'var(--t-bg)' }}>
              <Row k="Subtotal" v={money(subtotal)} />
              <Row k="Envío" v={money(local.deliveryFee)} />
              <Row k="Total" v={money(subtotal + local.deliveryFee)} big />
              <button className="btn btn-primary btn-block" style={{ marginTop: 12, padding: '14px 16px' }} onClick={onCheckout}>
                Continuar al pago <I.chevR size={16} />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Row({ k, v, big }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: big ? '8px 0 4px' : '4px 0' }}>
      <span style={{ fontSize: big ? 16 : 13, fontWeight: big ? 700 : 500, color: big ? 'var(--t-ink)' : 'var(--t-muted)' }}>{k}</span>
      <span className="ce-mono" style={{ fontSize: big ? 20 : 13, fontWeight: 700, color: 'var(--t-ink)' }}>{v}</span>
    </div>
  );
}

function CartLine({ line, onRemove, onUpdateQty }) {
  const lineTotal = (line.product.price + (line.extras||[]).reduce((a,e)=>a+e.price,0)) * line.qty;
  return (
    <div style={{ display: 'flex', gap: 12 }}>
      <div style={{ width: 64, height: 64, borderRadius: 12, backgroundImage: `url(${line.product.photo})`, backgroundSize: 'cover', backgroundPosition: 'center', flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
          <div className="ce-display" style={{ fontSize: 14, fontWeight: 700, letterSpacing: '-0.015em', lineHeight: 1.2 }}>{line.product.name}</div>
          <div className="ce-mono" style={{ fontSize: 14, fontWeight: 700, whiteSpace: 'nowrap' }}>{money(lineTotal)}</div>
        </div>
        {line.extras && line.extras.length > 0 && (
          <div style={{ fontSize: 11, color: 'var(--t-muted)', marginTop: 3, lineHeight: 1.4 }}>
            {line.extras.map(e => e.name).join(' · ')}
          </div>
        )}
        {line.notes && <div style={{ fontSize: 11, color: 'var(--t-muted)', marginTop: 3, fontStyle: 'italic' }}>Nota: {line.notes}</div>}

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 0, borderRadius: 99, background: 'var(--t-surface)', border: '1px solid var(--t-line)', padding: 3 }}>
            <button onClick={() => onUpdateQty(line.qty - 1)} style={{ width: 26, height: 26, borderRadius: '50%', border: 'none', background: 'transparent', color: 'var(--t-ink)', display: 'grid', placeItems: 'center' }}>
              <I.minus size={12} />
            </button>
            <span className="ce-mono" style={{ width: 22, textAlign: 'center', fontSize: 12, fontWeight: 700 }}>{line.qty}</span>
            <button onClick={() => onUpdateQty(line.qty + 1)} style={{ width: 26, height: 26, borderRadius: '50%', border: 'none', background: 'var(--t-ink)', color: 'var(--t-bg)', display: 'grid', placeItems: 'center' }}>
              <I.plus size={12} />
            </button>
          </div>
          <button onClick={onRemove} style={{ fontSize: 11, color: 'var(--t-muted)', background: 'transparent', border: 'none', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>Quitar</button>
        </div>
      </div>
    </div>
  );
}

// ─── Checkout (customer data) ───────────────────────────────────────
function Checkout({ local, cart, subtotal, onBack, onConfirm }) {
  const [name, setName] = cfState('');
  const [address, setAddress] = cfState('');
  const [phone, setPhone] = cfState('');
  const [payment, setPayment] = cfState('efectivo');
  const [notes, setNotes] = cfState('');

  const canConfirm = name.trim() && address.trim();

  return (
    <>
      <div style={{ padding: '8px 8px 6px', display: 'flex', alignItems: 'center', gap: 10, background: 'var(--t-bg)', position: 'sticky', top: 0, zIndex: 10 }}>
        <button onClick={onBack} className="btn btn-ghost" style={{ padding: 8, width: 38, height: 38, borderRadius: 12 }}><I.arrowL /></button>
        <div className="ce-display" style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-0.02em' }}>Datos del pedido</div>
      </div>
      <div className="phone-body" style={{ padding: '4px 18px 22px' }}>
        <div style={{ fontSize: 12, color: 'var(--t-muted)', marginBottom: 14 }}>Confirma tus datos para enviar el pedido por WhatsApp a {local.name}.</div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <span className="field-lbl">Nombre completo</span>
            <input className="field" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej. María González" />
          </div>
          <div>
            <span className="field-lbl">Dirección de entrega</span>
            <input className="field" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Calle, número, colonia y referencias" />
          </div>
          <div>
            <span className="field-lbl">Teléfono</span>
            <input className="field" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="10 dígitos" />
          </div>
          <div>
            <span className="field-lbl">Método de pago</span>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
              {[
                { id: 'efectivo', label: 'Efectivo', icon: 'fa-money-bill-wave' },
                { id: 'tarjeta', label: 'Tarjeta', icon: 'fa-credit-card' },
                { id: 'transfer', label: 'Transfer.', icon: 'fa-building-columns' },
              ].map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPayment(p.id)}
                  style={{
                    padding: '12px 8px', borderRadius: 14,
                    background: payment === p.id ? 'var(--t-primary-soft)' : 'var(--t-surface)',
                    border: '1px solid ' + (payment === p.id ? 'var(--t-primary)' : 'var(--t-line)'),
                    color: payment === p.id ? 'var(--t-primary-deep)' : 'var(--t-ink)',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                    fontWeight: 600, fontSize: 12, cursor: 'pointer',
                  }}>
                  <i className={`fas ${p.icon}`} style={{ fontSize: 16 }}></i>
                  {p.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <span className="field-lbl">Notas del pedido (opcional)</span>
            <textarea className="field" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Ej. tocar el timbre 2 veces" style={{ resize: 'none' }} />
          </div>

          <div className="card" style={{ padding: 14, marginTop: 4 }}>
            <div className="ce-display" style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>Resumen ({cart.length})</div>
            {cart.map((line) => (
              <div key={line.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '4px 0', color: 'var(--t-ink)' }}>
                <span>{line.qty}× {line.product.name}</span>
                <span className="ce-mono" style={{ fontWeight: 600 }}>{money((line.product.price + (line.extras||[]).reduce((a,e)=>a+e.price,0)) * line.qty)}</span>
              </div>
            ))}
            <div style={{ height: 1, background: 'var(--t-line)', margin: '8px 0' }}></div>
            <Row k="Subtotal" v={money(subtotal)} />
            <Row k="Envío" v={money(local.deliveryFee)} />
            <Row k="Total" v={money(subtotal + local.deliveryFee)} big />
          </div>

          <button
            onClick={onConfirm}
            disabled={!canConfirm}
            className="btn btn-primary btn-block"
            style={{ padding: '15px 16px', fontSize: 14, marginTop: 4, opacity: canConfirm ? 1 : 0.4 }}
          >
            <I.whatsapp size={18} /> Enviar pedido por WhatsApp
          </button>
        </div>
      </div>
    </>
  );
}

// ─── WhatsApp confirmation preview ──────────────────────────────────
function WAConfirm({ local, cart, subtotal, onBack }) {
  const total = subtotal + local.deliveryFee;
  const link = buildWhatsAppLink(local, cart, { name: 'María González', address: 'Av. Insurgentes 432, Roma Nte.', payment: 'Efectivo' });

  return (
    <>
      <div style={{ padding: '8px 8px 6px', display: 'flex', alignItems: 'center', gap: 10, background: 'var(--t-bg)' }}>
        <button onClick={onBack} className="btn btn-ghost" style={{ padding: 8, width: 38, height: 38, borderRadius: 12 }}><I.arrowL /></button>
        <div className="ce-display" style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-0.02em' }}>Confirmar por WhatsApp</div>
      </div>

      <div className="phone-body" style={{ padding: '4px 18px 22px' }}>
        <div style={{ textAlign: 'center', padding: '14px 0 18px' }}>
          <div style={{
            width: 72, height: 72, borderRadius: 22,
            background: '#25D366', color: 'white',
            display: 'grid', placeItems: 'center',
            margin: '0 auto',
            boxShadow: '0 18px 36px -12px rgba(37,211,102,.6)',
          }}><I.whatsapp size={36} /></div>
          <h2 className="ce-display" style={{ margin: '14px 0 4px', fontSize: 22, fontWeight: 700, letterSpacing: '-0.025em' }}>Listo para enviar</h2>
          <div style={{ fontSize: 13, color: 'var(--t-muted)', maxWidth: 280, margin: '0 auto', textWrap: 'pretty' }}>
            Te mostramos el mensaje que se enviará al WhatsApp de {local.name}.
          </div>
        </div>

        {/* Phone screenshot mock of WhatsApp */}
        <div style={{
          background: '#ECE5DD',
          borderRadius: 18,
          padding: '14px 14px 18px',
          backgroundImage: 'radial-gradient(circle at 30% 20%, rgba(255,255,255,.4), transparent 50%), radial-gradient(circle at 70% 80%, rgba(255,255,255,.3), transparent 50%)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingBottom: 14, borderBottom: '1px solid rgba(0,0,0,.06)' }}>
            <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'var(--t-primary)', color: 'var(--t-primary-ink)', display: 'grid', placeItems: 'center', fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 12 }}>{local.logoMonogram}</div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#075E54' }}>{local.name}</div>
              <div style={{ fontSize: 11, color: 'rgba(0,0,0,.5)' }}>en línea</div>
            </div>
          </div>
          <div style={{ paddingTop: 14, display: 'flex', justifyContent: 'flex-end' }}>
            <div style={{
              maxWidth: '85%',
              background: '#DCF8C6',
              borderRadius: '12px 0 12px 12px',
              padding: '10px 12px',
              fontSize: 12, lineHeight: 1.5,
              color: '#111',
              boxShadow: '0 1px 0 rgba(0,0,0,.04)',
              whiteSpace: 'pre-wrap',
              fontFamily: 'inherit',
            }}>
              <b>Hola {local.name}, me gustaría hacer un pedido:</b>{'\n'}
              {cart.map((line) => (
                <span key={line.id}>
                  {'\n'}• {line.qty}× {line.product.name} — {money((line.product.price + (line.extras||[]).reduce((a,e)=>a+e.price,0)) * line.qty)}
                  {line.extras && line.extras.length > 0 && (
                    <span style={{ color: 'rgba(0,0,0,.6)' }}>{'\n'}      · {line.extras.map(e => e.name).join(', ')}</span>
                  )}
                </span>
              ))}
              {'\n\n'}Subtotal: {money(subtotal)}{'\n'}
              Envío: {money(local.deliveryFee)}{'\n'}
              <b>Total: {money(total)}</b>{'\n\n'}
              Nombre: María González{'\n'}
              Dirección: Av. Insurgentes 432, Roma Nte.{'\n'}
              Pago: Efectivo
              <div style={{ textAlign: 'right', fontSize: 9, color: 'rgba(0,0,0,.45)', marginTop: 4, marginBottom: -2 }}>9:41 ✓✓</div>
            </div>
          </div>
        </div>

        <a
          href={link}
          target="_blank"
          className="btn btn-block"
          style={{ marginTop: 18, background: '#25D366', color: 'white', padding: '15px 16px', textDecoration: 'none' }}
        >
          <I.whatsapp size={18} /> Abrir WhatsApp y enviar
        </a>
        <button onClick={onBack} className="btn btn-ghost btn-block" style={{ marginTop: 6, fontSize: 13 }}>Volver a editar</button>
      </div>
    </>
  );
}

Object.assign(window, { ProductModal, CartSheet, Checkout, WAConfirm });
