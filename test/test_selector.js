import chai from 'chai';
import {createSelector} from '../src/selector';

let assert = chai.assert;

suite('selector', function() {
    test("basic selector", function() {
        const selector = createSelector(state => state.a, a => a);
        assert.equal(selector({a: 1}), 1);
    });
});
