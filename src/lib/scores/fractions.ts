export type Fraction = Readonly<{ numerator: number; denominator: number }>

function requireSafeInteger(value: number): void {
  if (!Number.isSafeInteger(value))
    throw new RangeError('Musical time exceeds safe integer precision')
}

function greatestCommonDivisor(left: number, right: number): number {
  while (right !== 0) [left, right] = [right, left % right]
  return left
}

export function fraction(numerator: number, denominator = 1): Fraction {
  requireSafeInteger(numerator)
  requireSafeInteger(denominator)
  if (denominator <= 0) throw new RangeError('Musical time denominator must be positive')
  const divisor = greatestCommonDivisor(Math.abs(numerator), denominator)
  return { numerator: numerator / divisor, denominator: denominator / divisor }
}

export const ZERO = fraction(0)

export function addFractions(left: Fraction, right: Fraction): Fraction {
  const divisor = greatestCommonDivisor(left.denominator, right.denominator)
  const numerator =
    left.numerator * (right.denominator / divisor) + right.numerator * (left.denominator / divisor)
  const denominator = (left.denominator / divisor) * right.denominator
  return fraction(numerator, denominator)
}

export function subtractFractions(left: Fraction, right: Fraction): Fraction {
  return addFractions(left, fraction(-right.numerator, right.denominator))
}

export function compareFractions(left: Fraction, right: Fraction): number {
  const difference = subtractFractions(left, right)
  return Math.sign(difference.numerator)
}

export function fractionFromDivisions(duration: number, divisions: number): Fraction {
  if (duration < 0 || divisions <= 0) throw new RangeError('Invalid MusicXML duration or divisions')
  return fraction(duration, divisions)
}
