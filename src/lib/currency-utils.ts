/**
 * Currency utility functions with proper rounding rules per currency.
 */

// Legacy fallback rates (BDT → target)
const BDT_RATES: Record<string, number> = {
  BDT: 1, USD: 0.0091, GBP: 0.0072, EUR: 0.0084, INR: 0.76,
  CAD: 0.0125, AUD: 0.014, JPY: 1.36, CNY: 0.066, BRL: 0.046,
  AED: 0.033, SAR: 0.034, SGD: 0.012, MYR: 0.04, PKR: 2.53,
  NGN: 14.1, ZAR: 0.165, KRW: 12.5, MXN: 0.156, TRY: 0.295,
  IDR: 143, PHP: 0.51, THB: 0.31, VND: 230, EGP: 0.45,
  KES: 1.17, GHS: 0.14, NZD: 0.015, SEK: 0.094, NOK: 0.097,
  DKK: 0.063, CHF: 0.008, PLN: 0.036, RUB: 0.83, LKR: 2.72,
  NPR: 1.22, MMK: 19.1, KWD: 0.0028, QAR: 0.033, BHD: 0.0034,
  OMR: 0.0035, JOD: 0.0065, CLP: 8.5, COP: 37.8, ARS: 8.1,
};

/**
 * Currency decimal places map.
 * Most currencies use 2 decimals. These are the exceptions.
 */
const CURRENCY_DECIMALS: Record<string, number> = {
  // Zero-decimal currencies
  BIF: 0, CLP: 0, DJF: 0, GNF: 0, ISK: 0, JPY: 0, KMF: 0, KRW: 0,
  MGA: 0, PYG: 0, RWF: 0, UGX: 0, VND: 0, VUV: 0, XAF: 0, XOF: 0, XPF: 0,
  // Three-decimal currencies
  BHD: 3, IQD: 3, JOD: 3, KWD: 3, LYD: 3, OMR: 3, TND: 3,
};

/** Get the number of decimal places for a currency */
export function getCurrencyDecimals(currency: string): number {
  return CURRENCY_DECIMALS[currency.toUpperCase()] ?? 2;
}

/** Round an amount to the correct decimal places for a currency */
export function roundForCurrency(amount: number, currency: string): number {
  const decimals = getCurrencyDecimals(currency);
  const factor = Math.pow(10, decimals);
  return Math.round(amount * factor) / factor;
}

/** Get the minor unit multiplier for a currency (e.g., 100 for USD, 1 for JPY, 1000 for BHD) */
export function getMinorUnitMultiplier(currency: string): number {
  return Math.pow(10, getCurrencyDecimals(currency));
}

/** Convert amount to minor units (cents/paise/etc) for gateway APIs */
export function toMinorUnits(amount: number, currency: string): number {
  return Math.round(amount * getMinorUnitMultiplier(currency));
}

/** Convert from minor units back to major units */
export function fromMinorUnits(minorAmount: number, currency: string): number {
  return minorAmount / getMinorUnitMultiplier(currency);
}

export function convertPrice(bdtAmount: number, targetCurrency: string, exchangeRate?: number): number {
  const rate = exchangeRate ?? BDT_RATES[targetCurrency] ?? 1;
  return roundForCurrency(bdtAmount * rate, targetCurrency);
}

/** Format a converted price with its currency symbol using Intl */
export function formatConvertedPrice(
  bdtAmount: number,
  currency: string,
  symbol: string,
  exchangeRate?: number
): string {
  const converted = convertPrice(bdtAmount, currency, exchangeRate);
  const decimals = getCurrencyDecimals(currency);
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: decimals === 0 ? 0 : (converted < 1 ? decimals : 0),
      maximumFractionDigits: decimals,
    }).format(converted);
  } catch {
    if (decimals === 0) return `${symbol}${Math.round(converted).toLocaleString()}`;
    return `${symbol}${converted.toFixed(decimals)}`;
  }
}
