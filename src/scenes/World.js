import Phaser from 'phaser';
import { content } from '../content.js';
import { S, saveGame, bonus, check, addItem, addCoins, addXp, setFlag, getFlag, equippedLook, onChange } from '../state.js';
import {
  TILE, TILE_NAMES, TILE_SOLID, buildTileAtlas, buildProps, renderMapCanvas, characterTexture, iconCanvas, PROP_SIZE, CHAR_W, CHAR_H,
} from '../art.js';
import { input, onPress } from '../ui/controls.js';
import * as UI from '../ui/ui.js';
import * as Q from '../systems/quests.js';
import { playMinigame } from '../ui/minigames.js';
import { sfx, playMusic, initAudio, resumeAudio } from '../audio.js';
import { STR, tpl } from '../i18n.js';
import { storyMethods } from './story.js';

const FOOT_H = { bed: 2 };            // footprint rows (default 1)
const NO_COLLIDE = new Set(['mat']);

export default class World extends Phaser.Scene {
  constructor() { super('World'); }

  create() {
    this.atlas = buildTileAtlas(this);
    buildProps(this);
    this.busy = true;                 // blocked until the game starts
    this.solid = new Set();
    this.layer = this.add.group();
    this.transitioning = false;
    this.abilityCd = 0; this.dashT = 0; this.sniffT = 0;
    this.stepAcc = 0; this.saveT = 0; this.gotoT = 0;
    this.tmp = [];
    this.fitCamera();
    this.scale.on('resize', () => this.fitCamera());
    onPress('a', () => this.onA());
    onPress('b', () => this.useAbility());
    UI.hooks.teleport = (map, x, y) => this.changeMap(map, x, y);
    UI.hooks.charChanged = () => this.refreshPlayerLook();
    UI.hooks.resetCooldown = () => { this.abilityCd = 0; };
    UI.hooks.ending = () => UI.showEnding();
    this.events.on('shutdown', () => {});
    window.addEventListener('pagehide', () => saveGame());
    document.addEventListener('visibilitychange', () => { if (document.hidden) saveGame(); });
    // rewards are shown after the current dialogue closes
    this.pendingRewards = [];
    UI.hooks.enterStory = (qid) => this.enterStory(qid);
    onChange((type, data) => {
      if (type === 'questDone') this.pendingRewards.push(data);
      if (type === 'stepDone' || type === 'questStarted') this.time.delayedCall(350, () => this.runAuto());
    });
  }

  fitCamera() {
    const w = this.scale.width, zoom = w < 700 ? 2 : 3;
    this.cameras.main.setZoom(zoom);
    if (this.mapW) this.setCameraBounds();
  }
  // maps smaller than the screen are centred instead of stuck in a corner
  setCameraBounds() {
    const cam = this.cameras.main, zoom = cam.zoom;
    const vw = this.scale.width / zoom, vh = this.scale.height / zoom, mw = this.mapW * TILE, mh = this.mapH * TILE;
    const bw = Math.max(mw, vw), bh = Math.max(mh, vh);
    cam.setBounds(-(bw - mw) / 2, -(bh - mh) / 2, bw, bh);
  }

  // ------------------------------------------------------------------ world building
  startWorld() {
    this.busy = false; this.announced = {};
    const st = S.state;
    this.loadMap(st.map, st.x, st.y, st.dir);
  }

  clearWorld() {
    (this.labels || []).forEach((l) => l.el.remove()); this.labels = [];
    this.layer.clear(true, true);
    this.tmp.forEach((o) => o.destroy && o.destroy()); this.tmp = [];
    this.solid = new Set(); this.npcs = []; this.props = []; this.pickups = []; this.doors = [];
    if (this.mapImg) { this.mapImg.destroy(); this.mapImg = null; }
    if (this.player) { this.player.destroy(); this.player = null; }
  }

