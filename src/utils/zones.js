// utils/zones.js
import { ZONE_LOOKUP, ZONES } from "../data/zones";

export const DEFAULT_ZONE_SLUG = "hannam-3";

const STATIC_LABELS = {
  "hannam-1": "한남 1구역",
};

export const ZONE_LABELS = ZONES.reduce(
  (acc, zone) => ({
    ...acc,
    [zone.slug]: zone.name,
  }),
  { ...STATIC_LABELS }
);

export const ZONE_OPTIONS = Object.entries(ZONE_LABELS).map(
  ([slug, name]) => ({ slug, name })
);

export function getZoneName(zoneId, fallback = "한남동") {
  if (!zoneId) {
    return fallback;
  }
  return ZONE_LABELS[zoneId] || zoneId;
}

export function getZoneMeta(zoneId) {
  if (!zoneId) return null;
  return ZONE_LOOKUP[zoneId] || null;
}

export function formatZoneLabel(zoneId) {
  return getZoneName(zoneId, "한남동 전체");
}
