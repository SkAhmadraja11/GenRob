# GenRob Voice Transcripts Specification

This document provides representative voice transcripts across Hindi, Telugu, and English/code-mixed trade vernacular used by Indian kirana store owners, wholesalers, and traders. Each example showcases the raw transcript, phonetic nuances, regional trade vocabulary, and the resulting structured JSON output from the NLU Edge Function.

---

## 1. Hindi Stock Inward (माल आवक)

### Raw Utterance:
> *"पांच बोरा आशीर्वाद आटा आया २१०० में पचास किलो वाला"*  
> **Phonetic (Hinglish)**: `Paanch bora Aashirvaad atta aaya ekkis sau mein pachaas kilo wala`

### Vernacular Concepts:
- **"पांच बोरा" (5 bora)**: Indian trade wholesale unit where 1 bag = 50kg.
- **"आया" (Aaya)**: Direction keyword indicating goods received inward (`type = 'in'`).
- **"२१०० में" (2100 mein)**: Wholesale purchase rate per bag in INR.
- **"पचास किलो वाला" (50 kg wala)**: Packaging specification mapped to base unit.

### Expected Parsed JSON:
```json
{
  "intent": "stock_in",
  "product_name": "Aashirvaad Shudh Chakki Atta",
  "category": "Grains & Atta",
  "quantity": 5,
  "unit": "bag",
  "base_unit": "kg",
  "multiplier": 50,
  "calculated_base_qty": 250,
  "price": 2100.00,
  "total_amount": 10500.00,
  "direction": "in",
  "customer_name": null,
  "confidence": 0.96,
  "summary_text_hi": "5 बोरा (250 kg) आशीर्वाद आटा स्टॉक में दर्ज हुआ",
  "summary_text_te": "5 బస్తాల (250 kg) గోధుమ పిండి స్టాక్ లో చేర్చబడింది",
  "summary_text_en": "5 bags (250 kg) Aashirvaad Atta recorded as Stock IN"
}
```

---

## 2. Telugu Stock Outward / Sales (అమ్మకం / సేల్స్)

### Raw Utterance:
> *"రెండు డబ్బాల ఫార్చూన్ నూనె అమ్మాము హోటల్ వాళ్ళకి రెండు వేల నూట యాభై రూపాయలు"*  
> **Phonetic (Teluglish)**: `Rendu dabbala Fortune noone ammamu hotel vallaki rendu vela noota yabai rupayalu`

### Vernacular Concepts:
- **"రెండు డబ్బాల" (Rendu dabbala / 2 tins)**: Wholesale edible oil tin (1 tin = 15 Litres).
- **"ఫార్చూన్ నూనె" (Fortune noone)**: Fortune Sunlite Sunflower Oil.
- **"అమ్మాము" (Ammamu)**: Telugu direction keyword indicating sale outward (`type = 'out'`).
- **"రెండు వేల నూట యాభై" (2,150)**: Rate per tin (₹2,150). Total = ₹4,300.
- **"హోటల్ వాళ్ళకి" (Hotel vallaki)**: Customer category / note.

### Expected Parsed JSON:
```json
{
  "intent": "stock_out",
  "product_name": "Fortune Sunlite Sunflower Oil",
  "category": "Edible Oils",
  "quantity": 2,
  "unit": "tin",
  "base_unit": "litre",
  "multiplier": 15,
  "calculated_base_qty": 30,
  "price": 2150.00,
  "total_amount": 4300.00,
  "direction": "out",
  "customer_name": "Hotel Customer",
  "confidence": 0.95,
  "summary_text_hi": "2 टिन (30 लीटर) फॉर्च्यून सूरजमुखी तेल बिका",
  "summary_text_te": "2 డబ్బాల (30 లీటర్లు) ఫార్చూన్ నూనె అమ్మకం నమోదైంది",
  "summary_text_en": "2 tins (30 Litres) Fortune Sunflower Oil recorded as Stock OUT"
}
```

---

## 3. Code-Mixed Hinglish Khata Udhaar Logging (ग्राहक उधार)

### Raw Utterance:
> *"Ramesh tailor ji ne aath sau pachaas ka rashan udhaar liya, likh lo"*  
> **Hindi Script Equivalent**: `रमेश टेलर जी ने आठ सौ पचास का राशन उधार लिया, लिख लो`

### Vernacular Concepts:
- **"Ramesh tailor ji"**: Customer name fuzzy matched to `c0000001-...` (Ramesh Kumar Tailor).
- **"आठ सौ पचास" (850)**: Credit amount in INR.
- **"उधार लिया / लिख लो" (Udhaar liya / likh lo)**: Intent keyword triggering `khata_ledger` entry with `type = 'credit'` (debiting customer).
- **"rashan"**: Groceries / provision note.

### Expected Parsed JSON:
```json
{
  "intent": "khata_credit",
  "product_name": null,
  "quantity": null,
  "unit": null,
  "price": null,
  "total_amount": 850.00,
  "direction": "out",
  "customer_name": "Ramesh Kumar (Tailor)",
  "customer_id": "c0000001-0000-0000-0000-000000000001",
  "confidence": 0.97,
  "summary_text_hi": "रमेश कुमार के खाते में ₹850 का उधार दर्ज किया गया",
  "summary_text_te": "రమేష్ కుమార్ ఖాతాలో ₹850 అప్పు నమోదు చేయబడింది",
  "summary_text_en": "₹850 recorded as credit given to Ramesh Kumar (Tailor)"
}
```

---

## 4. Code-Mixed Multi-Language Challan Delivery Inward

### Raw Utterance:
> *"Lifebuoy soap ki ek petti aayi Begum Bazar agency se aur tees packet Tata salt"*

### Vernacular Concepts:
- **"एक पेटी" (1 petti / carton)**: 1 carton of Lifebuoy soap containing 36 pieces.
- **"तीस पैकेट" (30 packets)**: 30 individual 1kg packets of Tata Salt.
- **"आई" (Aayi)**: Stock IN delivery inward.

### Expected Parsed JSON (Multi-Item Breakdown):
```json
{
  "intent": "stock_in",
  "items": [
    {
      "product_name": "Lifebuoy Total Germ Protection Soap 125g",
      "quantity": 1,
      "unit": "carton",
      "base_unit": "piece",
      "calculated_base_qty": 36,
      "price": 1260.00,
      "direction": "in",
      "confidence": 0.94
    },
    {
      "product_name": "Tata Salt Vacuum Evaporated Iodized",
      "quantity": 30,
      "unit": "packet",
      "base_unit": "packet",
      "calculated_base_qty": 30,
      "price": 27.00,
      "direction": "in",
      "confidence": 0.96
    }
  ]
}
```
