# Chrome Web Store listing

Everything to paste into the developer dashboard. The store title and summary come from `manifest.json` (`name`, `description`), so they are listed here only for reference.

## Store listing tab

**Title** (from manifest, 62/75 chars)

```
Unlikely: Unlike All Tweets & Delete X (Twitter) Likes in Bulk
```

**Summary** (from manifest, 121/132 chars)

```
Mass unlike tweets and remove all your likes on X (Twitter) in one click. Free, open source, no login, no data collected.
```

**Description** (plain text, paste as is)

```
Unlikely removes all your likes on X (Twitter) automatically. Open your likes page, press Start, and walk away. It unlikes every tweet you have ever liked, one by one, until your likes tab is empty.

Whether you want a clean slate, are tidying up an old account, or just don't want years of likes on public display, Unlikely is the fastest way to mass unlike tweets without clicking thousands of hearts by hand.

HOW IT WORKS
1. Go to your likes page on x.com (the popup has an "Open my likes" button).
2. Click the Unlikely icon and press Start.
3. Close the popup if you like. A small progress pill in the corner of the page shows how many likes have been removed and has a Stop button.

FEATURES
• Bulk unlike everything: deletes all your X / Twitter likes, not just the ones on screen. It scrolls and reloads the page by itself to keep going through thousands of likes.
• Handles rate limits for you: if X starts rejecting unlikes, Unlikely pauses (2 minutes, then 4, 8… up to 30) and resumes on its own.
• Removes "ghost likes": old liked tweets that show an empty heart but still count towards your likes. Unlikely re-likes and immediately unlikes them so they are really gone.
• Three speeds: Careful, Normal and Fast. Slower speeds trigger fewer rate limits.
• Stop after N likes: only want to clear your most recent 500 likes? Set a limit.
• Live counter for the current run, plus an all-time total.
• Works in Chrome, Brave, Edge and other Chromium browsers.

PRIVATE BY DESIGN
• No login, no X API key, no password. It works in your own browser tab using the session you already have.
• No data collection, no analytics, no tracking, no ads. Nothing is sent to any server.
• Runs only on x.com and twitter.com.
• Free and open source. Read the code or report an issue on GitHub: https://github.com/tberk/unlikely

FAQ
How do I delete all my likes on Twitter / X at once?
X has no button for it. Install Unlikely, open your likes page, and press Start. It unlikes tweets for you until none are left.

Does it delete my tweets or retweets?
No. Unlikely only removes likes. Your posts, replies, reposts and bookmarks are untouched.

My likes count on my profile still shows a number. Why?
X's count is often out of date and includes ghost likes. Turn on "Also clear ghost likes" in Settings and run it again.

Will my account get banned?
Unlikely clicks the same unlike buttons you would, at a pace you choose, and backs off when X rate-limits it. Still, automating actions may be against X's terms, so use it on your own account at your own risk.

Can I keep using my browser while it runs?
Yes. Keep the X tab open; it can be in the background, though Chrome may slow background tabs down.

Unlikely is an independent open-source project and is not affiliated with, endorsed by, or sponsored by X Corp. "X" and "Twitter" are trademarks of X Corp., used here only to describe what the extension works with.
```

**Category:** Lifestyle › Social Networking

**Language:** English

**Graphic assets** (in `store/assets/`, regenerate with `store/render.sh`)

| Asset | File | Size |
| --- | --- | --- |
| Store icon | `icons/icon128.png` | 128×128 (96 px art + 16 px padding) |
| Screenshot 1 | `store/assets/screenshot-1.png` | 1280×800 |
| Screenshot 2 | `store/assets/screenshot-2.png` | 1280×800 |
| Small promo tile | `store/assets/promo-small.png` | 440×280 |
| Marquee promo tile | `store/assets/promo-marquee.png` | 1400×560 |

**Homepage URL:** `https://github.com/tberk/unlikely`
**Support URL:** `https://github.com/tberk/unlikely/issues`

## Privacy practices tab

**Single purpose**

```
Unlikely has a single purpose: removing the user's own likes on X (Twitter). On the user's likes page at x.com, it clicks the unlike buttons one by one when the user presses Start, until no likes are left or the user stops it.
```

**Permission justifications**

`storage`
```
Saves the user's settings (speed, an optional stop-after limit, and the ghost-likes toggle) and a local count of likes removed, which is shown in the popup. Nothing leaves the device.
```

`scripting`
```
Used only to inject the extension's own bundled content script (src/content.js) into an x.com tab that was already open before the extension was installed, so the user doesn't have to reload the page before pressing Start. No remote or dynamically generated code is executed.
```

Host permissions (`https://x.com/*`, `https://twitter.com/*`)
```
The extension's only job is to remove likes on X. The content script must run on x.com / twitter.com to find the unlike buttons on the user's likes page, click them, and show a small progress indicator. It requests no other sites.
```

**Remote code:** No, I am not using remote code.

**Data usage:** tick nothing. The extension collects none of the listed data types. Then certify all three statements (no selling, no unrelated use, no creditworthiness use).

**Privacy policy URL:** `https://github.com/tberk/unlikely/blob/main/PRIVACY.md`

## Distribution tab

Public, all regions, free.

## Review notes

The reviewer may not have an X account with likes, so a short note helps:

```
To test: sign in to any X account that has liked posts, open https://x.com/i/history/likes, click the extension icon and press Start. The likes are removed one at a time; the progress pill in the bottom-left corner has a Stop button. The extension makes no network requests of its own; it only clicks X's own unlike buttons. Source: https://github.com/tberk/unlikely
```
