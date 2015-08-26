import chai from 'chai';
import { createSelector, createSelectorCreator, defaultMemoize } from '../src/index';
import { default as lodashMemoize } from 'lodash.memoize';

let assert = chai.assert;

suite('selector', () => {
    test('basic selector', () => {
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
    test('basic selector multiple keys', () => {
        let called = 0;
        const selector = createSelector(
            state => state.a,
            state => state.b,
            (a, b) => {
                called++;
                return a + b;
            }
        );
        const state1 = {a: 1, b: 2};
        assert.equal(selector(state1), 3);
        assert.equal(selector(state1), 3);
        assert.equal(called, 1);
        const state2 = {a: 3, b: 2};
        assert.equal(selector(state2), 5);
        assert.equal(selector(state2), 5);
        assert.equal(called, 2);
    });
    test('memoized composite arguments', () => {
        let called = 0;
        const selector = createSelector(
            state => state.sub,
            sub => {
                called++;
                return sub;
            }
        );
        const state1 = { sub: { a: 1 } };
        assert.deepEqual(selector(state1), { a: 1 });
        assert.deepEqual(selector(state1), { a: 1 });
        assert.equal(called, 1);
        const state2 = { sub: { a: 2 } };
        assert.deepEqual(selector(state2), { a: 2 });
        assert.equal(called, 2);
    });
    test('first argument can be an array', () => {
        let called = 0;
        const selector = createSelector(
            [state => state.a, state => state.b],
            (a, b) => {
                called++;
                return a + b;
            }
        );
        assert.equal(selector({a: 1, b: 2}), 3);
        assert.equal(selector({a: 1, b: 2}), 3);
        assert.equal(called, 1);
        assert.equal(selector({a: 3, b: 2}), 5);
        assert.equal(called, 2);
    });
    test('can accept props', () => {
        let called = 0;
        const selector = createSelector(
            state => state.a,
            state => state.b,
            (state, props) => props.c,
            (a, b, c) => {
                called++;
                return a + b + c;
            }
        );
        assert.equal(selector({a: 1, b: 2}, {c: 100}), 103);
    });
    test('chained selector', () => {
        let called = 0;
        const selector1 = createSelector(
            state => state.sub,
            sub => sub
        );
        const selector2 = createSelector(
            selector1,
            sub => {
                called++;
                return sub.value;
            }
        );
        const state1 = {sub: { value: 1}};
        assert.equal(selector2(state1), 1);
        assert.equal(selector2(state1), 1);
        assert.equal(called, 1);
        const state2 = {sub: { value: 2}};
        assert.equal(selector2(state2), 2);
        assert.equal(called, 2);
    });
    test('chained selector with props', () => {
        let called = 0;
        const selector1 = createSelector(
            state => state.sub,
            (state, props) => props.x,
            (sub, x) => ({sub, x})
        );
        const selector2 = createSelector(
            selector1,
            (state, props) => props.y,
            (param, y) => {
                called++;
                return param.sub.value + param.x + y;
            }
        );
        const state1 = {sub: { value: 1}};
        assert.equal(selector2(state1, {x: 100, y: 200}), 301);
        assert.equal(selector2(state1, {x: 100, y: 200}), 301);
        assert.equal(called, 1);
        const state2 = {sub: { value: 2}};
        assert.equal(selector2(state2, {x: 100, y: 201}), 303);
        assert.equal(called, 2);
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
        const customSelectorCreator = createSelectorCreator(lodashMemoize, JSON.stringify);
        let called = 0;
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
        assert.equal(memoized(o1), 1);
        assert.equal(memoized(o1), 1);
        assert.equal(called, 1);
        assert.equal(memoized(o2), 2);
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
        assert.equal(memoized(1), 1);
        assert.equal(memoized(2), 1); // yes, really true
        assert.equal(called, 1);
        assert.equal(memoized('A'), 'A');
        assert.equal(called, 2);
    });
});
