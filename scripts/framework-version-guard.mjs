const SEMVER_PATTERN = /(\d+)(?:\.(\d+))?(?:\.(\d+))?/;

function readVersionParts(specifier) {
  if (!specifier) {
    return null;
  }

  const match = specifier.match(SEMVER_PATTERN);
  if (!match) {
    return null;
  }

  return {
    major: Number(match[1]),
    minor: match[2] ? Number(match[2]) : null,
    patch: match[3] ? Number(match[3]) : null,
    normalized:
      match[2] && match[3]
        ? `${match[1]}.${match[2]}.${match[3]}`
        : `${match[1]}`,
  };
}

function getPackageVersion(manifest, name) {
  return manifest.dependencies?.[name] ?? manifest.devDependencies?.[name] ?? null;
}

function buildIssue({ packageName, actual, expected, message }) {
  return {
    packageName,
    actual,
    expected,
    message,
  };
}

export function validateFrameworkAlignment(manifest) {
  const issues = [];
  const next = getPackageVersion(manifest, "next");
  const eslintConfigNext = getPackageVersion(manifest, "eslint-config-next");
  const react = getPackageVersion(manifest, "react");
  const reactDom = getPackageVersion(manifest, "react-dom");
  const typesReact = getPackageVersion(manifest, "@types/react");
  const typesReactDom = getPackageVersion(manifest, "@types/react-dom");
  const hasTypescript = Boolean(getPackageVersion(manifest, "typescript"));

  const nextVersion = readVersionParts(next);
  const eslintNextVersion = readVersionParts(eslintConfigNext);
  const reactVersion = readVersionParts(react);
  const reactDomVersion = readVersionParts(reactDom);
  const typesReactVersion = readVersionParts(typesReact);
  const typesReactDomVersion = readVersionParts(typesReactDom);

  if (!eslintConfigNext) {
    issues.push(
      buildIssue({
        packageName: "eslint-config-next",
        actual: "missing",
        expected: nextVersion?.normalized ?? "same version as next",
        message:
          "The repo requires eslint-config-next as the official Next.js lint preset.",
      })
    );
  } else if (
    nextVersion &&
    eslintNextVersion &&
    nextVersion.normalized !== eslintNextVersion.normalized
  ) {
    issues.push(
      buildIssue({
        packageName: "eslint-config-next",
        actual: eslintConfigNext,
        expected: nextVersion.normalized,
        message:
          "eslint-config-next must stay aligned with the exact Next.js version used by the repo.",
      })
    );
  }

  if (reactVersion && reactDomVersion && reactVersion.major !== reactDomVersion.major) {
    issues.push(
      buildIssue({
        packageName: "react-dom",
        actual: reactDom,
        expected: `major ${reactVersion.major}`,
        message: "react and react-dom must share the same major version.",
      })
    );
  }

  if (hasTypescript && !typesReact) {
    issues.push(
      buildIssue({
        packageName: "@types/react",
        actual: "missing",
        expected: reactVersion ? `major ${reactVersion.major}` : "react major",
        message:
          "TypeScript projects in this repo must keep @types/react installed and aligned with React.",
      })
    );
  } else if (
    reactVersion &&
    typesReactVersion &&
    reactVersion.major !== typesReactVersion.major
  ) {
    issues.push(
      buildIssue({
        packageName: "@types/react",
        actual: typesReact,
        expected: `major ${reactVersion.major}`,
        message: "@types/react must share React's major version.",
      })
    );
  }

  if (hasTypescript && !typesReactDom) {
    issues.push(
      buildIssue({
        packageName: "@types/react-dom",
        actual: "missing",
        expected: reactVersion ? `major ${reactVersion.major}` : "react major",
        message:
          "TypeScript projects in this repo must keep @types/react-dom installed and aligned with React.",
      })
    );
  } else if (
    reactVersion &&
    typesReactDomVersion &&
    reactVersion.major !== typesReactDomVersion.major
  ) {
    issues.push(
      buildIssue({
        packageName: "@types/react-dom",
        actual: typesReactDom,
        expected: `major ${reactVersion.major}`,
        message: "@types/react-dom must share React's major version.",
      })
    );
  }

  return issues;
}

export function formatFrameworkAlignmentIssues(issues) {
  return issues
    .map(
      (issue) =>
        `- ${issue.packageName}: ${issue.message} (actual: ${issue.actual}, expected: ${issue.expected})`
    )
    .join("\n");
}
