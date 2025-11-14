import { getApiBase } from "./client";

test("getApiBase falls back to localhost when unset", () => {
  const previous = process.env.REACT_APP_API_BASE;
  delete process.env.REACT_APP_API_BASE;
  const base = getApiBase();
  expect(base).toBe("http://localhost:3001");
  process.env.REACT_APP_API_BASE = previous;
});
