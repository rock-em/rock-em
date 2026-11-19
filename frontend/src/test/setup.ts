import "@testing-library/jest-dom/vitest";
import { beforeEach } from "vitest";

// Newer Node versions define their own localStorage, which hides jsdom's and
// has no working methods without a backing file. Tests get a plain in-memory
// one instead, emptied before each test.
const values = new Map<string, string>();
const storage: Storage = {
  get length() {
    return values.size;
  },
  clear: () => values.clear(),
  getItem: (key) => values.get(key) ?? null,
  key: (index) => [...values.keys()][index] ?? null,
  removeItem: (key) => void values.delete(key),
  setItem: (key, value) => void values.set(key, String(value)),
};
Object.defineProperty(globalThis, "localStorage", { configurable: true, value: storage });
beforeEach(() => values.clear());
