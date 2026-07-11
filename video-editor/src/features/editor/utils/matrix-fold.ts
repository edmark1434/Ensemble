interface Decomposed2D {
  rotate: number;  // degrees
  skewX: number;   // degrees
  scaleX: number;
  scaleY: number;
}

const toRad = (deg: number) => (deg * Math.PI) / 180;
const toDeg = (rad: number) => (rad * 180) / Math.PI;

type Mat2 = { a: number; b: number; c: number; d: number };
// CSS matrix(a, b, c, d, e, f) layout: x' = a*x + c*y; y' = b*x + d*y

function mul(m1: Mat2, m2: Mat2): Mat2 {
  return {
    a: m1.a * m2.a + m1.c * m2.b,
    b: m1.b * m2.a + m1.d * m2.b,
    c: m1.a * m2.c + m1.c * m2.d,
    d: m1.b * m2.c + m1.d * m2.d
  };
}

function buildSkewMatrix(
  rotateDeg: number,
  skewXDeg: number,
  skewYDeg: number,
  scaleX: number,
  scaleY: number
): Mat2 {
  const rot = toRad(rotateDeg);
  const R: Mat2 = { a: Math.cos(rot), b: Math.sin(rot), c: -Math.sin(rot), d: Math.cos(rot) };
  const SX: Mat2 = { a: 1, b: 0, c: Math.tan(toRad(skewXDeg)), d: 1 };
  const SY: Mat2 = { a: 1, b: Math.tan(toRad(skewYDeg)), c: 0, d: 1 };
  const S: Mat2 = { a: scaleX, b: 0, c: 0, d: scaleY };
  return mul(R, mul(SX, mul(SY, S)));
}

// Standard QR-style 2D decompose (same algorithm browsers use to
// interpolate transforms). Any invertible 2x2 matrix factors into
// rotate * skewX * scale(scaleX, scaleY) — skewY has no independent
// slot because it's redundant once scaleX/scaleY can differ. That's
// exactly the redundancy we're exploiting here.
function decompose2x2(m: Mat2): Decomposed2D {
  let { a, b, c, d } = m;

  let scaleX = Math.sqrt(a * a + b * b) || 1e-8;
  a /= scaleX; b /= scaleX;

  let skew = a * c + b * d;
  c -= a * skew; d -= b * skew;

  let scaleY = Math.sqrt(c * c + d * d) || 1e-8;
  c /= scaleY; d /= scaleY; skew /= scaleY;

  if (a * d - b * c < 0) {
    a = -a; b = -b; scaleX = -scaleX; skew = -skew;
  }

  return {
    rotate: toDeg(Math.atan2(b, a)),
    skewX: toDeg(Math.atan(skew)),
    scaleX,
    scaleY
  };
}

/** rotate + skewX + skewY + independent scaleX/scaleY -> rotate + skewX + (scaleX, scaleY) */
export function foldSkewYIntoScale(
  rotateDeg: number,
  skewXDeg: number,
  skewYDeg: number,
  scaleX: number,
  scaleY: number
): Decomposed2D {
  return decompose2x2(buildSkewMatrix(rotateDeg, skewXDeg, skewYDeg, scaleX, scaleY));
}