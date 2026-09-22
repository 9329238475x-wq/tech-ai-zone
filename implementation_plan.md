# Authentic Broadsheet Newspaper Theme & Information-Dense Editorial Layout

## Goal Description
यूज़र की सटीक मांग के अनुसार:
1. **एडमिन पासवर्ड अपडेट**: एडमिन पासवर्ड बदलकर `Sonuremix93` किया जाएगा।
2. **सच्चा अख़बार / न्यूज़पेपर थीम (Authentic Broadsheet Newspaper Theme)**:
   - वर्तमान डार्क/चमकीला लुक हटाकर **New York Times, Wall Street Journal और The Guardian** जैसा असली अख़बार (Newsprint Parchment `#f6f4ee`, डीप प्रिंटर इंक `#111827`, और क्लासिक डबल-लाइन रूल्स) थीम लागू करना।
3. **टेक्स्ट में सब्टल लेटरप्रेस शैडो (Text Shadows)**:
   - हेडिंग्स और शीर्षकों में लेटरप्रेस प्रिंटिंग जैसा सब्टल शैडो (`text-shadow`) जिससे टेक्स्ट असली छपे हुए अख़बार जैसा प्रीमियम दिखे।
4. **हाई-डेंसिटी और कॉम्पैक्ट लेआउट (Information-Dense Multi-Column Broadsheet)**:
   - फ़ॉन्ट्स और पैडिंग की ज़रूरत से ज़्यादा बड़ी साइज़ को कॉम्पैक्ट और संतुलित बनाकर छोटी-छोटी जगहों में भी भरपूर उपयोगी विवरण (Micro-briefs, Datelines, Tech Ticker, Editorial Columns) जोड़ना, ताकि खाली जगह बर्बाद न हो।

---

## User Review Required

> [!IMPORTANT]
> **थीम और लेआउट में मुख्य परिवर्तन:**
> 1. **कलर पैलेट**: ऑथेंटिक वॉर्म न्यूज़ प्रिंट पेपर (`#f6f4ee` / `#ffffff`), चारकोल प्रिंटर इंक (`#111827`), सब्टल क्लासिक बॉर्डर (`#d8d3c5`), और प्रेस-रेड सेरेब्रल एक्सेंट (`#991b1b`)।
> 2. **टाइपोग्राफी**: हेडिंग्स के लिए क्लासिक ब्रॉडशीट सेरिफ़ (`Playfair Display` और `Merriweather`) + बॉडी के लिए पठनीय संपादकीय टाइपोग्राफी + टेक्स्ट शैडो (`text-shadow: 0 1px 1px rgba(0,0,0,0.1)`).
> 3. **अख़बार का मास्टहेड (Masthead)**:
>    - डेटलाइन: *"Monday, September 21, 2026 • Vol. XIV No. 88 • Global Tech Edition • ₹0.00 Digital"*
>    - मुख्य ब्रॉडशीट मास्टहेड: **THE TECH AI CHRONICLE**
>    - लाइव टेक इंडेक्स टिकर: *NASDAQ AI +1.4% • GPU COMPUTE 104.2 • 120B BENCHMARK VERIFIED*
> 4. **फ्रंट पेज का 3-कॉलम ब्रॉडशीट लेआउट**:
>    - बायाँ कॉलम: *Compact Dispatches & Tech Briefs (छोटी-छोटी जगहों में भरपूर डिटेल्ड जानकारी)*
>    - मध्य कॉलम: *Hero Broadsheet Lead Story (फोटो, कैप्शन, डेटालाइन)*
>    - दायाँ कॉलम: *Trending Leaderboard #1-#5 & Verified Fact Wire*
> 5. **नया एडमिन पासवर्ड**: `Sonuremix93`

---

## Proposed Changes

### 1. Security & Password Configuration
#### [MODIFY] [.env](file:///c:/Blog-Web/.env)
- `ADMIN_PASSWORD=Sonuremix93` सेट करेंगे।

