export interface Country {
  /** ISO 3166-1 alpha-2 code, e.g. "IN". */
  iso: string;
  name: string;
  /** Dialling code including "+", e.g. "+91". */
  dial: string;
  flag: string;
  /** Allowed national number lengths (digits only, no leading 0). */
  minDigits: number;
  maxDigits: number;
}

export const DEFAULT_COUNTRY_ISO = "IN";

export const COUNTRIES: Country[] = [
  { iso: "IN", name: "India", dial: "+91", flag: "🇮🇳", minDigits: 10, maxDigits: 10 },
  { iso: "US", name: "United States", dial: "+1", flag: "🇺🇸", minDigits: 10, maxDigits: 10 },
  { iso: "CA", name: "Canada", dial: "+1", flag: "🇨🇦", minDigits: 10, maxDigits: 10 },
  { iso: "GB", name: "United Kingdom", dial: "+44", flag: "🇬🇧", minDigits: 10, maxDigits: 10 },
  { iso: "AE", name: "United Arab Emirates", dial: "+971", flag: "🇦🇪", minDigits: 9, maxDigits: 9 },
  { iso: "SA", name: "Saudi Arabia", dial: "+966", flag: "🇸🇦", minDigits: 9, maxDigits: 9 },
  { iso: "QA", name: "Qatar", dial: "+974", flag: "🇶🇦", minDigits: 8, maxDigits: 8 },
  { iso: "KW", name: "Kuwait", dial: "+965", flag: "🇰🇼", minDigits: 8, maxDigits: 8 },
  { iso: "OM", name: "Oman", dial: "+968", flag: "🇴🇲", minDigits: 8, maxDigits: 8 },
  { iso: "BH", name: "Bahrain", dial: "+973", flag: "🇧🇭", minDigits: 8, maxDigits: 8 },
  { iso: "NP", name: "Nepal", dial: "+977", flag: "🇳🇵", minDigits: 10, maxDigits: 10 },
  { iso: "BD", name: "Bangladesh", dial: "+880", flag: "🇧🇩", minDigits: 10, maxDigits: 10 },
  { iso: "LK", name: "Sri Lanka", dial: "+94", flag: "🇱🇰", minDigits: 9, maxDigits: 9 },
  { iso: "PK", name: "Pakistan", dial: "+92", flag: "🇵🇰", minDigits: 10, maxDigits: 10 },
  { iso: "BT", name: "Bhutan", dial: "+975", flag: "🇧🇹", minDigits: 8, maxDigits: 8 },
  { iso: "MV", name: "Maldives", dial: "+960", flag: "🇲🇻", minDigits: 7, maxDigits: 7 },
  { iso: "SG", name: "Singapore", dial: "+65", flag: "🇸🇬", minDigits: 8, maxDigits: 8 },
  { iso: "MY", name: "Malaysia", dial: "+60", flag: "🇲🇾", minDigits: 9, maxDigits: 10 },
  { iso: "AU", name: "Australia", dial: "+61", flag: "🇦🇺", minDigits: 9, maxDigits: 9 },
  { iso: "NZ", name: "New Zealand", dial: "+64", flag: "🇳🇿", minDigits: 8, maxDigits: 10 },
  { iso: "DE", name: "Germany", dial: "+49", flag: "🇩🇪", minDigits: 10, maxDigits: 11 },
  { iso: "FR", name: "France", dial: "+33", flag: "🇫🇷", minDigits: 9, maxDigits: 9 },
  { iso: "IT", name: "Italy", dial: "+39", flag: "🇮🇹", minDigits: 9, maxDigits: 10 },
  { iso: "NL", name: "Netherlands", dial: "+31", flag: "🇳🇱", minDigits: 9, maxDigits: 9 },
  { iso: "IE", name: "Ireland", dial: "+353", flag: "🇮🇪", minDigits: 9, maxDigits: 9 },
  { iso: "ZA", name: "South Africa", dial: "+27", flag: "🇿🇦", minDigits: 9, maxDigits: 9 },
  { iso: "KE", name: "Kenya", dial: "+254", flag: "🇰🇪", minDigits: 9, maxDigits: 9 },
  { iso: "NG", name: "Nigeria", dial: "+234", flag: "🇳🇬", minDigits: 10, maxDigits: 10 },
  { iso: "JP", name: "Japan", dial: "+81", flag: "🇯🇵", minDigits: 10, maxDigits: 10 },
  { iso: "HK", name: "Hong Kong", dial: "+852", flag: "🇭🇰", minDigits: 8, maxDigits: 8 },
];

export const findCountry = (iso: string): Country =>
  COUNTRIES.find((c) => c.iso === iso) ?? COUNTRIES[0];

/** India numbers start with 6-9; elsewhere only the length is checked. */
export const isValidNationalNumber = (country: Country, digits: string): boolean => {
  if (!/^\d+$/.test(digits)) return false;
  if (digits.length < country.minDigits || digits.length > country.maxDigits) return false;
  if (country.iso === "IN" && !/^[6-9]/.test(digits)) return false;
  return true;
};
