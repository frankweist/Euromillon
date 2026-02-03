# Pruebas y Comprobaciones (TESTING)

## Propósito ✅

Proveer una lista de comprobaciones manuales y casos de prueba para validar las funcionalidades críticas del proyecto, especialmente los cambios recientes: eliminación de participantes, previsualización/creación de sorteos desde Dashboard, y exportación CSV.

---

## Entorno

- Abrir `index.html` en un navegador (Chrome/Edge/Firefox).
- Abrir DevTools (F12) para comprobar la consola y el estado de `localStorage`.

---

## Casos de prueba manuales

1. Borrar participante (función `deleteParticipante`) 🔥
   - Pasos:
     1. Añadir un participante nuevo con el botón `Añadir` en Participantes.
     2. Ir al listado y pulsar `Borrar` en ese participante.
     3. Confirmar la acción en el diálogo.
   - Resultado esperado:
     - El participante desaparece del listado.
     - Las entradas del mes en `Pagos` ya no contienen la id del participante.
     - Si estaba en algún sorteo, se elimina de `jugadores` de ese sorteo y se recalcula `totalEuros`.
     - `localStorage` refleja el nuevo estado (comprobar `pena_euromillones_v1`).

2. Previsualizar elegibles en Sorteos (`#btnPreviewEligible`) ✨
   - Pasos:
     1. Ir a la pestaña `Sorteos`.
     2. Seleccionar `Fecha`, `Día` y `Mes de pago`.
     3. Pulsar `Ver lista elegibles`.
   - Resultado esperado:
     - `#drawEligibleCount` muestra el número correcto.
     - `#drawTotalEuros` muestra el total calculado con `state.config.costeApuesta`.
     - `#eligiblePreview` contiene chips con los nombres de los participantes elegibles.

3. Crear sorteo desde Dashboard (`#btnCrearSorteoDesdeDashboard`) ✅
   - Pasos:
     1. En Dashboard, seleccionar `Fecha`, `Día` y `Mes de pago`.
     2. Pulsar `Crear sorteo con estos jugadores`.
   - Resultado esperado:
     - Se crea un nuevo sorteo con `nota: "Creado desde Dashboard"`.
     - Aparece en el histórico de sorteos y `renderSorteos()` lo muestra.
     - `state.sorteos` contiene el nuevo sorteo y `localStorage` se ha actualizado.

7. Registrar resultados de un sorteo (historial de aciertos) 🏆
   - Pasos:
     1. Ir a la pestaña `Sorteos` y abrir el detalle de un sorteo.
     2. En la sección `Resultados`, introducir `Números ganadores`, `Estrellas` y `Premio total (€)`.
     3. Pulsar `Registrar resultados`.
   - Resultado esperado:
     - Se calcula el número de apuestas ganadoras (tanto de las apuestas del sorteo como las apuestas fijas).
     - Se registra un resumen en `sorteo.resultados` con `totalWinners`, `totalDistributed` y `perWinner`.
     - El Dashboard muestra el sorteo en `Últimos resultados` y la lista de sorteos muestra el resumen (Ganadores · Repartido).

4. Exportar CSV de elegibles (Dashboard) 🧾
   - Pasos:
     1. En Dashboard, seleccionar `Mes de pago` y `Día`.
     2. Pulsar `Exportar CSV`.
   - Resultado esperado:
     - Se descarga un archivo `elegibles_YYYY-MM.csv` con las columnas `id,nombre`.

5. Importar/Exportar JSON (seguridad y validez) 🔁
   - Pasos:
     1. Exportar JSON con `Exportar` (botón superior).
     2. Modificar ligeramente para romper la estructura y volver a importar (probar casos inválidos).
     3. Importar un respaldo válido.
   - Resultado esperado:
     - Importar archivos válidos funciona y recarga la UI.
     - Archivos inválidos muestran un mensaje de error y no rompen el estado.

