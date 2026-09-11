# Roadmap — candidates beyond the current draft

The current draft (TASK-KERNEL v3.0 + the two amendments adopted from first-round
Ethereum Magicians review) is feature-frozen for the ERC PR. Items below are
recorded here so they are decided deliberately in a future revision or companion,
not smuggled into the kernel. Nothing here blocks Draft status.

## v2 revision candidates (change the interface identifier)

### 1. `judgmentFee` — the price of one recomputable ruling

A tender term set by the publisher at mint and paid from the vault to
`acceptanceAuthority` **on acceptance only**: metered per verdict, default zero.

- Reframed during first-round review (credit: @babyblueviper1): not a governance
  knob for paying judges, but literally the price of one recomputable ruling —
  which puts a tender's *full* price, reward plus judgment, in one vault that
  travels with the token when it trades. The reverse-asset thesis applied to
  judgment itself.
- Why not now: it changes the `ITaskTender` identifier, and it must never pay per
  rejection (a rejection-paid fee lets junk submissions plus a complicit judge
  drain the vault one ruling at a time — see Security Considerations).
- Prototype path without kernel change: the slot holds a fee-holding attestation
  or panel contract, the same way the fulfiller of record can be a splitter. The
  companion below can prove the economics before the kernel adopts the field.

### 2. On-chain verifier-kind discovery

Two verifiers can both declare `ITaskVerifier` and both set `machineSettled`
while being different kinds of judge — a deterministic recomputation anyone can
reproduce from the committed criteria, versus an attestation of a nondeterministic
or off-chain process. A buyer of a traded tender inherits very different judgment
risk from each, and `acceptanceAuthorityOf` alone cannot tell them apart.

- Today: the committed acceptance profile SHOULD state the verifier kind and
  whether rulings can be independently recomputed (off-chain, but inside
  `taskHash`, so a buyer who verifies the package before purchase learns it).
- Future: an on-chain discovery surface (e.g. a `verifierKindOf()` /
  ERC-165-discoverable classification interface) belongs with the judgment
  attestation companion, where "what kind of ruling is this" is the native
  question rather than an afterthought bolted onto the kernel.

## Companion track (no kernel change; separate drafts)

### Judgment-execution attestation companion (proposed by @babyblueviper1)

For judged tenders (N ≥ 1), the contract today records only the judge's say-so;
it cannot distinguish "the judge looked and it's fine" from a rubber stamp. The
companion occupies the acceptance-authority slot and, given
`(taskHash, version, resultHash)` plus the task's committed acceptance criteria,
issues a signed verdict *with a recomputable proof hash* — and only that hash,
not the say-so, triggers `acceptFulfillment` / `rejectFulfillment`. Kernel-side
composition points already exist by design: the companion is simply an acceptance
authority; each `Submission` records the cited `taskVersion`; its internal
decision window must run strictly shorter than `judgmentWindow` (see Security
Considerations on composing external judging timeouts). Sketches against the real
interface IDs are welcome as issues or PRs to this repository; if it firms up it
deserves its own draft.

### Other standing candidates

- ERC-1155 fulfillment shares: team splits, bid allocations, subcontract shares
  referencing `TaskRef = (chainId, taskContract, taskTokenId)`.
- Atomic reveal-on-payment delivery profiles for judged tenders.
- Streaming (per-second) settlement for faucet task tokens.
- Admission-control hooks / submission bonds for hostile-submitter deployments
  (the kernel deliberately only bounds slot-squatting; see Security
  Considerations).
