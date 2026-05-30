# Classic UNO Module

Status: playable MVP.

Implemented:

- 108-card Classic UNO deck
- 2 to 12 players
- deterministic server-side shuffling
- seven-card deal by default
- number cards, skip, reverse, draw two, wild, wild draw four
- current color tracking
- server-side legal action validation
- draw/pass flow
- UNO call state
- winner detection and scoring
- per-viewer public state filtering so only the viewer receives their own hand
- serializable state for room snapshots and reconnect recovery

Future improvements:

- optional stacking rules
- configurable challenge rules for wild draw four
- penalties for failing to call UNO
- house-rule presets
- better timeout behaviors per room setting
