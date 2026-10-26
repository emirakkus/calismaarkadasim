import { describe, it, expect } from "vitest";
import { validateBackup, CURRENT_SCHEMA_VERSION } from "@/lib/backup";

function validFile() {
  return {
    app: "Çalışma Yol Arkadaşım",
    schemaVersion: CURRENT_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    data: {
      subjects: [{ id: 1, name: "Matematik" }],
      topics: [],
      tasks: [],
      questionLogs: [{ id: 1 }, { id: 2 }],
    },
  };
}

describe("validateBackup", () => {
  it("geçerli dosyayı kabul eder ve sayıları çıkarır", () => {
    const r = validateBackup(validFile());
    expect(r.valid).toBe(true);
    expect(r.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    expect(r.counts.subjects).toBe(1);
    expect(r.counts.questionLogs).toBe(2);
  });

  it("yanlış uygulama imzasını reddeder", () => {
    const f = validFile();
    f.app = "Başka Uygulama";
    const r = validateBackup(f);
    expect(r.valid).toBe(false);
  });

  it("gelecekteki şema sürümünü reddeder", () => {
    const f = validFile();
    f.schemaVersion = CURRENT_SCHEMA_VERSION + 5;
    const r = validateBackup(f);
    expect(r.valid).toBe(false);
  });

  it("data bölümü yoksa reddeder", () => {
    const r = validateBackup({ app: "Çalışma Yol Arkadaşım", schemaVersion: 1 });
    expect(r.valid).toBe(false);
  });

  it("bir alan dizi değilse reddeder", () => {
    const f = validFile();
    (f.data as Record<string, unknown>).subjects = "oops";
    const r = validateBackup(f);
    expect(r.valid).toBe(false);
  });

  it("nesne olmayan girdiyi reddeder", () => {
    expect(validateBackup(null).valid).toBe(false);
    expect(validateBackup("string").valid).toBe(false);
  });
});
