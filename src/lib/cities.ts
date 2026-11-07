/** City keys used by search and profiles. Labels live in the dictionaries (`cities.*`). */
export const CITY_GROUPS = {
  kurdistan: ["erbil", "sulaymaniyah", "duhok", "halabja"],
  iraq: ["baghdad", "basra", "mosul", "kirkuk", "najaf", "karbala"],
} as const;

export const ALL_CITY_KEYS: readonly string[] = [...CITY_GROUPS.kurdistan, ...CITY_GROUPS.iraq];

/** Search value meaning "any city / remote is fine". */
export const ANYWHERE = "anywhere";
