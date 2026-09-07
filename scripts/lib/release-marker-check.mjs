/** React inserts empty comments between adjacent SSR text nodes. */
export function missingReleaseMarkers(body, markers, contentType) {
  const searchable = /^text\/html(?:;|$)/i.test(contentType)
    ? body.replaceAll("<!-- -->", "").replaceAll("<!---->", "")
    : body
  return markers.filter((marker) => !searchable.includes(marker))
}
