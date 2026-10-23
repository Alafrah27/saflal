const avatarColors = [
  "#6C63FF", // indigo
  "#FF6584", // pink
  "#43B77A", // emerald
  "#F5A623", // amber
  "#5B9BD5", // sky blue
  "#E74C8B", // magenta
  "#8B5CF6", // purple
  "#EF6C00", // deep orange
];

export function getColorFromId(id) {
  if (!id) return avatarColors[0];
  const str = String(id);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return avatarColors[Math.abs(hash) % avatarColors.length];
}
