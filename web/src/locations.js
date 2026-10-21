// Locations come from the database (dbo.Loca → the per-location columns of dbo.Stock),
// so nothing here decides WHICH locations exist. This only makes a code readable:
// a known code gets its shop name, anything else falls back to the code itself, so a
// location added to the POS still shows up correctly without a code change.
const NAMES = {
  HCM: 'Havelock City Mall',
  One_Galle_Face: 'One Galle Face',
};

export const locationName = (code) => NAMES[code] ?? String(code).replace(/_/g, ' ');

// Short label for tight spaces (the filter buttons): initials of the full name.
export const locationShort = (code) => {
  const name = locationName(code);
  if (name === code) return code;
  return name.split(/\s+/).map((w) => w[0]).join('').toUpperCase();
};
