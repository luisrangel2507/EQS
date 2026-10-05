
/** Lee un parámetro de un solo uso (?nueva=1) y lo quita de la URL para que recargar no lo repita. */
export function consumirParametro(nombre: string) {
  const url = new URL(window.location.href);
  const valor = url.searchParams.get(nombre);
  if (valor !== null) {
    url.searchParams.delete(nombre);
    window.history.replaceState(window.history.state, "", url.pathname + url.search + url.hash);
  }
  return valor;
}
