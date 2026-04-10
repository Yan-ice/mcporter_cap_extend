import { describe, expect, it } from 'vitest';

import { serializeCapabilityParamText } from '../src/capability-param-text.js';

const schema = {
  type: 'object',
  properties: {
    host: { type: 'string' },
    port: { type: 'number' },
    path: { type: 'string' },
    depth: { type: 'number' },
  },
} as const;

describe('serializeCapabilityParamText', () => {
  it('uses properties key order as key=value pairs', () => {
    const args = { host: '127.0.0.1', port: 2121, path: '/', depth: 3 };
    expect(serializeCapabilityParamText(args, schema)).toBe('host=127.0.0.1,port=2121,path=/,depth=3');
  });

  it('omits capability from schema order', () => {
    const s = {
      type: 'object',
      properties: {
        capability: { type: 'string' },
        a: { type: 'string' },
        b: { type: 'string' },
      },
    };
    expect(serializeCapabilityParamText({ a: 'x', b: 'y' }, s)).toBe('a=x,b=y');
  });

  it('uses empty value for missing args', () => {
    expect(serializeCapabilityParamText({}, schema)).toBe('host=,port=,path=,depth=');
  });

  it('JSON-encodes objects and arrays', () => {
    const s = { type: 'object', properties: { x: { type: 'object' } } };
    expect(serializeCapabilityParamText({ x: { y: 1 } }, s)).toBe('x={"y":1}');
    expect(serializeCapabilityParamText({ x: [1, 2] }, s)).toBe('x=[1,2]');
  });
});
