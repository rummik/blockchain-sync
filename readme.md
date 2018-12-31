BLOCKchain Sync
===============
A hastily thrown together tool to handle syncing Mastodon instance blocks with
the instances listed in the [BLOCKchain][].

- 2fa is supported

_This has only been tested with Mastodon 2.6.5_

[BLOCKchain]: https://github.com/dzuk-mutant/blockchain

## Requirements
- Node.js >= 9
- Yarn

## Quickstart
- Clone `git clone https://github.com/rummik/blockchain-sync.git`
- Copy `lists.example.json` to `lists.json` and edit to your liking
- Copy `login.example.json` to `login.json` and add your login info
  - Yes, it's kludgy, expect this to change when Admin APIs are available
- Run `yarn install`
- Run `yarn run sync`

## Contributing
Contributions welcome!
