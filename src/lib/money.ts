/**
 * Utilidades monetarias.
 * Todos los precios se almacenan y operan en centavos (enteros) para evitar
 * errores de punto flotante. La conversion a "soles"/moneda se hace solo al
 * mostrar en la interfaz.
 */

export function centsToUnits(cents: number): number {
  return Math.round(cents) / 100;
}

export function unitsToCents(units: number): number {
  return Math.round(units * 100);
}

const formatter = new Intl.NumberFormat("es-PE", {
  style: "currency",
  currency: "PEN",
});

export function formatCents(cents: number): string {
  return formatter.format(centsToUnits(cents));
}
