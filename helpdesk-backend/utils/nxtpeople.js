/**
 * NxtPeople — central HR access controller.
 *
 * Before any user is allowed to log in, this app asks NxtPeople
 * "is this email currently an authorized employee for this app?".
 * If NxtPeople says no, login is blocked even if OTP/OAuth succeeded.
 *
 * Config (must be set in .env, never committed):
 *   NXTPEOPLE_URL      = https://nxtpeople.altiusnxt.tech
 *   NXTPEOPLE_API_KEY  = <secret provided by NxtPeople admin>
 *
 * Fails closed: any error (missing config, timeout, network) → denied.
 */

const NXT_URL = process.env.NXTPEOPLE_URL;
const NXT_KEY = process.env.NXTPEOPLE_API_KEY;

async function checkAccess(email) {
  if (!NXT_URL || !NXT_KEY) {
    console.warn('[nxtpeople] CONFIG_MISSING — NXTPEOPLE_URL or NXTPEOPLE_API_KEY not set in .env');
    return { allowed: false, reason: 'CONFIG_MISSING' };
  }
  try {
    const r = await fetch(`${NXT_URL}/api/external/access/check`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': NXT_KEY,
      },
      body: JSON.stringify({ email: String(email).toLowerCase().trim() }),
      signal: AbortSignal.timeout(5000),
    });
    return await r.json();
  } catch (err) {
    console.error('[nxtpeople] check failed:', err.message);
    return { allowed: false, reason: 'NETWORK_ERROR' };
  }
}

module.exports = { checkAccess };
