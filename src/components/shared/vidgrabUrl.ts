export const getVidGrabUrl = (userToken?: string): string => {
  const envUrl = import.meta.env.VITE_VIDGRAB_URL;
  let baseUrl = "https://vidgrab.drawndimension.com";

  const hostname = window.location.hostname;
  if (hostname === "localhost" || hostname === "127.0.0.1") {
    baseUrl = "http://localhost:8080";
  } else if (envUrl && typeof envUrl === "string" && envUrl.trim()) {
    baseUrl = envUrl.trim();
  }

  if (userToken) {
    const separator = baseUrl.includes("?") ? "&" : "?";
    return `${baseUrl}${separator}token=${encodeURIComponent(userToken)}`;
  }

  return baseUrl;
};

export default getVidGrabUrl;
