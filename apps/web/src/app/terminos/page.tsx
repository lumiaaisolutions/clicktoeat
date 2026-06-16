import Link from 'next/link';
import { Logo } from '@/components/ui/Logo';
import { Icon } from '@/components/ui/Icon';

export const metadata = {
  title: 'Términos y condiciones · ClickToEat',
};

export default function TerminosPage() {
  return (
    <main className="min-h-screen bg-[#FBF8F3]">
      <header className="border-b border-line bg-white">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-2">
            <Logo variant="lockup" size={26} />
          </Link>
          <Link href="/" className="text-sm text-muted hover:text-ink inline-flex items-center gap-1">
            <Icon name="arrow-right" size={12} className="rotate-180" />
            Inicio
          </Link>
        </div>
      </header>

      <article className="max-w-3xl mx-auto px-4 py-10 prose prose-sm sm:prose-base">
        <p className="text-xs uppercase tracking-[0.18em] text-muted font-bold">Legal</p>
        <h1 className="ce-display text-3xl sm:text-4xl font-bold mt-2">Términos y condiciones de uso</h1>
        <p className="text-muted">Vigencia: 15 de junio de 2026</p>

        <h2 className="ce-display font-bold text-xl mt-8">1. Servicio</h2>
        <p>
          ClickToEat es una plataforma SaaS que permite a los restaurantes tener una landing pública con su
          menú y recibir pedidos directos por WhatsApp. No procesa pagos del cliente final ni cobra comisión por pedido.
        </p>

        <h2 className="ce-display font-bold text-xl mt-6">2. Suscripción</h2>
        <ul>
          <li>El servicio se cobra mensualmente vía Stripe.</li>
          <li>Ofrecemos 14 días de prueba gratis sin requerir tarjeta.</li>
          <li>La suscripción se renueva automáticamente. Puedes cancelar en cualquier momento desde tu panel.</li>
          <li>No hay reembolsos por períodos parciales — la cancelación toma efecto al fin del período pagado.</li>
        </ul>

        <h2 className="ce-display font-bold text-xl mt-6">3. Responsabilidades del local</h2>
        <ul>
          <li>Mantener actualizados precios, horarios y disponibilidad de productos.</li>
          <li>Atender los pedidos que llegan por WhatsApp.</li>
          <li>Cumplir con regulaciones sanitarias y fiscales locales.</li>
          <li>No usar la plataforma para vender productos ilegales o no autorizados.</li>
        </ul>

        <h2 className="ce-display font-bold text-xl mt-6">4. Disponibilidad</h2>
        <p>
          Mantenemos la plataforma con SLA objetivo de 99% mensual. No garantizamos cero downtime;
          mantenimiento programado se anuncia con 24h de anticipación cuando es planeable.
        </p>

        <h2 className="ce-display font-bold text-xl mt-6">5. Suspensión</h2>
        <p>
          Podemos suspender una cuenta si: (a) la suscripción está atrasada más de 7 días,
          (b) detectamos uso fraudulento, (c) el contenido viola la ley aplicable.
        </p>

        <h2 className="ce-display font-bold text-xl mt-6">6. Propiedad intelectual</h2>
        <p>
          El contenido que el local sube (logo, fotos, descripciones) es propiedad del local. ClickToEat
          recibe licencia para mostrarlo en la landing pública mientras la cuenta esté activa.
        </p>

        <h2 className="ce-display font-bold text-xl mt-6">7. Limitación de responsabilidad</h2>
        <p>
          ClickToEat no es responsable de la calidad de los productos vendidos por los locales ni de la
          relación comercial entre el local y sus clientes finales. Cualquier disputa se resuelve directamente entre ellos.
        </p>

        <h2 className="ce-display font-bold text-xl mt-6">8. Privacidad</h2>
        <p>
          Consulta nuestro <Link href="/privacidad" className="text-[#FF2D2D] underline">Aviso de privacidad</Link> para
          conocer qué datos tratamos y cómo.
        </p>

        <h2 className="ce-display font-bold text-xl mt-6">9. Cambios</h2>
        <p>
          Podemos actualizar estos términos. Si el cambio es material te notificamos por email con 15 días de anticipación.
        </p>

        <h2 className="ce-display font-bold text-xl mt-6">10. Jurisdicción</h2>
        <p>
          Estos términos se rigen por las leyes de los Estados Unidos Mexicanos. Cualquier controversia se
          resolverá ante tribunales de la Ciudad de México.
        </p>

        <h2 className="ce-display font-bold text-xl mt-6">Contacto</h2>
        <p>
          <a href="mailto:soporte@lumiaaisolutions.com" className="text-[#FF2D2D] underline">soporte@lumiaaisolutions.com</a>
        </p>
      </article>

      <p className="text-center text-xs text-muted py-8">
        Desarrollado por{' '}
        <a href="https://lumiaaisolutions.com" target="_blank" rel="noopener noreferrer" className="font-semibold text-ink/70 hover:text-ink">
          LUMIA
        </a>
      </p>
    </main>
  );
}
