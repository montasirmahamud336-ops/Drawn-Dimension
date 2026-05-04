import path from "path";
import { fileURLToPath } from "url";

const currentFile = fileURLToPath(import.meta.url);
const currentDir = path.dirname(currentFile);

export const SERVER_ROOT = path.resolve(currentDir, "..", "..");
export const SERVER_DATA_DIR = path.join(SERVER_ROOT, "data");
export const SERVER_MEDIA_DIR = path.join(SERVER_ROOT, "media");
export const SERVER_UPLOADS_DIR = path.join(SERVER_ROOT, "uploads");
