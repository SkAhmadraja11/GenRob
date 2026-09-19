// GenRob Comprehensive i18n Translation Dictionary
// Supports: Hindi (hi), Telugu (te), English (en)

export type SupportedLanguage = 'hi' | 'te' | 'en';

export const CATEGORY_TRANSLATIONS: Record<string, { hi: string; te: string; en: string }> = {
  'All': { hi: 'सभी', te: 'అన్నీ', en: 'All' },
  'Grains & Atta': { hi: 'अनाज व आटा', te: 'ధాన్యాలు & పిండి', en: 'Grains & Atta' },
  'Pulses & Dal': { hi: 'दालें व दलहन', te: 'పప్పు ధాన్యాలు', en: 'Pulses & Dal' },
  'Edible Oils': { hi: 'खाद्य तेल', te: 'వంట నూనెలు', en: 'Edible Oils' },
  'Spices & Masala': { hi: 'मसाले', te: 'మసాలాలు', en: 'Spices & Masala' },
  'Dairy & Beverages': { hi: 'डेयरी व पेय', te: 'డైరీ & పానీయాలు', en: 'Dairy & Beverages' },
  'Personal & Home Care': { hi: 'घरेलू व स्वच्छता', te: 'గృహ & వ్యక్తిగత సంరక్షణ', en: 'Personal & Home Care' },
  'Packaged Foods': { hi: 'पैकेटबंद खाद्य', te: 'ప్యాకేజ్డ్ ఫుడ్స్', en: 'Packaged Foods' },
  'General': { hi: 'सामान्य', te: 'సాధారణం', en: 'General' },
  'General Trade': { hi: 'सामान्य किराना', te: 'జనరల్ ట్రేడ్', en: 'General Trade' },
};

export const UNIT_TRANSLATIONS: Record<string, { hi: string; te: string; en: string }> = {
  bag: { hi: 'बोरी / कट्टा', te: 'బస్తా', en: 'Bag' },
  tin: { hi: 'टिन / पीपा', te: 'డబ్బా', en: 'Tin' },
  carton: { hi: 'पेटी / बॉक्स', te: 'పెట్టె', en: 'Carton' },
  patti: { hi: 'पट्टी', te: 'పట్టీ', en: 'Patti' },
  kg: { hi: 'किलो', te: 'కిలో', en: 'kg' },
  litre: { hi: 'लीटर', te: 'లీటర్', en: 'Litre' },
  liter: { hi: 'लीटर', te: 'లీటర్', en: 'Liter' },
  packet: { hi: 'पैकेट', te: 'ప్యాకెట్', en: 'Packet' },
  piece: { hi: 'नग / पीस', te: 'పీస్', en: 'Piece' },
  quintal: { hi: 'क्विंटल', te: 'క్వింటాల్', en: 'Quintal' },
  box: { hi: 'बॉक्स', te: 'బాక్స్', en: 'Box' },
  bottle: { hi: 'बोतल', te: 'సీసా', en: 'Bottle' },
};

export function translateCategory(category: string, lang: SupportedLanguage): string {
  const item = CATEGORY_TRANSLATIONS[category];
  if (item) return item[lang] || category;
  return category;
}

export function translateUnit(unit: string, lang: SupportedLanguage): string {
  const normalized = unit.toLowerCase();
  const item = UNIT_TRANSLATIONS[normalized];
  if (item) return item[lang] || unit;
  return unit;
}