  loadMap(id, tx, ty, dir = 0) {
    const map = content.maps[id]; if (!map) return;
    this.clearWorld();
    this.map = map; S.state.map = id; this.lastChar = S.state.activeChar;
    const W = map.tiles[0].length, H = map.tiles.length;
    this.mapW = W; this.mapH = H;
    const key = 'map_' + id;
    if (!this.textures.exists(key)) this.textures.addCanvas(key, renderMapCanvas(map, this.atlas));
    this.mapImg = this.add.image(0, 0, key).setOrigin(0, 0).setDepth(-1000);
    // solid tiles
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (TILE_SOLID.has(map.legend[map.tiles[y][x]])) this.solid.add(x + ',' + y);
    // props
    (map.props || []).forEach((p) => this.addProp(p));
    // npcs
    this.pickCaller();
    (map.npcs || []).forEach((n) => this.addNpc(n));
    // pickups
    this.refreshPickups();
    this.doors = map.doors || [];
    // player
    const look = equippedLook(S.state.activeChar);
    this.playerKey = characterTexture(this, 'p_' + S.state.activeChar + '_' + JSON.stringify(look), look);
    this.player = this.add.sprite(tx * TILE + 8, ty * TILE + 15, this.playerKey, 0).setOrigin(0.5, 32 / 34);
    this.player.dir = dir; this.player.moving = false;
    this.player.play(`${this.playerKey}_idle${dir}`);
    // camera
    const cam = this.cameras.main;
    this.setCameraBounds();
    cam.startFollow(this.player, true, 0.15, 0.15); cam.roundPixels = true;
    cam.fadeIn(250, 0, 0, 0);
    this.hint = this.add.text(0, 0, '!', { fontFamily: 'PS2P, monospace', fontSize: '8px', color: '#ffd23f', stroke: '#0d0720', strokeThickness: 3, resolution: 3 }).setOrigin(0.5, 1).setDepth(99999).setVisible(false);
    this.tmp.push(this.hint);
    playMusic(map.music || 'home');
    S.state.x = tx; S.state.y = ty; S.state.dir = dir;
    UI.refreshHud();
    this.transitioning = false; this.lastDoor = tx + ',' + ty;
    UI.toast(map.name, 1600);
    this.timer = null; UI.setTimer(null);
    this.makeLabel(this.player, nameOf(S.state.activeChar), true);
    this.setupMission(); this.setupCompanion();
    this.time.delayedCall(700, () => { this.runAuto(); if (this.callerId && !this.announced?.[this.mission.id]) { (this.announced ||= {})[this.mission.id] = true; this.announceMission(); } });
  }

