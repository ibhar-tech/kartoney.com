// Bilingual Dictionary mapping English & Arabic content for full SEO and local compatibility
const translations = {
    ar: {
        "nav-features": "المميزات",
        "nav-download": "التحميل",
        "nav-admin": "بوابة الإشراف",
        "hero-badge": "⚡ الجيل الجديد من تطبيقات البث المباشر",
        "world-cup-banner": "🔥 اليوم: نهائي كأس العالم - الأرجنتين ضد إسبانيا 🔥",
        "hero-title": "البث الرياضي المباشر كما لم تشهده من قبل",
        "hero-subtitle": "تطبيق يلا شوت YalaShot يمنحك تجربة مشاهدة أسطورية فائقة السرعة والاستقرار لجميع المباريات وقنوات الرياضة المشفرة. البديل الذكي والآمن لتطبيقات ياسين تيفي Yacine TV والأسطورة Ostora TV.",
        "hero-cta-download": "تحميل التطبيق مجاناً",
        "hero-cta-features": "اكتشف المميزات",
        "features-title": "لماذا تختار يلا شوت YalaShot؟",
        "features-subtitle": "لقد قمنا بإعادة ابتكار البث المباشر لنمنحك منصة سريعة وآمنة وممتعة عبر جميع أجهزتك.",
        "feature-1-title": "تقنية فك التشفير الذكية",
        "feature-1-desc": "نقوم بفك تشفير البث وسحب القنوات الرياضية الشهيرة بشكل مباشر وبدون فترات انتظار طويلة أو إعلانات مزعجة.",
        "feature-2-title": "دعم كامل لجميع الأجهزة",
        "feature-2-desc": "سواء كنت تشاهد من هاتفك الذكي، جهاز التلفزيون الخاص بك (Android TV)، أو الكمبيوتر الشخصي، تطبيقنا مصمم ليتناسب معك تماماً.",
        "feature-3-title": "أمان فائق وحماية متكاملة",
        "feature-3-desc": "منظومة أمان مدمجة ومحمية ضد التعديل أو الهندسة العكسية لحماية بياناتك وحصتك الشهرية بشكل كامل.",
        "feature-4-title": "إشعارات المباريات العاجلة",
        "feature-4-desc": "احصل على إشعارات فورية وبث مباشر للأهداف والأحداث الحصرية للمباريات بمجرد حدوثها على هاتفك وسطح المكتب.",
        "download-title": "تنزيل التطبيق لكافة المنصات",
        "download-subtitle": "اختر نسختك المفضلة المتوافقة تماماً مع نظام تشغيل جهازك وابدأ المشاهدة في ثوانٍ.",
        "tab-mobile": "الهاتف",
        "tab-tv": "شاشة التلفزيون",
        "tab-desktop": "الكمبيوتر الشخصي",
        "dl-mobile-desc": "تطبيق الاندرويد المتكامل لمشاهدة أهم مباريات اليوم وتلقي التنبيهات المباشرة بجودة عالية وثبات لا مثيل له.",
        "dl-tv-desc": "نسخة التلفزيون الذكي المحسنة كلياً لتعمل بسلاسة تامة مع ريموت التحكم عن بعد، مع دعم جودات بث متعددة فائقة الدقة.",
        "dl-linux-desc": "تطبيق متكامل لسطح المكتب على نظام Linux Mint وتوزيعات دبيان مع مشغل مدمج ونظام إشعارات أصلي بالكامل.",
        "dl-win-desc": "برنامج سطح المكتب الأنيق لنظام التشغيل ويندوز، يدعم اختصارات لوحة المفاتيح والتشغيل في الخلفية.",
        "btn-download-now": "تحميل الآن",
        "admin-title": "بوابة الإدارة والإشراف",
        "admin-desc": "لوحة تحكم مركزية متطورة تتيح للمشرفين تتبع إحصائيات الاستخدام والتحليلات الحية، بالإضافة إلى إمكانية إرسال الإشعارات والإنذارات العاجلة لكافة المشتركين فوراً.",
        "admin-btn-linux": "تنزيل لوحة التحكم (Linux)",
        "admin-btn-win": "تنزيل لوحة التحكم (Windows)",
        "admin-btn-mobile": "لوحة التحكم للهواتف (APK)",
        "footer-copyright": "© 2026 يلا شوت - YalaShot. جميع الحقوق محفوظة.",
        "footer-disclaimer": "هذا التطبيق مجاني بالكامل وغير مرتبط بأي تطبيقات تجارية أخرى."
    },
    en: {
        "nav-features": "Features",
        "nav-download": "Downloads",
        "nav-admin": "Admin Gateway",
        "hero-badge": "⚡ The Next-Gen Streaming Suite",
        "world-cup-banner": "🔥 Today: World Cup Final - Argentina vs Spain 🔥",
        "hero-title": "Live Sports Streaming Redefined",
        "hero-subtitle": "YalaShot gives you a premium, lightning-fast, and highly stable viewing experience for football matches and live channels. The ultimate secure alternative to Yacine TV and Ostora TV.",
        "hero-cta-download": "Download Free Now",
        "hero-cta-features": "Discover Features",
        "features-title": "Why Choose YalaShot?",
        "features-subtitle": "We rebuilt live streaming from the ground up to give you an ad-free, ultra-stable, and beautiful platform.",
        "feature-1-title": "Smart Decryption Gateway",
        "feature-1-desc": "Our custom engines strip segment wrappers on-the-fly to deliver direct high-quality streams without lags or bloat.",
        "feature-2-title": "Cross-Platform Support",
        "feature-2-desc": "Enjoy a beautiful, responsive experience optimized for your Android Phone, Smart TV, or Linux/Windows PC.",
        "feature-3-title": "Anti-Reverse Engineering",
        "feature-3-desc": "Engineered with ProGuard and advanced API obfuscation layers to protect your session key, data, and bandwidth quota.",
        "feature-4-title": "Urgent Live Notifications",
        "feature-4-desc": "Get native desktop toasts and heads-up mobile alerts containing match events, scores, and real-time live targets.",
        "download-title": "Get the App on Any Device",
        "download-subtitle": "Choose the client package perfectly optimized for your system and start watching in high-fidelity within seconds.",
        "tab-mobile": "Mobile",
        "tab-tv": "Smart TV",
        "tab-desktop": "Desktop PC",
        "dl-mobile-desc": "The complete Android mobile suite optimized for premium viewing, live schedules, and instant push event triggers.",
        "dl-tv-desc": "Leanback-focused television interface designed to run beautifully on Android Smart TVs, Android boxes, and Firesticks.",
        "dl-linux-desc": "Premium Linux client optimized for Linux Mint/Debian, supporting native notification toasts and keyboard shortcuts.",
        "dl-win-desc": "Sleek Windows desktop client with automatic tray minimization, global shortcuts, and custom playback engine.",
        "btn-download-now": "Download Package Now",
        "admin-title": "Centralized Admin Gate",
        "admin-desc": "Central command center allowing admins to monitor live telemetry, track multi-platform connections, and broadcast urgent push alerts instantly.",
        "admin-btn-linux": "Get Dashboard (Linux .deb)",
        "admin-btn-win": "Get Dashboard (Windows .msi)",
        "admin-btn-mobile": "Get Mobile Admin (Android APK)",
        "footer-copyright": "© 2026 YalaShot Suite. All rights reserved.",
        "footer-disclaimer": "This platform is entirely free and not affiliated with any premium network services."
    }
};

