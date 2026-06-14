const assert = require("node:assert/strict");
const { resolveAlphabetJump } = require("./navigation");

const sampleTerms = [
  { name: "Claim" },
  { name: "Coinsurance" },
  { name: "Deductible" },
  { name: "policyholder" },
];

assert.deepEqual(resolveAlphabetJump(sampleTerms, "Z"), {
  letter: "Z",
  status: "empty",
  matches: [],
});

assert.deepEqual(resolveAlphabetJump(sampleTerms, "D"), {
  letter: "D",
  status: "single",
  matches: [{ name: "Deductible" }],
});

assert.deepEqual(resolveAlphabetJump(sampleTerms, "C"), {
  letter: "C",
  status: "multiple",
  matches: [{ name: "Claim" }, { name: "Coinsurance" }],
});

assert.deepEqual(resolveAlphabetJump(sampleTerms, "p"), {
  letter: "P",
  status: "single",
  matches: [{ name: "policyholder" }],
});

console.log("navigation tests passed");
