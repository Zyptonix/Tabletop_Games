# UNO Flip Module Placeholder

Status: planned.

This folder will implement a `GameModule` for a two-sided card game variant.

Expected pieces:

- light/dark side card definitions
- side-aware deck setup and public state filtering
- flip action and table flip animation event
- separate rule helpers for each side
- state fields for active side and side-specific current color

The room server should not need changes when this module is implemented.
