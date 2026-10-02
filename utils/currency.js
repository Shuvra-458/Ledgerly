/**
 * Supported currencies and their display symbols.
 * Keep this in sync with the enum in models/User.js.
 */
const CURRENCY_SYMBOLS = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  INR: '₹',
  JPY: '¥',
};

const SUPPORTED_CURRENCIES = Object.keys(CURRENCY_SYMBOLS);

/**
 * Returns the display symbol for a currency code.
 * Falls back to '$' for unknown codes.
 */
function symbol(code) {
  return CURRENCY_SYMBOLS[code] || '$';
}

module.exports = { CURRENCY_SYMBOLS, SUPPORTED_CURRENCIES, symbol };