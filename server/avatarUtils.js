const FEMALE_NAMES = new Set([
  'SHALAKA', 'KRISHNA', 'DURVA', 'ZIYA', 'SAKHI', 'BHRANTI',
  'KHUSHI', 'DIYA', 'HELLY', 'SHRIYA', 'NISHITABA', 'RADHA',
  'SUHA', 'HIMANSHI', 'RUCHITAA', 'HANI', 'ARATI', 'VISHVA',
  'JELAM', 'ROSHNI', 'ADITI', 'DHARA', 'BHAVYA', 'HINABA',
  'PRIYA', 'POOJA', 'NEHA', 'SHREYA', 'ANITA', 'KAVITA', 'SHITAL'
]);

export function isFemaleName(fullName = '') {
  if (!fullName) return false;
  const parts = fullName.toUpperCase().split(/[\s._-]+/);
  for (const part of parts) {
    if (FEMALE_NAMES.has(part)) return true;
    if (part.endsWith('BEN') || part.endsWith('BA')) return true;
  }
  return false;
}

/**
 * Returns a calm, professional standing avatar (half-body/bust, neutral expressions).
 * Eliminates all offensive, exaggerated, or silly expressions (no crying, winking, vampire teeth, etc.).
 */
export function getAvatarUrl(name = 'User', gender = null, isFaculty = false) {
  const cleanName = (name || 'User').trim();
  const female = gender === 'female' || (gender !== 'male' && isFemaleName(cleanName));

  const hair = female
    ? 'long,bobCut,pigtails,curlyBun,bobBangs,straightBun,extraLong'
    : 'shortCombover,shortComboverChops,buzzcut,fade,cap';

  const facialHairProb = (isFaculty && !female) ? '30' : '0';

  // DiceBear Personas style: half-body characters standing calmly in clean clothing
  // mouth=smile ensures a polite, gentle, normal expression
  // eyes=open ensures normal calm eyes (no crying, tears, winks, or vampire expressions)
  return `https://api.dicebear.com/7.x/personas/svg?seed=${encodeURIComponent(cleanName)}&hair=${hair}&mouth=smile&eyes=open&facialHairProbability=${facialHairProb}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`;
}

/**
 * Ensures any existing avatar containing offensive/silly avataaars or empty URLs is sanitized.
 */
export function cleanAvatarUrl(avatar, name = 'User', gender = null, isFaculty = false) {
  if (!avatar || typeof avatar !== 'string' || avatar.includes('avataaars') || avatar.includes('unsplash.com')) {
    return getAvatarUrl(name, gender, isFaculty);
  }
  return avatar;
}
