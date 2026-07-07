export function formatRelativeTime(value: string) {
  const date = new Date(value);
  const seconds = Math.floor((date.getTime() - Date.now()) / 1000);
  const ranges: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ["year", 60 * 60 * 24 * 365],
    ["month", 60 * 60 * 24 * 30],
    ["week", 60 * 60 * 24 * 7],
    ["day", 60 * 60 * 24],
    ["hour", 60 * 60],
    ["minute", 60],
    ["second", 1]
  ];

  const formatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  const [unit, unitSeconds] =
    ranges.find(([, rangeSeconds]) => Math.abs(seconds) >= rangeSeconds) ?? ranges[ranges.length - 1];

  return formatter.format(Math.round(seconds / unitSeconds), unit);
}
