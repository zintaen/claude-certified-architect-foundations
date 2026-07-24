# observability-injection — task-CONTENT-001

Critical paths are CLI gates (no request path). Each script emits one JSON line to stderr per run:

- `check-provenance`: `{event:"provenance.check", ok, bank_count, record_count, missing, orphan, schema_errors}`
- `similarity-check`: `{event:"provenance.similarity", ok, corpus_id, item_count, over_threshold, refused?}`

No OTel required for this improvement task (no runtime service surface). Branch coverage of error exits is exercised by unit tests.
