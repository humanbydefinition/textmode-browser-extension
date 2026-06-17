# Security Policy

## Supported Versions

The extension is in early public development. Security fixes are provided for the current `main` branch and the
latest tagged release once releases begin.

| Version / Channel             | Supported                                 |
| ----------------------------- | ----------------------------------------- |
| Latest release                | Yes                                       |
| Current `main` branch         | Yes                                       |
| Older releases                | No, unless maintainers announce otherwise |
| Forks and local modifications | No                                        |

If you are unsure whether your report affects a supported version, report it anyway. We would rather review a
false alarm than miss a real issue.

## Reporting a Vulnerability

Please do not open a public GitHub issue, pull request, discussion, or chat thread for a suspected
vulnerability.

Report security concerns privately to [hello@textmode.art](mailto:hello@textmode.art) or by using GitHub
private vulnerability reporting once it is enabled for the repository.

Include as much as you can:

- A clear description of the issue and affected component.
- Browser, browser version, operating system, and extension build target.
- Extension version, commit, or build output if known.
- Reproduction steps or a minimal proof of concept.
- Whether the issue may expose page data, browsing data, media contents, local files, or extension privileges.
- Any mitigation ideas or candidate fixes you have already identified.

If the report includes sensitive material, secrets, private page content, or exploit details, mention that
clearly.

## What To Expect

Maintainers will make a best effort to:

- Acknowledge receipt within 5 business days.
- Triage and reproduce the issue.
- Keep the reporter informed as investigation progresses.
- Prepare and release a fix for supported versions when the report is confirmed.

Response times can vary depending on severity, maintainer availability, and the complexity of the affected
browser or extension code path.

## Disclosure Process

This project follows coordinated disclosure.

- Please give maintainers reasonable time to investigate and ship a fix before public disclosure.
- Once a fix is available, the project may publish release notes, a changelog entry, or a GitHub security
  advisory summarizing the issue.
- Reporter credit will be included when appropriate and when the reporter wants to be named.

## Security Model

The extension is designed to:

- Avoid persistent host permissions in production builds.
- Inject the content runtime only after a user action.
- Bundle executable code locally.
- Process selected media locally in the browser.
- Avoid analytics, telemetry, or server-side media processing.
- Keep browser APIs isolated behind internal adapters where practical.

## In Scope

This policy covers security issues in:

- Source code in this repository.
- Official extension builds produced from this repository.
- Official examples, fixtures, and documentation tied directly to this codebase.
- Extension permission, injection, messaging, storage, export, and WebGL/media-sampling behavior.

## Out Of Scope

The following are generally out of scope unless they demonstrate a broader extension security issue:

- Browser, operating system, or third-party service vulnerabilities outside the project's control.
- Issues introduced only in downstream forks or private modifications.
- Pages that intentionally block canvas, WebGL, or media sampling.
- Cross-origin or DRM restrictions enforced correctly by the browser.
- Denial of service from extremely large or intentionally hostile media without data exposure.
- General support questions, feature requests, or non-security bugs.

For non-security bugs, use the public GitHub issue templates instead.