  footprint(p) {
    const size = PROP_SIZE[p.type] || [16, 16];
    return { fw: Math.max(1, Math.ceil(size[0] / TILE)), fh: FOOT_H[p.type] || 1 };
  }
  addProp(p) {
    if (p.needsFlag && !getFlag(p.needsFlag)) { (this.hiddenProps ||= []).push(p); }
    const key = 'prop_' + p.type; if (!this.textures.exists(key)) return;
    const spr = this.add.image(p.x * TILE, (p.y + 1) * TILE, key).setOrigin(0, 1);
    spr.setDepth((p.y + 1) * TILE);
    const f = this.footprint(p);
    p.fp = f;
    const solid = p.solid !== false && !NO_COLLIDE.has(p.type);
    if (p.type === 'mat') spr.setDepth(-900);
    const rec = { p, spr, solid };
    if (p.needsFlag && !getFlag(p.needsFlag)) { spr.setVisible(false); rec.hidden = true; }
    else if (solid) this.blockProp(p);
    this.props.push(rec); this.layer.add(spr);
  }
  blockProp(p) { const f = p.fp; for (let dx = 0; dx < f.fw; dx++) for (let dy = 0; dy < f.fh; dy++) this.solid.add((p.x + dx) + ',' + (p.y - dy)); }
  refreshProps() {
    (this.props || []).forEach((r) => { if (r.hidden && getFlag(r.p.needsFlag)) { r.hidden = false; r.spr.setVisible(true); if (r.solid) this.blockProp(r.p); } });
  }
  addNpc(n) {
    const def = content.npcs[n.id]; if (!def) return;
    if (this.callerId && !n.call && n.id === this.callerId) return;           // the caller stands at the call point instead
    if (def.character && def.character === S.state.activeChar) return;     // you are this person right now
    const key = characterTexture(this, 'n_' + n.id, def.look);
    const spr = this.add.sprite(n.x * TILE + 8, n.y * TILE + 15, key, 0).setOrigin(0.5, 32 / 34);
    spr.play(`${key}_idle${n.dir || 0}`);
    if (def.scale) spr.setScale(def.scale);
    spr.setDepth(spr.y);
    if (!def.noLabel) this.makeLabel(spr, def.name, false, def.scale || 1);
    this.solid.add(n.x + ',' + n.y);
    this.npcs.push({ id: n.id, def, spr, key, tx: n.x, ty: n.y, entry: n });
    this.layer.add(spr);
  }
  makeLabel(spr, text, isPlayer, scale = 1) {
    if (!text) return null;
    const host = document.getElementById('labels'); if (!host) return null;
    const el = document.createElement('span'); el.textContent = text; if (isPlayer) el.className = 'me';
    host.appendChild(el);
    const rec = { el, spr, scale }; (this.labels ||= []).push(rec); spr.label = rec;
    return rec;
  }
  updateLabels() {
    const cam = this.cameras.main, wv = cam.worldView, z = cam.zoom;
    for (const l of this.labels || []) {
      const x = (l.spr.x - wv.x) * z, y = (l.spr.y - 31 * l.scale - wv.y) * z - (l.extra || 0);
      l.el.style.transform = `translate(calc(${Math.round(x)}px - 50%), calc(${Math.round(y)}px - 100%))`;
      if (l.hideNear && this.player) { const dd = Math.hypot(l.spr.x - this.player.x, l.spr.y - this.player.y); l.el.style.visibility = dd < 26 ? 'hidden' : ''; }
      l.el.style.display = x < -60 || y < -40 || x > this.scale.width + 60 || y > this.scale.height + 60 ? 'none' : '';
    }
  }
  refreshPickups() {
    (this.pickups || []).forEach((p) => p.spr.destroy());
    this.pickups = [];
    (this.map.pickups || []).forEach((p) => {
      if (S.state.collected[this.map.id + ':' + p.id]) return;
      if (p.needsQuest && S.state.quests[p.needsQuest]?.state !== 'active') return;
      const it = content.items[p.item]; if (!it) return;
      const key = 'icon_' + p.item;
      if (!this.textures.exists(key)) this.textures.addCanvas(key, iconCanvas(it.icon, it.color));
      const spr = this.add.image(p.x * TILE + 8, p.y * TILE + 12, key).setOrigin(0.5, 1).setDepth(p.y * TILE + 14);
      this.tweens.add({ targets: spr, y: spr.y - 2, yoyo: true, repeat: -1, duration: 600 });
      if (p.hidden) spr.setAlpha(0);
      this.pickups.push({ p, spr });
      this.layer.add(spr);
    });
  }

  // ------------------------------------------------------------------ collision + movement
  blockedAt(px, py) { return this.solid.has(Math.floor(px / TILE) + ',' + Math.floor(py / TILE)) || px < 0 || py < 0 || px >= this.mapW * TILE || py >= this.mapH * TILE; }
  canStand(x, y) {            // feet box 8x5 centred on x, ending at y
    for (const [dx, dy] of [[-4, -4], [4, -4], [-4, 0], [4, 0]]) if (this.blockedAt(x + dx, y + dy)) return false;
    return true;
  }

