# docs/ — {{PROJECT_NAME}} documentation

Start from [`../AGENTS.md`](../AGENTS.md) (agents) or [`LOOP.md`](LOOP.md) (collaboration model).

## Structure

| Directory / file                        | Contents                                                  |
| --------------------------------------- | --------------------------------------------------------- |
| **[`intents/`](intents/README.md)**     | Plan stage: what is wanted, by whom, why — accepted by the product owner |
| **[`specs/`](specs/README.md)**         | Design stage: requirements + design from an accepted intent, every point a person decides flagged |
| **`product/`**                          | Product contract: requirements (source of truth for scope), roadmap |
| **`architecture/`**                     | Detailed technical design (SAD, DB, API...)               |
| **[`decisions/`](decisions/README.md)** | ADRs — durable architectural decisions                    |
| [`decisions/OPEN.md`](decisions/OPEN.md) | Queue of questions awaiting a human (open OPEN = story not Ready) |
| **[`stories/`](stories/README.md)**     | Story packets + backlog                                   |
| **[`reviews/`](reviews/README.md)**     | Cross-review snapshots per milestone                      |
| **[`templates/`](templates/)**          | Templates for intent / spec / story / decision / review / runbook |
| `LOOP.md`                            | Human ⇄ agent collaboration model                         |
| `FEATURE_INTAKE.md`                     | Work classification: tiny / normal / high-risk            |
| `ARCHITECTURE.md`                       | Architecture index + boundaries                           |
| `TEST_MATRIX.md`                        | Behavior → proof                                          |

<!-- loops-init: create product/ and architecture/ when the corresponding docs exist; a brand-new repo
     can start with a single product contract file in product/. Add design/, glossary.md... as needed. -->

## Sources of truth

- Product: `product/{{PRODUCT_DOC}}`
- Technical: `architecture/{{TECH_DOC}}`
- Decisions: `decisions/`
