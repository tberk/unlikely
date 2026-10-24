# Privacy policy

_Last updated: 25 October 2026_

Unlikely is a browser extension that removes your likes on X (formerly Twitter). It does not collect, store, sell or share any personal data.

## What the extension does

- It runs only on `x.com` and `twitter.com`.
- When you press **Start**, it clicks the unlike buttons on your likes page, in your own browser, using your existing X session. It never sees or handles your password.
- It does not send anything to the developer or any third-party server. There is no analytics, tracking, advertising or remote code.

## What is stored, and where

All of this stays on your device (or in your browser's own sync storage, if you use Chrome sync):

| Data | Where | Why |
| --- | --- | --- |
| Your settings (speed, stop-after limit, ghost-likes toggle) | `chrome.storage.sync` | So your choices are remembered |
| A running count of likes removed | `chrome.storage.local` | Shown in the popup as "N all time" |
| Progress of the current run, and IDs of posts already unliked in it | The tab's `sessionStorage` | So a run survives the page reloads the extension triggers; cleared when the tab closes |

Uninstalling the extension deletes its storage.

## Permissions

- **Access to x.com and twitter.com**: needed to find and click the unlike buttons on your likes page.
- **storage**: saves the settings and counter described above.
- **scripting**: lets the extension start in an X tab that was already open before you installed it, without you reloading the tab.

## Open source

The full source code is public at <https://github.com/tberk/unlikely>, so you can check all of the above yourself.

## Contact

Questions or concerns: open an issue at <https://github.com/tberk/unlikely/issues>.

Unlikely is an independent project and is not affiliated with, endorsed by or sponsored by X Corp.
