import chai from 'chai';
import { createSelector, createSelectorCreator, defaultMemoize } from '../src/index';
import { default as lodashMemoize } from 'lodash.memoize';

let assert = chai.assert;

suite('selector', () => {
    test('basic selector', () => {
        const selector = createSelector(state => state.a, a => a);
        assert.equal(selector({a: 1}), 1);
    });
    test('basic selector multiple keys', () => {
        const selector = createSelector(
            state => state.a,
            state => state.b,
            (a, b) => a + b
        );
        assert.equal(selector({a: 1, b: 2}), 3);
    });
    test('first argument can be an array', () => {
        const selector = createSelector(
            [state => state.a], a => a);
        assert.equal(selector({a: 1}), 1);
    });
    test('can accept props', () => {
        const selector = createSelector(
            state => state.a,
            state => state.b,
            (a, b, props) => a + b + props
        );
        assert.equal(selector({a: 1, b: 2}, 100), 103);
    });
    test('ignores props for default memoization', () => {
        let called = 0;
        const selector = createSelector(
            state => state.a,
            (a, props) => {
                called++;
                return a + props;
            }
        );
        assert.equal(selector({a: 1}, 100), 101);
        assert.equal(selector({a: 1}, 200), 101);
        assert.equal(called, 1);
        assert.equal(selector({a: 2}, 200), 202);
        assert.equal(called, 2);
    });
    test('chained selector', () => {
        const selector1 = createSelector(
            state => state.sub, sub => sub);
        const selector2 = createSelector(
            selector1, sub => sub.value);
        assert.equal(selector2({sub: { value: 1}}), 1);
    });
    test('memoized selector', () => {
        let called = 0;
        const selector = createSelector(state => state.a, a => {
            called++;
            return a;
        });
        assert.equal(selector({a: 1}), 1);
        assert.equal(selector({a: 1}), 1);
        assert.equal(called, 1);
        assert.equal(selector({a: 2}), 2);
        assert.equal(called, 2);
    });
    test('memoized composite arguments', () => {
        let called = 0;
        const selector = createSelector(state => state.sub, sub => {
            called++;
            return sub;
        });
        const state = { sub: { a: 1 } };
        assert.deepEqual(selector(state), { a: 1 });
        assert.deepEqual(selector(state), { a: 1 });
        assert.equal(called, 1);
    });
    test('override valueEquals', () => {
        // a rather absurd equals operation we can verify in tests
        const createOverridenSelector = createSelectorCreator(
          defaultMemoize,
          (a, b) => typeof a === typeof b
        );
        let called = 0;
        const selector = createOverridenSelector(state => state.a, a => {
            called++;
            return a;
        });
        assert.equal(selector({a: 1}), 1);
        assert.equal(selector({a: 2}), 1); // yes, really true
        assert.equal(called, 1);
        assert.equal(selector({a: 'A'}), 'A');
        assert.equal(called, 2);
    });
    test('custom memoize', () => {
        let called = 0;
        const customSelectorCreator = createSelectorCreator(lodashMemoize, JSON.stringify);
        const selector = customSelectorCreator(
            state => state.a,
            state => state.b,
            (a, b) => {
                called++;
                return a + b;
            }
        );
        assert.equal(selector({a: 1, b: 2}), 3);
        assert.equal(selector({a: 1, b: 2}), 3);
        assert.equal(called, 1);
        assert.equal(selector({a: 2, b: 3}), 5);
        assert.equal(called, 2);
        // TODO: Check correct memoize function was called
    });
    test('exported memoize', () => {
        let called = 0;
        const memoized = defaultMemoize(state => {
            called++;
            return state.a;
        });
        const o1 = {a: 1};
        const o2 = {a: 2};
        assert.equal(memoized(o1, {}), 1);
        assert.equal(memoized(o1, {}), 1);
        assert.equal(called, 1);
        assert.equal(memoized(o2, {}), 2);
        assert.equal(called, 2);
    });
    test('exported memoize with valueEquals override', () => {
        // a rather absurd equals operation we can verify in tests
        const valueEquals = (a, b) => typeof a === typeof b;
        let called = 0;
        const memoized = defaultMemoize(a => {
            called++;
            return a;
        }, valueEquals);
        assert.equal(memoized(1, {}), 1);
        assert.equal(memoized(2, {}), 1); // yes, really true
        assert.equal(called, 1);
        assert.equal(memoized('A', {}), 'A');
        assert.equal(called, 2);
    });
});
