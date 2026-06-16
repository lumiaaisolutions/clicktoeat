# Flujo de upgrade de plan

Cuando un usuario intenta entrar a un módulo que su plan no incluye, ClickToEat NO lo redirige al landing público (que rompía la sesión). En su lugar:

1. Click en item con candado → **modal `<UpgradeModal>`** explica qué plan lo desbloquea.
2. Click en "Mejorar mi plan" → redirige a `/admin/billing?upgrade=<plan_slug>` con sesión intacta.
3. La sección **"Cambiar de plan"** dentro de `/admin/billing` auto-scrollea al verla.
4. Click en el plan deseado → Stripe Checkout.

## Componentes

- `apps/web/src/store/upgradeModal.ts` — store Zustand para abrir/cerrar.
- `apps/web/src/components/admin/UpgradeModal.tsx` — modal con portal a body.
- `apps/web/src/app/admin/billing/page.tsx` → `<UpgradeSection>` inline.

## Comportamiento del sidebar

`NavLinks` ahora intercepta el click en items con `locked = true`:

```tsx
const handleLockedClick = (e: React.MouseEvent) => {
  if (!locked) return;
  e.preventDefault();
  e.stopPropagation();
  showUpgrade({ feature, requiredPlan, moduleLabel });
};
<Link href={locked ? '#' : item.href} onClick={handleLockedClick} ...>
```

`href="#"` cuando está locked previene cualquier navegación accidental.

## Por qué no usamos /onboarding/elegir-plan

`/onboarding/elegir-plan` está pensada para usuarios **nuevos** que vienen de `/registro` sin local creado todavía. Para upgrades de un local activo, lleva más sentido mantenerlos en `/admin/billing` donde:

- Ven su plan actual claramente etiquetado como "Actual"
- Saben que la diferencia se prorratea en la siguiente factura
- Pueden cancelar el upgrade y seguir como están
