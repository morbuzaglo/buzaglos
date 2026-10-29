// Story scenes: each family story is its own playable scene (map + steps). Mixed into the World scene.
import { content } from '../content.js';
import { S, saveGame, addItem, removeItem, itemCount } from '../state.js';
import { characterTexture, TILE } from '../art.js';
import * as Q from '../systems/quests.js';
import * as UI from '../ui/ui.js';
import { playMinigame } from '../ui/minigames.js';
import { STR, tpl } from '../i18n.js';
import { sfx } from '../audio.js';

const HUB_CALL = { x: 19, y: 5, dir: 2 };

export const storyMethods = {
  /** The next level, who calls the player, and where. Runs when a map loads. */
  /** Decides the current level and who calls (must run BEFORE the map's NPCs are created so nobody appears twice). */
  pickCaller() {
    this.mission = Q.currentMission();
    this.callerId = null; this.callerRec = null;
    const isScene = this.mission && (this.mission.maps || []).includes(this.map.id);
    if (!this.mission || isScene) return;
    this.callerId = this.mission.callers.find((id) => content.npcs[id] && content.npcs[id].character !== S.state.activeChar) || null;
  },
  /** Puts the caller at the call point with a "!" mark. */
  setupMission() {
    const hub = content.config.hub || { map: 'house' };
    if (!this.callerId || this.map.id !== hub.map) return;
    const pt = this.pickCallSpot() || content.config.callPoint || HUB_CALL;
    this.addNpc({ id: this.callerId, x: pt.x, y: pt.y, dir: pt.dir ?? 2, call: true });
    this.callerRec = this.npcs[this.npcs.length - 1];
    if (this.callerRec) { this.callerRec.spr.label?.el.classList.add('calling'); this.markCaller(this.callerRec); }
  },
  /** A fresh random open spot in the house for the caller each time (never the same as last time). */
  pickCallSpot() {
    const W = this.mapW, H = this.mapH, free = (x, y) => !this.solid.has(x + ',' + y) && x > 0 && y > 0 && x < W - 1 && y < H - 1;
    const pl = { x: S.state.x, y: S.state.y };
    const spots = [];
    for (let y = 2; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
      if (!free(x, y) || !free(x + 1, y) || !free(x - 1, y) || !free(x, y + 1) || !free(x, y - 1)) continue;
      if (Math.hypot(x - pl.x, y - pl.y) < 3) continue;
      if ((this.doors || []).some((d) => Math.hypot(x - d.x, y - d.y) < 3)) continue;
      if (this.npcs.some((n) => Math.hypot(x - n.tx, y - n.ty) < 2.5)) continue;
      if (S.lastCallSpot && Math.hypot(x - S.lastCallSpot.x, y - S.lastCallSpot.y) < 4) continue;
      spots.push({ x, y });
    }
    if (!spots.length) return null;
    const pt = spots[Math.floor(Math.random() * spots.length)];
    S.lastCallSpot = pt;
    return { x: pt.x, y: pt.y, dir: pl.x < pt.x ? 2 : 3 };
  },
  /** Family members in the house stroll a few steps now and then, then stand still again. */
  updateWander(dt) {
    const hub = content.config.hub || { map: 'house' };
    if (this.map.id !== hub.map || this.busy || this.transitioning) return;
    for (const n of this.npcs) {
      if (n.moving || n.def.wander === false || n === this.callerRec || n.def.scale) continue;
      n.wanderT = (n.wanderT ?? (3 + Math.random() * 6)) - dt;
      if (n.wanderT > 0) continue;
      n.wanderT = 4 + Math.random() * 8;
      if (n.homeX === undefined) { n.homeX = n.tx; n.homeY = n.ty; }
      const dirs = [[0, 1], [0, -1], [-1, 0], [1, 0]].sort(() => Math.random() - 0.5);
      const steps = 1 + Math.floor(Math.random() * 3);
      for (const [dx, dy] of dirs) {
        let x = n.tx, y = n.ty, ok = 0;
        for (let i = 0; i < steps; i++) {
          const nx = x + dx, ny = y + dy;
          if (this.solid.has(nx + ',' + ny) || nx < 1 || ny < 2 || nx >= this.mapW - 1 || ny >= this.mapH - 1) break;
          if (Math.hypot(nx - n.homeX, ny - n.homeY) > 4) break;
          if (this.doors.some((d) => Math.hypot(nx - d.x, ny - d.y) < 2)) break;
          if (Math.hypot(nx * TILE + 8 - this.player.x, ny * TILE + 15 - this.player.y) < 20) break;
          x = nx; y = ny; ok++;
        }
        if (ok) { this.wanderTo(n, dx, dy, ok); break; }
      }
    }
  },
  wanderTo(n, dx, dy, count) {
    const dir = dx < 0 ? 2 : dx > 0 ? 3 : dy < 0 ? 1 : 0;
    n.moving = true;
    const stepOnce = (left) => {
      if (!n.spr.scene || !this.npcs.includes(n)) return;
      const nx = n.tx + dx, ny = n.ty + dy;
      if (left === 0 || this.busy || this.solid.has(nx + ',' + ny) || Math.hypot(nx * TILE + 8 - this.player.x, ny * TILE + 15 - this.player.y) < 18) {
        n.spr.play(`${n.key}_idle${dir}`); n.moving = false; return;
      }
      this.solid.delete(n.tx + ',' + n.ty); this.solid.add(nx + ',' + ny);
      n.tx = nx; n.ty = ny;
      n.spr.play(`${n.key}_walk${dir}`, true);
      this.tweens.add({ targets: n.spr, x: nx * TILE + 8, y: ny * TILE + 15, duration: 300, onUpdate: () => n.spr.setDepth(n.spr.y), onComplete: () => stepOnce(left - 1) });
    };
    stepOnce(count);
  },
  markCaller(rec) {
    const host = document.getElementById('labels'); if (!host) return;
    const m = document.createElement('span'); m.className = 'callmark'; m.textContent = '!'; host.appendChild(m);
    (this.labels ||= []).push({ el: m, spr: rec.spr, scale: rec.spr.scaleY, extra: 22, mark: true });
  },
  announceMission() {
    if (!this.mission || !this.callerId) { if (!this.mission && content.config.finalShards && S.state.shards.length >= content.config.finalShards) UI.queueToast(STR.mission.allDone, 3000); return; }
    const ch = content.characters[this.callerId];
    UI.queueToast(STR.mission.calls(content.npcs[this.callerId].name, ch?.gender), 3200); sfx('door');
  },
  /** The caller briefs the player like an adventure mission, then the level starts. */
  async startMission() {
    const q = this.mission; if (!q) return;
    const protag = q.callers[0], me = this.callerId;
    const texts = q.callers[0] === S.state.activeChar && q.missionPlayer ? q.missionPlayer : (me === protag ? q.missionSelf : q.missionOther);
    const lines = texts.map((text) => ({ who: me, text }));
    if (S.state.quests[q.id]?.state === 'active') lines.unshift({ who: me, text: STR.mission.resume });
    await UI.say(lines);
    await UI.choose('narrator', STR.mission.level(q.order, tpl(q.title)), [STR.mission.go]);
    this.enterStory(q.id);
  },
  /** Compass arrow pointing at the caller (or at the way home when we are elsewhere). */
  updateGuide() {
    const g = document.getElementById('guide'); if (!g) return;
    let target = null;
    const hub = content.config.hub || { map: 'house' };
    if (this.mission && !this.busy && !this.transitioning && this.player && !UI.panelOpen() && !UI.dialogueOpen()) {
      if (this.callerRec) target = { x: this.callerRec.spr.x, y: this.callerRec.spr.y - 14 };
      else if (this.map.id !== hub.map && !Q.activeStory()) target = this.doorTowardHub();
    }
    if (!target) { g.classList.add('hidden'); return; }
    const cam = this.cameras.main, wv = cam.worldView, z = cam.zoom;
    const px = (this.player.x - wv.x) * z, py = (this.player.y - 14 - wv.y) * z;
    const dx = (target.x - wv.x) * z - px, dy = (target.y - wv.y) * z - py, dist = Math.hypot(dx, dy);
    if (dist < 70) { g.classList.add('hidden'); return; }
    g.classList.remove('hidden');
    const r = Math.min(64, dist - 40), ax = px + (dx / dist) * r, ay = py + (dy / dist) * r;
    g.style.transform = `translate(${Math.round(ax)}px, ${Math.round(ay)}px) translate(-50%, -50%)`;
    g.firstElementChild.style.transform = `rotate(${Math.atan2(dy, dx)}rad)`;
  },
  doorTowardHub() {
    const hub = (content.config.hub || { map: 'house' }).map;
    const prev = { [hub]: null }, queue = [hub];
    while (queue.length) { const m = queue.shift(); for (const [id, mp] of Object.entries(content.maps)) { if (prev[id] === undefined && (mp.doors || []).some((d) => d.to === m)) { prev[id] = m; queue.push(id); } } }
    const next = prev[this.map.id]; if (!next) return null;
    const d = (this.map.doors || []).find((x) => x.to === next); if (!d) return null;
    return { x: d.x * 16 + 8, y: d.y * 16 + 8 };
  },

  /** Enter (or resume / replay) a story from the family album. */
  enterStory(qid) {
    const q = content.quests[qid]; if (!q?.scene) return;
    let st = S.state.quests[qid];
    if (st?.state === 'done') {                     // replay: no second reward
      S.state.quests[qid] = st = { state: 'active', step: 0, replay: true };
      this.clearStoryCollected(q);
    } else if (!st) Q.startQuest(qid);
    st = S.state.quests[qid];
    if (this.callerId) st.companion = this.callerId;
    const where = st.at || q.scene;
    this.transitioning = false;
    this.changeMap(where.map, where.x, where.y);
    saveGame();
  },
  /** The character who gave the mission walks with the player through every map of the level. */
  setupCompanion() {
    this.companion = null;
    const q = Q.activeStory(); if (!q || !this.inStoryMap(q) || !this.player) return;
    const id = S.state.quests[q.id].companion, def = content.npcs[id]; if (!def) return;
    const key = characterTexture(this, 'n_' + id, def.look);
    const spr = this.add.sprite(this.player.x - 14, this.player.y, key, 0).setOrigin(0.5, 32 / 34);
    spr.play(`${key}_idle0`); this.layer.add(spr);
    const lab = this.makeLabel(spr, def.name, false); if (lab) lab.hideNear = true;
    this.companion = { id, spr, key, hist: [], moving: false, dir: 0 };
  },
  updateCompanion() {
    const c = this.companion, p = this.player; if (!c || !p) return;
    const h = c.hist, last = h[h.length - 1];
    if (!last || Math.hypot(p.x - last.x, p.y - last.y) > 3) h.push({ x: p.x, y: p.y });
    if (h.length > 40) h.shift();
    const tgt = h.length > 9 ? h[h.length - 9] : { x: p.x - 14, y: p.y };
    const dx = tgt.x - c.spr.x, dy = tgt.y - c.spr.y, d = Math.hypot(dx, dy);
    if (Math.hypot(p.x - c.spr.x, p.y - c.spr.y) > 150) { c.spr.x = tgt.x; c.spr.y = tgt.y; }
    const toPlayer = Math.hypot(p.x - c.spr.x, p.y - c.spr.y);
    const moving = d > 1.2 && toPlayer > 13;
    if (moving) { c.spr.x += dx * 0.14; c.spr.y += dy * 0.14; c.dir = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 2 : 3) : (dy < 0 ? 1 : 0); }
    const anim = `${c.key}_${moving ? 'walk' : 'idle'}${c.dir}`;
    if (c.spr.anims.currentAnim?.key !== anim) c.spr.play(anim);
    c.spr.setDepth(c.spr.y);
  },
  exitStory() {
    const hub = content.config.hub || { map: 'house', x: 9, y: 11 };
    this.timer = null; UI.setTimer(null);
    this.changeMap(hub.map, hub.x, hub.y);
  },
  clearStoryCollected(q) {
    for (const mid of q.maps || [q.scene.map]) for (const pk of content.maps[mid]?.pickups || []) if (pk.needsQuest === q.id) delete S.state.collected[mid + ':' + pk.id];
    for (const mid of q.maps || [q.scene.map]) for (const p of content.maps[mid]?.props || []) if (p.gives) delete S.state.flags['got:' + mid + ':' + p.id];
  },
  inStoryMap(q) { return (q.maps || [q.scene?.map]).includes(this.map?.id); },

  /** Runs automatic steps (cutscenes, teleports, choices, auto mini-games) of the story we are in. */
  async runAuto() {
    if (this.autoRunning || this.busy || this.transitioning || !this.player || UI.panelOpen() || UI.dialogueOpen()) return;
    this.autoRunning = true;
    try {
      for (let guard = 0; guard < 20; guard++) {
        const q = Q.activeQuests().find((x) => x.scene && this.inStoryMap(x)); if (!q) break;
        const step = Q.currentStep(q.id); if (!Q.isAuto(step)) break;
        this.busy = true; this.player.play(`${this.playerKey}_idle${this.player.dir}`);
        if (step.type === 'cutscene') { await UI.say(step.lines); Q.completeStep(q.id); }
        else if (step.type === 'teleport') { S.state.quests[q.id].at = { map: step.map, x: step.x, y: step.y }; Q.completeStep(q.id); this.busy = false; this.changeMap(step.map, step.x, step.y); this.autoRunning = false; return; }
        else if (step.type === 'choice') { await this.choiceStep(step); Q.completeStep(q.id); }
        else if (step.type === 'minigame') { if (step.lines) await UI.say(step.lines); const won = await playMinigame(step.game, step.config || {}, tpl(q.title)); if (won) { Q.completeStep(q.id); } else { await UI.say([{ who: 'narrator', text: STR.world.tryAgain2 }]); } }
        this.busy = false;
        this.afterQuestChange();
        await this.flushRewards();
      }
    } finally { this.busy = false; this.autoRunning = false; }
  },

  async choiceStep(step) {
    for (let i = 0; i < 12; i++) {
      const idx = await UI.choose(step.who || 'narrator', step.question, step.options.map((o) => o.text));
      const o = step.options[idx];
      if (o.reply) await UI.say(o.reply);
      if (o.correct) return;
      if (!o.reply) await UI.say([{ who: 'narrator', text: STR.world.tryAgain2 }]);
    }
  },

  async runInteractStep(m) {
    const { quest, step } = m;
    if (step.lines) await UI.say(step.lines);
    if (step.minigame) {
      const won = await playMinigame(step.minigame.game, step.minigame.config || {}, tpl(quest.title));
      if (!won) { await UI.say([{ who: 'narrator', text: STR.world.tryAgain }]); return; }
    }
    if (step.give) addItem(step.give, 1);
    sfx('pickup'); Q.completeStep(quest.id);
  },

  /** Interacting with a prop that hands out an item (once per story run). */
  async giveFromProp(p) {
    const key = 'got:' + this.map.id + ':' + p.id;
    if (S.state.flags[key]) { await UI.say([{ who: 'narrator', text: p.emptyText || STR.world.nothingMore }]); return true; }
    S.state.flags[key] = true; addItem(p.gives, 1); sfx('pickup');
    UI.queueToast(STR.world.found(content.items[p.gives]?.name || p.gives));
    if (p.givesText) await UI.say([{ who: 'narrator', text: p.givesText }]);
    Q.evaluate(); return true;
  },

  async propAction(p) {
    if (p.interact?.action === 'stories') { UI.openStories(); return true; }
    if (p.interact?.action === 'exit') {
      const i = await UI.choose('narrator', STR.stories.exitAsk, [STR.stories.stay, STR.stories.leave]);
      if (i === 1) this.exitStory();
      return true;
    }
    return false;
  },

  /** Countdown for timed collection steps (e.g. 7 minutes to get ready). */
  tickStory(dt) {
    const q = Q.activeQuests().find((x) => x.scene && this.inStoryMap(x));
    const step = q && Q.currentStep(q.id);
    // Safety net: an automatic step (cutscene, choice, mini-game) that missed its trigger (the screen was busy at that moment) is retried, so a level can never stall on it.
    this.autoT = (this.autoT || 0) + dt;
    if (this.autoT > 0.8) { this.autoT = 0; if (step && Q.isAuto(step) && !this.autoRunning) this.runAuto(); }
    if (!(step?.type === 'collect' && step.timeLimit)) { if (this.timer) { this.timer = null; UI.setTimer(null); } return; }
    const idx = S.state.quests[q.id].step;
    if (!this.timer || this.timer.qid !== q.id || this.timer.idx !== idx) this.timer = { qid: q.id, idx, left: step.timeLimit };
    if (!this.busy && !UI.panelOpen() && !UI.dialogueOpen()) this.timer.left -= dt;
    const frac = Math.max(0, this.timer.left) / step.timeLimit, total = step.displaySeconds || step.timeLimit, secs = Math.ceil(frac * total);
    UI.setTimer(`${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`);
    if (this.timer.left <= 0 && !this.busy) this.failTimer(q, step);
  },
  async failTimer(q, step) {
    this.busy = true; this.timer = null; UI.setTimer(null); sfx('bad');
    removeItem(step.item, itemCount(step.item));
    this.clearStoryCollected(q); this.refreshPickups();
    await UI.say(step.failLines || [{ who: 'narrator', text: STR.stories.failTimer }]);
    this.busy = false; this.afterQuestChange();
  },
};
