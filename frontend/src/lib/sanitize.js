/**
 * lib/sanitize.js
 * Client-side input sanitization for SisterCircle+.
 * Mirror of the backend sanitizers — defence in depth.
 * The backend re-sanitizes everything; this is a first line of defence.
 */

const STRIP_TAGS   = /<[^>]+>/gi;
const SCRIPT_BLOCK = /<script[\s\S]*?<\/script>|javascript\s*:|on\w+\s*=/gi;
const PROMPT_INJECT = /(ignore previous|ignore all|system:|assistant:|<\|im_start\|>|\[\[)/gi;

/**
 * stripHtml(value)
 * Remove all HTML tags from a string.
 */
export function stripHtml(value) {
  if (typeof value !== "string") return "";
  return value.replace(SCRIPT_BLOCK, "").replace(STRIP_TAGS, "").trim();
}

/**
 * sanitizeText(value, maxLength = 500)
 * Full sanitization for free-text fields.
 */
export function sanitizeText(value, maxLength = 500) {
  if (typeof value !== "string") return "";
  let v = value.replace(SCRIPT_BLOCK, "");
  v = v.replace(STRIP_TAGS, "");
  v = v.replace(PROMPT_INJECT, "[removed]");
  v = v.replace(/\s+/g, " ").trim();
  return v.slice(0, maxLength);
}

/**
 * validateAge(value)
 * Returns { valid: true, value: number } or { valid: false, error: string }.
 */
export function validateAge(value) {
  const n = Number(value);
  if (!value && value !== 0) return { valid: false, error: "Age is required." };
  if (isNaN(n) || !Number.isInteger(n)) return { valid: false, error: "Age must be a whole number." };
  if (n < 10 || n > 80) return { valid: false, error: "Age must be between 10 and 80." };
  return { valid: true, value: n };
}

/**
 * validateEmail(value)
 * Returns { valid: true } or { valid: false, error: string }.
 */
export function validateEmail(value) {
  if (!value) return { valid: false, error: "Email is required." };
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  if (!re.test(value)) return { valid: false, error: "Please enter a valid email address." };
  return { valid: true };
}

/**
 * sanitizeSymptomPayload(form)
 * Sanitizes the full symptom form object before POSTing to /api/symptoms/analyse/.
 */
export function sanitizeSymptomPayload(form) {
  return {
    age:              form.age ? Number(form.age) : null,
    location:         sanitizeText(form.location || "", 100),
    user_type:        sanitizeText(form.userType || "Patient", 50),
    last_period:      (form.lastPeriod || "").slice(0, 10) || null,
    cycle_length:     sanitizeText(form.cycleLength || "", 50),
    cycle_regularity: sanitizeText(form.cycleRegularity || "", 50),
    bleeding_volume:  sanitizeText(form.bleedingVolume || "", 50),
    bleeding_days:    sanitizeText(form.bleedingDays || "", 30),
    pain_level:       Math.max(0, Math.min(10, Number(form.painLevel) || 0)),
    symptoms:         (form.symptoms || []).slice(0, 20).map(s => sanitizeText(s, 100)),
    other_symptoms:   sanitizeText(form.otherSymptoms || "", 500),
  };
}
