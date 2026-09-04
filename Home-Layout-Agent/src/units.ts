const SQUARE_FEET_PER_SQUARE_METER = 10.763910416709722;

export function squareMetersToSquareFeet(areaM2: number): number {
  if (!Number.isFinite(areaM2) || areaM2 < 0) {
    throw new RangeError('areaM2 must be a finite non-negative number');
  }
  return areaM2 * SQUARE_FEET_PER_SQUARE_METER;
}

export function formatArea(
  areaM2: number,
  locale: 'en-US' | 'zh-CN',
  includeUsListingEquivalent = false,
): string {
  const primary = new Intl.NumberFormat(locale, {
    maximumFractionDigits: 1,
    minimumFractionDigits: 0,
  }).format(areaM2);

  if (!includeUsListingEquivalent) return `${primary} m²`;

  const squareFeet = new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 0,
  }).format(squareMetersToSquareFeet(areaM2));
  return `${primary} m² (${squareFeet} sq ft)`;
}

export function millimetersToDisplayLength(
  lengthMm: number,
  locale: 'en-US' | 'zh-CN',
): string {
  if (!Number.isFinite(lengthMm) || lengthMm < 0) {
    throw new RangeError('lengthMm must be a finite non-negative number');
  }

  if (lengthMm < 1000) {
    const centimeters = lengthMm / 10;
    return `${new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(centimeters)} cm`;
  }

  const meters = lengthMm / 1000;
  return `${new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(meters)} m`;
}
