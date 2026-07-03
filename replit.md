# مركز سرعة انجاز للخدمات — Web Browser App

تطبيق Flask متكامل لإدارة حسابات تيليجرام، المساعد الذكي، نظام البطاقات، ومنسق الملفات الأكاديمية.

## Run & Operate

- `python main.py` — تشغيل التطبيق (المنفذ 5000)
- Workflow: **Flask App** (يعمل تلقائياً)

## Stack

- Python 3.11
- Flask 3.1.3 + Flask-SocketIO 5.6.1
- Telethon 1.43.2 (Telegram API)
- Groq AI API
- python-pptx, pdfplumber, PyMuPDF (معالجة الملفات)
- gevent (async mode)

## Where things live

- `app.py` — التطبيق الرئيسي (15,000+ سطر)
- `auth.py` — نظام تسجيل الدخول وإدارة جلسات تيليجرام
- `main.py` — نقطة التشغيل
- `templates/` — قوالب HTML
- `static/` — ملفات JS والأيقونات
- `data/` — بيانات JSON (البطاقات، الإشعارات، الروابط)
- `sessions/` — بيانات جلسات المستخدمين
- `pptx_app/outputs/` — مخرجات العروض التقديمية

## Architecture decisions

- Telegram API ID/Hash مضمنة مباشرةً في `auth.py`
- جلسات تيليجرام تُحفظ في `sessions/` محلياً أو `/tmp/sessions` على Render
- SocketIO في وضع threading (وليس gevent) لتجنب تعارض asyncio
- SESSION_SECRET من متغيرات البيئة (مطلوب)
- GitHub sync اختياري (GITHUB_TOKEN + GITHUB_REPO + GITHUB_BRANCH)

## Product

- ① إرسال رسائل مجدولة/فوري عبر حسابات تيليجرام متعددة
- ② مراقبة كلمات مفتاحية في المجموعات والإرسال التلقائي
- ③ بوت تعلم ذكي باستخدام Groq AI
- ④ منشئ عروض PPTX من نص
- ⑤ تحويل PDF/DOCX/Excel
- ⑥ نظام بطاقات تفعيل مع لوحة إدارة
- ⑦ إشعارات Web Push
- ⑧ حفظ تلقائي للجلسات على GitHub

## User preferences

_لا توجد تفضيلات مسجلة بعد._

## Gotchas

- GROQ_API_KEY مطلوب لميزات الذكاء الاصطناعي (اختياري لباقي الميزات)
- GITHUB_TOKEN مطلوب للمزامنة التلقائية مع GitHub (اختياري)
- SESSION_SECRET مطلوب دائماً (موجود في secrets)
- لا تغيّر PORT — التطبيق يستخدم 5000 افتراضياً

## Pointers

- مصدر المستودع: https://github.com/anwer1230/Web-browser
- `env.example` يحتوي على قائمة جميع متغيرات البيئة المطلوبة
