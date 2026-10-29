// Hebrew UI strings + gender templating.
// Story text can address the player in the right grammatical gender with {f:אתה-נקבה|m:אתה-זכר},
// e.g. "{f:תוכלי|m:תוכל} לעזור?". The gender comes from the active character (characters.json "gender").
import { content } from './content.js';
import { S } from './state.js';

export function tpl(text) {
  if (text == null) return '';
  const ch = content.characters[S.state.activeChar];
  const g = ch?.gender === 'f' ? 'f' : 'm';
  return String(text)
    .replace(/\{f:([^|}]*)\|m:([^}]*)\}/g, (_, f, m) => (g === 'f' ? f : m))
    .replace(/\{m:([^|}]*)\|f:([^}]*)\}/g, (_, m, f) => (g === 'f' ? f : m))
    .replace(/\{name\}/g, ch?.name || '');
}

export const STR = {
  menu: 'תפריט', lvl: 'רמה',
  explore: 'לחקור! מדברים עם קרובי משפחה כדי לקבל סיפורים חדשים.', goAttic: 'לעלות לעליית הגג!',
  coinsGot: (n) => `${n >= 0 ? '+' : ''}${n} מטבעות`, xpGot: (n) => `+${n} ניסיון`, gotItem: (n) => `התקבל: ${n}`,
  tabs: { family: 'משפחה', quests: 'משימות', bag: 'תיק', album: 'אלבום', awards: 'פרסים', more: 'עוד' },
  family: { choose: 'בחרו גיבור.', chooseSub: 'לכל בן משפחה יש יכולת ייחודית (כפתור B), חוזקה וחולשה. חלק מהמשימות דורשות יכולת מסוימת!', playAs: 'לשחק', active: 'פעיל', ability: 'יכולת', strength: 'חוזקה', weakness: 'חולשה', nowPlaying: (n) => `עכשיו משחקים: ${n}` },
  quests: { none: 'אין משימות פעילות.', noneSub: 'מדברים עם קרובי משפחה וחברים כדי לקבל סיפורים חדשים!', tip: 'טיפ', done: 'הושלמו' },
  bag: { coins: 'מטבעות', level: 'רמה', empty: 'התיק ריק.', use: 'שימוש', used: (n) => `נעשה שימוש: ${n}`, outfits: 'לבוש', defaultLook: 'המראה הרגיל', wear: 'ללבוש', worn: 'לבוש', upgrades: 'שדרוגים' },
  album: { title: 'אלבום המשפחה', restored: (a, b) => `רסיסי זיכרון ששוחזרו: ${a} מתוך ${b}`, hint: (n) => `רמז: שלב ${n}.` },
  awards: { reward: (n) => `פרס: ${n} מטבעות` },
  settings: { music: 'מוזיקה', sfx: 'אפקטים', on: 'פועל', off: 'כבוי', stats: 'סטטיסטיקה', statsLine: (s) => `צעדים ${s.steps} | שיחות ${s.talks} | משחקונים ${s.minigames} | שימוש ביכולות ${s.abilityUses}`,
    cloud: { title: 'שמירה בענן (בין מכשירים)', help: 'בוחרים קוד משפחתי (8 תווים לפחות, אותיות באנגלית וספרות) ומשתמשים באותו קוד בכל מכשיר.', code: 'קוד משפחתי', save: 'שמירה לענן', load: 'טעינה מהענן', saved: 'נשמר בענן!', loaded: 'נטען מהענן!', fail: 'הפעולה נכשלה. בדקו את הקוד והחיבור.', badCode: 'הקוד חייב להיות באורך 8 תווים לפחות (אותיות באנגלית, ספרות, - או _)' },
    restart: (n) => `להתחיל מחדש את ${n} (מוחק את ההתקדמות)`, restartAsk: 'למחוק את ההתקדמות של הדמות הזו ולהתחיל מההתחלה?',
    saveTitle: 'שמירה והעברה', saveHelp: 'ההתקדמות נשמרת אוטומטית במכשיר הזה. כדי להמשיך במכשיר אחר, מעתיקים את הקוד ומדביקים אותו שם.',
    paste: 'מדביקים כאן קוד שמירה לייבוא', showCode: 'הצגת הקוד שלי', import: 'ייבוא', imported: 'ההתקדמות יובאה!', overwrite: (n) => `קיימת כבר התקדמות שמורה של ${n}. להחליף אותה?`, badCode: 'הקוד אינו תקין', backTitle: 'חזרה למסך הפתיחה' },
  mission: { level: (n, t) => `שלב ${n}: ${t}`, go: 'יוצאים!', calls: (n, g) => (g === 'f' ? `${n} קוראת לך! עוקבים אחרי החץ.` : `${n} קורא לך! עוקבים אחרי החץ.`), resume: 'ברוכים השבים! נמשיך מאיפה שעצרנו.', hint: 'עוקבים אחרי החץ אל מי שמסומן בסימן קריאה.', toHome: 'חזרה הביתה', arrowCall: 'משימה', allDone: 'כל ההרפתקאות הושלמו! לכו לעליית הגג.' },
  ability: { fix: 'לחצו B לתיקון!', sniff: 'לחצו B לגילוי חפצים נסתרים!', charm: 'לחצו B כדי לקבל טיפ!', dash: 'לחצו B לריצה מהירה!', tutorial: (n, d) => `לכל אחד במשפחה יש יכולת מיוחדת בכפתור B. אצלכם: ${n}. ${d} הכפתור מנצנץ כשאפשר להשתמש בה.` },
  stories: { title: 'שלבים', help: '', enter: 'להיכנס', resume: 'להמשיך', replay: 'לשחק שוב', exitAsk: 'לצאת מהשלב? ההתקדמות נשמרת.', stay: 'להישאר', leave: 'לצאת', failTimer: 'נגמר הזמן! מתחילים שוב.' },
  shop: { title: 'חנות', coins: (n) => `מטבעות: ${n}`, owned: 'ברשותך' },
  common: { cont: 'המשך', close: 'סגירה' },
  title: { who: 'מי אתם במשפחה?', pickHelp: 'ההתקדמות נשמרת לכל דמות בנפרד, ונמשכת בדיוק מאותו מקום.', progress: (a, b) => `רסיסים ${a}/${b}`, newTag: 'חדש', confirmPick: (n) => `לשחק בתור ${n}? אי אפשר להחליף דמות באמצע המשחק.`, shards: (a, b) => `רסיסים: ${a} מתוך ${b}`, cont: 'המשך', newGame: 'משחק חדש', confirmNew: 'להתחיל מחדש? ההתקדמות השמורה תוחלף.', tip: 'טיפ: מוסיפים למסך הבית (שיתוף ← הוספה למסך הבית) כדי לשחק במסך מלא, כמו אפליקציה.' },
  ending: { end: 'סוף', l1: 'כל אלבום המשפחה שוחזר!', l2: (l, c) => `רמה ${l}  |  ${c} מטבעות`, l3: 'תודה ששיחקתם!' },
  ev: { levelUp: (n) => `עלייה ברמה! עכשיו רמה ${n}`, achievement: (t) => `★ הישג: ${t}`, newQuest: (t) => `משימה חדשה: ${t}`, newHero: (n) => `גיבור חדש נפתח: ${n}` },
  world: {
    alreadyFixed: 'כבר מתוקן, כמו חדש!',
    tryAgain2: 'לא בדיוק. אפשר לנסות שוב.', nothingMore: 'אין כאן עוד כלום.',
    success: 'הצלחה!', tryAgain: 'לא הפעם. מדברים שוב כדי לנסות שוב!', recharging: 'היכולת בטעינה...', turbo: 'טורבו!', sniff: 'מרגישים דברים נסתרים בסביבה...',
    nobodyCharm: 'אין אף אחד מספיק קרוב.', charmed: (n) => `טיפ של ${n}: +5 מטבעות!`, charmedAlready: (n) => `כבר קיבלנו טיפ מ${n}.`, nothingFix: 'אין כאן מה לתקן.', fixed: 'תוקן!', found: (n) => `נמצא: ${n}`,
    takeQuest: (t) => `לצאת למשימה ״${t}״?`, yes: 'כן, יוצאים לדרך!', later: 'אולי אחר כך', noProblem: 'אין בעיה. אפשר לחזור מתי שרוצים.', thanks: 'תודה על העזרה!',
    questComplete: 'המשימה הושלמה!', shardRestored: 'רסיס זיכרון שוחזר!', itemLine: (n) => `פריט: ${n}`, shardLine: (t) => `◆ רסיס זיכרון שוחזר: ${t}`,
    allShards: 'כל הרסיסים נמצאו! הדלת בעליית הגג בבית זוהרת...', locked: 'נעול.',
  },
  mg: {
    watch: 'מסתכלים בקפידה...', repeat: 'עכשיו חוזרים על הסדר!', wrong: 'לא בדיוק. מתחילים מההתחלה.',
    round: (a, b) => `סיבוב ${a}/${b}`, lives: 'חיים', stop: 'עצור!', perfect: 'מושלם!', burnt: 'נשרף! אפשר לנסות שוב.', crashed: 'התנגשת! אפשר לנסות שוב.', slip: 'לא הצלחנו! אפשר לנסות שוב.', giveUp: 'לוותר', match: 'מתאימים זוגות!',
    moves: (n) => `הסתיים ב-${n} מהלכים!`, hits: 'פגיעות', time: 'זמן', awesome: 'מעולה!', timeUp: 'נגמר הזמן!', question: (a, b) => `שאלה ${a}/${b}`, correct: (a, b) => `${a}/${b} תשובות נכונות`,
  },
  buy: { notForSale: 'לא למכירה', owned: 'כבר ברשותך', noCoins: 'אין מספיק מטבעות', bought: (n) => `נקנה: ${n}` },
};
