/** Admit the common Living Web identity boundary before reading a source. */
export function canonicalOrigin(input) {
  const uri = new URL(input);
  const loopback = ["localhost", "127.0.0.1", "[::1]"].includes(uri.hostname);
  if ((uri.protocol !== "https:" && !(loopback && uri.protocol === "http:")) ||
      uri.username || uri.password || uri.pathname !== "/" || uri.search || uri.hash) {
    throw new TypeError("Living Web Server origin must be a canonical HTTPS origin (or loopback HTTP)");
  }
  return uri.origin;
}
