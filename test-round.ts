const roundScore = (num) => Math.round((num + Number.EPSILON) * 10) / 10;

console.log(roundScore(8.15));
console.log(roundScore(8.25));
console.log(roundScore(8.35));
console.log(roundScore(8.45));
console.log(roundScore(8.55));
console.log(roundScore(8.65));
console.log(roundScore(8.75));
console.log(roundScore(8.85));
console.log(roundScore(8.95));
