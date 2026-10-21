/**
 * Utility to format Date to Jakarta (WIB, GMT+7) Time
 */
export function formatJakartaTime(date: Date, format: 'datetime' | 'date' = 'datetime'): string {
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: format === 'datetime' ? '2-digit' : undefined,
    minute: format === 'datetime' ? '2-digit' : undefined,
    second: format === 'datetime' ? '2-digit' : undefined,
    hour12: false,
  });

  const parts = formatter.formatToParts(date);
  const map: Record<string, string> = {};
  parts.forEach(({ type, value }) => { map[type] = value; });

  if (format === 'date') {
    return `${map.year}-${map.month}-${map.day}`;
  }
  return `${map.year}-${map.month}-${map.day} ${map.hour}:${map.minute}:${map.second}`;
}
