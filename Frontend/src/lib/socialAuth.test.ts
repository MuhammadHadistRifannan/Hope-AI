import { describe, expect, it } from "vitest";
import { isInAppBrowser, parseProviders } from "./socialAuth";

describe("parseProviders", () => {
  it("mengambil penyedia yang dikenal, dengan urutan tetap", () => {
    expect(parseProviders("apple, Google ,facebook")).toEqual(["google", "facebook", "apple"]);
  });

  it("mengabaikan nama yang tidak dikenal dan nilai kosong", () => {
    expect(parseProviders("twitter,,google")).toEqual(["google"]);
    expect(parseProviders(undefined)).toEqual([]);
    expect(parseProviders("")).toEqual([]);
  });
});

describe("isInAppBrowser", () => {
  it("mengenali browser bawaan Instagram dan Facebook", () => {
    expect(isInAppBrowser("Mozilla/5.0 (iPhone) AppleWebKit Instagram 300.0")).toBe(true);
    expect(isInAppBrowser("Mozilla/5.0 (Linux; Android) [FBAN/FB4A;FBAV/400.0]")).toBe(true);
  });

  it("tidak menandai Chrome dan Safari biasa", () => {
    expect(isInAppBrowser("Mozilla/5.0 (Windows NT 10.0) Chrome/130.0 Safari/537.36")).toBe(false);
    expect(isInAppBrowser("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0) Version/18.0 Mobile Safari/604.1")).toBe(false);
  });
});
