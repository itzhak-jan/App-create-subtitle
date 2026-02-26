# SubFlow - אפליקציית כתוביות אוטומטיות

<div dir="rtl">

## 📱 מה זה SubFlow?

SubFlow היא אפליקציית מובייל מתקדמת לאנדרואיד שמאפשרת לך:
- **לתמלל** סרטונים אוטומטית באמצעות OpenAI Whisper
- **לתרגם** כתוביות לעברית (ושפות נוספות) באמצעות Claude AI
- **להטמיע** כתוביות ישירות בתוך הסרטון (hardcode/burn-in)

## 🚀 התחלה מהירה

### דרישות מקדימות

1. **Node.js** גרסה 18 ומעלה
2. **npm** גרסה 9 ומעלה
3. **מפתח OpenAI API** - לתמלול באמצעות Whisper
4. **מפתח Claude API** - לתרגום הכתוביות

### התקנה

```bash
# שכפל את המאגר
git clone https://github.com/your-username/subflow.git
cd subflow

# התקן תלויות
npm install

# הכן את פרויקט האנדרואיד (נדרש פעם אחת)
npx expo prebuild --platform android

# הפעל בסימולטור / מכשיר
npx expo run:android
```

### קבלת מפתחות API

#### OpenAI API Key (לתמלול Whisper)
1. עבור ל-[platform.openai.com](https://platform.openai.com/api-keys)
2. צור חשבון או התחבר
3. לחץ על "Create new secret key"
4. העתק את המפתח (מתחיל ב-`sk-`)

#### Claude API Key (לתרגום)
1. עבור ל-[console.anthropic.com](https://console.anthropic.com/api-keys)
2. צור חשבון או התחבר
3. לחץ על "Create Key"
4. העתק את המפתח (מתחיל ב-`sk-ant-`)

> ⚠️ **אבטחה**: המפתחות מאוחסנים בצורה מוצפנת על המכשיר שלך בלבד, ולעולם לא נשלחים לשרתים חיצוניים.

## 🎯 אופן השימוש

1. **פתח את האפליקציה** ← הגדר את מפתחות ה-API בפעם הראשונה
2. **בחר סרטון** ← מהגלריה או מקבצי המכשיר
3. **בחר שפות** ← שפת מקור (זיהוי אוטומטי) ושפת יעד (ברירת מחדל: עברית)
4. **לחץ "התחל עיבוד"** ← האפליקציה תעבד ברקע
5. **קבל התראה** כשהסרטון מוכן
6. **צפה, שמור ושתף** את הסרטון עם הכתוביות

## 🔄 תהליך העיבוד

```
סרטון מקורי
    ↓
חילוץ שמע (FFmpeg)
    ↓
תמלול (OpenAI Whisper API)
    ↓
תרגום לעברית (Claude AI)
    ↓
הטמעת כתוביות (FFmpeg)
    ↓
סרטון עם כתוביות מוטמעות ✅
```

## 📋 דרישות טכניות

- **אנדרואיד**: גרסה 7.0 (API 24) ומעלה
- **חיבור אינטרנט**: נדרש לשלב התמלול והתרגום
- **שטח פנוי**: לפחות 500MB עבור קבצים זמניים

## ⚙️ הגדרות

### שפות נתמכות לתרגום
- 🇮🇱 עברית (ברירת מחדל)
- 🇺🇸 אנגלית
- 🇸🇦 ערבית
- 🇫🇷 צרפתית
- 🇩🇪 גרמנית
- 🇪🇸 ספרדית
- 🇷🇺 רוסית
- 🇨🇳 סינית
- 🇯🇵 יפנית
- 🇵🇹 פורטוגזית
- 🇮🇹 איטלקית
- 🇹🇷 טורקית

### שפות מקור
- זיהוי אוטומטי (מומלץ)
- כל שפה נתמכת מעל

## 🏗️ מבנה הפרויקט

```
src/
├── screens/
│   ├── HomeScreen.tsx        # מסך ראשי
│   ├── SetupScreen.tsx       # הגדרה ראשונית
│   ├── SettingsScreen.tsx    # הגדרות ומפתחות API
│   ├── HistoryScreen.tsx     # היסטוריית עיבודים
│   ├── ProcessingScreen.tsx  # מסך עיבוד פעיל
│   └── VideoPreviewScreen.tsx# תצוגת סרטון מוגמר
├── services/
│   ├── whisper.ts            # OpenAI Whisper API
│   ├── claude.ts             # Claude AI לתרגום
│   ├── ffmpeg.ts             # עיבוד וידאו/אודיו
│   ├── notifications.ts      # התראות מקומיות
│   ├── storage.ts            # אחסון מאובטח
│   └── subtitles.ts          # עיבוד קבצי SRT
├── components/
│   ├── ProgressBar.tsx       # מד התקדמות
│   ├── VideoCard.tsx         # כרטיסיית וידאו
│   └── LanguagePicker.tsx    # בוחר שפה
├── utils/
│   ├── srt-parser.ts         # ניתוח קבצי SRT
│   └── audio-chunker.ts      # פיצול קבצי אודיו
├── context/
│   └── ProcessingContext.tsx # ניהול מצב עיבוד
├── navigation/
│   └── RootNavigator.tsx     # ניווט
└── types/
    └── index.ts              # טיפוסי TypeScript
```

## 🔒 אבטחה

- מפתחות ה-API מאוחסנים ב-`expo-secure-store` (מוצפן)
- לעולם לא נכתבים בקוד
- לא נשלחים לשרתים חיצוניים (רק ל-OpenAI ו-Anthropic)
- ה-`.gitignore` מגן על כל הקבצים הרגישים

## 🛠️ CI/CD

האפליקציה מגיעה עם GitHub Actions לבניית APK אוטומטית:

- **דחיפה ל-`main`** → בנייה אוטומטית של APK
- **מיזוג Pull Request** → בנייה אוטומטית

קובץ ה-APK נשמר כ-artifact ב-GitHub Actions למשך 30 יום.

## 📦 בניית APK ידנית

```bash
# הכן את פרויקט האנדרואיד
npx expo prebuild --platform android

# בנה APK
cd android
./gradlew assembleRelease

# ה-APK יופיע ב:
# android/app/build/outputs/apk/release/app-release.apk
```

## 🐛 פתרון בעיות נפוצות

### שגיאה: "מפתח API אינו תקין"
- בדוק שהמפתח הועתק בשלמותו
- ודא שיש לך אשראי בחשבון ה-OpenAI/Anthropic

### שגיאה: "קובץ אודיו גדול מדי"
- האפליקציה תפצל אוטומטית קבצים מעל 25MB
- ודא שיש מספיק שטח פנוי

### שגיאה: "לא ניתן לגשת לגלריה"
- עבור להגדרות המכשיר
- אפשר גישה לאחסון עבור SubFlow

### עיבוד תקוע
- ניתן לבטל בכל שלב מכפתור "בטל עיבוד"
- אם האפליקציה נסגרת, העיבוד יופסק

## 📄 רישיון

MIT License - ראה קובץ LICENSE לפרטים.

---

*פותח עם ❤️ בישראל | Powered by OpenAI Whisper & Anthropic Claude*

</div>
