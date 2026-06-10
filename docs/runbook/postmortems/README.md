# Postmortems

Registro de incidentes en producción. **Blameless** — el foco está en aprender del sistema, no en culpar al humano.

## Cuándo escribir uno

**Obligatorio** para cualquier incidente que cumpla **uno** de estos:

- ⚠️ Caída de la API > 5 minutos.
- ⚠️ Caída del frontend > 15 minutos.
- ⚠️ Pérdida de datos (cualquier cantidad).
- ⚠️ Filtración de datos entre tenants (incluso un solo registro).
- ⚠️ Exposición pública de información que debía ser privada (PII, tokens, dumps).
- ⚠️ Cualquier toque a producción que rompió algo y requirió rollback.

**Recomendado** para:

- "Casi accidente" — cosas que se atraparon a tiempo pero pudieron explotar.
- Performance degradation > 30% por más de 30 min sin causa identificada.

## Convención de nombre

```
YYYY-MM-DD-<slug-corto>.md
```

Ejemplo: `2026-07-15-mysql-disk-full.md`

## Cómo escribir uno

1. Copiar [`TEMPLATE.md`](TEMPLATE.md) al nuevo archivo.
2. Llenar dentro de las 48h del incidente (mientras la memoria está fresca).
3. PR del postmortem — revisar en equipo en la siguiente reunión semanal.
4. Cerrar el postmortem cuando los action items estén hechos (no antes).

## Lista de postmortems

_Vacío — al primer incidente, listarlo aquí en orden cronológico inverso (más reciente arriba)._

## Métricas agregadas

Al cierre de cada Q (trimestre), generar un meta-postmortem:

- Número de incidentes por severidad.
- MTTR (mean time to recovery).
- Categorías de causa raíz más frecuentes.
- Action items abiertos y sus owners.

Esto va a `docs/runbook/postmortems/quarterly/QX-YYYY.md`.

## Cultura

- **No "fue culpa de X"** — siempre "el sistema permitió que X pasara". El humano es un sensor del fallo del sistema.
- **No "no volverá a pasar"** — siempre "esta es la acción concreta para que no vuelva a pasar" con owner + fecha.
- **Comparte aprendizajes** internamente. Un postmortem leído por el equipo previene futuros incidentes.

## Referencias externas

- Google SRE Book — [Postmortem Culture](https://sre.google/sre-book/postmortem-culture/)
- PagerDuty — [Postmortem template](https://postmortems.pagerduty.com/)
- Atlassian — [Blameless postmortem](https://www.atlassian.com/incident-management/postmortem/blameless)
