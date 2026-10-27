/** Keeps live lookup disabled until CP01-C accepts the deployed backend; contains no request transport. */
export async function verifyStudent() {
  return { kind: 'unavailable' };
}

/** Private read transport remains disabled until separately authorized CP01-C integration. */
export async function readStudent() {
  throw { status: 503 };
}