  update(time, delta) {
    if (!this.player) return;
    const dt = delta / 1000;
    S.state.playSeconds += dt;
    this.abilityCd = Math.max(0, this.abilityCd - dt);
    this.dashT = Math.max(0, this.dashT - dt); this.sniffT = Math.max(0, this.sniffT - dt);
    this.updateAbilityButton();
    // movement
    let vx = 0, vy = 0;
    if (!this.busy && !this.transitioning) { vx = input.x; vy = input.y; }
    const len = Math.hypot(vx, vy);
    const p = this.player;
    if (len > 0.05) {
      const sp = 58 * (1 + bonus().speed / 100) * (this.dashT > 0 ? 1.9 : 1) * Math.min(1, len);
      const nx = vx / len, ny = vy / len;
      const mx = nx * sp * dt, my = ny * sp * dt;
      const ox = p.x, oy = p.y;
      if (this.canStand(p.x + mx, p.y)) p.x += mx;
      if (this.canStand(p.x, p.y + my)) p.y += my;
      p.dir = Math.abs(nx) > Math.abs(ny) ? (nx < 0 ? 2 : 3) : (ny < 0 ? 1 : 0);
      this.stepAcc += Math.hypot(p.x - ox, p.y - oy);
      if (this.stepAcc >= 16) { S.state.stats.steps++; this.stepAcc -= 16; if (S.state.stats.steps % 4 === 0) sfx('step'); }
      const anim = `${this.playerKey}_walk${p.dir}`;
      if (p.anims.currentAnim?.key !== anim) p.play(anim);
      p.moving = true;
    } else if (p.moving) { p.moving = false; p.play(`${this.playerKey}_idle${p.dir}`); }
    p.setDepth(p.y);
    if (this.dashT > 0 && Math.random() < 0.5) this.puff(p.x, p.y - 2);
    // tile position
    const tx = Math.floor(p.x / TILE), ty = Math.floor((p.y - 1) / TILE);
    S.state.x = tx; S.state.y = ty; S.state.dir = p.dir;
    // doors
    if (!this.transitioning && !this.busy) this.checkDoors(tx, ty);
    // pickups + hidden reveal
    this.updatePickups();
    // interaction hint
    this.updateHint();
    this.tickStory(dt); this.updateWander(dt);
    this.updateCompanion(); this.updateLabels(); this.updateGuide(); this.abilityHintT = (this.abilityHintT || 0) - dt; if (this.abilityHintT <= 0) { this.abilityHintT = 0.35; this.updateAbilityHint(); }
    // periodic
    this.gotoT += dt; if (this.gotoT > 0.5) { this.gotoT = 0; if (Q.checkGoto(this.map.id, tx, ty)) this.afterQuestChange(); }
    this.saveT += dt; if (this.saveT > 20) { this.saveT = 0; saveGame(); }
    if (input.aPressed) { input.aPressed = false; }
    // flush rewards when idle
  }

  puff(x, y) {
    const c = this.add.rectangle(x + (Math.random() * 6 - 3), y, 3, 3, 0xffffff, 0.8).setDepth(y + 1);
    this.tweens.add({ targets: c, alpha: 0, y: y - 6, duration: 300, onComplete: () => c.destroy() });
  }

  checkDoors(tx, ty) {
    for (const d of this.doors) {
      if (d.x !== tx || d.y !== ty) continue;
      if (this.lastDoor === d.x + ',' + d.y) return;
      if (d.needsFlag && !getFlag(d.needsFlag)) { if (!this._blockedMsg) { this._blockedMsg = true; UI.toast(d.blocked || STR.world.locked); sfx('bad'); setTimeout(() => (this._blockedMsg = false), 2000); this.player.x -= (this.player.dir === 3 ? 6 : this.player.dir === 2 ? -6 : 0); } return; }
      this.go(d); return;
    }
    if (!this.doors.some((d) => d.x === tx && d.y === ty)) this.lastDoor = null;
  }
  go(d) {
    this.transitioning = true; sfx('door'); saveGame();
    this.cameras.main.fadeOut(200, 0, 0, 0);
    this.time.delayedCall(220, () => this.loadMap(d.to, d.tx, d.ty, d.dir || 0));
  }
  changeMap(id, tx, ty) { this.transitioning = true; this.cameras.main.fadeOut(200, 0, 0, 0); this.time.delayedCall(220, () => this.loadMap(id, tx, ty, 0)); }

  updatePickups() {
    const p = this.player;
    for (const pk of this.pickups) {
      const dx = pk.spr.x - p.x, dy = pk.spr.y - p.y, d = Math.hypot(dx, dy);
      if (pk.p.hidden) {
        const show = d < 26 || (this.sniffT > 0 && d < 150);
        pk.spr.setAlpha(Math.min(1, pk.spr.alpha + (show ? 0.1 : -0.1)));
        if (!show) pk.spr.setAlpha(Math.max(0, pk.spr.alpha - 0.0));
      }
      if (d < 12 && (!pk.p.hidden || pk.spr.alpha > 0.4)) this.collect(pk);
    }
  }
  collect(pk) {
    S.state.collected[this.map.id + ':' + pk.p.id] = true;
    this.pickups = this.pickups.filter((x) => x !== pk); pk.spr.destroy();
    const it = content.items[pk.p.item];
    addItem(pk.p.item, 1); sfx('pickup'); UI.queueToast(STR.world.found(it.name));
    Q.evaluate(); this.afterQuestChange(); saveGame();
    if (!this.busy) { this.busy = true; this.flushRewards().finally(() => { this.busy = false; }); }
  }

