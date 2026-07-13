---
'@hhmi/checks-shared': patch
'@hhmi/checks-proofig': patch
'@hhmi/checks-text-integrity': patch
---

Add Segment analytics for HHMI Checks across shared helpers and both check extensions. Track run lifecycle (started, completed, failed, retried), EULA funnel, results displayed, report opened, PDF download, and user-triggered run/retry actions with consistent properties (`checkKind`, `trigger`, work/version context). Upload-option toggles are tracked by the platform upload route, not these packages.
