import * as pc from 'playcanvas';

export function addPrefixToPodData(podObject, prefix) {
  // Make a shallow copy so we don’t mutate the original
  const updated = { ...podObject };

  // Only modify fields if they exist and aren’t already absolute (e.g., "http://", "https://")
  // If you always want to force this prefix, you can skip the "startsWith" checks.

  // 1) Pod Display Image
  if (updated.podDispalyImage && !isAbsoluteUrl(updated.podDispalyImage)) {
    updated.podDispalyImage = prefix + updated.podDispalyImage;
  }

  // 2) Pod settings: Glb, Skybox, Floor
  if (updated.podSettingsGlobal) {
    const globalCopy = { ...updated.podSettingsGlobal };

    if (globalCopy.podGlbUrl && !isAbsoluteUrl(globalCopy.podGlbUrl)) {
      globalCopy.podGlbUrl = prefix + globalCopy.podGlbUrl;
    }

    if (globalCopy.skyboxUrl && !isAbsoluteUrl(globalCopy.skyboxUrl)) {
      globalCopy.skyboxUrl = prefix + globalCopy.skyboxUrl;
    }

    if (globalCopy.floorCubemapUrl && !isAbsoluteUrl(globalCopy.floorCubemapUrl)) {
      globalCopy.floorCubemapUrl = prefix + globalCopy.floorCubemapUrl;
    }

    updated.podSettingsGlobal = globalCopy;
  }

  return updated;
}

/**
 * Utility to check if a string is already an absolute URL
 */

window.CurrentText = null;
export function isAbsoluteUrl(url) {
  return url.startsWith('http://') || url.startsWith('https://');
}