  // ------------------------------------------------------------------ interaction
  findTarget() {
    const p = this.player, fx = [0, 0, -1, 1][p.dir], fy = [1, -1, 0, 0][p.dir];
    const cx = p.x + fx * 10, cy = p.y - 6 + fy * 10;
    let best = null, bd = 26;
    const consider = (kind, ref, x, y, r = 0) => { const d = Math.hypot(x - cx, y - cy) - r; if (d < bd) { bd = d; best = { kind, ref }; } };
    this.npcs.forEach((n) => consider('npc', n, n.spr.x, n.spr.y - 6));
    this.props.forEach((r) => { if ((r.p.interact || r.p.gives) && !r.hidden) { const f = r.p.fp; consider('prop', r, r.p.x * TILE + (f.fw * TILE) / 2, (r.p.y + 1) * TILE - 8, (f.fw * TILE) / 2); } });
    return best;
  }
  updateHint() {
    if (this.busy) { this.hint.setVisible(false); return; }
    const t = this.findTarget();
    if (!t) { this.hint.setVisible(false); return; }
    const sp = t.kind === 'npc' ? t.ref.spr : t.ref.spr;
    this.hint.setVisible(true).setPosition(sp.x + (t.kind === 'prop' ? t.ref.spr.width / 2 : 0), sp.y - (t.kind === 'npc' ? 22 : t.ref.spr.height + 2));
    this.hint.setText(t.kind === 'npc' && Q.offerableBy(t.ref.id).length ? '!' : '•');
    this.hint.y += Math.sin(this.time.now / 160) * 1.2;
  }

  async onA() {
    initAudio(); resumeAudio();
    if (this.busy || this.transitioning || !this.player || UI.panelOpen() || UI.dialogueOpen()) return;
    const t = this.findTarget(); if (!t) return;
    this.busy = true; this.player.play(`${this.playerKey}_idle${this.player.dir}`);
    try {
      if (t.kind === 'npc') await this.talkNpc(t.ref); else await this.useProp(t.ref);
    } finally { this.busy = false; }
    await this.flushRewards();
  }

