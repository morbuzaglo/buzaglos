# BUZAGLOS - design document (v0.1, awaiting family data)

## 1. Concept
**BUZAGLOS: The Shattered Family Album.** A funny top-down pixel-art RPG for iPhone.
Somebody (the villain is TBD by the family stories) has shattered the legendary Family Album into
**Memory Shards**. Each shard is one real family story. Collecting a shard = playing that story as a
quest. When a shard is restored it unlocks a new place, item or character. All shards restored
= the Big Family Dinner (final event).

This framing makes the game *data-driven by real stories*: every story you give me (or the admin
studio generates) becomes a shard + quest, with no code change.

## 2. World
Hub: **The Buzaglo House** (living room, kitchen, garage, roof). Gates open to districts that
unlock as shards are restored (names are placeholders until the family tells me real places):
Market Street, the School, the Beach, Grandma's Neighbourhood, the Secret Attic (final).
Each district is a tile map stored as JSON. Extended relatives live there as NPCs.

## 3. Gameplay loop
Explore -> talk to NPCs -> accept quest (a "story") -> solve it with the character's unique ability
and a small mini-game -> earn coins + XP + a Memory Shard -> level up / shop / unlock area.
Characters can be swapped at any time at the House; quests can require a specific character, and
quests of one character change another's (flags: e.g. a favour done by A gives B an item).

## 4. Characters (each parent/sibling)
Unique: appearance (pixel sprite, built from a layered generator or a pixelated photo portrait),
personality (drives dialogue), active ability (cooldown, used in puzzles/mini-games), passive
strength and weakness, personal quest line, signature catchphrase, theme jingle.
Extended family = NPCs and side-quest givers. **No personal facts are invented**: all of it comes
from the family data file.

## 5. Systems
Coins, XP, levels (stat growth + ability upgrades), inventory, shop (items, outfits, upgrades,
abilities), achievements, collectibles (shards, "family recipes", inside-joke cards), secrets and
unlockable locations, interlinked quest flags, daily "family chore" bonus, save/load.

## 6. Architecture
- **Client** (GitHub Pages): Phaser 3 + Vite (ES modules), mobile-first (virtual joystick + action
  buttons, safe-area aware, 60fps target, offline-capable). PWA (manifest, service worker, icons).
  Art: procedurally drawn pixel-art sprites/tiles on canvas (no asset downloads); photos are pixelated
  in the admin studio. Audio: WebAudio synthesized chiptune music and SFX (no audio files).
- **Content** = JSON in `/content` (characters, npcs, quests, dialogue, items, maps, shop,
  achievements). The game reads only this; the admin studio only edits this.
- **Backend** (Cloudflare Workers + KV, free tier): `/auth` (password check, signed session),
  `/ai/generate` (calls the Anthropic API with a strict JSON schema and validates output),
  `/publish` (commits approved content JSON to the GitHub repo through a stored token, which triggers
  the Pages Action), `/save` (cloud saves by family code). **All secrets (API key, GitHub token, admin
  password hash) live only as Worker secrets, never in the frontend.**
- **Admin Studio** (`/admin/`, separate page): login, family members + photos, free-text story box
  ("tell me what happened"), "Generate with AI" -> preview as quest/dialogue/rewards -> edit ->
  approve -> publish; economy/progression tables; map/location manager.
- **CI/CD**: GitHub Actions builds with Vite and deploys to Pages on every push to main.
- **Saves**: localStorage always; optional cloud sync via a family code.

## 7. Privacy (public URL!)
GitHub Pages is public. Anything in `/content` (names, photos, stories) is readable by anyone with
the link. Options: first names/nicknames only, pixelated (not original) photos, and an optional
family passcode screen (light protection only, not real security).

## 8. Milestones
M1 engine + hub + movement + dialogue + UI + audio + PWA with placeholder family (playable)
M2 quest/shard engine, shop, inventory, achievements, saves
M3 Admin Studio + Worker + AI pipeline + publish
M4 real family content, polish, test on iPhone, deploy instructions
