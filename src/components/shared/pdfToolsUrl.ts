export const getPdfToolsUrl = (_userToken?: string): string => {
  const envUrl = import.meta.env.VITE_PDF_TOOLS_URL;
  return (envUrl && typeof envUrl === "string" && envUrl.trim()) 
    ? envUrl.trim() 
    : "https://tools.drawndimension.com";
};

export default getPdfToolsUrl;
