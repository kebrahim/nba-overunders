// ESPN's APIs (team logo CDN, the scoreboard endpoint) use lowercase team
// abbreviations that mostly match our team codes, with a handful of known
// exceptions for the NBA.
const ESPN_CODE_OVERRIDES: Record<string, string> = {
  GSW: "gs",
  NOP: "no",
  NYK: "ny",
  SAS: "sa",
  UTA: "utah",
  WAS: "wsh",
};

const CODE_BY_ESPN = new Map(
  Object.entries(ESPN_CODE_OVERRIDES).map(([code, espnCode]) => [espnCode, code]),
);

export function toEspnCode(code: string): string {
  return ESPN_CODE_OVERRIDES[code] ?? code.toLowerCase();
}

export function fromEspnCode(espnCode: string): string {
  const lower = espnCode.toLowerCase();
  return CODE_BY_ESPN.get(lower) ?? lower.toUpperCase();
}
