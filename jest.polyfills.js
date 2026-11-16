// jsdom omits these Node globals; aws-sdk (smithy) needs them at import time
const { TextEncoder, TextDecoder } = require('util');
Object.assign(globalThis, { TextEncoder, TextDecoder });

// jsdom has no structuredClone (every current browser does); the SBOM translators use it
if (typeof globalThis.structuredClone !== 'function') {
  const { serialize, deserialize } = require('v8');
  globalThis.structuredClone = value => deserialize(serialize(value));
}
