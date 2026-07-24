# edge-case-matrix@1 — task-CONTENT-001

| id    | class      | case                                            | expected handling                                                  |
| ----- | ---------- | ----------------------------------------------- | ------------------------------------------------------------------ |
| EC-01 | null/empty | Empty provenance file / empty bank              | Gate exits 1 with clear message                                    |
| EC-02 | null/empty | Record missing required fields                  | Schema validation fails gate                                       |
| EC-03 | bounds     | Threshold exactly at trigger                    | Verdict `over_threshold`; disposition must be `flagged_for_review` |
| EC-04 | bounds     | Score just below threshold                      | Verdict `clear`; disposition may stay `active`                     |
| EC-05 | malformed  | Non-UTF8 / truncated JSON records               | Gate fails schema parse                                            |
| EC-06 | malformed  | Unsorted records file                           | Determinism check fails                                            |
| EC-07 | race       | Concurrent attestation writers                  | Deterministic sort by item_id; merge via sorted file               |
| EC-08 | security   | Dump content added to corpus                    | Manifest missing/wrong attestation → similarity script refuses     |
| EC-09 | security   | App imports provenance JSON                     | Grep unit test fails                                               |
| EC-10 | security   | Fabricated `generated_at` on retroactive record | Unit test rejects shape                                            |
| EC-11 | coverage   | sampleQuestions omitted from gate               | Gate enumerates both modules                                       |
| EC-12 | honesty    | Unknown origin fields on old items              | Omitted; method=`retroactive_attestation` only                     |
