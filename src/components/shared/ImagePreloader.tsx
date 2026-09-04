import { useEffect } from "react";
import { registerImageServiceWorker, startBackgroundFullImagePrecache } from "./ImageCacheManager";

export const ImagePreloader = () => {
  useEffect(() => {
    // 1. Register the Service Worker to handle all image caching
    registerImageServiceWorker();

    // 2. Start background image preloading when app is idle
    startBackgroundFullImagePrecache();
  }, []);

  return null;
};

export default ImagePreloader;
