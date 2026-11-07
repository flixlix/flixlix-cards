import { RuleTester } from "vite-plus/lint/plugins-dev";
import { describe, it } from "vite-plus/test";
import rule from "./cognitive-complexity.js";

RuleTester.describe = describe;
RuleTester.it = it;

const tester = new RuleTester({ languageOptions: { parserOptions: { lang: "ts" } } });

// Scores taken from the SonarSource cognitive complexity white paper.
const sumOfPrimes = `function sumOfPrimes(max) {
  let total = 0;
  OUT: for (let i = 1; i <= max; ++i) {
    for (let j = 2; j < i; ++j) {
      if (i % j === 0) {
        continue OUT;
      }
    }
    total += i;
  }
  return total;
}`;

const getWords = `function getWords(number) {
  switch (number) {
    case 1: return "one";
    case 2: return "a couple";
    default: return "lots";
  }
}`;

const branches = `function pick(a, b, c) {
  if (a && b || c) {
    return 1;
  } else if (b) {
    return 2;
  } else {
    return 3;
  }
}`;

const ternaryInCallback = `const label = (items) => items.map((item) => (item.on ? "on" : "off"));`;

const tooComplex = (name, score, max) => ({
  messageId: "tooComplex",
  data: { name, score: String(score), max: String(max) },
});

tester.run("cognitive-complexity", rule, {
  valid: [
    { code: sumOfPrimes, options: [{ max: 7 }] },
    { code: getWords, options: [{ max: 1 }] },
    { code: branches, options: [{ max: 5 }] },
    { code: ternaryInCallback, options: [{ max: 1 }] },
  ],
  invalid: [
    { code: sumOfPrimes, options: [{ max: 6 }], errors: [tooComplex("sumOfPrimes", 7, 6)] },
    { code: getWords, options: [{ max: 0 }], errors: [tooComplex("getWords", 1, 0)] },
    { code: branches, options: [{ max: 4 }], errors: [tooComplex("pick", 5, 4)] },
  ],
});
