# Siya

हिंदी और English बोलने वाली आवाज़ वाली AI असिस्टेंट। लाल-काला dashboard।

## क्या करती है
- माइक दबाकर बोलिए, Siya सुनकर जवाब बोलती है
- सिर्फ़ "Siya" बोलने पर जवाब: "Yes boss!"
- लाइव इंटरनेट जवाब (Gemini + Google Search)
- "व्हाट्सएप खोलो", "यूट्यूब खोलो" जैसे कमांड से ऐप खुलते हैं (PhonePe शामिल नहीं)
- ElevenLabs की limit खत्म होते ही अपने आप फ़ोन की Hindi आवाज़ पर चली जाती है, जिसकी कोई limit नहीं

## GitHub पर चालू करना
1. इस repo की सारी फ़ाइलें repo में अपलोड करें
2. Settings → Pages → Source: "Deploy from a branch", Branch: main, Folder: / (root) → Save
3. 1-2 मिनट बाद ऊपर Pages का लिंक दिखेगा
4. फ़ोन के Chrome में वो लिंक खोलें → तीन बिंदु → "Add to Home screen" / "Install app"

## पहली बार
ऐप में ⚙ दबाकर Gemini API key डालें (aistudio.google.com से मुफ़्त मिलती है)।
ElevenLabs key ज़रूरी नहीं। खाली रहेगी तो फ़ोन की आवाज़ चलेगी।

key कभी repo में मत लिखिए। वो सिर्फ़ ऐप की सेटिंग में डालें, फ़ोन में सेव होती है।
