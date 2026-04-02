import { InferPkgTypeFromPurl } from "./converter";
import { PkgType } from "./types";

describe('InferPkgTypeFromPurl', () => {
  describe('OS package detection', () => {
    it('should detect apk packages', () => {
      expect(InferPkgTypeFromPurl('pkg:apk/alpine/curl')).toBe<PkgType>('os');
    });

    it('should detect deb packages', () => {
      expect(InferPkgTypeFromPurl('pkg:deb/debian/bash')).toBe('os');
    });

    it('should detect dpkg packages', () => {
      expect(InferPkgTypeFromPurl('pkg:dpkg/ubuntu/coreutils')).toBe('os');
    });

    it('should detect rpm packages', () => {
      expect(InferPkgTypeFromPurl('pkg:rpm/fedora/openssl')).toBe('os');
    });

    it('should prioritize OS over other matches', () => {
      const purl = 'pkg:apk/npm/somepkg';
      expect(InferPkgTypeFromPurl(purl)).toBe('os');
    });
  });

  describe('Language ecosystems', () => {
    it('should detect npm packages', () => {
      expect(InferPkgTypeFromPurl('pkg:npm/lodash')).toBe('npm');
    });

    it('should detect python (pypi) packages', () => {
      expect(InferPkgTypeFromPurl('pkg:pypi/requests')).toBe('python');
    });

    it('should detect maven packages', () => {
      expect(
        InferPkgTypeFromPurl('pkg:maven/org.apache.commons/commons-lang3')
      ).toBe('maven');
    });

    it('should detect nuget packages', () => {
      expect(InferPkgTypeFromPurl('pkg:nuget/Newtonsoft.Json')).toBe('.net');
    });

    it('should detect cargo (rust) packages', () => {
      expect(InferPkgTypeFromPurl('pkg:cargo/serde')).toBe('rust');
    });
  });

  describe('Default / fallback', () => {
    it('should return generic for unknown package types', () => {
      expect(InferPkgTypeFromPurl('pkg:golang/github.com/foo/bar')).toBe('generic');
    });

    it('should return generic for empty string', () => {
      expect(InferPkgTypeFromPurl('')).toBe('generic');
    });

    it('should return generic for non-purl strings', () => {
      expect(InferPkgTypeFromPurl('not-a-purl')).toBe('generic');
    });
  });

  describe('Edge cases', () => {
    it('should be case-sensitive (no match if casing differs)', () => {
      expect(InferPkgTypeFromPurl('pkg:NPM/lodash')).toBe('generic');
    });

    it('should match substrings (potential false positives)', () => {
      // Demonstrates current behavior (not necessarily desired)
      expect(
        InferPkgTypeFromPurl('something-pkg:npm-like-but-not-real')
      ).toBe('generic');
    });

    it('should handle multiple matches by returning first match', () => {
      const purl = 'pkg:npm/pkg:pypi/pkg:maven/foo';
      expect(InferPkgTypeFromPurl(purl)).toBe('npm');
    });

    it('should not misclassify partial matches', () => {
      expect(InferPkgTypeFromPurl('pkg:npmmalicious/foo')).toBe('generic');
    });
  });
});