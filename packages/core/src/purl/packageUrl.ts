export type PackageUrl = {
  type: string;
  namespace: string;
  name: string;
  version: string;
  qualifiers: Record<string, string>;
  subpath: string;
};

const escape = (s: string) => encodeURIComponent(s).replace(/[!*'()]/g, c => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
const escapePath = (s: string) => s.split('/').map(escape).join('/');

export const parsePackageUrl = (purl: string): PackageUrl | null => {
  if (!purl.startsWith('pkg:')) return null;
  try {
    let rest = purl.slice(4).replace(/^\/+/, '');
    const [beforeHash, ...hash] = rest.split('#');
    const [path, ...query] = beforeHash.split('?');
    const slash = path.indexOf('/');
    if (slash < 1) return null;
    const type = path.slice(0, slash).toLowerCase();
    rest = path.slice(slash + 1);
    const lastSlash = rest.lastIndexOf('/');
    // only an '@' in the name starts the version: not the raw '@' of a scope (`@scope/name`)
    const at = rest.lastIndexOf('@');
    const [nameAndNamespace, version] = at > lastSlash ? [rest.slice(0, at), rest.slice(at + 1)] : [rest, ''];
    const qualifiers: Record<string, string> = {};
    for (const pair of query.join('?').split('&')) {
      const eq = pair.indexOf('=');
      const value = eq > 0 ? decodeURIComponent(pair.slice(eq + 1)) : '';
      if (value) qualifiers[pair.slice(0, eq).toLowerCase()] = value;
    }
    const name = decodeURIComponent(nameAndNamespace.slice(lastSlash + 1));
    if (!name) return null;
    return {
      type,
      namespace: lastSlash < 0 ? '' : decodeURIComponent(nameAndNamespace.slice(0, lastSlash)),
      name,
      version: decodeURIComponent(version),
      qualifiers,
      subpath: decodeURIComponent(hash.join('#')),
    };
  } catch {
    return null; // malformed 
  }
};

export const formatPackageUrl = ({ type, namespace, name, version, qualifiers, subpath }: PackageUrl): string => {
  const query = Object.keys(qualifiers)
    .filter(k => qualifiers[k] !== '')
    .sort()
    .map(k => `${k}=${escape(qualifiers[k])}`)
    .join('&');
  return (
    `pkg:${type}/${namespace ? escapePath(namespace) + '/' : ''}${escape(name)}` +
    (version ? `@${escape(version)}` : '') +
    (query ? `?${query}` : '') +
    (subpath ? `#${escapePath(subpath)}` : '')
  );
};
