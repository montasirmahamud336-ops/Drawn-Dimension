export const getPdfToolsUrl = (userToken?: string): string => {
  const envUrl = import.meta.env.VITE_PDF_TOOLS_URL;
  let baseUrl = (envUrl && typeof envUrl === "string" && envUrl.trim()) 
    ? envUrl.trim() 
    : "https://tools.drawndimension.com";

  if (userToken) {
    const separator = baseUrl.includes("?") ? "&" : "?";
    return `${baseUrl}${separator}token=${encodeURIComponent(userToken)}`;
  }

  return baseUrl;
};

export default getPdfToolsUrl;
