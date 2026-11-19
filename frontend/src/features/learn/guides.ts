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
  String: {
    intro:
      "Strings are sequences of characters. Most problems come down to scanning, counting, or comparing substrings.",
    concepts: [
      { title: "Character counting", detail: "Tally characters with an array or map to compare strings." },
      { title: "Two pointers", detail: "Walk inward from both ends for palindromes and reversals." },
      { title: "Sliding windows", detail: "Grow and shrink a substring while tracking what it contains." },
      { title: "Building output", detail: "Collect pieces in a list and join once instead of repeated concatenation." },
    ],
  },
  "Hash Table": {
    intro: "Hash tables trade memory for constant-time lookups, turning many nested loops into a single pass.",
    concepts: [
      { title: "Seen sets", detail: "Remember what you have visited to detect duplicates and cycles." },
      { title: "Complement lookups", detail: "Store values so the matching partner is found in O(1)." },
      { title: "Frequency maps", detail: "Count occurrences to compare, group, or rank items." },
      { title: "Grouping by key", detail: "Choose a canonical key so related items land in the same bucket." },
    ],
  },
  "Dynamic Programming": {
    intro: "Dynamic programming solves a problem by combining answers to smaller overlapping subproblems.",
    concepts: [
      { title: "Define the state", detail: "Decide what a subproblem is and which values identify it." },
      { title: "Write the recurrence", detail: "Express each state using smaller states and base cases." },
      { title: "Memoize or tabulate", detail: "Cache top-down results or fill a table bottom-up." },
      { title: "Shrink the table", detail: "Keep only the rows or values the recurrence still needs." },
    ],
  },
  "Two Pointers": {
    intro: "Two pointers move through a sequence together, replacing a nested loop with one coordinated pass.",
    concepts: [
      { title: "Opposite ends", detail: "Close in from both sides of a sorted array." },
      { title: "Fast and slow", detail: "Move at different speeds to find cycles and midpoints." },
      { title: "Read and write", detail: "Compact an array in place with one pointer reading and one writing." },
    ],
  },
  "Sliding Window": {
    intro: "A sliding window tracks a contiguous range and updates its answer as the range moves.",
    concepts: [
      { title: "Fixed windows", detail: "Add the entering element and remove the leaving one." },
      { title: "Variable windows", detail: "Expand until invalid, then shrink until valid again." },
      { title: "Window state", detail: "Keep counts or sums that update in constant time." },
    ],
  },
  Tree: {
    intro:
      "Trees are hierarchies of nodes. Most solutions are a traversal with the right information passed up or down.",
    concepts: [
      { title: "Depth-first traversal", detail: "Preorder, inorder, and postorder visit nodes in different orders." },
      { title: "Level-order traversal", detail: "Use a queue to process a tree one level at a time." },
      { title: "Recursive returns", detail: "Have each call return what its parent needs, such as height." },
      { title: "Search tree ordering", detail: "Use left-smaller, right-larger ordering to skip subtrees." },
    ],
  },
  Greedy: {
    intro:
      "Greedy algorithms make the best local choice at each step, which works when local choices never need undoing.",
    concepts: [
      { title: "Sort first", detail: "Order items so the best next choice is always at the front." },
      { title: "Exchange arguments", detail: "Check that swapping two choices can never improve the result." },
      { title: "Interval scheduling", detail: "Pick by earliest finish to fit the most intervals." },
    ],
  },
  Backtracking: {
    intro: "Backtracking explores choices one at a time and undoes them when a path cannot lead to a solution.",
    concepts: [
      { title: "Choose, explore, undo", detail: "Make a choice, recurse, then restore the previous state." },
      { title: "Pruning", detail: "Stop early when a partial answer already breaks a constraint." },
      { title: "Avoiding duplicates", detail: "Sort and skip equal choices at the same depth." },
    ],
  },
  "Heap (Priority Queue)": {
    intro: "A heap gives quick access to the smallest or largest item while items keep arriving.",
    concepts: [
      { title: "Push and pop", detail: "Both run in O(log n) and keep the best item on top." },
      { title: "Top K", detail: "Keep a heap of size k instead of sorting everything." },
      { title: "Two heaps", detail: "Balance a max-heap and a min-heap to track a running median." },
    ],
  },
  Sorting: {
    intro: "Sorting puts data in order so that pairs, groups, and boundaries become easy to find.",
    concepts: [
      { title: "Custom comparisons", detail: "Sort by a key or comparator that matches the problem." },
      { title: "Sort then scan", detail: "Many problems become one pass once the input is ordered." },
      { title: "Counting and bucket sort", detail: "Beat O(n log n) when values fall in a small range." },
    ],
  },
  Math: {
    intro: "Math problems reward spotting a formula or property that removes the need for brute force.",
    concepts: [
      { title: "Modular arithmetic", detail: "Keep numbers small and handle remainders correctly." },
      { title: "Divisors and primes", detail: "Use gcd, factorization, and sieves." },
      { title: "Digit manipulation", detail: "Peel digits with division and remainder." },
      { title: "Overflow awareness", detail: "Know the limits of the number types you use." },
    ],
  },
  "Bit Manipulation": {
    intro: "Bit manipulation works directly on binary representations for compact, fast solutions.",
    concepts: [
      { title: "AND, OR, XOR, shifts", detail: "Know what each operator does to individual bits." },
      { title: "XOR cancellation", detail: "Equal values cancel, which exposes the odd one out." },
      { title: "Bit masks", detail: "Represent a small set as the bits of one integer." },
    ],
  },
  "Prefix Sum": {
    intro: "Prefix sums precompute running totals so any range sum is a single subtraction.",
    concepts: [
      { title: "Running totals", detail: "Build the prefix array in one pass." },
      { title: "Range queries", detail: "Subtract two prefixes to get the sum between them." },
      { title: "Prefix plus hash map", detail: "Count subarrays with a target sum by looking up earlier prefixes." },
    ],
  },
};

// Topic names differ between sources, so several names share one guide.
const aliases: Record<string, string> = {
  Array: "Arrays",
  "Binary Search": "Search",
  "Linked List": "Linked Lists",
  "Doubly-Linked List": "Linked Lists",
  Graph: "Graphs",
  "Depth-First Search": "Graphs",
  "Breadth-First Search": "Graphs",
  "Monotonic Stack": "Stack",
  "Binary Tree": "Tree",
  "Binary Search Tree": "Tree",
  Memoization: "Dynamic Programming",
};

export function guideFor(topic: string): Guide {
  return (
    guides[aliases[topic] ?? topic] ?? {
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
