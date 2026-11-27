export const paletteCommands = [
  {
    href: "/",
    label: "Browse problems",
    keywords: "catalog search questions coding",
    description: "Explore the problem catalog",
  },
  { href: "/learn", label: "Learning paths", keywords: "study topics roadmap", description: "Practice by topic" },
  {
    href: "/progress",
    label: "Practice review",
    keywords: "history progress solved statistics",
    description: "Review your practice activity",
  },
  {
    href: "/generate",
    label: "Generate a problem",
    keywords: "create custom question",
    description: "Create a new coding exercise",
  },
  {
    href: "/about",
    label: "About Rock Em",
    keywords: "help information project",
    description: "Learn about the platform",
  },
];

export function searchCommands(query: string) {
  const words = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  return paletteCommands.filter((command) => {
    const searchable = `${command.label} ${command.keywords} ${command.description}`.toLowerCase();
    return words.every((word) => searchable.includes(word));
  });
}

export function moveSelection(index: number, direction: number, count: number) {
  return count === 0 ? 0 : (index + direction + count) % count;
}