6. Borrar apuesta en el detalle del sorteo (`removeApuesta`) y borrar apuesta fija (`eliminarFija`) ⚠️
   - Pasos:
     1. Abrir detalle de un sorteo que tenga apuestas.
     2. Pulsar la ✕ en una apuesta y comprobar que desaparece.
     3. En Ajustes, añadir una apuesta fija y luego borrarla.
   - Resultado esperado:
     - Las apuestas desaparecen y `localStorage` se guarda.
     - Verificar que ya no aparecen en comprobador de resultados.

---

## Snippets rápidos (Consola)

- Comprobar número de participantes:

```js
console.log(state.participantes.length);
```

- Comprobar elegibles manualmente:

```js
// Reemplaza 'martes' y '2024-02' por datos reales
console.log(logic.computeEligibleIds(state, 'martes', '2024-02'));
```

- Simular borrar participante (no confirmar):

```js
// Ejecuta con cuidado: borrará al participante
deleteParticipante(state.participantes[0].id);
console.log('Eliminado, actuales:', state.participantes.length);
```

- Forzar creación rápida de sorteo (consola):

```js
const ids = logic.computeEligibleIds(state, 'martes', '2024-02');
const so = {
  id: 't',
  fecha: '2024-02-01',
  dia: 'martes',
  payMonth: '2024-02',
  jugadores: ids,
  totalEuros: ids.length * state.config.costeApuesta,
  apuestas: [],
  premio: 0,
};
state.sorteos.push(so);
saveState(state);
console.log('sorteos:', state.sorteos.length);
```

---

## Casos límite y validaciones a probar 🧪

- No hay participantes -> crear sorteo / exportar CSV debe avisar sin crear/descargar.
- Participante inactivo -> no debe aparecer en elegibles.
- Pagos parcialmente marcados (sí/no) -> solo deben incluirse los que `pagado === true`.
- Import JSON con claves faltantes -> mostrar error claro.

---

## Checklist de regresión (rápida)

- [ ] Añadir participante funciona (nombre, preferencia).
- [ ] Editar participante mantiene preferencia correcta.
- [ ] Pagos: marcar/unmarcar se persiste.
- [ ] Crear sorteo desde SORTEOS y desde DASHBOARD.
- [ ] Dashboard muestra el próximo sorteo apto (fecha y resumen con jugadores y total €).
- [ ] Borrar participante limpia todo (pagos, sorteos).
- [ ] Export/Import mantienen consistencia de datos.

---

Si quieres, puedo añadir pruebas automatizadas (por ejemplo con Playwright) y un script `npm test` sencillo para ejecutar estas verificaciones en un navegador sin cabeza. ¿Lo añadimos? 🚀

---

## Tests automatizados (Playwright) 🚀

Se incluyen dos suites E2E bajo `tests/e2e/`:

- `tests/e2e/smoke.spec.ts` — **smoke tests** (rápidos): cubren los flujos más críticos (añadir participante, marcar pago, resumen en Dashboard). Esta suite se ejecuta automáticamente en PRs desde CI.
- `tests/e2e/full.spec.ts` — **full E2E** (completo): pruebas más amplias y lentas que verifican la creación de sorteos y eliminación de participantes. Úsalo localmente o en runs dedicados.

Pasos para ejecutar:

1. Instala dependencias de desarrollo:

   npm install

2. Instala los navegadores de Playwright:

   npx playwright install

3. Ejecuta la suite smoke (rápida, recomendada en CI):

   npx playwright test tests/e2e/smoke.spec.ts --project=chromium

4. Ejecuta la suite completa (más lenta):

   npx playwright test tests/e2e/full.spec.ts --project=chromium

> Nota: En CI está configurado para ejecutar los **unit tests** en cada push/PR y los **smoke E2E** solamente en PRs (por eso los smoke están optimizados para ser rápidos y confiables). Si necesitas que la CI ejecute la suite completa también, podemos agregar un job aparte (recomendado para nightlies o merges a `main`).

El servidor se levanta automáticamente en el puerto 3000 usando `http-server`.

---