export const translations = {
  hi: {
    // App & Shell
    appLoading: 'जेनरॉब लोड हो रहा है…',
    appConnecting: 'सुपाबेस से कनेक्ट हो रहा है…',
    trialBannerActive: 'मुफ्त ट्रायल सक्रिय —',
    trialDaysRemaining: 'दिन शेष',
    trialUpgradeNow: 'अभी अपग्रेड करें',
    limitReachedBanner: 'सामान सीमा पूर्ण (फ्री प्लान)। नए सामान जोड़ने के लिए अपग्रेड करें →',
    loadingInventory: 'इन्वेंट्री लोड हो रही है…',
    connectingRealtime: 'सुपाबेस रियल-टाइम से कनेक्ट हो रहे हैं',
    kiranaBadge: 'किराना V1',
    langChangeTooltip: 'भाषा बदलें',
    alertsTooltip: 'स्टॉक अलर्ट',
    settingsTooltip: 'डेटाबेस सेटिंग्स',
    authTooltip: 'फोन-OTP दुकानदार लॉगिन',

    // Landing / Unauthenticated
    signInTitle: 'जेनरॉब (GenRob)',
    signInSubtitle: 'भारतीय छोटे व्यापारियों के लिए वॉइस-फर्स्ट इन्वेंट्री।\nहिंदी, तेलुगु या अंग्रेजी में बोलकर स्टॉक प्रबंधित करें।',
    signInMobileBtn: '📱 मोबाइल नंबर से लॉगिन करें',
    oneClickDemoBtn: '⚡ 1-क्लिक डेमो लॉगिन (राजेश शर्मा — बालाजी किराना)',
    otpSentNotice: 'आपके फोन नंबर पर SMS द्वारा 6-अंकों का OTP भेजा जाएगा।',

    // Header
    appName: 'श्री बालाजी किराना & जनरल स्टोर्स',
    realtimeLive: 'सुपाबेस लाइव सक्रिय',
    offlineSync: 'ऑफ़लाइन / लोकल सिंक',
    alerts: 'स्टॉक अलर्ट',
    settings: 'कनेक्शन सेटिंग्स',
    location: 'बेगम बाज़ार, हैदराबाद',

    // Nav
    navStock: 'स्टॉक',
    navKhata: 'खाता',
    navVoice: 'बोलें',
    navChallan: 'चालान OCR',
    navAnalytics: 'पूर्वानुमान',
    navBriefing: 'बुलेटिन',

    // Product Catalog
    totalSkus: 'कुल सामान (SKUs)',
    activeCatalog: 'सक्रिय सामान',
    lowStock: 'कम स्टॉक (Low Stock)',
    belowReorder: 'रीऑर्डर सीमा से कम',
    outOfStock: 'खत्म सामान (Out of Stock)',
    reorderNow: 'तुरंत मंगवाएं',
    stockValuation: 'स्टॉक मूल्य (Valuation)',
    atCost: 'थोक खरीद भाव पर',
    searchPlaceholder: 'आटा, दाल, तेल, साबुन खोजें...',
    addNewProduct: 'नया सामान जोड़ें',
    allCategories: 'सभी',
    statusOk: 'सही (OK)',
    statusLow: 'कम (Low)',
    statusOut: 'खत्म (Out)',
    currentStock: 'मौजूदा स्टॉक',
    reorderLimit: 'रीऑर्डर सीमा',
    salePrice: 'बिक्री भाव',
    stockInAction: 'आया (+ माल)',
    stockOutAction: 'बिका (- माल)',
    noProductsFound: 'कोई सामान नहीं मिला',

    // Khata
    totalMarketUdhaar: 'बाजार में कुल उधार',
    customerAccounts: 'ग्राहक खाते',
    voiceUdhaarBtn: 'बोलकर उधार लिखें (Voice Udhaar)',
    searchCustomer: 'ग्राहक का नाम या फोन खोजें...',
    customerLedger: 'ग्राहक खतौनी / हिसाब',
    creditLimit: 'उधार सीमा',
    availableLimit: 'बाकी लिमिट',
    giveUdhaar: '+ उधार दिया (Credit)',
    takePayment: '✓ जमा / भुगतान (Payment)',
    txnHistory: 'लेन-देन इतिहास',
    noTxns: 'इस ग्राहक का कोई पिछला लेन-देन नहीं है',
    entryModalTitle: 'खाता प्रविष्टि जोड़ें',
    amountLabel: 'राशि (₹)',
    notesLabel: 'विवरण / सामान का नाम',
    saveEntry: 'खाते में जोड़ें',
    cancel: 'रद्द करें',

    // Analytics
    aiPredictiveTitle: 'AI स्टॉक पूर्वानुमान व री-ऑर्डर',
    predictiveSubtitle: 'पिछले 30 दिनों की खपत दर के आधार पर स्वचालित विश्लेषण',
    deadStockTitle: 'डेड स्टॉक व फंसी पूंजी',
    deadStockSubtitle: 'वे सामान जो 30+ दिनों से नहीं बिके और पूंजी फंसाए हुए हैं',
    daysLeft: 'दिनों का स्टॉक',
    dailyBurn: 'दैनिक बिक्री',
    suggestedReorder: 'सुझाया गया रीऑर्डर',
    urgencyCritical: 'अति गंभीर',
    urgencyHigh: 'उच्च',
    urgencyMedium: 'मध्यम',
    tiedUpCapital: 'फंसी पूंजी',
    lastSale: 'अंतिम बिक्री',
    daysAgo: 'दिन पहले',
    neverSold: 'कभी नहीं बिका',

    // Challan
    challanTitle: 'सप्लायर चालान / बिल OCR',
    challanSubtitle: 'थोक चालान की फोटो अपलोड करें और 1-क्लिक में इन्वेंट्री में जोड़ें',
    uploadChallan: 'चालान फोटो चुनें या खींचें',
    parseChallan: 'स्कैन डिलीवरी चालान (Scan Challan)',
    extractedItems: 'पहचाने गए सामान विवरण',
    commitToStock: 'सभी स्टॉक में जोड़ें',

    // Daily Briefing
    briefingTitle: 'दैनिक वॉइस बुलेटिन (24-Hour Voice Briefing)',
    briefingSubtitle: 'पिछले 24 घंटों के वास्तविक लेन-देन का लाइव वॉइस सारांश',
    listenBriefing: 'बुलेटिन सुनें',
    stopBriefing: 'बुलेटिन रोकें',
    total24hSales: '24h कुल बिक्री',
    stockInCount: 'माल आया (प्रविष्टियां)',
    stockOutCount: 'ग्राहक बिक्री',
    newUdhaar24h: 'नया उधार (24h)',
    aiSummaryText: 'AI दैनिक व्यापार समीक्षा',

    // Voice Modal
    voiceModalTitle: 'वॉइस स्टॉक और खाता प्रविष्टि',
    listeningStatus: 'सुन रहे हैं... बोलिए',
    processingVoice: 'AI समझ रहा है...',
    voicePlaceholder: 'उदा. "पांच बोरा आशीर्वाद आटा आया २१०० में" या "रमेश जी ने आठ सौ पचास का राशन लिया"',
    tryExamples: 'बोलने के उदाहरण (क्लिक करके जांचें):',

    // Stock In / Out Modal
    stockInModalTitle: 'माल आवक दर्ज करें (Stock IN)',
    stockOutModalTitle: 'माल बिक्री दर्ज करें (Stock OUT)',
    stockDirectionLabel: 'प्रकार चुनें',
    qtyLabel: 'मात्रा',
    unitLabel: 'व्यापार इकाई',
    unitPriceLabel: 'प्रति इकाई भाव (₹)',
    totalValueLabel: 'कुल लेन-देन मूल्य',
    submitStockInBtn: 'माल आवक सुरक्षित करें (+ स्टॉक)',
    submitStockOutBtn: 'माल बिक्री सुरक्षित करें (- स्टॉक)',
    baseQtyCalc: 'बेस इकाई गणना',

    // Add New Product Modal
    addProductTitle: 'नया किराना सामान जोड़ें',
    productNameLabel: 'सामान का नाम *',
    productNamePlaceholder: 'उदा. आशीर्वाद चक्की आटा',
    categoryLabel: 'श्रेणी *',
    tradeUnitLabel: 'थोक इकाई (Trade Unit)',
    baseUnitLabel: 'खुदरा इकाई (Base Unit)',
    multiplierLabel: 'रूपांतरण गुणक (1 थोक इकाई = कितने बेस इकाई)',
    currentStockLabel: 'प्रारंभिक स्टॉक',
    reorderThresholdLabel: 'रीऑर्डर चेतावनी सीमा',
    salePriceLabel: 'बिक्री मूल्य (₹)',
    costPriceLabel: 'लागत / थोक खरीद मूल्य (₹)',
    saveProductBtn: 'नया सामान सुरक्षित करें',

    // Unit Conversion Modal
    unitConversionTitle: 'इकाई रूपांतरण सेटिंग्स',
    unitConversionSubtitle: 'थोक बोरा/टीन और खुदरा किलो/लीटर के बीच अनुपात सेट करें',
    saveConversionBtn: 'रूपांतरण सुरक्षित करें',

    // Settings Modal
    settingsModalTitle: 'सुपाबेस कनेक्शन सेटिंग्स',
    settingsModalSubtitle: 'क्लाउड डेटाबेस URL और Anon API कुंजी कॉन्फ़िगर करें',
    urlLabel: 'प्रोजेक्ट URL',
    keyLabel: 'Anon पब्लिक कुंजी',
    testConnBtn: 'कनेक्शन जांचें',
    saveConnBtn: 'सेव करें और रीलोड करें',
    clearConnBtn: 'डिफ़ॉल्ट रीसेट करें',

    // Billing Portal
    billingTitle: 'दुकान प्लान व सब्सक्रिप्शन',
    billingSubtitle: 'अपने व्यापार के आकार के अनुसार सबसे उपयुक्त प्लान चुनें',
    currentPlanBadge: 'वर्तमान प्लान',
    upgradePlanBtn: 'अपग्रेड करें',
    startTrialBtn: '14-दिन मुफ्त ट्रायल शुरू करें',

    // Referral Card
    referralTitle: 'व्यापारी मित्र को रेफर करें',
    referralSubtitle: 'दूसरे दुकानदारों को जोड़ें और दोनों पाएं 1 महीना मुफ्त प्रीमियम!',
    copyLinkBtn: 'रेफरल लिंक कॉपी करें',
    copiedLinkBtn: '✓ कॉपी हो गया!',
    totalReferredLabel: 'कुल रेफर किए गए',
    rewardsEarnedLabel: 'अर्जित रिवॉर्ड्स',

    // Alerts Drawer
    alertsDrawerTitle: 'स्टॉक चेतावनियां (Live Alerts)',
    spokenAlertsBtn: 'बोलकर चेतावनियां सुनें',
    allClearTitle: 'सब सही है! (All Clear)',
    allClearMsg: 'सभी सामान सुरक्षित रीऑर्डर सीमा से ऊपर हैं।',
    resolveAlertBtn: 'मार्क सुलझाया (Resolve)',
  },

  te: {
    // App & Shell
    appLoading: 'జెన్‌రాబ్ లోడ్ అవుతోంది…',
    appConnecting: 'సుపాబేస్‌కు కనెక్ట్ అవుతోంది…',
    trialBannerActive: 'ఉచిత ట్రయల్ యాక్టివ్ —',
    trialDaysRemaining: 'రోజులు మిగిలాయి',
    trialUpgradeNow: 'ఇప్పుడే అప్‌గ్రేడ్ చేయండి',
    limitReachedBanner: 'సరుకుల పరిమితి పూర్తయింది. కొత్త సరుకులను జోడించడానికి అప్‌గ్రేడ్ చేయండి →',
    loadingInventory: 'ఇన్వెంటరీ లోడ్ అవుతోంది…',
    connectingRealtime: 'సుపాబేస్ రియల్-టైమ్‌కు కనెక్ట్ అవుతోంది',
    kiranaBadge: 'కిరాణా V1',
    langChangeTooltip: 'భాష మార్చండి',
    alertsTooltip: 'స్టాక్ హెచ్చరికలు',
    settingsTooltip: 'డేటాబేస్ సెట్టింగ్‌లు',
    authTooltip: 'ఫోన్-OTP దుకాణదారుని లాగిన్',

    // Landing / Unauthenticated
    signInTitle: 'జెన్‌రాబ్ (GenRob)',
    signInSubtitle: 'భారతీయ చిన్న వ్యాపారుల కోసం వాయిస్-ఫస్ట్ ఇన్వెంటరీ.\nతెలుగు, హిందీ లేదా ఇంగ్లీషులో మాట్లాడి స్టాక్ నిర్వహించండి.',
    signInMobileBtn: '📱 మొబైల్ నంబర్‌తో లాగిన్ అవ్వండి',
    oneClickDemoBtn: '⚡ 1-క్లిక్ డెమో లాగిన్ (రాజేష్ శర్మ — బాలాజీ కిరాణా)',
    otpSentNotice: 'మీ ఫోన్ నంబర్‌కు SMS ద్వారా 6 అంకెల OTP పంపబడుతుంది.',

    // Header
    appName: 'శ్రీ బాలాజీ కిరాణా & జనరల్ స్టోర్స్',
    realtimeLive: 'సుపాబేస్ లైవ్ యాక్టివ్',
    offlineSync: 'ఆఫ్‌లైన్ / లోకల్ సింక్',
    alerts: 'స్టాక్ హెచ్చరికలు',
    settings: 'కనెక్షన్ సెట్టింగ్‌లు',
    location: 'బేగంబజార్, హైదరాబాద్',

    // Nav
    navStock: 'స్టాక్',
    navKhata: 'ఖాతా',
    navVoice: 'వాయిస్',
    navChallan: 'చలాన్ OCR',
    navAnalytics: 'విశ్లేషణ',
    navBriefing: 'సారాంశం',

    // Product Catalog
    totalSkus: 'మొత్తం సరుకులు (SKUs)',
    activeCatalog: 'యాక్టివ్ సరుకులు',
    lowStock: 'తక్కువ స్టాక్ (Low Stock)',
    belowReorder: 'రీ-ఆర్డర్ పరిమితి కంటే తక్కువ',
    outOfStock: 'స్టాక్ అయిపోయింది (Out of Stock)',
    reorderNow: 'వెంటనే ఆర్డర్ చేయండి',
    stockValuation: 'స్టాక్ విలువ (Valuation)',
    atCost: 'హోల్‌సేల్ ధర వద్ద',
    searchPlaceholder: 'పిండి, పప్పు, నూనె, సబ్బు వెతకండి...',
    addNewProduct: 'కొత్త సరుకు జోడించండి',
    allCategories: 'అన్నీ',
    statusOk: 'బాగుంది (OK)',
    statusLow: 'తక్కువ (Low)',
    statusOut: 'అయిపోయింది (Out)',
    currentStock: 'ప్రస్తుత స్టాక్',
    reorderLimit: 'రీ-ఆర్డర్ పరిమితి',
    salePrice: 'అమ్మకపు ధర',
    stockInAction: 'వచ్చింది (+ సరుకు)',
    stockOutAction: 'అమ్మాము (- సరుకు)',
    noProductsFound: 'సరుకులు కనుగొనబడలేదు',

    // Khata
    totalMarketUdhaar: 'మార్కెట్ లో మొత్తం అప్పు (ఉధార్)',
    customerAccounts: 'ఖాతాదారులు',
    voiceUdhaarBtn: 'మాట్లాడి అప్పు రాయండి (Voice Udhaar)',
    searchCustomer: 'కస్టమర్ పేరు లేదా ఫోన్ వెతకండి...',
    customerLedger: 'కస్టమర్ ఖాతా / లెడ్జర్',
    creditLimit: 'అప్పు పరిమితి',
    availableLimit: 'మిగిలిన పరిమితి',
    giveUdhaar: '+ అప్పు ఇచ్చాము (Credit)',
    takePayment: '✓ జమ / చెల్లింపు (Payment)',
    txnHistory: 'లావాదేవీల చరిత్ర',
    noTxns: 'ఈ కస్టమర్‌కు ఇంతకుముందు లావాదేవీలు లేవు',
    entryModalTitle: 'ఖాతాలో నమోదు చేయండి',
    amountLabel: 'మొత్తం (₹)',
    notesLabel: 'వివరాలు / సరుకు పేరు',
    saveEntry: 'ఖాతాలో నమోదు చేయండి',
    cancel: 'రద్దు చేయండి',

    // Analytics
    aiPredictiveTitle: 'AI స్టాక్ అంచనాలు & రీ-ఆర్డర్',
    predictiveSubtitle: 'గత 30 రోజుల వినియోగం ఆధారంగా స్వయంచాలక విశ్లేషణ',
    deadStockTitle: 'డెడ్ స్టాక్ & నిలిచిపోయిన పెట్టుబడి',
    deadStockSubtitle: '30+ రోజులుగా అమ్ముడుపోని సరుకులు',
    daysLeft: 'రోజుల స్టాక్',
    dailyBurn: 'రోజువారీ అమ్మకం',
    suggestedReorder: 'సూచించిన ఆర్డర్',
    urgencyCritical: 'చాలా ముఖ్యం',
    urgencyHigh: 'అత్యవసరం',
    urgencyMedium: 'సాధారణం',
    tiedUpCapital: 'నిలిచిన పెట్టుబడి',
    lastSale: 'చివరి అమ్మకం',
    daysAgo: 'రోజుల క్రితం',
    neverSold: 'ఇంతవరకు అమ్మలేదు',

    // Challan
    challanTitle: 'సప్లయర్ చలాన్ / బిల్లు OCR',
    challanSubtitle: 'హోల్‌సేల్ చలాన్ ఫోటో తీసి 1-క్లిక్‌తో ఇన్వెంటరీకి జోడించండి',
    uploadChallan: 'చలాన్ ఫోటో ఎంచుకోండి',
    parseChallan: 'డెలివరీ చలాన్ స్కాన్ చేయండి (Scan Challan)',
    extractedItems: 'గుర్తించబడిన చలాన్ వివరాలు',
    commitToStock: 'స్టాక్‌కి జోడించండి',

    // Daily Briefing
    briefingTitle: 'రోజువారీ వాయిస్ బులెటిన్ (24-Hour Voice Briefing)',
    briefingSubtitle: 'గత 24 గంటల వాస్తవ పోస్ట్‌గ్రెస్ లావాదేవీల వాయిస్ సారాంశం',
    listenBriefing: 'బులెటిన్ వినండి',
    stopBriefing: 'బులెటిన్ ఆపండి',
    total24hSales: '24h మొత్తం అమ్మకాలు',
    stockInCount: 'స్టాక్ వచ్చింది',
    stockOutCount: 'కస్టమర్ అమ్మకాలు',
    newUdhaar24h: 'కొత్త అప్పు (24h)',
    aiSummaryText: 'AI రోజువారీ సమీక్ష',

    // Voice Modal
    voiceModalTitle: 'వాయిస్ స్టాక్ & ఖాతా ఎంట్రీ',
    listeningStatus: 'వింటున్నాము... మాట్లాడండి',
    processingVoice: 'AI ప్రాసెస్ చేస్తోంది...',
    voicePlaceholder: 'ఉదా: "రెండు డబ్బాల ఫార్చూన్ నూనె అమ్మాము" లేదా "వెంకటేష్ గౌడ్ మూడు వేలు అప్పు రాసుకో"',
    tryExamples: 'ఉదాహరణలు (పరీక్షించడానికి క్లిక్ చేయండి):',

    // Stock In / Out Modal
    stockInModalTitle: 'స్టాక్ రాక నమోదు చేయండి (Stock IN)',
    stockOutModalTitle: 'స్టాక్ అమ్మకం నమోదు చేయండి (Stock OUT)',
    stockDirectionLabel: 'రకం ఎంచుకోండి',
    qtyLabel: 'పరిమాణం',
    unitLabel: 'యూనిట్',
    unitPriceLabel: 'యూనిట్ ధర (₹)',
    totalValueLabel: 'మొత్తం విలువ',
    submitStockInBtn: 'స్టాక్ జోడించండి (+ IN)',
    submitStockOutBtn: 'అమ్మకం నమోదు చేయండి (- OUT)',
    baseQtyCalc: 'బేస్ యూనిట్ పరిమాణం',

    // Add New Product Modal
    addProductTitle: 'కొత్త సరుకును జోడించండి',
    productNameLabel: 'సరుకు పేరు *',
    productNamePlaceholder: 'ఉదా. ఆశీర్వాద్ గోధుమ పిండి',
    categoryLabel: 'వర్గం *',
    tradeUnitLabel: 'హోల్‌సేల్ యూనిట్ (Trade Unit)',
    baseUnitLabel: 'రిటైల్ యూనిట్ (Base Unit)',
    multiplierLabel: 'మార్పిడి నిష్పత్తి (1 ట్రేడ్ యూనిట్ = ఎన్ని బేస్ యూనిట్లు)',
    currentStockLabel: 'ప్రారంభ స్టాక్',
    reorderThresholdLabel: 'రీ-ఆర్డర్ హెచ్చరిక పరిమితి',
    salePriceLabel: 'అమ్మకపు ధర (₹)',
    costPriceLabel: 'కొనుగోలు ధర (₹)',
    saveProductBtn: 'సరుకును భద్రపరచండి',

    // Unit Conversion Modal
    unitConversionTitle: 'యూనిట్ మార్పిడి సెట్టింగ్‌లు',
    unitConversionSubtitle: 'బస్తా/డబ్బా మరియు కిలో/లీటర్ మధ్య నిష్పత్తిని సెట్ చేయండి',
    saveConversionBtn: 'మార్పులను భద్రపరచండి',

    // Settings Modal
    settingsModalTitle: 'సుపాబేస్ కనెక్షన్ సెట్టింగ్‌లు',
    settingsModalSubtitle: 'క్లౌడ్ డేటాబేస్ URL మరియు Anon API కీ కాన్ఫిగర్ చేయండి',
    urlLabel: 'ప్రాజెక్ట్ URL',
    keyLabel: 'Anon పబ్లిక్ కీ',
    testConnBtn: 'కనెక్షన్ పరీక్షించండి',
    saveConnBtn: 'సేవ్ చేసి రీలోడ్ చేయండి',
    clearConnBtn: 'డిఫాల్ట్‌కు రీసెట్ చేయండి',

    // Billing Portal
    billingTitle: 'ప్లాన్‌లు & సబ్‌స్క్రిప్షన్లు',
    billingSubtitle: 'మీ దుకాణ అవసరాలకు తగిన ఉత్తమ ప్లాన్‌ను ఎంచుకోండి',
    currentPlanBadge: 'ప్రస్తుత ప్లాన్',
    upgradePlanBtn: 'అప్‌గ్రేడ్ చేయండి',
    startTrialBtn: '14-రోజుల ఉచిత ట్రయల్ ప్రారంభించండి',

    // Referral Card
    referralTitle: 'మిత్ర వ్యాపారిని ఆహ్వానించండి',
    referralSubtitle: 'ఇతర దుకాణదారులను ఆహ్వానించి ఇద్దరూ 1 నెల ఉచిత ప్రీమియం పొందండి!',
    copyLinkBtn: 'రెఫరల్ లింక్ కాపీ చేయండి',
    copiedLinkBtn: '✓ కాపీ అయింది!',
    totalReferredLabel: 'మొత్తం రెఫరల్స్',
    rewardsEarnedLabel: 'పొందిన రివార్డులు',

    // Alerts Drawer
    alertsDrawerTitle: 'స్టాక్ హెచ్చరికలు (Live Alerts)',
    spokenAlertsBtn: 'వాయిస్ ద్వారా హెచ్చరికలు వినండి',
    allClearTitle: 'అంతా బాగుంది! (All Clear)',
    allClearMsg: 'అన్ని సరుకులు సురక్షిత రీ-ఆర్డర్ పరిమితి కంటే ఎక్కువగా ఉన్నాయి.',
    resolveAlertBtn: 'సమస్య పరిష్కరించబడింది (Resolve)',
  },

  en: {
    // App & Shell
    appLoading: 'Loading GenRob…',
    appConnecting: 'Connecting to Supabase…',
    trialBannerActive: 'Free trial active —',
    trialDaysRemaining: 'days remaining',
    trialUpgradeNow: 'Upgrade now',
    limitReachedBanner: 'Product limit reached (Free plan). Upgrade to add more products →',
    loadingInventory: 'Loading Your Inventory…',
    connectingRealtime: 'Connecting to Supabase Realtime',
    kiranaBadge: 'Kirana V1',
    langChangeTooltip: 'Change Language',
    alertsTooltip: 'Stock Alerts',
    settingsTooltip: 'Database Settings',
    authTooltip: 'Phone-OTP Shop Owner Auth',

    // Landing / Unauthenticated
    signInTitle: 'GenRob',
    signInSubtitle: 'Voice-first inventory for Indian small businesses.\nManage stock by speaking in Hindi, Telugu, or English.',
    signInMobileBtn: '📱 Sign In with Mobile',
    oneClickDemoBtn: '⚡ 1-Click Demo (Rajesh Sharma — Balaji Kirana)',
    otpSentNotice: 'A 6-digit OTP passcode will be delivered via SMS to your phone.',

    // Header
    appName: 'Sri Balaji Kirana & General Stores',
    realtimeLive: 'Supabase Realtime Live',
    offlineSync: 'Offline / Local Sync',
    alerts: 'Stock Alerts',
    settings: 'Connection Settings',
    location: 'Begum Bazar, HYD',

    // Nav
    navStock: 'Stock',
    navKhata: 'Khata',
    navVoice: 'Speak',
    navChallan: 'Challan OCR',
    navAnalytics: 'Insights',
    navBriefing: 'Briefing',

    // Product Catalog
    totalSkus: 'Total Catalog (SKUs)',
    activeCatalog: 'Active catalog items',
    lowStock: 'Low Stock Items',
    belowReorder: 'Below reorder limit',
    outOfStock: 'Out of Stock Items',
    reorderNow: 'Reorder immediately',
    stockValuation: 'Stock Valuation',
    atCost: 'At wholesale cost',
    searchPlaceholder: 'Search atta, dal, oil, soap in English/Hindi/Telugu...',
    addNewProduct: 'Add New Product',
    allCategories: 'All',
    statusOk: 'Healthy (OK)',
    statusLow: 'Low Stock',
    statusOut: 'Out of Stock',
    currentStock: 'Current Stock',
    reorderLimit: 'Reorder Limit',
    salePrice: 'Sale Price',
    stockInAction: 'Stock IN (+)',
    stockOutAction: 'Stock OUT (-)',
    noProductsFound: 'No products found',

    // Khata
    totalMarketUdhaar: 'Total Udhaar Outstanding',
    customerAccounts: 'Customer Accounts',
    voiceUdhaarBtn: 'Speak to Record Udhaar',
    searchCustomer: 'Search customer name or phone...',
    customerLedger: 'Customer Ledger',
    creditLimit: 'Credit Limit',
    availableLimit: 'Available Limit',
    giveUdhaar: '+ Give Credit (Udhaar)',
    takePayment: '✓ Receive Payment',
    txnHistory: 'Transaction History',
    noTxns: 'No previous transactions found for this customer',
    entryModalTitle: 'Add Khata Entry',
    amountLabel: 'Amount (₹)',
    notesLabel: 'Notes / Item Details',
    saveEntry: 'Save to Khata',
    cancel: 'Cancel',

    // Analytics
    aiPredictiveTitle: 'AI Predictive Reorder Intelligence',
    predictiveSubtitle: 'Automated runout forecasting based on 30-day consumption velocity',
    deadStockTitle: 'Dead Stock & Trapped Capital',
    deadStockSubtitle: 'Items with zero movement for 30+ days holding working capital',
    daysLeft: 'Days of Stock Left',
    dailyBurn: 'Daily Velocity',
    suggestedReorder: 'Suggested Order',
    urgencyCritical: 'Critical',
    urgencyHigh: 'High',
    urgencyMedium: 'Medium',
    tiedUpCapital: 'Tied Up Capital',
    lastSale: 'Last Sale',
    daysAgo: 'days ago',
    neverSold: 'Never Sold',

    // Challan
    challanTitle: 'Supplier Challan / Bill OCR',
    challanSubtitle: 'Upload wholesaler challans to auto-ingest line items into Postgres',
    uploadChallan: 'Choose or Snap Challan Photo',
    parseChallan: 'Scan Delivery Challan',
    extractedItems: 'Extracted Line Items',
    commitToStock: 'Commit All to Stock',

    // Daily Briefing
    briefingTitle: '24-Hour Voice Briefing',
    briefingSubtitle: 'Live spoken summary computed directly from Postgres transactions',
    listenBriefing: 'Listen Spoken Briefing',
    stopBriefing: 'Stop Spoken Audio',
    total24hSales: '24h Total Sales',
    stockInCount: 'Stock IN Batches',
    stockOutCount: 'Customer Sales',
    newUdhaar24h: 'New Udhaar (24h)',
    aiSummaryText: 'AI Store Performance Review',

    // Voice Modal
    voiceModalTitle: 'Voice Stock & Khata Entry',
    listeningStatus: 'Listening... speak naturally',
    processingVoice: 'AI is parsing your speech...',
    voicePlaceholder: 'e.g. "Five bags Aashirvaad atta arrived at 2100" or "Ramesh took groceries for 850"',
    tryExamples: 'Quick Voice Examples (click to test):',

    // Stock In / Out Modal
    stockInModalTitle: 'Record Stock Inward (Stock IN)',
    stockOutModalTitle: 'Record Stock Sale (Stock OUT)',
    stockDirectionLabel: 'Select Movement Type',
    qtyLabel: 'Quantity',
    unitLabel: 'Trade Unit',
    unitPriceLabel: 'Unit Price (₹)',
    totalValueLabel: 'Total Transaction Value',
    submitStockInBtn: 'Save Stock IN (+ Stock)',
    submitStockOutBtn: 'Save Stock OUT (- Stock)',
    baseQtyCalc: 'Base Unit Equivalent',

    // Add New Product Modal
    addProductTitle: 'Add New Product to Catalog',
    productNameLabel: 'Product Name *',
    productNamePlaceholder: 'e.g. Aashirvaad Chakki Atta',
    categoryLabel: 'Category *',
    tradeUnitLabel: 'Trade Unit (Wholesale)',
    baseUnitLabel: 'Base Unit (Retail)',
    multiplierLabel: 'Conversion Multiplier (1 Trade Unit = how many Base Units)',
    currentStockLabel: 'Opening Stock',
    reorderThresholdLabel: 'Reorder Warning Limit',
    salePriceLabel: 'Sale Price (₹)',
    costPriceLabel: 'Cost Price (₹)',
    saveProductBtn: 'Save New Product',

    // Unit Conversion Modal
    unitConversionTitle: 'Unit Conversion Settings',
    unitConversionSubtitle: 'Configure trade wholesale to retail quantity multipliers',
    saveConversionBtn: 'Save Conversion',

    // Settings Modal
    settingsModalTitle: 'Supabase Connection Settings',
    settingsModalSubtitle: 'Configure cloud database URL and public API credentials',
    urlLabel: 'Project URL',
    keyLabel: 'Anon Public Key',
    testConnBtn: 'Test Connection',
    saveConnBtn: 'Save & Reload',
    clearConnBtn: 'Reset to Defaults',

    // Billing Portal
    billingTitle: 'Shop Plans & Subscriptions',
    billingSubtitle: 'Choose the best plan tailored for your store size',
    currentPlanBadge: 'Current Plan',
    upgradePlanBtn: 'Upgrade Plan',
    startTrialBtn: 'Start 14-Day Free Trial',

    // Referral Card
    referralTitle: 'Refer a Merchant Friend',
    referralSubtitle: 'Invite fellow store owners. Both get 1 month of Free Premium!',
    copyLinkBtn: 'Copy Referral Link',
    copiedLinkBtn: '✓ Copied!',
    totalReferredLabel: 'Total Referred',
    rewardsEarnedLabel: 'Rewards Earned',

    // Alerts Drawer
    alertsDrawerTitle: 'Live Stock Alerts',
    spokenAlertsBtn: 'Listen Spoken Alerts',
    allClearTitle: 'All Clear!',
    allClearMsg: 'All items are currently above safe reorder thresholds.',
    resolveAlertBtn: 'Resolve Alert',
  },
};

export function getTranslations(lang: SupportedLanguage) {
  return translations[lang] || translations.hi;
}
