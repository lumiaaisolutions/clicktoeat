import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="min-h-screen grid place-items-center px-6 text-center">
      <div>
        <p className="ce-display text-7xl font-bold opacity-30">404</p>
        <h1 className="ce-display text-2xl font-bold mt-2">No encontramos esta página</h1>
        <p className="text-muted mt-2">Es posible que el local haya sido suspendido o no exista.</p>
        <Link href="/" className="inline-block mt-6 px-5 py-3 rounded-2xl bg-ink text-white font-medium">
          Volver al inicio
        </Link>
      </div>
    </main>
  );
}
