// Bilingual copy for the Ostora Online O² download page.
// Arabic is the page's shipped language; English is a client-side toggle.
const translations = {
    ar: {
        "nav-screens": "أجهزتك",
        "nav-libraries": "المحتوى",
        "nav-features": "المميزات",
        "nav-download": "التحميل",
        "nav-back": "العودة لكارتوني",

        "hero-badge": "تطبيق واحد · ثلاث شاشات",
        "hero-title": "كل ما تشاهده، على كل شاشة عندك",
        "hero-subtitle": "الأسطورة أونلاين تطبيق أندرويد واحد يعمل على الهاتف والتابلت وتلفزيون أندرويد. مكتبة كارتوني كاملة مدمجة بداخله، مع البث المباشر وآلاف القنوات والإذاعات — مجاناً وبدون حساب.",
        "hero-cta-download": "تحميل APK مجاناً",
        "hero-cta-features": "شاهد كيف يعمل",
        "fact-size": "حجم التطبيق",
        "fact-os": "الحد الأدنى",
        "fact-version": "آخر إصدار",
        "fact-account-value": "بدون",
        "fact-account": "تسجيل حساب",

        "screens-title": "ملف APK واحد. لا نسخ متعددة.",
        "screens-subtitle": "نفس التطبيق يتعرف على جهازك ويعيد ترتيب نفسه له. حمّله مرة، وثبّته على كل ما تملك.",
        "screen-phone-title": "الهاتف",
        "screen-phone-desc": "شبكة من ثلاثة أعمدة، مشغّل عمودي أو أفقي، ونافذة عائمة تكمل المشاهدة أثناء تصفحك لتطبيق آخر.",
        "screen-tablet-title": "التابلت",
        "screen-tablet-desc": "تخطيط أوسع بخمسة أعمدة وشريط تنقل جانبي عند الدوران أفقياً — بدل تكبير واجهة هاتف على شاشة كبيرة.",
        "screen-tv-title": "تلفزيون أندرويد",
        "screen-tv-desc": "تنقل كامل بالريموت، أيقونة في قائمة تطبيقات التلفزيون، وتبديل القنوات بزرّي أعلى وأسفل مثل أي رسيفر.",

        "lib-title": "ثماني مكتبات داخل التطبيق",
        "lib-subtitle": "أرقام حقيقية من داخل الإصدار 1.1، لا تقديرات.",
        "lib-kartoney-note": "مدمجة داخل ملف التطبيق — تتصفحها فوراً بلا انتظار أي خادم",
        "lib-foot": "بحث عربي واحد يغطي 6,248 عنواناً عبر كل المكتبات — يتجاهل التشكيل وهمزات الألف ولا يهتم بترتيب الكلمات.",

        "features-title": "مبني للمشاهدة، لا للإزعاج",
        "features-subtitle": "كل ميزة هنا موجودة فعلاً في الإصدار الذي ستحمّله.",
        "feature-1-title": "لا فاصل إعلاني قبل التشغيل",
        "feature-1-desc": "التطبيق مجاني ومدعوم بالإعلانات، لكن لا يظهر أي إعلان بين ضغطك على العنوان وبدء البث. الفواصل تأتي في أوقات الانتظار فقط، ويمكنك إيقافها ساعتين مقابل مشاهدة فيديو واحد.",
        "feature-2-title": "ترجمة وسرعة تشغيل",
        "feature-2-desc": "اختيار الترجمة من داخل المشغّل بكل اللغات التي يوفرها المصدر، وسرعة تشغيل من 0.5× إلى 2×، وثلاثة أوضاع لملء الشاشة.",
        "feature-3-title": "نافذة عائمة",
        "feature-3-desc": "اسحب الفيديو للأسفل ليكمل في نافذة صغيرة داخل التطبيق، أو اخرج منه ليتابع في نافذة النظام العائمة فوق أي شاشة.",
        "feature-4-title": "مفضلة وإخفاء المعطّل",
        "feature-4-desc": "اضغط مطولاً على أي عنوان لتضيفه للمفضلة، أو للإبلاغ عنه كمعطّل فيختفي من كل الشاشات. أنت من يبني قائمتك.",
        "feature-5-title": "ودجت على الشاشة الرئيسية",
        "feature-5-desc": "مفضلتك في مربع على شاشة هاتفك، بصور الأغلفة. ضغطة واحدة تشغّل مباشرة بدون المرور بالتطبيق.",
        "feature-6-title": "بدون حساب ولا أذونات فضولية",
        "feature-6-desc": "لا تسجيل، ولا بريد، ولا وصول إلى جهات اتصالك أو موقعك. يرفض التطبيق العمل إذا عُدّل توقيعه، فالنسخة التي تحمّلها من هنا هي النسخة الأصلية.",

        "download-title": "تحميل مباشر من كارتوني",
        "download-subtitle": "ملف واحد لكل أجهزتك. بدون متجر، وبدون وسيط.",
        "dl-check-1": "هاتف · تابلت · تلفزيون أندرويد في ملف واحد",
        "dl-check-2": "عربي وإنجليزي، وواجهة تنقلب تلقائياً من اليمين لليسار",
        "dl-check-3": "مجاني بالكامل — لا اشتراك ولا نسخة مدفوعة",
        "btn-download-now": "تحميل ostora_online_v1.1.apk",
        "download-note": "التطبيق غير متوفر على متجر جوجل بلاي بسبب سياسات المتجر تجاه تطبيقات البث، لذا يُحمَّل كملف APK مباشرة.",
        "step-1-title": "حمّل الملف",
        "step-1-desc": "اضغط زر التحميل بالأعلى. الملف ينزل مباشرة من kartoney.com.",
        "step-2-title": "اسمح بالتثبيت",
        "step-2-desc": "عند ظهور تنبيه الأمان، فعّل “السماح بالتثبيت من هذا المصدر” لمتصفحك أو مدير الملفات.",
        "step-3-title": "افتح وشاهد",
        "step-3-desc": "افتح التطبيق مباشرة. لا خطوة تسجيل ولا رمز تفعيل.",
        "tv-tip": "على التلفزيون: افتح kartoney.com من متصفح التلفزيون وحمّل نفس الملف، أو انسخه من الهاتف عبر USB. سيظهر التطبيق في قائمة تطبيقات التلفزيون مع تنقل كامل بالريموت.",

        "faq-title": "أسئلة قبل التحميل",
        "faq-q1": "هل أحتاج نسخة مختلفة للتلفزيون؟",
        "faq-a1": "لا. نفس ملف APK يعمل على الهاتف والتابلت وتلفزيون أندرويد. التطبيق يكتشف نوع الجهاز عند التشغيل ويبدّل واجهته: شبكة أوسع على التابلت، وتنقل بالريموت وأيقونة في قائمة التلفزيون على الشاشات الكبيرة.",
        "faq-q2": "هل يعمل على الكمبيوتر؟",
        "faq-a2": "التطبيق مخصص لأجهزة أندرويد فقط — الهاتف والتابلت والتلفزيون وصناديق TV Box. إن كنت على الكمبيوتر فتصفح كارتوني من المتصفح مباشرة.",
        "faq-q3": "هل مكتبة الكرتون تعمل بدون إنترنت؟",
        "faq-a3": "قائمة المسلسلات والحلقات مدمجة داخل التطبيق، فتتصفحها فوراً وبدون انتظار أي خادم. أما تشغيل الحلقة نفسها فيحتاج اتصالاً بالإنترنت مثل أي تطبيق بث.",
        "faq-q4": "هل التطبيق آمن؟",
        "faq-a4": "الملف موقّع رقمياً، ويرفض التطبيق العمل إذا عُدّل توقيعه — أي أن نسخة معدّلة من طرف آخر لن تعمل. لا يطلب أذونات الموقع أو جهات الاتصال، ويمكنك إيقاف إرسال إحصاءات الاستخدام من الإعدادات.",
        "faq-q5": "هل التطبيق مجاني فعلاً؟",
        "faq-a5": "نعم، بالكامل ومن دون نسخة مدفوعة. تكاليفه تغطيها إعلانات لا تظهر أبداً قبل بدء التشغيل، ويمكنك إيقاف الفواصل الإعلانية ساعتين مقابل مشاهدة فيديو إعلاني واحد.",

        "footer-home": "العودة إلى كارتوني",
        "footer-copyright": "© 2026 كارتوني — Ostora Online O². جميع الحقوق محفوظة.",
        "footer-disclaimer": "تطبيق مجاني غير مرتبط بأي خدمة اشتراك تجارية. المحتوى يُبث من مصادره العامة على الإنترنت."
    },

    en: {
        "nav-screens": "Your screens",
        "nav-libraries": "Content",
        "nav-features": "Features",
        "nav-download": "Download",
        "nav-back": "Back to Kartoney",

        "hero-badge": "One app · three screens",
        "hero-title": "Everything you watch, on every screen you own",
        "hero-subtitle": "Ostora Online is a single Android app that runs on your phone, your tablet and your Android TV. The whole Kartoney library is built into it, alongside live channels and radio — free, with no account.",
        "hero-cta-download": "Download the APK",
        "hero-cta-features": "See how it works",
        "fact-size": "App size",
        "fact-os": "Minimum",
        "fact-version": "Latest build",
        "fact-account-value": "None",
        "fact-account": "Sign-up required",

        "screens-title": "One APK. Not three downloads.",
        "screens-subtitle": "The same app recognises your device and lays itself out for it. Download once, install it on everything you own.",
        "screen-phone-title": "Phone",
        "screen-phone-desc": "A three-column grid, a player that works upright or sideways, and a floating window that keeps playing while you use something else.",
        "screen-tablet-title": "Tablet",
        "screen-tablet-desc": "A five-column layout and a side navigation rail in landscape — instead of a stretched phone interface on a big screen.",
        "screen-tv-title": "Android TV",
        "screen-tv-desc": "Full D-pad navigation, an icon in your TV's app row, and channel changing on the up and down keys like any set-top box.",

        "lib-title": "Eight libraries inside the app",
        "lib-subtitle": "Real counts from build 1.1, not estimates.",
        "lib-kartoney-note": "Bundled inside the APK — it opens instantly, with no server to wait for",
        "lib-foot": "One Arabic search covers 6,248 titles across every library — it ignores diacritics and alif variants, and word order does not matter.",

        "features-title": "Built for watching, not for interrupting",
        "features-subtitle": "Every feature listed here is in the build you are about to download.",
        "feature-1-title": "No ad break before playback",
        "feature-1-desc": "The app is free and ad-supported, but no ad ever runs between tapping a title and the stream starting. Breaks come in dead time only, and one video buys you two hours without them.",
        "feature-2-title": "Subtitles and playback speed",
        "feature-2-desc": "Pick subtitles from inside the player in every language the source carries, plus 0.5×–2× speed and three picture-size modes.",
        "feature-3-title": "Floating window",
        "feature-3-desc": "Drag the video down and it keeps playing in a small window inside the app — or leave the app entirely and it follows you in the system's floating window.",
        "feature-4-title": "Favourites, and hide what's broken",
        "feature-4-desc": "Hold any title to favourite it, or to report it broken so it disappears everywhere. You build your own line-up.",
        "feature-5-title": "Home screen widget",
        "feature-5-desc": "Your favourites in a tile on your home screen, with real cover art. One tap plays, without opening the app first.",
        "feature-6-title": "No account, no nosy permissions",
        "feature-6-desc": "No sign-up, no email, no access to your contacts or location. The app refuses to run if its signature has been altered, so the copy you get here is the original.",

        "download-title": "Direct download from Kartoney",
        "download-subtitle": "One file for every device you own. No store, no middleman.",
        "dl-check-1": "Phone · tablet · Android TV in a single file",
        "dl-check-2": "Arabic and English, with the layout flipping right-to-left on its own",
        "dl-check-3": "Completely free — no subscription, no paid tier",
        "btn-download-now": "Download ostora_online_v1.1.apk",
        "download-note": "The app is not on Google Play because of the store's policies on streaming apps, so it is distributed as a direct APK.",
        "step-1-title": "Download the file",
        "step-1-desc": "Tap the button above. The file comes straight from kartoney.com.",
        "step-2-title": "Allow the install",
        "step-2-desc": "When the security prompt appears, turn on “allow installs from this source” for your browser or file manager.",
        "step-3-title": "Open and watch",
        "step-3-desc": "Open the app and start. There is no sign-up step and no activation code.",
        "tv-tip": "On a TV: open kartoney.com in the TV's browser and download the same file, or copy it over from your phone by USB. The app appears in your TV's app row with full remote-control navigation.",

        "faq-title": "Before you download",
        "faq-q1": "Do I need a different build for my TV?",
        "faq-a1": "No. The same APK runs on phones, tablets and Android TV. The app detects the device at launch and switches layout: a wider grid on a tablet, and D-pad navigation plus a TV launcher icon on a big screen.",
        "faq-q2": "Does it work on a PC?",
        "faq-a2": "The app is Android-only — phones, tablets, TVs and TV boxes. On a computer, just browse Kartoney in your browser instead.",
        "faq-q3": "Does the cartoon library work offline?",
        "faq-a3": "The list of series and episodes is bundled inside the app, so browsing it is instant and needs no server. Playing an episode still needs an internet connection, like any streaming app.",
        "faq-q4": "Is the app safe?",
        "faq-a4": "The file is digitally signed, and the app refuses to run if that signature has been altered — so a repackaged copy from someone else will not work. It asks for no location or contacts permission, and you can turn usage analytics off in Settings.",
        "faq-q5": "Is it really free?",
        "faq-a5": "Yes, entirely, with no paid tier. It is funded by ads that never appear before playback starts, and watching one video ad turns the breaks off for two hours.",

        "footer-home": "Back to Kartoney",
        "footer-copyright": "© 2026 Kartoney — Ostora Online O². All rights reserved.",
        "footer-disclaimer": "A free app, not affiliated with any commercial subscription service. Streams come from their own public sources."
    }
};

const htmlTag = document.documentElement;
const langBtn = document.getElementById("langBtn");
const langText = document.getElementById("langText");
let currentLang = "ar";

function applyTranslations(lang) {
    const dict = translations[lang];
    document.querySelectorAll("[data-translate]").forEach((el) => {
        const value = dict[el.dataset.translate];
        if (value) el.textContent = value;
    });

    const arabic = lang === "ar";
    htmlTag.lang = arabic ? "ar" : "en";
    htmlTag.dir = arabic ? "rtl" : "ltr";
    langText.textContent = arabic ? "English" : "العربية";
}

langBtn.addEventListener("click", () => {
    currentLang = currentLang === "ar" ? "en" : "ar";
    applyTranslations(currentLang);
});