// State trackers
let currentLang = "ar";

const htmlTag = document.documentElement;
const langBtn = document.getElementById("langBtn");
const langText = document.getElementById("langText");

// Initialize translation engine
function applyTranslations(lang) {
    const dict = translations[lang];
    document.querySelectorAll("[data-translate]").forEach(elem => {
        const key = elem.getAttribute("data-translate");
        if (dict[key]) {
            elem.textContent = dict[key];
        }
    });

    if (lang === "ar") {
        htmlTag.setAttribute("lang", "ar");
        htmlTag.setAttribute("dir", "rtl");
        langText.textContent = "English";
    } else {
        htmlTag.setAttribute("lang", "en");
        htmlTag.setAttribute("dir", "ltr");
        langText.textContent = "العربية";
    }
}

// Click language toggle button
langBtn.addEventListener("click", () => {
    currentLang = currentLang === "ar" ? "en" : "ar";
    applyTranslations(currentLang);
});

// Tab Downloading Logic
const tabBtns = document.querySelectorAll(".tab-btn");
const tabContents = document.querySelectorAll(".tab-content");

tabBtns.forEach(btn => {
    btn.addEventListener("click", () => {
        const targetTab = btn.getAttribute("data-tab");

        // Set active button
        tabBtns.forEach(b => b.classList.remove("active"));
        btn.classList.add("active");

        // Set active content block
        tabContents.forEach(content => {
            content.classList.remove("active");
            if (content.getAttribute("id") === `tab-${targetTab}`) {
                content.classList.add("active");
            }
        });
    });
});

// Run default translation
applyTranslations(currentLang);
