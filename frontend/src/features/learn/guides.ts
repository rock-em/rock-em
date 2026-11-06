export type Guide = { intro: string; concepts: { title: string; detail: string }[] };

const guides: Record<string, Guide> = {
  Arrays: {
    intro: "Arrays store values in an ordered sequence. Learn to scan, compare, and reuse information efficiently.",
    concepts: [
      { title: "Traversal", detail: "Move through an array using indices and loops." },
      { title: "Hash maps", detail: "Store previously seen values for quick lookups." },
      { title: "Two pointers", detail: "Use two moving indices instead of nested loops." },
      { title: "Sliding windows", detail: "Track a contiguous range while updating results efficiently." },
    ],
  },
  Stack: {
    intro: "Stacks process items last-in, first-out. They're ideal for nested structures and reversing order.",
    concepts: [
      { title: "Push and pop", detail: "Add to and remove from the top of a stack." },
      { title: "LIFO reasoning", detail: "Recognize problems where the most recent item matters first." },
      { title: "Matching pairs", detail: "Track nested brackets and validate their closing order." },
    ],
  },
  Search: {
    intro: "Search algorithms find values or boundaries. Sorted inputs often let you do better than a full scan.",
    concepts: [
      { title: "Linear search", detail: "Inspect elements one by one and understand O(n)." },
      { title: "Binary search", detail: "Halve the search space after each comparison." },
      { title: "Loop invariants", detail: "Keep clear left/right bounds and stopping conditions." },
      { title: "Edge cases", detail: "Test missing items, single-item arrays, and boundaries." },
    ],
  },
  "Linked Lists": {
    intro: "Linked lists connect nodes using references instead of contiguous indices.",
    concepts: [
      { title: "Nodes and pointers", detail: "Read val and next to move between nodes." },
      { title: "Traversal", detail: "Follow next pointers until reaching null." },
      { title: "Relinking", detail: "Rearrange next pointers without losing nodes." },
      { title: "Dummy heads", detail: "Simplify operations at the start of a list." },
    ],
  },
  Graphs: {
    intro: "Graphs represent connections. Grid-based problems often hide graph traversal underneath.",
    concepts: [
      { title: "Vertices and edges", detail: "Model entities and their connections." },
      { title: "Depth-first search", detail: "Follow one path fully before backtracking." },
      { title: "Breadth-first search", detail: "Explore neighbors one layer at a time." },
      { title: "Visited tracking", detail: "Avoid revisiting nodes or cells." },
    ],
  },
};

export function guideFor(topic: string): Guide {
  return (
    guides[topic] ?? {
      intro: `Practice ${topic} with a focused learning checklist and coding exercises.`,
      concepts: [
        { title: "Understand the fundamentals", detail: `Identify the important ideas behind ${topic}.` },
        { title: "Trace a small example", detail: "Work through input and output by hand." },
        { title: "Analyze efficiency", detail: "Consider the time and memory required by your solution." },
        { title: "Try edge cases", detail: "Test empty, minimal, and unusual inputs when applicable." },
      ],
    }
  );
}
