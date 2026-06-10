# Testing — Suites PHPUnit

Listado completo de tests por suite. `apps/api/tests/Feature/`.

## `PedidoFlowTest`

End-to-end del flujo de pedidos.

- `el_endpoint_publico_de_menu_devuelve_el_local_y_productos`
- `el_endpoint_publico_404_para_slug_inexistente`
- `un_pedido_publico_se_crea_y_descuenta_inventario`
- `rechaza_pedido_si_no_hay_stock_y_no_descuenta_nada`
- `producto_sin_receta_no_descuenta_inventario_pero_si_crea_pedido`
- `rechaza_producto_no_disponible`
- `el_owner_ve_solo_pedidos_de_su_local`
- `owner_puede_cambiar_estado_de_su_pedido`
- `owner_no_puede_modificar_pedidos_de_otro_local`
- `el_inventory_service_descuenta_correctamente_dentro_de_transaccion`
- `el_whatsapp_url_incluye_los_items_y_total`

## `PuntoVentaTest`

Particularidades del POS interno.

- `staff_crea_un_pedido_en_sucursal_y_se_marca_confirmado`
- `acepta_metodo_pago_tarjeta_tpv`
- `acepta_cliente_nombre_personalizado_para_apartar_orden`
- `rechaza_pos_sin_stock_y_no_descuenta`
- `usuario_sin_local_id_no_puede_crear_pedido_pos`
- `pedido_de_sucursal_aparece_en_la_lista_general_del_local`

## `RecetaTest`

Sync de recetas + autorización.

- `owner_puede_actualizar_la_receta_de_su_producto`
- `actualizar_receta_es_idempotente_reemplaza_completo`
- `permite_borrar_toda_la_receta_con_array_vacio`
- `rechaza_ingrediente_de_otro_local`
- `rechaza_cantidad_cero_o_negativa`
- `owner_no_puede_editar_recetas_de_producto_ajeno`

## `InventarioAvanzadoTest`

Funciones avanzadas de inventario.

- `cancelar_pedido_reintegra_el_stock_descontado`
- `cancelar_dos_veces_es_idempotente_no_duplica_reintegro`
- `cancelar_pedido_ya_entregado_no_reintegra`
- `historial_de_movimientos_lista_filtrable_por_tipo`
- `descontar_bajo_el_minimo_crea_notificacion`
- `dos_pedidos_seguidos_bajo_minimo_no_duplican_notificacion`
- `endpoint_de_notificaciones_lista_y_marca_leida`
- `producto_compuesto_descuenta_los_ingredientes_del_componente`
- `producto_compuesto_de_compuesto_se_expande_dos_niveles`
- `detecta_ciclo_en_receta_y_lanza_excepcion`
- `api_sync_recetas_rechaza_componente_que_apunta_al_mismo_producto`

## `ComprasTest`

Módulo de compras con promedio ponderado.

- `registra_compra_aumenta_stock_y_genera_movimientos`
- `actualiza_costo_unitario_con_promedio_ponderado`
- `promedio_ponderado_cuando_stock_anterior_era_cero`
- `anular_compra_revierte_stock_si_alcanza`
- `rechaza_anular_si_ya_se_consumio_parte_del_stock`
- `lista_compras_filtrable_por_estado`
- `staff_puede_registrar_pero_no_anular`
- `rechaza_ingrediente_de_otro_local`

## `HorariosYMetricasTest`

Horarios + métricas + bloqueo de pedidos por horario.

- `get_horarios_devuelve_estado_calculado`
- `patch_horarios_actualiza_y_ordena_por_dia`
- `patch_horarios_dedup_dia_duplicado`
- `cerrado_temporal_fuerza_estado_cerrado`
- `sin_horarios_devuelve_estado_null`
- `endpoint_publico_de_menu_incluye_estado`
- `metricas_calcula_ventas_y_ticket_promedio`
- `metricas_serie_diaria_rellena_dias_sin_ventas`
- `metricas_top_productos_ordenado_por_cantidad`
- `metricas_acepta_rango_custom_desde_hasta`
- `pedido_publico_se_rechaza_si_local_cerrado_temporal`
- `pedido_publico_se_rechaza_si_esta_fuera_de_horario`
- `pedido_publico_funciona_sin_horarios_definidos`
- `pos_interno_si_acepta_pedido_aunque_local_cerrado`
- `metricas_requiere_local`

## `SuperAdminLocalesTest`

Admin global.

- `super_admin_ve_todos_los_locales`
- `owner_no_puede_acceder_al_endpoint_super_admin`
- `super_admin_crea_un_local_con_owner_en_la_misma_request`
- `rechaza_slug_duplicado`
- `super_admin_actualiza_branding_de_cualquier_local`
- `super_admin_suspende_y_reactiva_un_local`
- `super_admin_borra_local_soft_delete`

---

## Total aproximado

~65 tests Feature. Una corrida full (sqlite in-memory) toma del orden de 5-15 segundos en una máquina moderna.

## Qué NO está cubierto

- Endpoints de auth (`register`, `login`, `password reset propio`, `password reset por super admin`).
- Endpoints de uploads (`/uploads/image`).
- Endpoints de categorías (CRUD sólo cubierto indirectamente).
- Endpoints de productos (CRUD sólo cubierto indirectamente).
- Rate limiting (las pruebas no disparan los throttles).
- Branding (`PATCH /local`).
- Validación detallada de cada FormRequest (algunos casos cubiertos por suites mayores).
- `MetricasService` con compras (margen aprox).

Pendiente extender. Ver [`issues/devops-faltante.md`](../issues/devops-faltante.md).
