// shared.jsx — helpers shared across screens.

const { useState, useEffect, useRef, useMemo, useCallback, createContext, useContext } = React;

// Currency
const money = (n) => `$${n.toFixed(0)}`;

// Build WhatsApp deep-link
function buildWhatsAppLink(localObj, cart, customer) {
  const lines = [];
  lines.push(`Hola ${localObj.name}, me gustaría hacer un pedido:`);
  lines.push('');
  cart.forEach((item) => {
    lines.push(`• ${item.qty}× ${item.product.name} — ${money(item.product.price * item.qty)}`);
    if (item.extras && item.extras.length) {
      item.extras.forEach((ex) => lines.push(`     · ${ex.name}${ex.price ? ' (+' + money(ex.price) + ')' : ''}`));
    }
    if (item.notes) lines.push(`     · Nota: ${item.notes}`);
  });
  const subtotal = cart.reduce((s, it) => s + (it.product.price + (it.extras||[]).reduce((a,e)=>a+e.price,0)) * it.qty, 0);
  const total = subtotal + (localObj.deliveryFee || 0);
  lines.push('');
  lines.push(`Subtotal: ${money(subtotal)}`);
  lines.push(`Envío: ${money(localObj.deliveryFee || 0)}`);
  lines.push(`*Total: ${money(total)}*`);
  if (customer) {
    lines.push('');
    if (customer.name) lines.push(`Nombre: ${customer.name}`);
    if (customer.address) lines.push(`Dirección: ${customer.address}`);
    if (customer.payment) lines.push(`Pago: ${customer.payment}`);
    if (customer.notes) lines.push(`Notas: ${customer.notes}`);
  }
  const text = encodeURIComponent(lines.join('\n'));
  return `https://wa.me/${localObj.whatsapp}?text=${text}`;
}

// Live open/closed
function isOpenNow(local, fakeHour) {
  const h = fakeHour ?? new Date().getHours();
  return h >= local.hours.open && h < local.hours.close;
}

// Status bar component
function StatusBar() {
  return (
    <div className="phone-status">
      <span>9:41</span>
      <div className="status-icons">
        <i className="fas fa-signal"></i>
        <i className="fas fa-wifi"></i>
        <i className="fas fa-battery-full"></i>
      </div>
    </div>
  );
}

// Bottom indicator
function BottomBar() {
  return (
    <div style={{ height: 22, display: 'flex', justifyContent: 'center', alignItems: 'flex-end', paddingBottom: 6, background: 'var(--t-bg)' }}>
      <div style={{ width: 120, height: 4, borderRadius: 99, background: 'var(--t-ink)', opacity: 0.7 }}></div>
    </div>
  );
}

// Star rating display
function Stars({ rating, size = 14 }) {
  return (
    <span style={{ display: 'inline-flex', gap: 1, color: '#FFB400' }}>
      {[1,2,3,4,5].map(i => <I.star key={i} size={size} filled={i <= Math.round(rating)} />)}
    </span>
  );
}

Object.assign(window, { money, buildWhatsAppLink, isOpenNow, StatusBar, BottomBar, Stars });
