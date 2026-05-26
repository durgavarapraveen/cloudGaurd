export function formatFetchTime(timeStr: string) {
  if (!timeStr) return "—";
  // Combine with today's date to create a full datetime
  const [hours, minutes] = timeStr.split(":");
  const utcDate = new Date();
  utcDate.setUTCHours(Number(hours), Number(minutes), 0, 0);
  // Now format in user's local time
  return utcDate.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short", // shows "IST", "EST" etc
  });
}
