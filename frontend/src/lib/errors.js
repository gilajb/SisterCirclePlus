/**
 * Turns an axios error into one readable sentence. DRF returns either a
 * string, {detail: "..."} or a field-keyed object of message arrays.
 */
export function flattenErrors(err, fallback = "Something went wrong. Please try again.") {
  const data = err?.response?.data;
  if (!data) return fallback;
  if (typeof data === "string") return data;
  const messages = Object.values(data).flat();
  return messages.length ? messages.join(" ") : fallback;
}
