// Story scenes: each family story is its own playable scene (map + steps). Mixed into the World scene.
import { content } from '../content.js';
import { S, saveGame, addItem, removeItem, itemCount } from '../state.js';
import * as Q from '../systems/quests.js';
import * as UI from '../ui/ui.js';
import { playMinigame } from '../ui/minigames.js';
import { STR, tpl } from '../i18n.js';
import { sfx } from '../audio.js';

export const storyMethods = {
  /** Enter (or resume / replay) a story from the family album. */
  enterStory(qid) {
    const q = content.quests[qid]; if (!q?.scene) return;
    let st = S.state.quests[qid];
    if (st?.state === 'done') {                     // replay: no second reward
      S.state.quests[qid] = st = { state: 'active', step: 0, replay: true };
      this.clearStoryCollected(q);
    } else if (!st) Q.startQuest(qid);
    st = S.state.quests[qid];
    const where = st.at || q.scene;
    this.transitioning = false;
    this.changeMap(where.map, where.x, where.y);
    saveGame();
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
