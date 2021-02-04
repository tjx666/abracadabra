import {
  splitMultipleDeclarations,
  canSplitMultipleDeclarations
} from "./split-multiple-declarations";

import { RefactoringWithActionProvider } from "../../types";

const config: RefactoringWithActionProvider = {
  command: {
    key: "splitMultipleDeclarations",
    operation: splitMultipleDeclarations,
    title: "Split Multiple Declarations"
  },
  actionProvider: {
    message: "Split multiple declarations",
    createVisitor: canSplitMultipleDeclarations
  }
};

export default config;
