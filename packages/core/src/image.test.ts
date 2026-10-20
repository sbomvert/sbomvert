import { isValidImageRef, SanitizeContainerImage } from './image';

test('SanitizeContainerImage turns a reference into one path segment', () => {
  expect(SanitizeContainerImage('library/nginx:1.27')).toBe('libraryslashnginxtwodots1.27');
});

describe('isValidImageRef', () => {
  test.each([
    'nginx',
    'nginx:latest',
    'library/nginx:1.27',
    'ghcr.io/org/app:v1.2.3',
    'localhost:5000/a/b',
    'localhost:5000/a/b:tag',
    `alpine@sha256:${'a'.repeat(64)}`,
  ])('accepts %s', ref => expect(isValidImageRef(ref)).toBe(true));

  test.each([
    '',
    '-o=x',
    '--output=/etc/passwd',
    '../../etc',
    'a/../b',
    'nginx latest',
    'nginx;rm',
    'x'.repeat(300),
    'dir:/root',
    'file:/etc/passwd',
    'oci-dir:/x',
    'docker-archive:/x.tar',
    'registry://nginx',
    'fs:///',
  ])('rejects %p', ref => expect(isValidImageRef(ref)).toBe(false));
});
