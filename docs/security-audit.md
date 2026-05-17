# Security audit — mesh-pyramid

Generated: **2026-05-17T14:00:13.224Z** · 22 checks · 22 pass · 0 fail

> A programmatic, CPU-only verification of every claim in the four-layer security stack.
> Re-run with `npm run audit:security` from this repo. Source: `mesh-common/tests/securityAudit.test.ts`
>
> - this app's `tests/e2e/security-audit.spec.ts`.

## Result

✅ **All checks pass.**

- crypto / Y.Doc invariants: **16 / 16**
- UI-flow checks: **6**

## Checks

| ID                                 | Claim                                                                                    | Method                                                                           | Result |
| ---------------------------------- | ---------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- | :----: |
| `L1.IDENTITY.persists`             | Identity key persists across reloads via localStorage                                    | loadOrCreateIdentity called twice with same prefix; both keypairs match          |   ✅   |
| `L1.IDENTITY.uniquePerApp`         | Each storagePrefix produces a distinct keypair (no cross-app reuse)                      | loadOrCreateIdentity with two different prefixes; private keys differ            |   ✅   |
| `L1.MODERATOR.claimSyncs`          | A claims moderator → B's hook reports A as current moderator                             | linkMockRooms relays Y.Doc updates; A.claim() then read on B                     |   ✅   |
| `L1.MODERATOR.expiredClaimIgnored` | A signed claim with expiresAt in the past is treated as vacant                           | Plant claim with expiresAt = now - 60s; hook reports current=null                |   ✅   |
| `L1.MODERATOR.forgedClaimRejected` | A claim with a signature not matching its embedded pubkey is treated as vacant           | Plant {pubkey:real, sig:forger}; hook rejects and reports current=null           |   ✅   |
| `L1.MODERATOR.releaseSyncs`        | Relinquish by the current moderator clears the slot for all peers                        | After A.relinquish() both A and B observe current=null                           |   ✅   |
| `L1.MODERATOR.signedClaim`         | The moderator claim's signature verifies against the embedded pubkey                     | verify({peerId,pubkey,claimedAt,expiresAt,nonce}, sig, pubkey) === true          |   ✅   |
| `L1.MODERATOR.vacantDefault`       | Fresh room reports no moderator and isMe=false                                           | useModerator hook on a fresh mock room returns {current:null, isMe:false}        |   ✅   |
| `L1.SIGN.rejectGarbage`            | Invalid signature / pubkey inputs return false instead of crashing                       | verify({x:1}, 'not-hex', 'also-bad') and verify({x:1}, '', '') both false        |   ✅   |
| `L1.SIGN.rejectTampered`           | A signed payload with any byte modified fails verification                               | Sign {msg:'hello'}, then verify({msg:'HELLO'}, …) returns false                  |   ✅   |
| `L1.SIGN.rejectWrongKey`           | A's signature does not verify under B's public key                                       | Sign with kpA.priv, verify with kpB.pub returns false                            |   ✅   |
| `L1.SIGN.roundtrip`                | A signed payload verifies against the matching pubkey                                    | Ed25519 sign(payload, privkey) then verify(payload, sig, pubkey)                 |   ✅   |
| `L1.TOFU.fingerprint`              | trustFingerprint emits a 4x2-hex grouped string for in-person verification               | fingerprint(peerId, pubkey) matches /^xx-xx-xx-xx$/                              |   ✅   |
| `L1.TOFU.peerIdFromPubkey`         | peerIdFromPubkey is deterministic and uses 64-bit prefix of pubkey                       | Two calls with same pubkey return the same 16-hex-char id                        |   ✅   |
| `L1.TOFU.register`                 | register() writes a self-signed PubkeyRecord into the registry Y.Map                     | Verify the stored record's signature against its own pubkey                      |   ✅   |
| `L1.TOFU.rejectImposter`           | A forged record signed by the wrong key does not block the real peer from publishing     | Pre-write mallory-signed alice claim; alice arrives and overwrites with her own  |   ✅   |
| `UI.MODERATOR.claimSyncs`          | A's claim becomes visible to B with the correct is-me / is-active classes                | Click claim on A, assert A shows 'you're moderating' and B shows 'is moderating' |   ✅   |
| `UI.MODERATOR.countdownShown`      | After claiming, the UI shows an auto-clear timer in 'Xm SSs' form near 30m               | Assert .mesh-mod text matches /auto-clears in (29\|30)m \d{2}s/                  |   ✅   |
| `UI.MODERATOR.honestyLabels`       | Moderator UI carries 'soft role, not enforcement' and 'auto-clears in X' subtitles       | Assert the badge text contains both honesty-contract phrases after claim         |   ✅   |
| `UI.MODERATOR.identityStable`      | After reload + re-claim, the same Ed25519 pubkey signs the new claim (TOFU stays pinned) | Read localStorage identity before/after reload + re-claim; pubkeys match         |   ✅   |
| `UI.MODERATOR.releaseClearsBoth`   | Release by the holding peer returns both peers to vacant                                 | After claim → release on A, both .mesh-mod read 'no moderator'                   |   ✅   |
| `UI.MODERATOR.vacantOnLoad`        | Both peers see 'no moderator — anyone can claim' on first load                           | Open two pages with no prior state; assert .mesh-mod shows 'no moderator'        |   ✅   |

