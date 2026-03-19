import {
  detectProjectMediaType,
  getProjectMediaList,
  getProjectPdfDocument,
  getProjectPrimaryCardMedia,
  getProjectPrimaryImageUrl,
  getProjectVisualMedia,
} from "./projectMedia";

describe("projectMedia helpers", () => {
  it("detects pdf, video, and image urls", () => {
    expect(detectProjectMediaType("https://cdn.example.com/work/document.PDF")).toBe("pdf");
    expect(detectProjectMediaType("https://cdn.example.com/work/demo.mp4")).toBe("video");
    expect(detectProjectMediaType("https://cdn.example.com/work/render.jpg")).toBe("image");
  });

  it("normalizes media arrays and infers missing types", () => {
    const project = {
      media: [
        { url: "https://cdn.example.com/work/render.jpg" },
        { url: "https://cdn.example.com/work/demo.mp4", type: "video" },
        { url: "https://cdn.example.com/work/spec-sheet.pdf", name: "spec-sheet.pdf" },
      ],
    };

    expect(getProjectMediaList(project)).toEqual([
      { url: "https://cdn.example.com/work/render.jpg", type: "image", name: null },
      { url: "https://cdn.example.com/work/demo.mp4", type: "video", name: null },
      { url: "https://cdn.example.com/work/spec-sheet.pdf", type: "pdf", name: "spec-sheet.pdf" },
    ]);
  });

  it("falls back to image_url when media array is missing", () => {
    const project = { image_url: "https://cdn.example.com/work/cover.png" };

    expect(getProjectMediaList(project)).toEqual([
      { url: "https://cdn.example.com/work/cover.png", type: "image", name: null },
    ]);
  });

  it("returns pdf and visual helpers from mixed media", () => {
    const project = {
      media: [
        { url: "https://cdn.example.com/work/spec-sheet.pdf", type: "pdf", name: "spec-sheet.pdf" },
        { url: "https://cdn.example.com/work/cover.png", type: "image" },
      ],
    };

    expect(getProjectPdfDocument(project)).toEqual({
      url: "https://cdn.example.com/work/spec-sheet.pdf",
      type: "pdf",
      name: "spec-sheet.pdf",
    });
    expect(getProjectVisualMedia(project)).toEqual([
      { url: "https://cdn.example.com/work/cover.png", type: "image", name: null },
    ]);
    expect(getProjectPrimaryImageUrl(getProjectMediaList(project))).toBe("https://cdn.example.com/work/cover.png");
    expect(getProjectPrimaryCardMedia(project)).toEqual({
      url: "https://cdn.example.com/work/cover.png",
      type: "image",
      name: null,
    });
  });
});

