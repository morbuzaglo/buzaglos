# בוזגלו (BUZAGLOS) – אלבום המשפחה השבור

משחק הרפתקאות פיקסלים בעברית, מבוסס על המשפחה. Phaser 3 + Vite, PWA (אפשר להוסיף למסך הבית באייפון), נפרס ל-GitHub Pages.

## מבנה
| נתיב | תפקיד |
|---|---|
| `content/*.json` | **כל תוכן המשחק**: דמויות, קרובים, משימות, דיאלוגים, מפות, חנות, הישגים |
| `src/` | מנוע המשחק (סצנה, ממשק, אמנות פיקסלים מצוירת בקוד, מוזיקה ואפקטים מסונתזים) |
| `admin/` + `src/admin/` | **סטודיו הניהול** (`/admin/`): עריכת משפחה, סיפורים עם AI, כלכלה, מפות, פרסום |
| `worker/` | שרת Cloudflare Worker: סיסמת מנהל, מפתח AI, טוקן GitHub, שמירות ענן. **סודות נמצאים רק כאן** |
| `.github/workflows/deploy.yml` | בנייה ופריסה אוטומטית ל-GitHub Pages בכל דחיפה ל-`main` |
| `tools/` | כלי בדיקה (`validate_content.mjs`, דפדפן headless, יצירת מפות ואייקונים) |

## הרצה מקומית
```
npm install
npm run dev          # http://localhost:5173  (משחק)   http://localhost:5173/admin/  (סטודיו)
npm run build        # dist/
node tools/validate_content.mjs   # בדיקת תקינות התוכן
node worker/test.mjs              # בדיקות השרת (ללא רשת)
```

## פריסה (פעם אחת)
### 1. GitHub Pages
1. ליצור מאגר ב-GitHub (למשל `buzaglos`) ולדחוף אליו את התיקייה (`git remote add origin ...`, `git push -u origin main`).
2. ב-GitHub: **Settings → Pages → Source: GitHub Actions**.
3. אחרי הדחיפה הראשונה ה-Action יבנה ויפרוס. הכתובת: `https://<משתמש>.github.io/<מאגר>/` ; סטודיו הניהול: `.../admin/`.
4. באייפון: Safari → שיתוף → **הוספה למסך הבית**.

### 2. השרת (Cloudflare Worker, חינמי) – נדרש ל-AI, פרסום אוטומטי ושמירות ענן
```
cd worker
npx wrangler login
npx wrangler kv namespace create SAVES          # להעתיק את ה-id ל-wrangler.toml
# לערוך ב-wrangler.toml: GITHUB_REPO, ALLOWED_ORIGIN (https://<משתמש>.github.io)
npx wrangler secret put ADMIN_PASSWORD          # סיסמת הסטודיו
npx wrangler secret put SESSION_SECRET          # מחרוזת אקראית ארוכה
npx wrangler secret put ANTHROPIC_API_KEY       # מפתח Claude API
npx wrangler secret put GITHUB_TOKEN            # טוקן fine-grained: Contents = Read and write, למאגר הזה בלבד
npx wrangler deploy
```
אחרי הפריסה: להעתיק את כתובת ה-Worker ל-`content/config.json` בשדה `apiUrl` (מפעיל שמירה בענן במשחק), ולהכניס אותה גם במסך ההתחברות של הסטודיו.

### 3. שימוש
- **סטודיו → משפחה**: עריכת שמות, אישיות, יכולת, מראה. העלאת תמונה → מראה פיקסלים (התמונה אינה נשמרת ואינה מתפרסמת).
- **סיפורים**: כותבים מה קרה → "יצירה עם AI" → תצוגה מקדימה → עריכה → אישור → טיוטה.
- **פרסום**: בדיקת תקינות → "פרסום למשחק" (commit ל-GitHub, הפריסה מתעדכנת תוך ~2 דקות).
- בלי שרת (מצב מקומי): עורכים, מורידים את הקבצים ששונו ומעתיקים ל-`content/`.

## אבטחה ופרטיות
- אין סיסמאות או מפתחות בקוד הלקוח; הכול ב-Secrets של ה-Worker. ה-Worker מאמת סשן חתום (HMAC), מגביל קצב, ומאפשר CORS רק מהאתר שלכם.
- כל תוכן שנוצר ב-AI עובר אימות (`src/shared/validate.js`) לפני שהוא נכנס למשחק – גם בדפדפן וגם בשרת.
- **הכתובת ציבורית**: כל מה שבתיקיית `content/` קריא לכל מי שיש לו את הקישור. מפרסמים שמות פרטיים בלבד ללא גילאים, ותמונות מקור לא מתפרסמות.

## הוספת דמויות/סיפורים ידנית
ראו `DESIGN.md`. תבנית מגדר בטקסט: `{f:תוכלי|m:תוכל}` (נבחרת לפי מגדר הדמות שמשחקים), `{name}` לשם הדמות.
