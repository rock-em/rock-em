-- Starter catalog copied from the frontend demo. Existing slugs, including
-- archived problems, are deliberately preserved. IDs are database-generated;
-- demo solved flags and executable test cases are not shared user state.
INSERT INTO problems (slug, title, description, difficulty, topic, examples, constraints, starter, function_name)
SELECT slug, title, description, difficulty, topic, examples, constraints, starter, function_name
FROM jsonb_to_recordset($catalog$
[
  {
    "slug": "two-sum",
    "title": "Two Sum",
    "description": "Given an array of integers nums and an integer target, return the indices of two different elements whose values add up to target. You may assume exactly one solution exists. Return the indices in any order.",
    "difficulty": "easy",
    "topic": "Arrays",
    "examples": [
      {
        "input": "nums = [2, 7, 11, 15], target = 9",
        "output": "[0, 1]"
      },
      {
        "input": "nums = [3, 2, 4], target = 6",
        "output": "[1, 2]"
      }
    ],
    "constraints": [
      "2 ≤ nums.length ≤ 10⁴",
      "Exactly one valid pair exists.",
      "You cannot use the same element twice."
    ],
    "starter": "function twoSum(nums, target) {\n  // Write your solution here\n  \n}",
    "function_name": "twoSum"
  },
  {
    "slug": "valid-parentheses",
    "title": "Valid Parentheses",
    "description": "Given a string containing only (), {}, and [], determine whether it is valid. Every opening bracket must be closed by the same type of bracket in the correct order.",
    "difficulty": "easy",
    "topic": "Stack",
    "examples": [
      {
        "input": "s = \"()[]{}\"",
        "output": "true"
      },
      {
        "input": "s = \"(]\"",
        "output": "false"
      }
    ],
    "constraints": [
      "1 ≤ s.length ≤ 10⁴",
      "s contains only parentheses and brackets."
    ],
    "starter": "function isValid(s) {\n  // Write your solution here\n  \n}",
    "function_name": "isValid"
  },
  {
    "slug": "binary-search",
    "title": "Binary Search",
    "description": "Given an array of integers nums sorted in ascending order and a target value, return the index of target. If target is not present, return -1. Aim for O(log n) time complexity.",
    "difficulty": "easy",
    "topic": "Search",
    "examples": [
      {
        "input": "nums = [-1, 0, 3, 5, 9, 12], target = 9",
        "output": "4"
      },
      {
        "input": "nums = [-1, 0, 3, 5, 9, 12], target = 2",
        "output": "-1"
      }
    ],
    "constraints": [
      "1 ≤ nums.length ≤ 10⁴",
      "nums is sorted and contains distinct integers."
    ],
    "starter": "function search(nums, target) {\n  // Write your solution here\n  \n}",
    "function_name": "search"
  },
  {
    "slug": "merge-two-sorted-lists",
    "title": "Merge Two Sorted Lists",
    "description": "Merge two sorted singly linked lists and return the head of the merged sorted list. Each node has a val and next property. Reuse the existing nodes or create new ones.",
    "difficulty": "easy",
    "topic": "Linked Lists",
    "examples": [
      {
        "input": "list1 = [1, 2, 4], list2 = [1, 3, 4]",
        "output": "[1, 1, 2, 3, 4, 4]"
      },
      {
        "input": "list1 = [], list2 = []",
        "output": "[]"
      }
    ],
    "constraints": [
      "Both lists are sorted in non-decreasing order.",
      "The total number of nodes is at most 50."
    ],
    "starter": "function mergeTwoLists(list1, list2) {\n  // Nodes have { val, next }\n  // Write your solution here\n  \n}",
    "function_name": "mergeTwoLists"
  },
  {
    "slug": "maximum-subarray",
    "title": "Maximum Subarray",
    "description": "Given an integer array nums, find the contiguous subarray with the largest sum and return that sum. The subarray must contain at least one element.",
    "difficulty": "medium",
    "topic": "Arrays",
    "examples": [
      {
        "input": "nums = [-2, 1, -3, 4, -1, 2, 1, -5, 4]",
        "output": "6",
        "explanation": "The subarray [4, -1, 2, 1] has sum 6."
      },
      {
        "input": "nums = [1]",
        "output": "1"
      }
    ],
    "constraints": [
      "1 ≤ nums.length ≤ 10⁵",
      "-10⁴ ≤ nums[i] ≤ 10⁴"
    ],
    "starter": "function maxSubArray(nums) {\n  // Write your solution here\n  \n}",
    "function_name": "maxSubArray"
  },
  {
    "slug": "number-of-islands",
    "title": "Number of Islands",
    "description": "Given a 2D grid of \"1\" (land) and \"0\" (water), count the islands. An island is formed by horizontally or vertically connected land cells and surrounded by water or the grid boundary.",
    "difficulty": "medium",
    "topic": "Graphs",
    "examples": [
      {
        "input": "grid = [[\"1\",\"1\",\"0\"],[\"1\",\"0\",\"0\"],[\"0\",\"0\",\"1\"]]",
        "output": "2"
      },
      {
        "input": "grid = [[\"0\",\"0\"],[\"0\",\"0\"]]",
        "output": "0"
      }
    ],
    "constraints": [
      "1 ≤ grid.length, grid[i].length ≤ 300",
      "Each cell is \"0\" or \"1\"."
    ],
    "starter": "function numIslands(grid) {\n  // Write your solution here\n  \n}",
    "function_name": "numIslands"
  }
]
$catalog$::jsonb) AS seed(
    slug TEXT, title TEXT, description TEXT, difficulty TEXT, topic TEXT,
    examples JSONB, constraints JSONB, starter TEXT, function_name TEXT
)
ON CONFLICT (slug) DO NOTHING;