#### [MODIFY] [server.js](file:///c:/Blog-Web/server.js)
- पासवर्ड फ़ालबैक को `Sonuremix93` पर अपडेट करेंगे।

---

### 2. Newspaper Masthead & Navigation
#### [MODIFY] [views/partials/header.ejs](file:///c:/Blog-Web/views/partials/header.ejs)
- Google Fonts से `Playfair Display` और `Newsreader` लोड करेंगे।
- टॉप डेटलाइन बार (तारीख, अंक संख्या, डिजिटल एडिशन) और लाइव टेक टिकर जोड़ेंगे।
- क्लासिक ब्रॉडशीट मास्टहेड और डबल-रूल नेविगेशन बार लागू करेंगे।

---

### 3. Newspaper Design System & Master CSS
#### [MODIFY] [public/css/style.css](file:///c:/Blog-Web/public/css/style.css)
- `:root` में न्यूज़पेपर कलर टोकन्स सेट करेंगे:
  - `--bg-primary: #f6f4ee` (Newsprint Paper)
  - `--bg-surface: #ffffff`
  - `--text-main: #111827` (Deep Printer Ink)
  - `--text-body: #292524`
  - `--border-color: #d8d3c5`
  - `--border-double: 3px double #1c1917`
  - `--text-shadow-heading: 0 1px 1px rgba(0, 0, 0, 0.12)`
- हेडिंग्स में सुंदर `text-shadow` जोड़ेंगे।
- कॉम्पैक्ट पैडिंग, ग्रिड और क्लासिक कॉलम बॉर्डर्स लागू करेंगे।

---

### 4. Dense Broadsheet Front Page
#### [MODIFY] [views/index.ejs](file:///c:/Blog-Web/views/index.ejs)
- फ्रंट पेज को एक प्रामाणिक न्यूज़पेपर लेआउट में बदलेंगे:
  - हेरो लीड स्टोरी के आसपास छोटे-छोटे न्यूज़ ब्रीफ़्स (Quick Dispatches, Bulleted Briefs) जोड़ेंगे।
  - ग्रिड कार्ड्स को कॉम्पैक्ट बनाकर साइड-बाय-साइड न्यूज़प्रिंट स्टाइल में सजाएँगे।

---

### 5. Broadsheet Article Reading & Admin Page
#### [MODIFY] [public/css/article.css](file:///c:/Blog-Web/public/css/article.css)
- आर्टिकल पेज पर ड्रॉप-कैप (Drop Cap - पहला बड़ा अक्षर), क्लासिक अख़बारी डेटलाइन (`SAN FRANCISCO — 21 Sept`), और कॉम्पैक्ट 2-कॉलम साइडबार स्टाइलिंग।

#### [MODIFY] [public/css/admin.css](file:///c:/Blog-Web/public/css/admin.css)
- एडमिन सेंटर को भी साफ-सुथरे, बिना बचकाने रंगों वाले न्यूज़प्रिंट / स्लैट लुक में अनुकूलित करेंगे।

---

## Verification Plan

### Automated / Server Tests
- `node server.js` चलाकर यह जांचना कि पासवर्ड `Sonuremix93` काम कर रहा है।
- `/admin/login` पर `Sonuremix93` से लॉगिन का परीक्षण।

### Visual Verification
- होमपेज (`http://localhost:3000/`) खोलना:
  - क्या न्यूज़पेपर जैसा वॉर्म न्यूज़प्रिंट बैकग्राउंड और प्रिंटर इंक टेक्स्ट दिख रहा है?
  - क्या टेक्स्ट में क्लासिक शैडो (`text-shadow`) और सेरिफ़ टाइपोग्राफी है?
  - क्या छोटी-छोटी जगहों में भी अख़बार की तरह डिटेल्ड जानकारी भरी हुई है?
- किसी भी आर्टिकल पेज (`/post/:slug`) को खोलकर अख़बार जैसा लुक जाँचना।
