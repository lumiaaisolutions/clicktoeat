/**
 * Aviso sonoro corto para pantallas de salón (cocina/mesero) cuando llega un
 * pedido/llamado nuevo. Usa WebAudio — sin archivo de audio que cargar.
 * Los navegadores bloquean audio hasta la primera interacción del usuario;
 * si está bloqueado, falla en silencio (no rompe la pantalla).
 */
let ctx: AudioContext | null = null;

export function playChime(): void {
  try {
    const AudioCtx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    ctx ??= new AudioCtx();
    const now = ctx.currentTime;
    // Dos tonos ascendentes cortos, tipo campanita.
    [880, 1174].forEach((freq, i) => {
      const osc = ctx!.createOscillator();
      const gain = ctx!.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const start = now + i * 0.16;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.25, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.22);
      osc.connect(gain).connect(ctx!.destination);
      osc.start(start);
      osc.stop(start + 0.24);
    });
  } catch {
    /* audio bloqueado o no soportado — ignorar */
  }
}
