const DANGEROUS_EXTENSIONS = new Set([
  ".exe",
  ".bat",
  ".cmd",
  ".ps1",
  ".msi",
  ".vbs",
  ".wsf",
  ".scr",
  ".com",
  ".pif",
]);

export function getBaseName(pathOrName: string): string {
  // Handle both Windows and Unix paths
  const parts = pathOrName.replace(/\\/g, "/").split("/");
  return parts[parts.length - 1] || pathOrName;
}

export function getExtension(pathOrName: string): string {
  const base = getBaseName(pathOrName);
  const dotIndex = base.lastIndexOf(".");
  if (dotIndex === -1 || dotIndex === 0) return "";
  return base.slice(dotIndex).toLowerCase();
}

export function isDangerousExecutable(pathOrName: string): boolean {
  return DANGEROUS_EXTENSIONS.has(getExtension(pathOrName));
}

export function isLikelyWindowsPath(text: string): boolean {
  return /^[A-Z]:\\/i.test(text.trim());
}

const IMAGE_EXTENSIONS = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
  ".gif",
  ".bmp",
  ".svg",
]);

export function isImageFile(pathOrName: string): boolean {
  return IMAGE_EXTENSIONS.has(getExtension(pathOrName));
}

export function getImageMimeFromExtension(pathOrName: string): string | undefined {
  const ext = getExtension(pathOrName);
  switch (ext) {
    case ".png": return "image/png";
    case ".jpg":
    case ".jpeg": return "image/jpeg";
    case ".webp": return "image/webp";
    case ".gif": return "image/gif";
    case ".bmp": return "image/bmp";
    case ".svg": return "image/svg+xml";
    default: return undefined;
  }
}
