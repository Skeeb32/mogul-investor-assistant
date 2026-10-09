import { describe, expect, it } from "vitest";
import { requestExceedsBytes, requireSameOrigin } from "./origin";

describe("request guards", () => {
  it("rejects a mutation from another origin", () => {
    const request = new Request("https://mogul.example/api/chat", {
      method: "POST",
      headers: { origin: "https://attacker.example" },
    });
    expect(requireSameOrigin(request)?.status).toBe(403);
  });

  it("allows a same-origin mutation", () => {
    const request = new Request("https://mogul.example/api/chat", {
      method: "POST",
      headers: { origin: "https://mogul.example" },
    });
    expect(requireSameOrigin(request)).toBeNull();
  });

  it("checks declared request size against a byte limit", () => {
    const request = new Request("https://mogul.example/api/documents", {
      method: "POST",
      headers: { "content-length": "1025" },
    });
    expect(requestExceedsBytes(request, 1024)).toBe(true);
    expect(requestExceedsBytes(request, 2048)).toBe(false);
  });
});
