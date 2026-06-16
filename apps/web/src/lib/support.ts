/**
 * Centralizado para contactar soporte de ClickToEat.
 *
 * Número de WhatsApp del equipo: +52 229 849 3423.
 * Toda página/componente que quiera abrir un chat con soporte usa
 * `soporteWhatsappUrl(...)` para que el mensaje quede pre-llenado con
 * contexto útil (motivo, plan actual, local, página).
 *
 * Si en el futuro el número cambia, este es el único lugar a tocar.
 */

const SOPORTE_WA_NUMERO = '5212298493423';

interface SoporteContext {
  /** Motivo libre — qué pasó / qué necesita el cliente. */
  motivo: string;
  /** Si está logueado, el slug de su local. */
  localSlug?: string;
  /** Plan actual (essential/professional) para que soporte sepa qué módulos tiene. */
  plan?: string;
  /** Página donde clickeó "Hablar con soporte" — útil para diagnóstico. */
  desde?: string;
}

export function soporteWhatsappUrl({ motivo, localSlug, plan, desde }: SoporteContext): string {
  const lines = [
    `Hola, equipo ClickToEat.`,
    ``,
    motivo,
  ];

  if (localSlug || plan || desde) {
    lines.push('', '---');
    if (localSlug) lines.push(`Local: ${localSlug}`);
    if (plan)      lines.push(`Plan: ${plan}`);
    if (desde)     lines.push(`Desde: ${desde}`);
  }

  const text = encodeURIComponent(lines.join('\n'));
  return `https://wa.me/${SOPORTE_WA_NUMERO}?text=${text}`;
}

/** Número visible (con espacios) para mostrar en UI. */
export const SOPORTE_TELEFONO_VISIBLE = '+52 229 849 3423';
