// --- Name format helpers ---
export const formatContainerName = (folderName: string): string => {
  return folderName.replace(/-?twodots/g, ':').replace(/-?slash/g, '/');
};

export const reverseFormatContainerName = (formattedName: string): string => {
  return formattedName.replace(/:/g, 'twodots').replace(/\//g, 'slash');
};