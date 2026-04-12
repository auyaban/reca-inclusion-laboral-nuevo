import { describe, expect, it } from "vitest";
import {
  formatFrameworkAlignmentIssues,
  validateFrameworkAlignment,
} from "./framework-version-guard.mjs";

describe("framework version guard", () => {
  it("accepts the aligned framework/tooling policy used by the repo", () => {
    const issues = validateFrameworkAlignment({
      dependencies: {
        next: "^16.2.2",
        react: "^19.0.0",
        "react-dom": "^19.0.0",
      },
      devDependencies: {
        typescript: "^5",
        "eslint-config-next": "16.2.2",
        "@types/react": "^19",
        "@types/react-dom": "^19",
      },
    });

    expect(issues).toEqual([]);
  });

  it("reports drift across next, react-dom and React type packages", () => {
    const issues = validateFrameworkAlignment({
      dependencies: {
        next: "^16.2.2",
        react: "^19.0.0",
        "react-dom": "^18.3.1",
      },
      devDependencies: {
        typescript: "^5",
        "eslint-config-next": "15.1.0",
        "@types/react": "^18",
        "@types/react-dom": "^17",
      },
    });

    expect(issues.map((issue) => issue.packageName)).toEqual([
      "eslint-config-next",
      "react-dom",
      "@types/react",
      "@types/react-dom",
    ]);
    expect(formatFrameworkAlignmentIssues(issues)).toContain(
      "eslint-config-next must stay aligned with the exact Next.js version"
    );
  });
});
