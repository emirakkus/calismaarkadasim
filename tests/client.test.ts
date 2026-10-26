import { describe, it, expect } from "vitest";
import { formatMinutes, pct } from "@/lib/client";

describe("istemci yardımcıları", () => {
  it("dakikayı biçimlendirir", () => {
    expect(formatMinutes(0)).toBe("0 dk");
    expect(formatMinutes(45)).toBe("45 dk");
    expect(formatMinutes(60)).toBe("1 sa");
    expect(formatMinutes(90)).toBe("1 sa 30 dk");
  });

  it("yüzdeyi hesaplar ve 100 ile sınırlar", () => {
    expect(pct(0, 0)).toBe(0);
    expect(pct(50, 100)).toBe(50);
    expect(pct(150, 100)).toBe(100);
  });
});
