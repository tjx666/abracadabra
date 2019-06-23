import { ReadThenWrite, Update, Code } from "./i-write-code";
import { negateExpression, findNegatableExpression } from "./negate-expression";
import { Selection } from "./selection";
import { ShowErrorMessage, ErrorReason } from "./i-show-error-message";

describe("Negate Expression", () => {
  let showErrorMessage: ShowErrorMessage;
  let readThenWrite: ReadThenWrite;
  let updates: Update[] = [];
  let updatedExpression = "";

  beforeEach(() => {
    showErrorMessage = jest.fn();
    updates = [];
    updatedExpression = "";
    readThenWrite = jest
      .fn()
      .mockImplementation(
        (_, getUpdates) => (updates = getUpdates(updatedExpression))
      );
  });

  it.each<[string, Selection]>([
    ["all expression is selected", new Selection([0, 4], [0, 10])],
    ["cursor is on left identifier", Selection.cursorAt(0, 4)],
    ["cursor is on operator", Selection.cursorAt(0, 7)],
    ["cursor is on right identifier", Selection.cursorAt(0, 9)]
  ])("should select expression if %s", async (_, selection) => {
    const code = `if (a == b) {}`;

    await doNegateExpression(code, selection);

    expect(readThenWrite).toBeCalledWith(
      new Selection([0, 4], [0, 10]),
      expect.any(Function)
    );
  });

  it.each<[string, Assertion]>([
    ["loose equality", { expression: "a == b", expected: "!(a != b)" }],
    ["strict equality", { expression: "a === b", expected: "!(a !== b)" }],
    ["loose inequality", { expression: "a != b", expected: "!(a == b)" }],
    ["strict inequality", { expression: "a !== b", expected: "!(a === b)" }],
    ["lower than", { expression: "a < b", expected: "!(a >= b)" }],
    ["lower or equal", { expression: "a <= b", expected: "!(a > b)" }],
    ["greater than", { expression: "a > b", expected: "!(a <= b)" }],
    ["greater or equal", { expression: "a >= b", expected: "!(a < b)" }],
    [
      "logical and",
      {
        expression: "a == b && b == c",
        selection: Selection.cursorAt(0, 12),
        expected: "!(a != b || b != c)"
      }
    ],
    [
      "logical or",
      {
        expression: "a == b || b == c",
        selection: Selection.cursorAt(0, 12),
        expected: "!(a != b && b != c)"
      }
    ],
    [
      "an already negated expression",
      {
        expression: "!(a != b && b != c)",
        selection: Selection.cursorAt(0, 14),
        expected: "a == b || b == c"
      }
    ],
    [
      "identifiers (boolean values)",
      {
        expression: "isValid || isCorrect",
        selection: Selection.cursorAt(0, 13),
        expected: "!(!isValid && !isCorrect)"
      }
    ],
    [
      "negated identifiers (boolean values)",
      {
        expression: "!isValid || isCorrect",
        selection: Selection.cursorAt(0, 14),
        expected: "!(isValid && !isCorrect)"
      }
    ],
    [
      "expression with non-negatable operators",
      {
        expression: "a + b > 0",
        selection: Selection.cursorAt(0, 6),
        expected: "!(a + b <= 0)"
      }
    ],
    [
      "an equality with cursor on 'typeof' operator",
      {
        expression: "typeof location.lat === 'number'",
        expected: "!(typeof location.lat !== 'number')"
      }
    ]
  ])("should negate %s", async (_, { expression, selection, expected }) => {
    updatedExpression = expression;
    const code = `if (${expression}) {}`;
    const DEFAULT_SELECTION = Selection.cursorAt(0, 4);

    await doNegateExpression(code, selection || DEFAULT_SELECTION);

    expect(updates).toEqual([
      {
        code: expected,
        selection: new Selection([0, 4], [0, 4 + expression.length])
      }
    ]);
  });

  it("should negate the left-side of a logical expression", async () => {
    const code = `if (a == b || b == c) {}`;
    const selection = Selection.cursorAt(0, 6);

    await doNegateExpression(code, selection);

    expect(readThenWrite).toBeCalledWith(
      new Selection([0, 4], [0, 10]),
      expect.any(Function)
    );
  });

  it("should negate the right-side of a logical expression", async () => {
    const code = `if (a == b || b == c) {}`;
    const selection = Selection.cursorAt(0, 15);

    await doNegateExpression(code, selection);

    expect(readThenWrite).toBeCalledWith(
      new Selection([0, 14], [0, 20]),
      expect.any(Function)
    );
  });

  it("should negate the whole logical expression if cursor is on identifier", async () => {
    const code = `if (isValid || b == c) {}`;
    const selection = Selection.cursorAt(0, 6);

    await doNegateExpression(code, selection);

    expect(readThenWrite).toBeCalledWith(
      new Selection([0, 4], [0, 21]),
      expect.any(Function)
    );
  });

  it("should negate the whole logical expression if cursor is on a negated identifier", async () => {
    const code = `if (!isValid || b == c) {}`;
    const selection = Selection.cursorAt(0, 6);

    await doNegateExpression(code, selection);

    expect(readThenWrite).toBeCalledWith(
      new Selection([0, 4], [0, 22]),
      expect.any(Function)
    );
  });

  it("should show an error message if selection can't be negated", async () => {
    const code = `console.log("Nothing to negate here!")`;
    const selection = Selection.cursorAt(0, 0);

    await doNegateExpression(code, selection);

    expect(showErrorMessage).toBeCalledWith(
      ErrorReason.DidNotFoundNegatableExpression
    );
  });

  async function doNegateExpression(code: Code, selection: Selection) {
    await negateExpression(code, selection, readThenWrite, showErrorMessage);
  }
});

describe("Finding negatable expression (quick fix)", () => {
  it("should match against logical expressions", async () => {
    const code = `if (a > b) {}`;
    const selection = Selection.cursorAt(0, 4);

    const expression = findNegatableExpression(code, selection);

    expect(expression).toBeDefined();
  });

  it("should match against binary expressions", async () => {
    const code = `function result() {
  return a === 0;
}`;
    const selection = Selection.cursorAt(1, 13);

    const expression = findNegatableExpression(code, selection);

    expect(expression).toBeDefined();
  });

  it("should not match against concatenable operators", async () => {
    const code = `function result() {
  return "(" + this.getValue() + ")";
}`;
    const selection = Selection.cursorAt(1, 13);

    const expression = findNegatableExpression(code, selection);

    expect(expression).toBeUndefined();
  });
});

interface Assertion {
  expression: Code;
  selection?: Selection;
  expected: Code;
}