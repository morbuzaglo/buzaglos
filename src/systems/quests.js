// Quest engine: offers, step matching, completion and rewards. Logic only (no DOM, no Phaser).
import { content } from '../content.js';
import { S, emit, check, addCoins, addXp, addItem, removeItem, itemCount, setFlag, saveGame } from '../state.js';

export const allQuests = () => Object.values(content.quests);
const qs = () => S.state.quests;

export function questState(id) { return qs()[id]?.state || 'none'; }
export function currentStep(id) { const q = content.quests[id], st = qs()[id]; return q && st?.state === 'active' ? q.steps[st.step] : null; }
export function activeQuests() { return allQuests().filter((q) => qs()[q.id]?.state === 'active'); }

/** Quests an NPC can currently offer. */
export function offerableBy(npcId) {
  return allQuests().filter((q) => q.giver === npcId && !qs()[q.id] && check(q.requires) && (!q.char || q.char === S.state.activeChar));
}
export function startQuest(id) {
  if (qs()[id]) return;
  qs()[id] = { state: 'active', step: 0 };
  emit('questStarted', content.quests[id]);
  evaluate(); saveGame();
}

/** Active step that this interaction satisfies, or null. kind: 'talk' | 'minigame' | 'use'. */
export function matchStep(kind, targetId, abilityType) {
  for (const q of activeQuests()) {
    const step = currentStep(q.id);
    if (!step) continue;
    if (kind === 'talk' && step.type === 'talk' && step.npc === targetId) return { quest: q, step };
    if (kind === 'minigame' && step.type === 'minigame' && step.at === targetId) return { quest: q, step };
    if (kind === 'use' && step.type === 'use' && step.target === targetId && (!step.ability || step.ability === abilityType)) return { quest: q, step };
  }
  return null;
}

export function completeStep(qid) {
  const q = content.quests[qid], st = qs()[qid];
  if (!q || st?.state !== 'active') return;
  const step = q.steps[st.step];
  if (step?.consume) removeItem(step.consume, step.consumeCount || step.count || 1);
  if (step?.give) addItem(step.give, 1);
  st.step++;
  if (st.step >= q.steps.length) completeQuest(qid);
  else { emit('stepDone', { quest: q, next: q.steps[st.step] }); evaluate(); }
  saveGame();
}

export function completeQuest(qid) {
  const q = content.quests[qid], st = qs()[qid];
  st.state = 'done';
  const r = q.reward || {};
  const gained = { coins: r.coins ? addCoins(r.coins) : 0, xp: r.xp ? addXp(r.xp) : 0, items: [], shard: null };
  (r.items || []).forEach((id) => { addItem(id, 1); gained.items.push(id); });
  Object.entries(r.flags || {}).forEach(([k, v]) => setFlag(k, v));
  if (r.shard && !S.state.shards.includes(r.shard.id)) { S.state.shards.push(r.shard.id); gained.shard = r.shard; }
  emit('questDone', { quest: q, gained });
}

/** Auto-complete steps that complete themselves (collect). Call after item changes. */
export function evaluate() {
  let guard = 0, changed = true;
  while (changed && guard++ < 10) {
    changed = false;
    for (const q of activeQuests()) {
      const step = currentStep(q.id);
      if (step?.type === 'collect' && itemCount(step.item) >= (step.count || 1)) { completeStep(q.id); changed = true; break; }
    }
  }
}

/** goto steps: call with player position. */
export function checkGoto(map, tx, ty) {
  for (const q of activeQuests()) {
    const step = currentStep(q.id);
    if (step?.type === 'goto' && step.map === map && Math.hypot(tx - step.x, ty - step.y) <= (step.radius || 2)) { completeStep(q.id); return true; }
  }
  return false;
}

export function objective(qid) {
  const step = currentStep(qid); if (!step) return '';
  let t = step.text || '';
  if (step.type === 'collect') t += ` (${Math.min(itemCount(step.item), step.count || 1)}/${step.count || 1})`;
  const who = content.npcs[step.npc || step.at];
  if (who?.character && who.character === S.state.activeChar) t += ' (צריך להחליף לדמות אחרת בתפריט)';
  return t;
}
export function trackedQuest() { return activeQuests()[0] || null; }
export function isQuestItemWanted(itemId) {
  return activeQuests().some((q) => { const s = currentStep(q.id); return s?.type === 'collect' && s.item === itemId; });
}
