-- Only enrich untouched demo entries. Never translate or replace admin-authored
-- content based on its slug alone. Historical migrations remain unchanged.
BEGIN;
CREATE TEMP TABLE starter_language_seed ON COMMIT DROP AS
SELECT * FROM jsonb_to_recordset($variants$
[
  {
    "slug": "two-sum",
    "title": "Two Sum",
    "description": "Given an array of integers nums and an integer target, return the indices of two different elements whose values add up to target. You may assume exactly one solution exists. Return the indices in any order.",
    "difficulty": "Easy",
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
    "function_name": "twoSum",
    "short_description": "Find two distinct positions whose values add up to a target.",
    "variants": {
      "python": {
        "requirements": [
          "Use Python 3.10 or later.",
          "Test input is a JSON array of positional arguments. Expected values use JSON encoding.",
          "Return zero-based indices; the order of the two returned indices does not matter."
        ],
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
          "2 <= len(nums) <= 10000",
          "Exactly one valid pair exists.",
          "You cannot use the same element twice."
        ],
        "tests": [
          {
            "input": [
              [
                2,
                7,
                11,
                15
              ],
              9
            ],
            "expected": [
              0,
              1
            ]
          },
          {
            "input": [
              [
                3,
                2,
                4
              ],
              6
            ],
            "expected": [
              1,
              2
            ]
          },
          {
            "input": [
              [
                3,
                3
              ],
              6
            ],
            "expected": [
              0,
              1
            ]
          }
        ],
        "starter": "def two_sum(nums, target):\n    # Write your solution here\n    pass\n",
        "functionName": "two_sum",
        "indexBase": 0
      },
      "javascript": {
        "requirements": [
          "Use JavaScript.",
          "Test input is a JSON array of positional arguments. Expected values use JSON encoding.",
          "Return zero-based indices; the order of the two returned indices does not matter."
        ],
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
          "2 <= nums.length <= 10000",
          "Exactly one valid pair exists.",
          "You cannot use the same element twice."
        ],
        "tests": [
          {
            "input": [
              [
                2,
                7,
                11,
                15
              ],
              9
            ],
            "expected": [
              0,
              1
            ]
          },
          {
            "input": [
              [
                3,
                2,
                4
              ],
              6
            ],
            "expected": [
              1,
              2
            ]
          },
          {
            "input": [
              [
                3,
                3
              ],
              6
            ],
            "expected": [
              0,
              1
            ]
          }
        ],
        "starter": "function twoSum(nums, target) {\n  // Write your solution here\n  \n}",
        "functionName": "twoSum",
        "indexBase": 0
      }
    }
  },
  {
    "slug": "valid-parentheses",
    "title": "Valid Parentheses",
    "description": "Given a string containing only (), {}, and [], determine whether it is valid. Every opening bracket must be closed by the same type of bracket in the correct order.",
    "difficulty": "Easy",
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
    "function_name": "isValid",
    "short_description": "Check whether brackets are balanced and properly nested.",
    "variants": {
      "python": {
        "requirements": [
          "Use Python 3.10 or later.",
          "Test input is a JSON array of positional arguments. Expected values use JSON encoding."
        ],
        "examples": [
          {
            "input": "s = \"()[]{}\"",
            "output": "True"
          },
          {
            "input": "s = \"(]\"",
            "output": "False"
          }
        ],
        "constraints": [
          "1 <= len(s) <= 10000",
          "s contains only parentheses and brackets."
        ],
        "tests": [
          {
            "input": [
              "()[]{}"
            ],
            "expected": true
          },
          {
            "input": [
              "(]"
            ],
            "expected": false
          },
          {
            "input": [
              "{[]}"
            ],
            "expected": true
          },
          {
            "input": [
              "([)]"
            ],
            "expected": false
          }
        ],
        "starter": "def is_valid(s):\n    # Write your solution here\n    pass\n",
        "functionName": "is_valid",
        "indexBase": 0
      },
      "javascript": {
        "requirements": [
          "Use JavaScript.",
          "Test input is a JSON array of positional arguments. Expected values use JSON encoding."
        ],
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
          "1 <= s.length <= 10000",
          "s contains only parentheses and brackets."
        ],
        "tests": [
          {
            "input": [
              "()[]{}"
            ],
            "expected": true
          },
          {
            "input": [
              "(]"
            ],
            "expected": false
          },
          {
            "input": [
              "{[]}"
            ],
            "expected": true
          },
          {
            "input": [
              "([)]"
            ],
            "expected": false
          }
        ],
        "starter": "function isValid(s) {\n  // Write your solution here\n  \n}",
        "functionName": "isValid",
        "indexBase": 0
      }
    }
  },
  {
    "slug": "binary-search",
    "title": "Binary Search",
    "description": "Given an array of integers nums sorted in ascending order and a target value, return the index of target. If target is not present, return -1. Aim for O(log n) time complexity.",
    "difficulty": "Easy",
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
    "function_name": "search",
    "short_description": "Find a target in a sorted sequence in logarithmic time.",
    "variants": {
      "python": {
        "requirements": [
          "Use Python 3.10 or later.",
          "Test input is a JSON array of positional arguments. Expected values use JSON encoding.",
          "Return a zero-based index when found, or -1 when absent."
        ],
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
          "1 <= len(nums) <= 10000",
          "nums is sorted and contains distinct integers."
        ],
        "tests": [
          {
            "input": [
              [
                -1,
                0,
                3,
                5,
                9,
                12
              ],
              9
            ],
            "expected": 4
          },
          {
            "input": [
              [
                -1,
                0,
                3,
                5,
                9,
                12
              ],
              2
            ],
            "expected": -1
          },
          {
            "input": [
              [
                5
              ],
              5
            ],
            "expected": 0
          },
          {
            "input": [
              [
                5
              ],
              -5
            ],
            "expected": -1
          }
        ],
        "starter": "def search(nums, target):\n    # Write your solution here\n    pass\n",
        "functionName": "search",
        "indexBase": 0
      },
      "javascript": {
        "requirements": [
          "Use JavaScript.",
          "Test input is a JSON array of positional arguments. Expected values use JSON encoding.",
          "Return a zero-based index when found, or -1 when absent."
        ],
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
          "1 <= nums.length <= 10000",
          "nums is sorted and contains distinct integers."
        ],
        "tests": [
          {
            "input": [
              [
                -1,
                0,
                3,
                5,
                9,
                12
              ],
              9
            ],
            "expected": 4
          },
          {
            "input": [
              [
                -1,
                0,
                3,
                5,
                9,
                12
              ],
              2
            ],
            "expected": -1
          },
          {
            "input": [
              [
                5
              ],
              5
            ],
            "expected": 0
          },
          {
            "input": [
              [
                5
              ],
              -5
            ],
            "expected": -1
          }
        ],
        "starter": "function search(nums, target) {\n  // Write your solution here\n  \n}",
        "functionName": "search",
        "indexBase": 0
      }
    }
  },
  {
    "slug": "merge-two-sorted-lists",
    "title": "Merge Two Sorted Lists",
    "description": "Merge two sorted singly linked lists and return the head of the merged sorted list. Each node has a val and next property. Reuse the existing nodes or create new ones.",
    "difficulty": "Easy",
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
    "function_name": "mergeTwoLists",
    "short_description": "Merge two sorted linked lists into one sorted linked list.",
    "variants": {
      "python": {
        "requirements": [
          "Use Python 3.10 or later.",
          "Test input is a JSON array of positional arguments. Expected values use JSON encoding.",
          "Tests encode each linked list as an array of values. Decode arguments into nodes with val and next before calling the function; encode the returned list as an array.",
          "The final node uses next = None. Empty linked lists are None."
        ],
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
        "tests": [
          {
            "input": [
              [
                1,
                2,
                4
              ],
              [
                1,
                3,
                4
              ]
            ],
            "expected": [
              1,
              1,
              2,
              3,
              4,
              4
            ]
          },
          {
            "input": [
              [],
              []
            ],
            "expected": []
          },
          {
            "input": [
              [],
              [
                0
              ]
            ],
            "expected": [
              0
            ]
          }
        ],
        "starter": "class ListNode:\n    def __init__(self, val=0, next=None):\n        self.val = val\n        self.next = next\n\ndef merge_two_lists(list1, list2):\n    # Write your solution here\n    pass\n",
        "functionName": "merge_two_lists",
        "indexBase": 0
      },
      "javascript": {
        "requirements": [
          "Use JavaScript.",
          "Test input is a JSON array of positional arguments. Expected values use JSON encoding.",
          "Tests encode each linked list as an array of values. Decode arguments into nodes with val and next before calling the function; encode the returned list as an array.",
          "The final node uses next = null. Empty linked lists are null."
        ],
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
        "tests": [
          {
            "input": [
              [
                1,
                2,
                4
              ],
              [
                1,
                3,
                4
              ]
            ],
            "expected": [
              1,
              1,
              2,
              3,
              4,
              4
            ]
          },
          {
            "input": [
              [],
              []
            ],
            "expected": []
          },
          {
            "input": [
              [],
              [
                0
              ]
            ],
            "expected": [
              0
            ]
          }
        ],
        "starter": "function mergeTwoLists(list1, list2) {\n  // Nodes have { val, next }\n  // Write your solution here\n  \n}",
        "functionName": "mergeTwoLists",
        "indexBase": 0
      }
    }
  },
  {
    "slug": "maximum-subarray",
    "title": "Maximum Subarray",
    "description": "Given an integer array nums, find the contiguous subarray with the largest sum and return that sum. The subarray must contain at least one element.",
    "difficulty": "Medium",
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
    "function_name": "maxSubArray",
    "short_description": "Find the largest sum of a nonempty contiguous subarray.",
    "variants": {
      "python": {
        "requirements": [
          "Use Python 3.10 or later.",
          "Test input is a JSON array of positional arguments. Expected values use JSON encoding."
        ],
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
          "1 <= len(nums) <= 100000",
          "-10000 <= nums[i] <= 10000"
        ],
        "tests": [
          {
            "input": [
              [
                -2,
                1,
                -3,
                4,
                -1,
                2,
                1,
                -5,
                4
              ]
            ],
            "expected": 6
          },
          {
            "input": [
              [
                1
              ]
            ],
            "expected": 1
          },
          {
            "input": [
              [
                5,
                4,
                -1,
                7,
                8
              ]
            ],
            "expected": 23
          },
          {
            "input": [
              [
                -3,
                -2,
                -5
              ]
            ],
            "expected": -2
          }
        ],
        "starter": "def max_subarray(nums):\n    # Write your solution here\n    pass\n",
        "functionName": "max_subarray",
        "indexBase": 0
      },
      "javascript": {
        "requirements": [
          "Use JavaScript.",
          "Test input is a JSON array of positional arguments. Expected values use JSON encoding."
        ],
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
          "1 <= nums.length <= 100000",
          "-10000 <= nums[i] <= 10000"
        ],
        "tests": [
          {
            "input": [
              [
                -2,
                1,
                -3,
                4,
                -1,
                2,
                1,
                -5,
                4
              ]
            ],
            "expected": 6
          },
          {
            "input": [
              [
                1
              ]
            ],
            "expected": 1
          },
          {
            "input": [
              [
                5,
                4,
                -1,
                7,
                8
              ]
            ],
            "expected": 23
          },
          {
            "input": [
              [
                -3,
                -2,
                -5
              ]
            ],
            "expected": -2
          }
        ],
        "starter": "function maxSubArray(nums) {\n  // Write your solution here\n  \n}",
        "functionName": "maxSubArray",
        "indexBase": 0
      }
    }
  },
  {
    "slug": "number-of-islands",
    "title": "Number of Islands",
    "description": "Given a 2D grid of \"1\" (land) and \"0\" (water), count the islands. An island is formed by horizontally or vertically connected land cells and surrounded by water or the grid boundary.",
    "difficulty": "Medium",
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
    "function_name": "numIslands",
    "short_description": "Count groups of horizontally or vertically connected land cells.",
    "variants": {
      "python": {
        "requirements": [
          "Use Python 3.10 or later.",
          "Test input is a JSON array of positional arguments. Expected values use JSON encoding."
        ],
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
          "1 <= len(grid), len(grid[0]) <= 300",
          "All rows have the same length.",
          "Each cell is \"0\" or \"1\"."
        ],
        "tests": [
          {
            "input": [
              [
                [
                  "1",
                  "1",
                  "0"
                ],
                [
                  "1",
                  "0",
                  "0"
                ],
                [
                  "0",
                  "0",
                  "1"
                ]
              ]
            ],
            "expected": 2
          },
          {
            "input": [
              [
                [
                  "0",
                  "0"
                ],
                [
                  "0",
                  "0"
                ]
              ]
            ],
            "expected": 0
          },
          {
            "input": [
              [
                [
                  "1",
                  "1"
                ],
                [
                  "1",
                  "1"
                ]
              ]
            ],
            "expected": 1
          }
        ],
        "starter": "def num_islands(grid):\n    # Write your solution here\n    pass\n",
        "functionName": "num_islands",
        "indexBase": 0
      },
      "javascript": {
        "requirements": [
          "Use JavaScript.",
          "Test input is a JSON array of positional arguments. Expected values use JSON encoding."
        ],
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
          "1 <= grid.length, grid[i].length <= 300",
          "Each cell is \"0\" or \"1\"."
        ],
        "tests": [
          {
            "input": [
              [
                [
                  "1",
                  "1",
                  "0"
                ],
                [
                  "1",
                  "0",
                  "0"
                ],
                [
                  "0",
                  "0",
                  "1"
                ]
              ]
            ],
            "expected": 2
          },
          {
            "input": [
              [
                [
                  "0",
                  "0"
                ],
                [
                  "0",
                  "0"
                ]
              ]
            ],
            "expected": 0
          },
          {
            "input": [
              [
                [
                  "1",
                  "1"
                ],
                [
                  "1",
                  "1"
                ]
              ]
            ],
            "expected": 1
          }
        ],
        "starter": "function numIslands(grid) {\n  // Write your solution here\n  \n}",
        "functionName": "numIslands",
        "indexBase": 0
      }
    }
  }
]
$variants$::jsonb) AS seed(slug TEXT,title TEXT,description TEXT,difficulty TEXT,topic TEXT,examples JSONB,constraints JSONB,starter TEXT,function_name TEXT,short_description TEXT,variants JSONB);

CREATE TEMP TABLE matching_starters ON COMMIT DROP AS
SELECT p.id,s.* FROM problems p JOIN starter_language_seed s ON p.slug=s.slug AND p.title=s.title AND p.description=s.description AND p.difficulty=lower(s.difficulty) AND p.topic=s.topic AND p.examples=s.examples AND p.constraints=s.constraints AND p.starter=s.starter AND p.function_name=s.function_name;

UPDATE problems p SET short_description=s.short_description
FROM matching_starters s WHERE p.id=s.id AND p.short_description=left(p.description,200);

-- One map per problem. Existing keys win, so rerunning never overwrites edits.
UPDATE problems p SET languages=s.variants || p.languages
FROM matching_starters s WHERE p.id=s.id;
COMMIT;
