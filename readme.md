BLOCKchain Sync
===============
A hastily thrown together tool to handle syncing Mastodon instance blocks with
the instances listed in the [BLOCKchain][].

_This has only been tested with Mastodon 2.6.5_

[BLOCKchain]: https://github.com/dzuk-mutant/blockchain


## Quickstart
- Copy `lists.example.json` to `lists.json` and edit to your liking
- Copy `login.example.json` to `login.json` and add your login info
  - Yes, it's kludgy, expect this to change when Admin APIs are available
- Run `yarn run sync`
