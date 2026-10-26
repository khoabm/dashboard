/** Keeps live lookup disabled until CP01-C accepts the deployed backend; contains no request transport. */
export async function verifyStudent() {
  return { kind: 'unavailable' };
}
