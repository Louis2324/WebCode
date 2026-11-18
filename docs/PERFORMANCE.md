# Performance baseline

The current baseline measures the parts that can run consistently in CI: shipped source size and the cost of normalizing a project model. It is a guardrail, not a substitute for profiling the packaged application on real devices.

Run:

```bash
npm run perf:baseline
npm run perf:baseline -- --check
```

The check fails if the project model normalization benchmark exceeds 250 ms for 10,000 operations or if the core renderer sources exceed 1 MiB combined. These limits are deliberately broad so they catch accidental regressions without pretending to be user-device measurements.

The next performance review should add representative measurements for cold startup, time to first preview, preview reload, memory with a typical project, and large-file editing. Those measurements require a defined device matrix and will be discussed with the architecture roadmap.
