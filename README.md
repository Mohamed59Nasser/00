# Broker Data Sheet

تطبيق Next.js 16 + React 19 + TypeScript لإدارة عملاء الوساطة العقارية، مع تسجيل دخول وصلاحيات على الخادم، وتخزين العملاء في Google Sheet أو PostgreSQL محليًا، وتصدير Excel.

## الشيت الحالي

**Real Estate Data:** https://docs.google.com/spreadsheets/d/14u23WYNh2OTwBk-5AgNj5nOSGpDUMhSIE_aOzgF7-do/edit?usp=drivesdk

يجب الحفاظ على هذا الملف وعلى تبويباته الثلاثة في نفس الملف:

- `ALL`: بيانات العملاء، 26 عمودًا، وتشمل المالك الحالي `Assigned To` وحقول الإنشاء والتعديل والإسناد.
- `SEARCH`: نتائج مشتقة بصيغ من `ALL`.
- `USERS`: بيانات الموظفين غير السرية فقط، ولا يحتوي على كلمة مرور أو hash أو مفتاح خاص أو جلسة.

الـ migration الموجود في `db/migrations/001_rbac.sql` إضافي ولا يحذف سجلات العملاء الموجودة.

## الصلاحيات

| الدور | النطاق |
| --- | --- |
| Agent | إضافة عميل لنفسه، وتعديل عملائه المعينين له فقط؛ لا حذف ولا نقل ولا إدارة موظفين. |
| Senior / Team Leader | نفس الصلاحيات داخل فريقه: إضافة Agents، إدارة عملاء الفريق، ونقلهم داخل الفريق فقط. |
| Admin | كل الفرق والأدوار، النقل، وإدارة الموظفين، وهو الوحيد الذي يستطيع حذف بيانات العملاء. |

كل عمليات القراءة والتعديل والحذف والنقل وفحص التكرار محمية في API على الخادم، وليست مجرد إخفاء أزرار في الواجهة. فحص التكرار يتم على الهاتف **أو** البريد الإلكتروني في كل العملاء، ويُظهر معلومات ملكية محدودة مع إخفاء بيانات الاتصال.

## التشغيل المحلي

1. ثبّت Node.js 20 أو أحدث، ثم نفّذ `npm ci`.
2. انسخ `.env.example` إلى `.env.local` واملأ القيم. لا ترفع `.env.local` إلى Git.
3. طبّق migration على PostgreSQL (مرة واحدة):

   ```bash
   psql "$DATABASE_URL" -f db/migrations/001_rbac.sql
   ```

   أو الصق محتواه في Supabase SQL Editor. تم تطبيقه بالفعل على مشروع Supabase الحالي.
4. أنشئ حساب Admin الأول مرة واحدة. يطلب السكربت الباسورد من متغير مؤقت، ويحفظ bcrypt hash فقط؛ لا يطبع الباسورد ولا يكتبه في أي ملف:

   ```bash
   export DATABASE_URL='ضع رابط قاعدة البيانات هنا'
   read -rsp 'Initial Admin password: ' ADMIN_INITIAL_PASSWORD; echo
   export ADMIN_INITIAL_PASSWORD
   npm run bootstrap:admin
   unset ADMIN_INITIAL_PASSWORD
   ```

   بيانات الحساب الثابتة هي: الاسم `Mohamed Nasser`، الهاتف `01156426501`، والبريد `mohamednasser555999@gmail.com`. يجب أن يكون الباسورد من 10 إلى 128 حرفًا ويحتوي على حرف ورقم. أول تسجيل دخول يفرض تغييره. إعادة تشغيل السكربت بعد إنشاء الحساب لا تغيّر الباسورد.
5. شغّل `npm run dev`.

## ربط Google Sheets

إنشاء حساب الخدمة خطوة يدوية من Google Cloud ولا يمكن للتطبيق إنشاؤه نيابة عنك:

1. أنشئ مشروعًا أو استخدم مشروعًا مجانيًا في Google Cloud، وفعّل **Google Sheets API**.
2. أنشئ **Service Account** ومفتاح JSON، ثم انسخ `client_email` فقط للمشاركة.
3. شارك الشيت الحالي مع هذا البريد بصلاحية **Editor**. لا تنشئ Sheet جديدًا.
4. ضع `GOOGLE_SHEET_ID` و`GOOGLE_SERVICE_ACCOUNT_EMAIL` و`GOOGLE_PRIVATE_KEY` في إعدادات الخادم، أو استخدم `GOOGLE_SERVICE_ACCOUNT_JSON` في مدير الأسرار. المفتاح الخاص سرّي ولا يوضع في Sheet أو GitHub أو المتصفح.

بيانات الحساب والجلسات تبقى في PostgreSQL حتى عندما يكون العملاء في Google Sheets. عند غياب إعدادات Google يستخدم التطبيق PostgreSQL كمخزن محلي للعملاء.

## النشر على Vercel مجانًا

- اربط مستودع GitHub بمشروع Vercel وانشر branch المطلوب كتطبيق Next.js على المسار الجذري. اترك `NEXT_PUBLIC_BASE_PATH` فارغًا؛ ويمكن ضبطه على `/00` فقط إذا كان النشر يحتاج هذا البادئة.
- أضف `DATABASE_URL` و`GOOGLE_SHEET_ID` و`GOOGLE_SERVICE_ACCOUNT_EMAIL` و`GOOGLE_PRIVATE_KEY` (أو JSON) كـ **Server Environment Variables**. لا تضف أي مفاتيح إلى متغيرات `NEXT_PUBLIC_*`.
- نفّذ bootstrap من جهازك باستخدام `DATABASE_URL` الخاص بالإنتاج، ثم احذف متغير الباسورد المؤقت. لا حاجة لإضافة `ADMIN_INITIAL_PASSWORD` إلى Vercel.
- تأكد من مشاركة الشيت مع بريد حساب الخدمة قبل اختبار الإضافة والتعديل.
- خطة Vercel المجانية لا تضمن خادمًا دائم التشغيل، وتخضع Serverless Functions لحدود التنفيذ والطلبات. كذلك تخضع Google Sheets وSupabase لحصص وحدود الخطط المجانية، وقد تتوقف قاعدة Supabase المجانية مؤقتًا حسب سياسة عدم النشاط الحالية. لا يحتاج الحل إلى ترقية مدفوعة للعمل الأساسي.

## التحقق

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

لا تضع أسرار الإنتاج في الأوامر التي قد تُحفظ في shell history، ولا في GitHub أو Google Sheets أو رسائل غير مشفرة.
