export const getCmsMainScrollContainer = () => {
  if (typeof window === "undefined") return null;
  return window.document.querySelector<HTMLElement>(".cms-main-scroll");
};

export const scrollCmsMainToTop = () => {
  const container = getCmsMainScrollContainer();
  if (container) {
    container.scrollTo({ top: 0, behavior: "auto" });
    return;
  }

  if (typeof window !== "undefined") {
    window.scrollTo({ top: 0, behavior: "auto" });
  }
};