## Evidence

Selected captured evidence (full payloads in `security-audit.json`):

### `L1.IDENTITY.persists`

```json
{
  "pubkeyA": "95187350115b9eb3060897b70f4ea4b18352e132b0d8a2e8717c55e93350ddc9",
  "pubkeyB": "95187350115b9eb3060897b70f4ea4b18352e132b0d8a2e8717c55e93350ddc9"
}
```

### `L1.IDENTITY.uniquePerApp`

```json
{
  "pubkeyA": "159f23f1ff331198",
  "pubkeyB": "de2f2a435f864391"
}
```

### `L1.MODERATOR.claimSyncs`

```json
{
  "claimer": "alice",
  "ttlMs": 1800000
}
```

### `L1.MODERATOR.expiredClaimIgnored`

```json
{
  "plantedExpiresAt": 1779026335623,
  "now": 1779026395626
}
```

### `L1.MODERATOR.forgedClaimRejected`

```json
{
  "realPubkey": "57e6fed66ba4f9ee",
  "forgerPubkey": "fd57178807c36766"
}
```

### `L1.MODERATOR.signedClaim`

```json
{
  "sigLen": 128,
  "nonceLen": 32
}
```

### `L1.SIGN.roundtrip`

```json
{
  "sigLen": 128,
  "pubkeyPrefix": "840095e6cca80445"
}
```

### `L1.TOFU.fingerprint`

```json
{
  "fingerprint": "fa-66-00-ab"
}
```

### `L1.TOFU.peerIdFromPubkey`

```json
{
  "peerId": "2da6065a19b65e4c"
}
```

### `L1.TOFU.register`

```json
{
  "peerId": "alice",
  "pubkeyPrefix": "e3f32b891a734fb6",
  "sigLen": 128
}
```

### `L1.TOFU.rejectImposter`

```json
{
  "forgedPubkey": "a32d3ec245909446",
  "realPubkey": "214541f2286c8dac"
}
```

### `UI.MODERATOR.honestyLabels`

```json
{
  "sample": "🛡you're moderatingauto-clears in 29m 59s · soft role, not enforcementrelease"
}
```

### `UI.MODERATOR.identityStable`

```json
{
  "pubkeyPrefix": "e9bbe0ad3a788638"
}
```

---

## How to re-run

```bash
cd mesh-pyramid
npm run audit:security
```

The audit runs in two passes:

1. **Crypto invariants** (Vitest, ~1s) — sign/verify roundtrips, TOFU registry, moderator role state machine, forged-claim rejection, expired-claim rejection. Uses in-memory Yjs mock rooms; no browser.
2. **UI flow** (Playwright, ~5s) — opens two peer browsers, exercises the visible moderator badge: vacant → claim → sync → release.

Both run **headless, CPU-only**. No GPU acceleration is required; no signaling server is contacted. The fleet's `judge.sh` aggregator includes these checks alongside per-app feature tests.