  faceTowards(n) { const p = this.player; const dx = p.x - n.spr.x, dy = p.y - n.spr.y; const d = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 3 : 2) : (dy < 0 ? 0 : 1); n.spr.play(`${n.key}_idle${d}`); }

  async talkNpc(n) {
    this.faceTowards(n); S.state.stats.talks++; sfx('tap');
    const id = n.id;
    if (n.entry?.call) { await this.startMission(); return; }
    if (n.entry?.gives) { await this.giveFromProp({ id: n.entry.uid || n.id, gives: n.entry.gives, givesText: n.entry.givesText, emptyText: n.entry.emptyText }); this.afterQuestChange(); return; }
    // 1. an active step that talks to this NPC / plays a mini-game with them
    let m = Q.matchStep('talk', id);
    if (m) { await UI.say(m.step.lines || [{ who: id, text: STR.world.thanks }]); Q.completeStep(m.quest.id); return this.afterQuestChange(); }
    m = Q.matchStep('minigame', id);
    if (m) { await this.runMinigameStep(m); return; }
    // 2. quest offer
    const offers = Q.offerableBy(id);
    if (offers.length) {
      const q = offers[0];
      await UI.say(q.offer);
      // ask
      const ok = await this.confirmDialog(id, STR.world.takeQuest(tpl(q.title)));
      if (ok) { Q.startQuest(q.id); sfx('pickup'); } else await UI.say([{ who: id, text: STR.world.noProblem }]);
      return this.afterQuestChange();
    }
    // 3. small talk: a random phrase (never the same twice in a row)
    const entry = (n.def.dialogues || []).find((d) => check(d.when));
    if (entry) await UI.runDialogue(entry.id);
    else if (n.def.phrases?.length) {
      const pool = n.def.phrases.map((p) => (typeof p === 'string' ? { text: p } : p)).filter((p) => check(p.when));
      let pick; for (let i = 0; i < 6; i++) { pick = pool[(Math.random() * pool.length) | 0]; if (pick.text !== this.lastPhrase?.[id]) break; }
      (this.lastPhrase ||= {})[id] = pick.text;
      await UI.say([{ who: id, text: pick.text }]);
    }
    if (n.def.shop && !entry) UI.openShop(n.def.shop);
    this.afterQuestChange();
  }

  confirmDialog(who, text) {
    // use the dialogue engine with two choices
    const id = '__confirm_' + Math.random().toString(36).slice(2);
    content.dialogues[id] = { start: { who, text, choices: [ { text: STR.world.yes, next: 'yes' }, { text: STR.world.later, next: 'no' } ] }, yes: { who: 'narrator', text: '', effects: [ { type: 'flag', key: id + '_y' } ] }, no: { who: 'narrator', text: '' } };
    return UI.runDialogue(id).then(() => { const ok = !!getFlag(id + '_y'); delete S.state.flags[id + '_y']; delete content.dialogues[id]; return ok; });
  }

  async runMinigameStep(m) {
    const { quest, step } = m;
    if (step.lines) await UI.say(step.lines);
    const won = await playMinigame(step.game, step.config || {}, tpl(quest.title));
    if (won) { UI.queueToast(STR.world.success); Q.completeStep(quest.id); } else { await UI.say([{ who: 'narrator', text: STR.world.tryAgain }]); }
    this.afterQuestChange();
  }

  async useProp(r) {
    const p = r.p;
    if (await this.propAction(p)) return;
    const m = Q.matchStep('minigame', p.id);                    // mini-game step bound to this prop (e.g. the stove)
    if (m) { await this.runMinigameStep(m); return; }
    const im = Q.matchStep('interact', p.id);
    if (im) { await this.runInteractStep(im); this.afterQuestChange(); return; }
    if (p.gives) { await this.giveFromProp(p); this.afterQuestChange(); return; }
    if (p.ability && p.flag && getFlag(p.flag) && p.id !== 'broken_fence') { await UI.say([{ who: 'narrator', text: STR.world.alreadyFixed }]); return; }
    if (p.interact?.dialogue) await UI.runDialogue(p.interact.dialogue);
    this.afterQuestChange();
  }

  afterQuestChange() { this.refreshPickups(); this.refreshProps(); UI.refreshHud(); }

  async flushRewards() {
    const was = this.busy; this.busy = true;
    while (this.pendingRewards.length) {
      const { quest, gained } = this.pendingRewards.shift();
      const lines = [quest.title];
      if (gained.coins) lines.push(STR.coinsGot(gained.coins));
      if (gained.xp) lines.push(STR.xpGot(gained.xp));
      gained.items.forEach((id) => lines.push(STR.world.itemLine(content.items[id]?.name || id)));
      if (gained.shard) lines.push('', STR.world.shardLine(gained.shard.title), gained.shard.story);
      sfx(gained.shard ? 'shard' : 'win');
      await new Promise((res) => UI.showReward(gained.shard ? STR.world.shardRestored : STR.world.questComplete, lines, res));
      if (quest.scene && this.inStoryMap(quest)) this.exitStory();
      if (gained.shard && S.state.shards.length >= content.config.finalShards) await UI.say([{ who: 'narrator', text: STR.world.allShards }]);
    }
    this.busy = was;
    this.afterQuestChange();
  }

  // ------------------------------------------------------------------ abilities
  /** Makes the ability button glow (with a short hint) whenever the ability can do something useful right here. */
  updateAbilityHint() {
    const ch = content.characters[S.state.activeChar], type = ch?.ability?.type, p = this.player; let hint = null;
    if (p && !this.busy && type) {
      if (type === 'fix') { for (const r of this.props || []) if (r.p.ability === 'fix' && !getFlag(r.p.flag) && !r.hidden && Math.hypot(r.p.x * TILE + 8 - p.x, (r.p.y + 1) * TILE - 8 - p.y) < 56) hint = STR.ability.fix; }
      if (type === 'sniff') { for (const pk of this.pickups || []) if (pk.p.hidden && pk.spr.alpha < 0.2 && Math.hypot(pk.spr.x - p.x, pk.spr.y - p.y) < 150) hint = STR.ability.sniff; }
      if (type === 'charm') { for (const n of this.npcs || []) if (!getFlag('charm_' + n.id) && n.def.phrases && Math.hypot(n.spr.x - p.x, n.spr.y - p.y) < 46) hint = STR.ability.charm; }
      if (type === 'dash' && this.timer) hint = STR.ability.dash;
      if (this.abilityCd > 0) hint = null;
    }
    UI.setAbilityHint(hint ? `${hint} (${ch.ability.name})` : null);
  }

  useAbility() {
    initAudio(); resumeAudio();
    if (this.busy || this.transitioning || !this.player || UI.panelOpen() || UI.dialogueOpen()) return;
    const ch = content.characters[S.state.activeChar], ab = ch.ability;
    if (this.abilityCd > 0) { UI.toast(STR.world.recharging, 900); sfx('bad'); return; }
    const total = ab.cooldown * (1 - bonus().cooldownPct / 100);
    this.abilityCd = total; this.abilityTotal = total;
    S.state.stats.abilityUses++; sfx('ability');
    const p = this.player;
    this.ring(p.x, p.y - 6);
    switch (ab.type) {
      case 'dash': this.dashT = 2.2; UI.toast(STR.world.turbo, 800); break;
      case 'sniff': this.sniffT = 6; UI.toast(STR.world.sniff, 1400); break;
      case 'charm': this.charm(); break;
      case 'fix': this.fix(); break;
      default: break;
    }
    setFlag('ability_used');
  }
  ring(x, y) {
    const c = this.add.circle(x, y, 4, 0xffffff, 0.0).setStrokeStyle(2, 0xffd23f).setDepth(99998);
    this.tmp.push(c);
    this.tweens.add({ targets: c, radius: 34, alpha: 0, duration: 450, onComplete: () => c.destroy() });
  }
  charm() {
    const p = this.player; let got = false;
    for (const n of this.npcs) {
      if (Math.hypot(n.spr.x - p.x, n.spr.y - p.y) > 48) continue;
      const k = 'charm_' + n.id; got = true;
      const heart = this.add.text(n.spr.x, n.spr.y - 24, '♥', { fontFamily: 'monospace', fontSize: '10px', color: '#ff5d73', stroke: '#0d0720', strokeThickness: 2, resolution: 3 }).setOrigin(0.5).setDepth(99999);
      this.tweens.add({ targets: heart, y: heart.y - 12, alpha: 0, duration: 900, onComplete: () => heart.destroy() });
      if (!getFlag(k)) { setFlag(k); addCoins(5); UI.queueToast(STR.world.charmed(n.def.name)); sfx('coin'); }
      else UI.queueToast(STR.world.charmedAlready(n.def.name), 1200);
    }
    if (!got) UI.toast(STR.world.nobodyCharm, 1200);
  }
  fix() {
    const p = this.player; let done = false;
    for (const r of this.props) {
      if (!r.p.ability || r.p.ability !== 'fix' || getFlag(r.p.flag)) continue;
      const f = r.p.fp, cx = r.p.x * TILE + (f.fw * TILE) / 2, cy = (r.p.y + 1) * TILE - 8;
      if (Math.hypot(cx - p.x, cy - p.y) > 40) continue;
      setFlag(r.p.flag); done = true; sfx('win'); UI.queueToast(STR.world.fixed);
      if (r.p.reward) { if (r.p.reward.coins) { addCoins(r.p.reward.coins); UI.queueToast(STR.coinsGot(r.p.reward.coins)); } if (r.p.reward.xp) addXp(r.p.reward.xp); }
      const m = Q.matchStep('use', r.p.id, 'fix'); if (m) { Q.completeStep(m.quest.id); }
      this.afterQuestChange(); this.flushRewards();
    }
    if (!done) UI.toast(STR.world.nothingFix, 1200);
  }
  updateAbilityButton() {
    const cd = document.querySelector('#btnB .cd'); if (!cd) return;
    const frac = this.abilityCd > 0 ? this.abilityCd / (this.abilityTotal || 1) : 0;
    cd.style.clipPath = `inset(${(1 - frac) * 100}% 0 0 0)`;
  }

  refreshPlayerLook() {
    if (!this.player) return;
    if (this.lastChar && this.lastChar !== S.state.activeChar) { this.lastChar = S.state.activeChar; this.loadMap(S.state.map, S.state.x, S.state.y, this.player.dir); return; }
    this.lastChar = S.state.activeChar;
    const look = equippedLook(S.state.activeChar);
    this.playerKey = characterTexture(this, 'p_' + S.state.activeChar + '_' + JSON.stringify(look), look);
    this.player.setTexture(this.playerKey, 0);
    this.player.play(`${this.playerKey}_idle${this.player.dir}`);
    UI.refreshHud();
  }
}

Object.assign(World.prototype, storyMethods);
function nameOf(id) { return content.characters[id]?.name || ''; }
