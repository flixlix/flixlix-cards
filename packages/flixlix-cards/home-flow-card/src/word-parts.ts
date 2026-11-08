/** How many characters `a` and `b` share, from their start or from their end. */
const sharedLength = (a: string[], b: string[], fromEnd: boolean) => {
  const count = Math.min(a.length, b.length);
  const at = (chars: string[], index: number) => chars[fromEnd ? chars.length - 1 - index : index];
  const length = Array.from({ length: count }, (_, index) => index).findIndex(
    (index) => at(a, index) !== at(b, index)
  );
  return length === -1 ? count : length;
};

/**
 * Splits `word`, one of two words it can switch between, into the head and tail both words share
 * and the middle that differs: "discharging" and "charging" share their tail "charging", "en
 * charge" and "en décharge" their head "en " and tail "charge". Only the middle needs to morph.
 */
export const wordParts = (word: string, other: string): [string, string, string] => {
  const chars = Array.from(word);
  const otherChars = Array.from(other);
  const head = sharedLength(chars, otherChars, false);
  const tail = Math.min(
    sharedLength(chars, otherChars, true),
    Math.min(chars.length, otherChars.length) - head
  );
  const end = chars.length - tail;
  return [
    chars.slice(0, head).join(""),
    chars.slice(head, end).join(""),
    chars.slice(end).join(""),
  ];
};
