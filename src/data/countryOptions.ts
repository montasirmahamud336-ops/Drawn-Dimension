import countries from "i18n-iso-countries";
import enLocale from "i18n-iso-countries/langs/en.json";

countries.registerLocale(enLocale);

export interface CountryOption {
  code: string;
  name: string;
}

const buildCountryOptions = (): CountryOption[] => {
  const countryNames = countries.getNames("en", { select: "official" });

  return Object.entries(countryNames)
    .filter(([code, name]) => /^[A-Z]{2}$/.test(code) && typeof name === "string")
    .map(([code, name]) => ({ code, name }))
    .sort((a, b) => a.name.localeCompare(b.name));
};

export const COUNTRY_OPTIONS: CountryOption[] = buildCountryOptions();

const COUNTRY_NAME_BY_CODE = new Map<string, string>(
  COUNTRY_OPTIONS.map((option) => [option.code, option.name])
);

export const getCountryName = (code: string) =>
  COUNTRY_NAME_BY_CODE.get(String(code ?? "").toUpperCase()) ?? String(code ?? "").toUpperCase();
