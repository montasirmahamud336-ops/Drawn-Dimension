import { afterEach, describe, expect, it, vi } from "vitest";
import { normalizeCmsStoredMediaUrl, resolveCmsMediaUrl } from "./mediaUrl";

const setWindowLocation = (url: string) => {
  Object.defineProperty(window, "location", {
    value: new URL(url),
    configurable: true,
  });
};

describe("mediaUrl helpers", () => {
  afterEach(() => {
    Object.defineProperty(window, "location", {
      value: new URL("http://localhost:3000"),
      configurable: true,
    });
    vi.unstubAllGlobals();
  });

  it("rewrites loopback media URLs to the public site for stored CMS values", () => {
    expect(
      normalizeCmsStoredMediaUrl(
        "http://127.0.0.1:4000/media/cms-uploads/team/example.png",
      ),
    ).toBe("https://www.drawndimension.com/media/cms-uploads/team/example.png");
  });

  it("rewrites relative media paths to a canonical public storage URL before saving", () => {
    expect(
      normalizeCmsStoredMediaUrl("/media/cms-uploads/projects/example.png"),
    ).toBe("https://www.drawndimension.com/media/cms-uploads/projects/example.png");
  });

  it("rewrites cms media URLs to the current production site origin", () => {
    setWindowLocation("https://www.drawndimension.com");

    expect(
      resolveCmsMediaUrl(
        "https://drawndimension.com/media/cms-uploads/home/logo.png",
      ),
    ).toBe("https://www.drawndimension.com/media/cms-uploads/home/logo.png");
    expect(
      resolveCmsMediaUrl(
        "https://api.drawndimension.com/media/cms-uploads/home/logo.png",
      ),
    ).toBe("https://www.drawndimension.com/media/cms-uploads/home/logo.png");
  });
});
