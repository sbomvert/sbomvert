// Container image references: how they are named in storage, and which ones a scan accepts.

export const SanitizeContainerImage = (imageName: string) =>
  imageName.replace(/\//g, 'slash').replace(/:/g, 'twodots');

// Image refs come from users and end up as tool CLI args and storage paths: no leading '-'
// (flag injection), no '..' (path traversal), no source scheme like `dir:/` or `file:` (a ':'
// not followed by a port or tag digit before the first '/'), only reference characters.
export const isValidImageRef = (ref: string) =>
  ref.length <= 255 &&
  /^[a-zA-Z0-9][a-zA-Z0-9._/:@-]*$/.test(ref) &&
  !ref.includes('..') &&
  !/^[^/]*:[^/0-9]*\//.test(ref) &&
  !/^[a-z-]+:\/?\//.test(ref);
