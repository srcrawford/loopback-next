// Copyright IBM Corp. 2017,2018. All Rights Reserved.
// Node module: @loopback/context
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

import {expect} from '@loopback/testlab';
import {Context, Binding, BindingScope, BindingType, isPromise} from '../..';

/**
 * Create a subclass of context so that we can access parents and registry
 * for assertions
 */
class TestContext extends Context {
  get parentList() {
    return this.parents;
  }
  get bindingMap() {
    const map = new Map(this.registry);
    return map;
  }
}

describe('Context constructor', () => {
  it('generates uuid name if not provided', () => {
    const ctx = new Context();
    expect(ctx.name).to.match(
      /^[0-9A-F]{8}-[0-9A-F]{4}-[1][0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i,
    );
  });

  it('generates unique names for different instances', () => {
    const ctx1 = new Context();
    const ctx2 = new Context();
    expect(ctx1.name).to.not.eql(ctx2.name);
  });

  it('accepts a name', () => {
    const ctx = new Context('my-context');
    expect(ctx.name).to.eql('my-context');
  });

  it('accepts a parent context', () => {
    const c1 = new Context('c1');
    const ctx = new TestContext(c1);
    expect(ctx.parentList).to.eql([c1]);
  });

  it('accepts multiple parent contexts', () => {
    const c1 = new Context('c1');
    const c2 = new Context('c2');
    const ctx = new TestContext([c1, c2]);
    expect(ctx.parentList).to.eql([c1, c2]);
  });

  it('accepts a parent context and a name', () => {
    const c1 = new Context('c1');
    const ctx = new TestContext(c1, 'c2');
    expect(ctx.name).to.eql('c2');
    expect(ctx.parentList).to.eql([c1]);
  });
});

describe('Context', () => {
  let ctx: Context;
  beforeEach('given a context', createContext);

  describe('bind', () => {
    it('adds a binding into the registry', () => {
      ctx.bind('foo');
      const result = ctx.contains('foo');
      expect(result).to.be.true();
    });

    it('returns a binding', () => {
      const binding = ctx.bind('foo');
      expect(binding).to.be.instanceOf(Binding);
    });

    it('rejects a key containing property separator', () => {
      const key = 'a' + Binding.PROPERTY_SEPARATOR + 'b';
      expect(() => ctx.bind(key)).to.throw(/Binding key .* cannot contain/);
    });
  });

  describe('contains', () => {
    it('returns true when the key is the registry', () => {
      ctx.bind('foo');
      const result = ctx.contains('foo');
      expect(result).to.be.true();
    });

    it('returns false when the key is not in the registry', () => {
      const result = ctx.contains('bar');
      expect(result).to.be.false();
    });

    it('returns false when the key is only in the parent context', () => {
      ctx.bind('foo');
      const childCtx = new Context(ctx);
      const result = childCtx.contains('foo');
      expect(result).to.be.false();
    });
  });

  describe('isBound', () => {
    it('returns true when the key is bound in the context', () => {
      ctx.bind('foo');
      const result = ctx.isBound('foo');
      expect(result).to.be.true();
    });

    it('returns false when the key is not bound in the context', () => {
      const result = ctx.isBound('bar');
      expect(result).to.be.false();
    });

    it('returns true when the key is bound in the context hierarchy', () => {
      ctx.bind('foo');
      const childCtx = new Context(ctx);
      const result = childCtx.isBound('foo');
      expect(result).to.be.true();
    });

    it('returns false when the key is not bound in the context hierarchy', () => {
      ctx.bind('foo');
      const childCtx = new Context(ctx);
      const result = childCtx.isBound('bar');
      expect(result).to.be.false();
    });
  });

  describe('unbind', () => {
    it('removes a binding', () => {
      ctx.bind('foo');
      const result = ctx.unbind('foo');
      expect(result).to.be.true();
      expect(ctx.contains('foo')).to.be.false();
    });

    it('returns false if the binding key does not exist', () => {
      ctx.bind('foo');
      const result = ctx.unbind('bar');
      expect(result).to.be.false();
    });

    it('cannot unbind a locked binding', () => {
      ctx
        .bind('foo')
        .to('a')
        .lock();
      expect(() => ctx.unbind('foo')).to.throw(
        `Cannot unbind key "foo" of a locked binding`,
      );
    });

    it('does not remove a binding from parent contexts', () => {
      ctx.bind('foo');
      const childCtx = new Context(ctx);
      const result = childCtx.unbind('foo');
      expect(result).to.be.false();
      expect(ctx.contains('foo')).to.be.true();
    });
  });

  describe('find', () => {
    it('returns matching binding', () => {
      const b1 = ctx.bind('foo');
      ctx.bind('bar');
      const result = ctx.find('foo');
      expect(result).to.be.eql([b1]);
    });

    it('returns matching binding with *', () => {
      const b1 = ctx.bind('foo');
      const b2 = ctx.bind('bar');
      const b3 = ctx.bind('baz');
      let result = ctx.find('*');
      expect(result).to.be.eql([b1, b2, b3]);
      result = ctx.find('ba*');
      expect(result).to.be.eql([b2, b3]);
    });

    it('returns matching binding with regexp', () => {
      const b1 = ctx.bind('foo');
      const b2 = ctx.bind('bar');
      const b3 = ctx.bind('baz');
      let result = ctx.find(/\w+/);
      expect(result).to.be.eql([b1, b2, b3]);
      result = ctx.find(/ba/);
      expect(result).to.be.eql([b2, b3]);
    });
  });

  describe('findByTag', () => {
    it('returns matching binding', () => {
      const b1 = ctx.bind('foo').tag('t1');
      ctx.bind('bar').tag('t2');
      const result = ctx.findByTag('t1');
      expect(result).to.be.eql([b1]);
    });

    it('returns matching binding with *', () => {
      const b1 = ctx.bind('foo').tag('t1');
      const b2 = ctx.bind('bar').tag('t2');
      const result = ctx.findByTag('t*');
      expect(result).to.be.eql([b1, b2]);
    });

    it('returns matching binding with regexp', () => {
      const b1 = ctx.bind('foo').tag('t1');
      const b2 = ctx.bind('bar').tag('t2');
      let result = ctx.findByTag(/t/);
      expect(result).to.be.eql([b1, b2]);
      result = ctx.findByTag(/t1/);
      expect(result).to.be.eql([b1]);
    });
  });

  describe('getBinding', () => {
    it('returns the binding object registered under the given key', () => {
      const expected = ctx.bind('foo');
      const actual: Binding = ctx.getBinding('foo');
      expect(actual).to.equal(expected);
    });

    it('reports an error when binding is not found', () => {
      expect(() => ctx.getBinding('unknown-key')).to.throw(/unknown-key/);
    });

    it('returns undefined if an optional binding is not found', () => {
      const actual = ctx.getBinding('unknown-key', {optional: true});
      expect(actual).to.be.undefined();
    });

    it('rejects a key containing property separator', () => {
      const key = 'a' + Binding.PROPERTY_SEPARATOR + 'b';
      expect(() => ctx.getBinding(key)).to.throw(
        /Binding key .* cannot contain/,
      );
    });
  });

  describe('getSync', () => {
    it('returns the value immediately when the binding is sync', () => {
      ctx.bind('foo').to('bar');
      const result = ctx.getSync('foo');
      expect(result).to.equal('bar');
    });

    it('returns undefined if an optional binding is not found', () => {
      expect(ctx.getSync('unknown-key', {optional: true})).to.be.undefined();
    });

    it('returns the value with property separator', () => {
      const SEP = Binding.PROPERTY_SEPARATOR;
      const val = {x: {y: 'Y'}};
      ctx.bind('foo').to(val);
      const value = ctx.getSync(`foo${SEP}x`);
      expect(value).to.eql({y: 'Y'});
    });

    it('throws a helpful error when the binding is async', () => {
      ctx.bind('foo').toDynamicValue(() => Promise.resolve('bar'));
      expect(() => ctx.getSync('foo')).to.throw(/foo.*the value is a promise/);
    });

    it('returns singleton value', () => {
      let count = 0;
      ctx
        .bind('foo')
        .toDynamicValue(() => count++)
        .inScope(BindingScope.SINGLETON);
      let result = ctx.getSync('foo');
      expect(result).to.equal(0);
      result = ctx.getSync('foo');
      expect(result).to.equal(0);
      const childCtx = new Context(ctx);
      result = childCtx.getSync('foo');
      expect(result).to.equal(0);
    });

    it('returns singleton value triggered by the child context', () => {
      let count = 0;
      ctx
        .bind('foo')
        .toDynamicValue(() => count++)
        .inScope(BindingScope.SINGLETON);
      const childCtx = new Context(ctx);
      // Calculate the singleton value at child level 1st
      let result = childCtx.getSync('foo');
      expect(result).to.equal(0);
      // Try twice from the parent ctx
      result = ctx.getSync('foo');
      expect(result).to.equal(0);
      result = ctx.getSync('foo');
      expect(result).to.equal(0);
      // Try again from the child ctx
      result = childCtx.getSync('foo');
      expect(result).to.equal(0);
    });

    it('returns transient value', () => {
      let count = 0;
      ctx
        .bind('foo')
        .toDynamicValue(() => count++)
        .inScope(BindingScope.TRANSIENT);
      let result = ctx.getSync('foo');
      expect(result).to.equal(0);
      result = ctx.getSync('foo');
      expect(result).to.equal(1);
      const childCtx = new Context(ctx);
      result = childCtx.getSync('foo');
      expect(result).to.equal(2);
    });

    it('returns context value', () => {
      let count = 0;
      ctx
        .bind('foo')
        .toDynamicValue(() => count++)
        .inScope(BindingScope.CONTEXT);
      let result = ctx.getSync('foo');
      expect(result).to.equal(0);
      result = ctx.getSync('foo');
      expect(result).to.equal(0);
    });

    it('returns context value from a child context', () => {
      let count = 0;
      ctx
        .bind('foo')
        .toDynamicValue(() => count++)
        .inScope(BindingScope.CONTEXT);
      let result = ctx.getSync('foo');
      expect(result).to.equal(0);
      const childCtx = new Context(ctx);
      result = childCtx.getSync('foo');
      expect(result).to.equal(1);
      result = childCtx.getSync('foo');
      expect(result).to.equal(1);
      const childCtx2 = new Context(ctx);
      result = childCtx2.getSync('foo');
      expect(result).to.equal(2);
      result = childCtx.getSync('foo');
      expect(result).to.equal(1);
    });
  });

  describe('get', () => {
    it('returns a promise when the binding is async', async () => {
      ctx.bind('foo').toDynamicValue(() => Promise.resolve('bar'));
      const result = await ctx.get('foo');
      expect(result).to.equal('bar');
    });

    it('returns undefined if an optional binding is not found', async () => {
      expect(await ctx.get('unknown-key', {optional: true})).to.be.undefined();
    });

    it('returns the value with property separator', async () => {
      const SEP = Binding.PROPERTY_SEPARATOR;
      const val = {x: {y: 'Y'}};
      ctx.bind('foo').toDynamicValue(() => Promise.resolve(val));
      const value = await ctx.get(`foo${SEP}x`);
      expect(value).to.eql({y: 'Y'});
    });

    it('returns singleton value', async () => {
      let count = 0;
      ctx
        .bind('foo')
        .toDynamicValue(() => Promise.resolve(count++))
        .inScope(BindingScope.SINGLETON);
      let result = await ctx.get('foo');
      expect(result).to.equal(0);
      result = await ctx.get('foo');
      expect(result).to.equal(0);
      const childCtx = new Context(ctx);
      result = await childCtx.get('foo');
      expect(result).to.equal(0);
    });

    it('returns context value', async () => {
      let count = 0;
      ctx
        .bind('foo')
        .toDynamicValue(() => Promise.resolve(count++))
        .inScope(BindingScope.CONTEXT);
      let result = await ctx.get('foo');
      expect(result).to.equal(0);
      result = await ctx.get('foo');
      expect(result).to.equal(0);
    });

    it('returns context value from a child context', async () => {
      let count = 0;
      ctx
        .bind('foo')
        .toDynamicValue(() => Promise.resolve(count++))
        .inScope(BindingScope.CONTEXT);
      let result = await ctx.get('foo');
      const childCtx = new Context(ctx);
      expect(result).to.equal(0);
      result = await childCtx.get('foo');
      expect(result).to.equal(1);
      result = await childCtx.get('foo');
      expect(result).to.equal(1);
      const childCtx2 = new Context(ctx);
      result = await childCtx2.get('foo');
      expect(result).to.equal(2);
      result = await childCtx.get('foo');
      expect(result).to.equal(1);
    });

    it('returns transient value', async () => {
      let count = 0;
      ctx
        .bind('foo')
        .toDynamicValue(() => Promise.resolve(count++))
        .inScope(BindingScope.TRANSIENT);
      let result = await ctx.get('foo');
      expect(result).to.equal(0);
      result = await ctx.get('foo');
      expect(result).to.equal(1);
      const childCtx = new Context(ctx);
      result = await childCtx.get('foo');
      expect(result).to.equal(2);
    });
  });

  describe('getValueOrPromise', () => {
    it('returns synchronously for constant values', () => {
      ctx.bind('key').to('value');
      const valueOrPromise = ctx.getValueOrPromise('key');
      expect(valueOrPromise).to.equal('value');
    });

    it('returns undefined if an optional binding is not found', () => {
      expect(
        ctx.getValueOrPromise('unknown-key', {optional: true}),
      ).to.be.undefined();
    });

    it('returns promise for async values', async () => {
      ctx.bind('key').toDynamicValue(() => Promise.resolve('value'));
      const valueOrPromise = ctx.getValueOrPromise('key');
      expect(isPromise(valueOrPromise)).to.be.true();
      const value = await valueOrPromise;
      expect(value).to.equal('value');
    });

    it('returns nested property (synchronously)', () => {
      ctx.bind('key').to({test: 'test-value'});
      const value = ctx.getValueOrPromise('key#test');
      expect(value).to.equal('test-value');
    });

    it('returns nested property (asynchronously)', async () => {
      ctx
        .bind('key')
        .toDynamicValue(() => Promise.resolve({test: 'test-value'}));
      const value = await ctx.getValueOrPromise('key#test');
      expect(value).to.equal('test-value');
    });

    it('supports deeply nested property path', () => {
      ctx.bind('key').to({x: {y: 'z'}});
      const value = ctx.getValueOrPromise('key#x.y');
      expect(value).to.equal('z');
    });

    it('returns undefined when nested property does not exist', () => {
      ctx.bind('key').to({test: 'test-value'});
      const value = ctx.getValueOrPromise('key#x.y');
      expect(value).to.equal(undefined);
    });

    it('honours TRANSIENT scope when retrieving a nested property', () => {
      const state = {count: 0};
      ctx
        .bind('state')
        .toDynamicValue(() => {
          state.count++;
          return state;
        })
        .inScope(BindingScope.TRANSIENT);
      // verify the initial state & populate the cache
      expect(ctx.getSync('state')).to.deepEqual({count: 1});
      // retrieve a nested property (expect a new value)
      expect(ctx.getSync('state#count')).to.equal(2);
      // retrieve the full object again (expect another new value)
      expect(ctx.getSync('state')).to.deepEqual({count: 3});
    });

    it('honours CONTEXT scope when retrieving a nested property', () => {
      const state = {count: 0};
      ctx
        .bind('state')
        .toDynamicValue(() => {
          state.count++;
          return state;
        })
        .inScope(BindingScope.CONTEXT);
      // verify the initial state & populate the cache
      expect(ctx.getSync('state')).to.deepEqual({count: 1});
      // retrieve a nested property (expect the cached value)
      expect(ctx.getSync('state#count')).to.equal(1);
      // retrieve the full object again (verify that cache was not modified)
      expect(ctx.getSync('state')).to.deepEqual({count: 1});
    });

    it('honours SINGLETON scope when retrieving a nested property', () => {
      const state = {count: 0};
      ctx
        .bind('state')
        .toDynamicValue(() => {
          state.count++;
          return state;
        })
        .inScope(BindingScope.SINGLETON);

      // verify the initial state & populate the cache
      expect(ctx.getSync('state')).to.deepEqual({count: 1});

      // retrieve a nested property from a child context
      const childContext1 = new Context(ctx);
      expect(childContext1.getValueOrPromise('state#count')).to.equal(1);

      // retrieve a nested property from another child context
      const childContext2 = new Context(ctx);
      expect(childContext2.getValueOrPromise('state#count')).to.equal(1);

      // retrieve the full object again (verify that cache was not modified)
      expect(ctx.getSync('state')).to.deepEqual({count: 1});
    });
  });

  describe('toJSON()', () => {
    it('converts to plain JSON object', () => {
      ctx
        .bind('a')
        .to('1')
        .lock();
      ctx
        .bind('b')
        .toDynamicValue(() => 2)
        .inScope(BindingScope.SINGLETON)
        .tag(['X', 'Y']);
      ctx
        .bind('c')
        .to(3)
        .tag('Z');
      expect(ctx.toJSON()).to.eql({
        a: {
          key: 'a',
          scope: BindingScope.TRANSIENT,
          tags: [],
          isLocked: true,
          type: BindingType.CONSTANT,
        },
        b: {
          key: 'b',
          scope: BindingScope.SINGLETON,
          tags: ['X', 'Y'],
          isLocked: false,
          type: BindingType.DYNAMIC_VALUE,
        },
        c: {
          key: 'c',
          scope: BindingScope.TRANSIENT,
          tags: ['Z'],
          isLocked: false,
          type: BindingType.CONSTANT,
        },
      });
    });
  });

  describe('composeWith()', () => {
    it('creates a new context with additional parents', () => {
      const c1 = new TestContext('c1');
      c1.bind('a').to(1);
      const c2 = new Context('c2');
      const c3 = c1.composeWith(c2, 'c3');
      expect(c3.name).to.be.eql('c3');
      expect(c3.parentList).to.eql([c1, c2]);
      expect(c3.bindingMap.size).to.eql(0);
    });

    it('adds additional parents', () => {
      const c0 = new Context('c0'); // c0
      const c1 = new TestContext(c0, 'c1'); // c1 -> c0
      const c2 = new Context('c2'); // c2
      const c3 = c1.composeWith(c2, 'c3');
      expect(c3.name).to.be.eql('c3');
      expect(c3.parentList).to.eql([c1, c2]);
    });
  });

  function createContext() {
    ctx = new Context();
  }
});
