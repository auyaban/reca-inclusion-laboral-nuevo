import { randomBytes } from "crypto";

const PASSWORD_ALPHABET =
  "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!#$%*-?";
const REQUIRED_CHARS = ["A", "a", "7", "!"] as const;

export function generateTemporaryPassword() {
  const bytes = randomBytes(14);
  const chars = [
    ...REQUIRED_CHARS,
    ...Array.from(bytes, (byte) =>
      PASSWORD_ALPHABET.at(byte % PASSWORD_ALPHABET.length)
    ),
  ].filter((char): char is string => Boolean(char));

  const shuffleBytes = randomBytes(chars.length);
  for (let index = chars.length - 1; index > 0; index -= 1) {
    const swapIndex = shuffleBytes[index] % (index + 1);
    [chars[index], chars[swapIndex]] = [chars[swapIndex], chars[index]];
  }

  return chars.join("");
}
