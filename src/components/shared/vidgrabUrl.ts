export const getVidGrabUrl = (_userToken?: string): string => {
  const envUrl = import.meta.env.VITE_VIDGRAB_URL;
  return (envUrl && typeof envUrl === "string" && envUrl.trim()) 
    ? envUrl.trim() 
    : "https://vidgrab.drawndimension.com";
};

export default getVidGrabUrl;
