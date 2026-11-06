// jsdom omits these Node globals; aws-sdk (smithy) needs them at import time
const { TextEncoder, TextDecoder } = require('util');
Object.assign(globalThis, { TextEncoder, TextDecoder });
