var createSelector = require('./lib/index').createSelector;

state = {
  fruits: ["Apple", "Banana", "Coconut"],
  batter: "Dough"
}

const fruitSelector = (state, props) => ( state.fruits )
const batterSelector = (state, props) => ( state.batter )
const piesSelector = createSelector(
  fruitSelector,
  batterSelector,
  (fruits, batter) => {
    return fruits.map(fruit => {
      return pieCreator(fruit, batter)
    })
  }
)
const fruitInput = (fruit, batter) => (fruit)
const batterInput = (fruit, batter) => (batter)
const pieCreator = createSelector(
  fruitInput,
  batterInput,
  (fruit, batter) => {
    return `Baked ${fruit} Pie!`
  }
)

console.log(piesSelector(state))

console.log(pieCreator.recomputations());
state = Object.assign(
  {}, 
  state,
  { fruits: [...state.fruits, "Pumpkin"] }
);

console.log(piesSelector(state))
console.log(pieCreator.recomputations());
