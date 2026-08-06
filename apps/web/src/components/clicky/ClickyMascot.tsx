'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Cuerpo visual de Clicky — cursor de mouse pixel-art (8-bit) con ojos que
 * parpadean. Es un PNG chico (28x28) embebido en base64, escalado sin
 * suavizado (`imageRendering: pixelated`) — no un asset externo.
 *
 * Por qué PNG y no una grilla de divs (como los intentos anteriores):
 * la silueta se diseñó primero como un path SVG suave y se verificó
 * visualmente (`chrome --headless --screenshot`) hasta que leyó
 * inequívocamente como "cursor" — reconstruir esa silueta a mano en una
 * grilla de píxeles gruesos la distorsionaba. En cambio, se renderizó el
 * SVG ya aprobado a 28x28 y se dejó que el navegador haga el escalado
 * "nearest neighbor" — mismo resultado 8-bit, proporciones exactas.
 */

const OPEN_SRC = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABwAAAAcCAYAAAByDd+UAAAB+klEQVR4nNyWMUvDQBTHX2rdBP0kiotCFxcVFKWgCBYFW8FCddJRWmuTWnBwqNBBJz9AFVQoaHUoRcFR3MTvoEIXbZozd8klufSSNDZ28EE57q53v/u/e+/lQtBjC0GPrefAsH1gNzKIrP3C46cAAZrAg+W3dwApMmSKx4GD+S5VWiAgBaStFEipJHOYvwGqMNRqaa0KF5MJA9otOMTnmTDcYsW59RXIxZcNMAQJ1GAKcasVitv91YWuoGE+z1QYTmiBI58mjfFsbF47AFQI1E9AcYFUWV+8yB5CVd2/eWaMZeUlyJ1XidpOoa4KqQ0MDEGj8cH93150AsTLmuFiL7BDWuh3Z7FmaY05AP5Rt2fmIpCeGSNzXnfrGqXyyQbpvx9GySG+izHSx2qJYktA4WtIT496QrkuBYRIHuJNmqU4kyJfR4t6nspkHuwp5GF8oG0TtkWO8/nqM1nudo8OCunJEbMpVqQomjLp+oG71CtoPPPQXuYEvZ+ZHQep8uS7qLtUGkstVXNNvLjXo1cx58F/xXGNUlCViOVbY1y8qpswFZyeHAa/xgUKil6wyzekj91GXUfdC5ao9KOyzf9uX3w6l54a0d0rE/BB7bXju2xTSBdaVdnn2Dv2zj1XILOxg+XvXgxoof4GfuxX75RuHlqBvsg6sf//EP4BAAD//0cbrp0AAAAGSURBVAMAOw+jHXw40AAAAAAASUVORK5CYII=';

const BLINK_SRC = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABwAAAAcCAYAAAByDd+UAAAB1UlEQVR4nNyWO0/DMBDHL1V3vgmMSCww0AUJ8VpAVAgQqlQxwYj6TEN3mNlYGAoSDxXRwlBVIMGCEBviS7AnNrHjuHHqODUNHXqLYzvxz//z3cUpGLGlYMQ2cmA6PHA0M4GD/frLjwEJmiGDWQeHgJENxZPTxMFylyIHDIygtp+HWj4nbOZ/gC4MO47XunAzt8Ohw4JTcl4PRlqiuLq7CdXtdQ6GJIEeDFG3BqGkrWRXh4Km5TxRYbgtbyx6G4AmheoElFShEVAEQRjyWl95eS1D39dRq1RYOjvnY5XsCo9eElA+tLQ0C+Z1h0Pj1Erz0NzbYoocmo9EGbB+5eKOv19annPhNotqG6z7N4iDSoEkIqk73UUwhdnMnTbbhMM3EH62Wu9KaESUYp6HEBNA4fk4k56hGoIj5632h1JdNJDvHAuLkkBBrltp2bt9ln4aFzSD5aEjQkm/uDANteardlFXVJpALb1sg3n1xAIH9eZBv+Ioaym4SsxGi4+bN12hCBTmJ0HX5JWG5V218UD7xG2+68LRS0xHZZ//VX98f66QmRLy8rjzNfBZ9in0PwyqCs+JZxyfe0qgsHCEWY+fHFrvfoOO/emeMsxFK9Eb2SA2/hfhXwAAAP//UvkengAAAAZJREFUAwAsJNJJ38zLfQAAAABJRU5ErkJggg==';

export function ClickyMascot({ size = 44, locked = false, awake = true }: {
  size?: number;
  locked?: boolean;
  awake?: boolean;
}) {
  const [blink, setBlink] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (!awake) { setBlink(true); return; }
    setBlink(false);
    function scheduleBlink() {
      timeoutRef.current = setTimeout(() => {
        setBlink(true);
        timeoutRef.current = setTimeout(() => {
          setBlink(false);
          scheduleBlink();
        }, 140);
      }, 1800 + Math.random() * 2600);
    }
    scheduleBlink();
    return () => clearTimeout(timeoutRef.current);
  }, [awake]);

  return (
    <img
      src={blink ? BLINK_SRC : OPEN_SRC}
      alt=""
      aria-hidden="true"
      width={size}
      height={size}
      style={{
        imageRendering: 'pixelated',
        filter: locked
          ? 'grayscale(1) opacity(0.7) drop-shadow(0 2px 2px rgba(0,0,0,0.15))'
          : 'drop-shadow(0 2px 3px rgba(0,0,0,0.18))',
      }}
    />
  );
}
