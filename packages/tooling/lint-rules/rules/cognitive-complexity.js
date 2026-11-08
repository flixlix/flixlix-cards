import { defineRule } from "vite-plus/lint/plugins";

// SonarSource cognitive complexity (https://www.sonarsource.com/docs/CognitiveComplexity.pdf).
// ponytail: every function, nested ones included, is scored on its own starting at nesting 0;
// Sonar instead folds nested functions into their parent. Switch if callbacks hide complexity.

const FUNCTION_TYPES = new Set([
  "FunctionDeclaration",
  "FunctionExpression",
  "ArrowFunctionExpression",
]);
const LOOP_TYPES = new Set([
  "ForStatement",
  "ForInStatement",
  "ForOfStatement",
  "WhileStatement",
  "DoWhileStatement",
]);

const isElseIf = (node) =>
  node.type === "IfStatement" &&
  node.parent?.type === "IfStatement" &&
  node.parent.alternate === node;

/** Whether `child` sits in a part of `ancestor` that adds one level of nesting. */
function nestsInside(ancestor, child) {
  switch (ancestor.type) {
    case "IfStatement":
      return !isElseIf(ancestor) && child !== ancestor.test;
    case "ConditionalExpression":
      return child !== ancestor.test;
    case "SwitchStatement":
      return child !== ancestor.discriminant;
    case "CatchClause":
      return child === ancestor.body;
    default:
      if (LOOP_TYPES.has(ancestor.type)) {
        return child === ancestor.body;
      }
      return FUNCTION_TYPES.has(ancestor.type);
  }
}

function enclosingFunction(node) {
  let current = node.parent;
  while (current && !FUNCTION_TYPES.has(current.type)) {
    current = current.parent;
  }
  return current;
}

function nestingLevel(node, owner) {
  let level = 0;
  let child = node;
  let current = node.parent;
  while (current && current !== owner) {
    if (nestsInside(current, child)) {
      level += 1;
    }
    child = current;
    current = current.parent;
  }
  return level;
}

function functionName(node) {
  if (node.id?.name) {
    return node.id.name;
  }
  const parent = node.parent;
  if (parent?.type === "VariableDeclarator" && parent.id.type === "Identifier") {
    return parent.id.name;
  }
  if ((parent?.type === "MethodDefinition" || parent?.type === "Property") && parent.key) {
    return parent.key.name ?? "method";
  }
  if (parent?.type === "PropertyDefinition" && parent.key) {
    return parent.key.name ?? "property";
  }
  return "anonymous function";
}

export default defineRule({
  meta: {
    type: "suggestion",
    docs: { description: "Limit the cognitive complexity of functions." },
    schema: [{ type: "object", properties: { max: { type: "integer", minimum: 0 } } }],
    messages: {
      tooComplex:
        "`{{name}}` has a cognitive complexity of {{score}} (max {{max}}). Split it into smaller named functions.",
    },
  },
  create(context) {
    const max = context.options[0]?.max ?? 15;
    const scores = new Map();

    const add = (node, amount) => {
      const owner = enclosingFunction(node);
      if (owner) {
        scores.set(owner, (scores.get(owner) ?? 0) + amount);
      }
    };
    const structural = (node) => {
      const owner = enclosingFunction(node);
      if (owner) {
        add(node, 1 + nestingLevel(node, owner));
      }
    };

    const visitors = {
      IfStatement(node) {
        if (isElseIf(node)) {
          add(node, 1);
        } else {
          structural(node);
        }
        if (node.alternate && node.alternate.type !== "IfStatement") {
          add(node, 1);
        }
      },
      ConditionalExpression: structural,
      SwitchStatement: structural,
      CatchClause: structural,
      LogicalExpression(node) {
        const parent = node.parent;
        if (parent?.type !== "LogicalExpression" || parent.operator !== node.operator) {
          add(node, 1);
        }
      },
      BreakStatement(node) {
        if (node.label) {
          add(node, 1);
        }
      },
      ContinueStatement(node) {
        if (node.label) {
          add(node, 1);
        }
      },
    };
    for (const type of LOOP_TYPES) {
      visitors[type] = structural;
    }
    for (const type of FUNCTION_TYPES) {
      visitors[`${type}:exit`] = (node) => {
        const score = scores.get(node) ?? 0;
        if (score > max) {
          context.report({
            node,
            messageId: "tooComplex",
            data: { name: functionName(node), score: String(score), max: String(max) },
          });
        }
        scores.delete(node);
      };
    }
    return visitors;
  },
});
