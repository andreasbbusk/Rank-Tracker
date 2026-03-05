export function isEmbedPath(pathname: string | null | undefined): boolean {
  return Boolean(pathname?.startsWith("/embed"));
}

export function toEmbedAwarePath(
  pathname: string | null | undefined,
  targetPath: string,
): string {
  if (!targetPath.startsWith("/")) {
    return targetPath;
  }

  if (!isEmbedPath(pathname)) {
    return targetPath;
  }

  if (targetPath === "/embed" || targetPath.startsWith("/embed/")) {
    return targetPath;
  }

  return `/embed${targetPath}`;
}
