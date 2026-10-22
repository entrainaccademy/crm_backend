// Older leads may contain spaces or a local Indian number. Compare all of
// those against the international number saved by the current lead form.
export const leadPhoneKey = (phone) => {
  const value = String(phone ?? "").trim();
  const digits = value.replace(/\D/g, "");
  if (!digits) return "";
  if (/^\d{10}$/.test(digits) && !value.startsWith("+")) return `+91${digits}`;
  return `+${digits}`;
};
