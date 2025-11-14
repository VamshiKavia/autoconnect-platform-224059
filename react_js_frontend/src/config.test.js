import { getFeatureFlags, isMockBackendEnabled } from "./config";

test("getFeatureFlags parses comma-separated key:value", () => {
  const prev = process.env.REACT_APP_FEATURE_FLAGS;
  process.env.REACT_APP_FEATURE_FLAGS = "A:true,B:false,C:123";
  const flags = getFeatureFlags();
  expect(flags.A).toBe(true);
  expect(flags.B).toBe(false);
  expect(flags.C).toBe("123");
  process.env.REACT_APP_FEATURE_FLAGS = prev;
});

test("isMockBackendEnabled recognizes MOCK_BACKEND", () => {
  const prev = process.env.REACT_APP_FEATURE_FLAGS;
  process.env.REACT_APP_FEATURE_FLAGS = "MOCK_BACKEND:true";
  expect(isMockBackendEnabled()).toBe(true);
  process.env.REACT_APP_FEATURE_FLAGS = prev;
});
