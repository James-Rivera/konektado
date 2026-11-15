/** Exact entry accepts pesos and centavos, never exponent notation or silently stripped symbols. */
export function parsePriceAmount(value: string): number | null {
  const text = value.trim();
  if (!text) return null;
  if (!/^(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d{1,2})?$/.test(text)) return Number.NaN;
  const amount = Number(text.replace(/,/g, ''));
  return Number.isFinite(amount) && amount > 0 && amount <= Number.MAX_SAFE_INTEGER / 100
    ? amount : Number.NaN;
}

export function getPriceSliderMaximum(min: number | null, max: number | null) {
  const highest = Math.max(Number.isFinite(min) ? min ?? 0 : 0, Number.isFinite(max) ? max ?? 0 : 0);
  return Math.max(1000, Math.ceil(highest / 1000) * 1000);
}

/** Snap only the moved thumb; never round away the untouched exact amount. */
export function moveRateThumb(current:{minimum:number;maximum:number},thumb:'minimum'|'maximum',amount:number,minimumValue:number,maximumValue:number,step:number) {
  const snapped=Math.round(amount/step)*step;
  return thumb==='minimum'
    ? {minimum:Math.max(minimumValue,Math.min(snapped,current.maximum)),maximum:current.maximum}
    : {minimum:current.minimum,maximum:Math.min(maximumValue,Math.max(snapped,current.minimum))};
}

export function getRangeError(min: number | null | undefined, max: number | null | undefined) {
  if (!Number.isFinite(min) || !Number.isFinite(max) || !min || !max || min <= 0 || max <= 0) {
    return 'Enter both minimum and maximum amounts greater than zero.';
  }
  if (max < min) return 'Maximum amount must be at least the minimum.';
  return null;
}

/** Invalid/unfinished amounts remain private editor state, not numeric columns. */
export function draftPriceValues(minimum?: number | null, maximum?: number | null) {
  const valid = (amount: number | null | undefined) => amount != null && Number.isFinite(amount) && amount > 0 && Math.round(amount * 100) / 100 === amount;
  if ((minimum != null && !valid(minimum)) || (maximum != null && !valid(maximum)) || (minimum != null && maximum != null && minimum > maximum)) return { minimum: null, maximum: null };
  return { minimum: minimum ?? null, maximum: maximum ?? null };
}
