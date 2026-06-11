/** Lecture cookie côté navigateur (gère les valeurs encodées et les `=` dans la valeur). */
export function getClientCookie(name: string): string | undefined {
  // Les composants serveur n'ont pas acces a `document`.
  if (typeof document === "undefined") return undefined;

  const prefix = `${name}=`;
  const parts = document.cookie.split("; ");

  // Parcourt les cookies du navigateur et decode uniquement la valeur demandee.
  for (const p of parts) {
    if (p.startsWith(prefix)) {
      return decodeURIComponent(p.slice(prefix.length));
    }
  }
  return undefined;
}
