// Optional image capability. The existing Fetch application still admits
// origin, negotiates media and authorizes a read before this reader can run.
import { inspectImageMaterial } from "@red-cup-engineering/semiotic-hypertext-packet/image-materials";

/** Declare an image backed by a current original SHP material. No source is
 * read at declaration time; no packet metadata becomes an authority grant.
 * Cache policy defaults to no-store and belongs to the publishing source. */
export function livingImagePage({ match, name, mediaType, read, cacheControl = "no-store" } = {}) {
  if (match === undefined || typeof read !== "function")
    throw new TypeError("Living Web image needs an original source reader and route");
  if (!["image/png", "image/svg+xml"].includes(mediaType))
    throw new TypeError("Living Web image requires image/png or passive image/svg+xml");
  if (name !== undefined && (typeof name !== "string" || !name))
    throw new TypeError("Living Web image name must be nonempty source text");
  // Let the native Headers contract validate the supplied field. It is a
  // policy of this publisher, never inferred from a byte identity.
  const policy = new Headers({ "cache-control": cacheControl }).get("cache-control");
  return Object.freeze({ match, ...(name === undefined ? {} : { name }),
    produces: Object.freeze([mediaType]),
    async read(context) {
      const current = await read(context);
      if (current === undefined || current === null) return null;
      const image = inspectImageMaterial(current);
      if (image.material.mediaType !== mediaType)
        throw new TypeError("Living Web image source differs from its declared image media type");
      return new Response(image.bytes, { headers: {
        "content-type": mediaType,
        "content-length": String(image.bytes.byteLength),
        etag: `"sha256-${image.material.ni.split(";")[1]}"`,
        "cache-control": policy,
        "content-security-policy": "default-src 'none'; sandbox",
        "x-content-type-options": "nosniff",
      } });
    },
  });
}
