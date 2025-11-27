//utils/zones.js
export const DEFAULT_ZONE_SLUG = "hannam-3";

export const ZONE_LABELS = {
  "hannam-3": "한남 3구역",
  "hannam-2": "한남 2구역",
  "hannam-1": "한남 1구역",
  "hannam-heights": "한남 하이츠",
  "hannam-hive": "한남 하이브",
};

export const ZONE_OPTIONS = Object.entries(ZONE_LABELS).map(
  ([slug, name]) => ({ slug, name })
);

export function getZoneName(zoneId, fallback = "한남동") {
  if (!zoneId) {
    return fallback;
  }
  return ZONE_LABELS[zoneId] || zoneId;
}

export function formatZoneLabel(zoneId) {
  return getZoneName(zoneId, "한남동 전체");
}
