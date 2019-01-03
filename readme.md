BLOCKchain Sync
===============
A hastily thrown together tool to handle syncing Mastodon instance blocks with
the instances listed in the [BLOCKchain][].

Features:
- 2fa support
- Updates existing domains if needed
- Support for multiple block list JSON sources

_This has only been tested with Mastodon 2.6.5_

[BLOCKchain]: https://github.com/dzuk-mutant/blockchain

## Requirements
- Node.js >= 9
- Yarn / NPM

## Quickstart
- Clone `git clone https://gitlab.com/chameleoid/awoo.pub/blockchain-sync.git`
- Copy `lists.example.json` to `lists.json` and edit to your liking
- Copy `login.example.json` to `login.json` and add your login info
  - Yes, it's kludgy, expect this to change when Admin APIs are available
- Run `yarn install` or `npm install`
- Run `yarn run sync` or `npm run sync`

## Contributing
Contributions welcome!

## Configuring
```json
{
  "//": "URLs of JSON lists to include blocks from",
  "includes": [
    "https://github.com/dzuk-mutant/blockchain/blob/master/list/list.json"
  ],

  "//": "Local block list",
  "blocklist": [
    {
      "//": "The instance's domain name",
      "domain": "example.com",

      "//": "Reasons lists this instance should be included in for taking action",
      "reasons": [ "spam" ]
    }
  ],

  "//": "List of domains that should never be blocked",
  "allowlist": [
    {
      "//": "The instance's domain name",
      "domain": "example.com"
    }
  ],

  "//": "Actions to be taken on instances in a set of reason lists",
  "//": "Consult the block lists you include to determine which lists are available",
  "actions": [
    {
      "//": "Reasons lists this action should be applied to",
      "//": "(taken from https://github.com/dzuk-mutant/blockchain/blob/master/list/json-list.md)",
      "//": "  `abuse` - Harrassment and direct abuse to other users",
      "//": "  `advertising` - Primarily owned or used by corporations to advertise or post product updates",
      "//": "  `corporate` - Corporate-owned instances",
      "//": "  `dct` - Dangerous conspiracy theories",
      "//": "  `hostile` - Other hostile admin conduct",
      "//": "  `security-risk` - Compromises the privacy/broadcast levels of posts",
      "//": "  `spam` - Primarily used for spam bots",
      "//": "  `ums` - Unwilling to moderate hate speech and violent speech",
      "//": "  `underage-porn` - Illustrated sexualised depictions of people who appear to be minors",
      "//": "  `vsz` - Violent speech space",
      "reasons": [ "spam" ],


      "//": "Severity of action to be taken",
      "//": "See: https://docs.joinmastodon.org/usage/moderation/#server-wide-moderation",
      "//": "  `suspend` - Block communication with users on the instance",
      "//": "  `silence` - Do not display posts on the public timeline",
      "severity": "silence",


      "//": "Rejections list (optional)",
      "//": "See: https://docs.joinmastodon.org/usage/moderation/#server-wide-moderation",
      "//": "  `media` - Reject media attachments, avatars, headers, emoji",
      "//": "  `reports` - Reject moderation reports from users",
      "reject": [ "media", "reports" ]
    }
  ]
}
```

### Configuration examples
```json
{
  "//": "URLs of JSON lists to include blocks from",
  "includes": [
    "https://github.com/dzuk-mutant/blockchain/blob/master/list/list.json"
  ],

  "//": "Local block list",
  "blocklist": [
    { "domain": "example.com", "reasons": [ "spam" ] }
  ],

  "//": "List of domains that should never be blocked",
  "allowlist": [
    { "domain": "example.com" }
  ],

  "//": "Actions to be taken on instances in a set of reason lists",
  "//": "Consult the block lists you include to determine which lists are available",
  "actions": [
    {
      "reasons": [
        "corporate",
        "advertising"
      ],

      "severity": "silence"
    },

    {
      "reasons": [
        "abuse",
        "dct",
        "hostile",
        "security-risk",
        "spam",
        "ums",
        "underage-porn",
        "vsz"
      ],

      "severity": "suspend"
    }
  ]
}
```
