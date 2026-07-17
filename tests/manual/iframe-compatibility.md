# Iframe compatibility release matrix

Run this checklist against each production build before publishing.

| Scenario                                      | Chrome | Edge | Opera | Firefox | Safari |
| --------------------------------------------- | ------ | ---- | ----- | ------- | ------ |
| Top-document canvas and video                 | ☐      | ☐    | ☐     | ☐       | ☐      |
| One-level same-origin iframe                  | ☐      | ☐    | ☐     | ☐       | ☐      |
| Nested same-origin iframe                     | ☐      | ☐    | ☐     | ☐       | ☐      |
| Unsandboxed `srcdoc` iframe                   | ☐      | ☐    | ☐     | ☐       | ☐      |
| Same-origin iframe added before selection     | ☐      | ☐    | ☐     | ☐       | ☐      |
| Cross-origin iframe is marked unavailable     | ☐      | ☐    | ☐     | ☐       | ☐      |
| Opaque sandboxed iframe is marked unavailable | ☐      | ☐    | ☐     | ☐       | ☐      |
| Escape cancels selection in every frame       | ☐      | ☐    | ☐     | ☐       | ☐      |
| Replacing media removes the previous overlay  | ☐      | ☐    | ☐     | ☐       | ☐      |
| Update, export, pause, resume, and remove     | ☐      | ☐    | ☐     | ☐       | ☐      |
| Iframe removal/navigation clears stale state  | ☐      | ☐    | ☐     | ☐       | ☐      |

Also confirm that each build retains only `activeTab`, `scripting`, `storage`, and `unlimitedStorage`, and that
tainted, non-CORS, or protected media reports an error without breaking the host page.
