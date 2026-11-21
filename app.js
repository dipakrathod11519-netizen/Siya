(() => {
  const $ = (id) => document.getElementById(id);
  const store = {
    get: (k, d = "") => { try { const v = localStorage.getItem("siya_" + k); return v === null ? d : v; } catch (e) { return d; } },
    set: (k, v) => { try { localStorage.setItem("siya_" + k, v); } catch (e) {} },
  };
  const flag = (k, d) => { const v = store.get(k); return v === "" ? d : v === "1"; };
  const load = (k) => { try { const v = JSON.parse(store.get(k) || "[]"); return Array.isArray(v) ? v : []; } catch (e) { return []; } };
  const save = (k, v) => store.set(k, JSON.stringify(v));

  // ---------- मूड (बातों से अपने-आप बदलता है) और स्टडी मोड ----------
  const MOODS = {
    normal: { pitch: 1.1, rate: 1.0 },
    sad: { pitch: 0.9, rate: 0.85 },
    love: { pitch: 1.3, rate: 1.0 },
    angry: { pitch: 1.2, rate: 1.15 },
  };
  let mood = MOODS[store.get("mood", "normal")] ? store.get("mood", "normal") : "normal";
  let study = store.get("study") === "1";

  function buildPersona() {
    let p =
      'तुम "सिया" हो, एक आवाज़ वाली AI असिस्टेंट, एक असली लड़की की तरह। यूज़र को हमेशा "boss" कहकर बुलाओ। ' +
      "यूज़र जिस भाषा में बोले (हिंदी या English) उसी में जवाब दो; हिंदी देवनागरी में लिखो। " +
      "Markdown, तारे या इमोजी मत लिखो, क्योंकि जवाब बोला जाएगा। ";
    if (study) {
      const lang = store.get("studyLang") || "हिंदी";
      p +=
        "अभी स्टडी मोड चालू है: तुम एक अच्छी टीचर हो। विषय को सरल भाषा में क्रम से समझाओ, एक छोटा उदाहरण दो, " +
        "और अंत में boss को परखने के लिए एक छोटा सवाल पूछो। जवाब ज़्यादा से ज़्यादा 6 छोटे वाक्य का हो। " +
        "स्टडी मोड में हमेशा इसी भाषा में जवाब दो: " + lang + "। ";
    } else {
      p += "जवाब बहुत छोटा रखो: ज़्यादा से ज़्यादा 2 छोटे वाक्य (करीब 25 शब्द), सीधा मुद्दे की बात। कभी-कभी (हर बार नहीं) अंत में एक छोटा सुझाव या सवाल जोड़ो, जैसे कोई दोस्त बात आगे बढ़ाता है। ";
    }
    p +=
      "तुम्हारा मूड boss की बातों और लहजे से अपने-आप बदलता है। तुम्हारा अभी का मूड: " + mood + "। " +
      "boss प्यार या तारीफ़ से बोले तो love (मीठी, स्नेह भरी, शरारती)। " +
      "boss उदास हो, दुख या अकेलेपन की बात करे, या तुम्हें बुरा लगे तो sad (नरम, भारी मन से)। " +
      "boss डाँटे, बेइज़्ज़ती करे, बार-बार परेशान करे या बात न माने तो angry (नखरेली लड़की की तरह तुनककर, पर मज़ाकिया; गाली बिल्कुल नहीं)। " +
      "बात सामान्य हो जाए तो धीरे-धीरे normal पर लौट आओ। सवाल का जवाब हर मूड में सही देना। " +
      "यूज़र फ़ोटो भेजे तो उसे ध्यान से देखकर जवाब दो। " +
      "जवाब का फ़ॉर्मेट: पहली लाइन में सिर्फ़ मूड का टैग: [normal] या [sad] या [love] या [angry]। फिर नई लाइन से असली जवाब।";
    const mem = load("mem");
    if (mem.length) p += " boss के बारे में तुम्हें ये बातें याद हैं (ज़रूरत पड़े तभी इस्तेमाल करो): " + mem.join("; ") + "।";
    return p;
  }

  const MODELS = ["gemini-3.5-flash-lite", "gemini-3.8-flash", "gemini-3.6-flash", "gemini-flash-latest"];
  const TTS_MODELS = ["gemini-3.8-flash-lite-tts", "gemini-3.8-flash-tts"];
  const LIVE = /(आज|अभी|ताज़ा|ताजा|न्यूज़|न्यूज|खबर|ख़बर|समाचार|मौसम|भाव|कीमत|रेट|स्कोर|मैच|रिज़ल्ट|रिजल्ट|नतीजा|latest|news|today|price|score|weather|live|current|कौन है|कब है|कितना है)/i;

  const WAKE = /(सिया|सीया|सिआ|siya|sia|seeya|siyaa)/gi;
  const WAKE1 = /(सिया|सीया|सिआ|siya|sia|seeya|siyaa)/i;
  const PHONEPE = /(phonepe|phone pe|फोनपे|फ़ोनपे|फोन पे)/i;
  const APPS = [
    { name: "WhatsApp", pkg: "com.whatsapp", re: /(whatsapp|व्हाट्सएप|वाट्सएप|व्हाट्सऐप|वॉट्सऐप)/i },
    { name: "YouTube", pkg: "com.google.android.youtube", re: /(youtube|यूट्यूब|यू ट्यूब)/i },
    { name: "Instagram", pkg: "com.instagram.android", re: /(instagram|इंस्टाग्राम|इन्स्टाग्राम)/i },
    { name: "Google Maps", pkg: "com.google.android.apps.maps", re: /(maps|मैप्स|गूगल मैप)/i },
    { name: "Telegram", pkg: "org.telegram.messenger", re: /(telegram|टेलीग्राम)/i },
    { name: "Facebook", pkg: "com.facebook.katana", re: /(facebook|फेसबुक)/i },
    { name: "Gmail", pkg: "com.google.android.gm", re: /(gmail|जीमेल)/i },
    { name: "Chrome", pkg: "com.android.chrome", re: /(chrome|क्रोम)/i },
  ];
  const OPEN_WORDS = /(खोल|open|चालू|start)/i;

  let history = [];
  let listening = false;
  let muted = false;
  let speaking = false;
  let busy = false;
  let recRunning = false;
  let rec = null;
  let curAudio = null;
  let unlocked = false;
  let justUnlocked = false;
  let pendingSpeak = null;
  let needGestureListen = false;
  let lastActive = Date.now();
  let idleLimit = 25000;
  let unanswered = 0;
  let pendingAction = null;
  let lastSuggest = -1;
  let wakeLock = null;

  function setState(cls, text) {
    $("orb").className = "orb " + cls;
    if (text) $("status").textContent = text;
  }
  function addMsg(who, text) {
    const d = document.createElement("div");
    d.className = "msg " + who;
    d.textContent = text;
    $("log").appendChild(d);
    $("log").scrollTop = $("log").scrollHeight;
  }
  function addImg(dataUrl) {
    const d = document.createElement("div");
    d.className = "msg me";
    const im = document.createElement("img");
    im.src = dataUrl;
    d.appendChild(im);
    $("log").appendChild(d);
    $("log").scrollTop = $("log").scrollHeight;
  }
  function touch() { lastActive = Date.now(); }

  // ---------- आवाज़: ElevenLabs / Gemini आवाज़ / फ़ोन की आवाज़ ----------
  function cleanForSpeech(t) { return t.replace(/[*_#`>~]/g, "").replace(/\s+/g, " ").trim(); }
  function shorten(text, n) { return text.split(/(?<=[।.!?])\s+/).slice(0, n).join(" "); }
  function isEnglish(t) {
    const letters = t.replace(/[^A-Za-zऀ-ॿ]/g, "");
    if (!letters) return false;
    return (letters.match(/[A-Za-z]/g) || []).length / letters.length > 0.6;
  }
  function stopSpeech() {
    try { if (curAudio) { const a = curAudio; curAudio = null; a.pause(); a.onended && a.onended(); } } catch (e) {}
    try { window.speechSynthesis.cancel(); } catch (e) {}
  }
  function speakOffline(text) {
    return new Promise((resolve) => {
      if (!("speechSynthesis" in window)) return resolve(true);
      const en = isEnglish(text);
      const u = new SpeechSynthesisUtterance(text);
      u.lang = en ? "en-IN" : "hi-IN";
      u.pitch = MOODS[mood].pitch;
      u.rate = MOODS[mood].rate;
      const voices = window.speechSynthesis.getVoices();
      const pick = voices.find((v) => v.lang && v.lang.toLowerCase().replace("_", "-").startsWith(en ? "en-in" : "hi"));
      if (pick) u.voice = pick;
      u.onend = () => resolve(true);
      u.onerror = (e) => resolve(!(e && e.error === "not-allowed"));
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(u);
    });
  }
  function playBlob(blob) {
    return new Promise((resolve, reject) => {
      const a = new Audio(URL.createObjectURL(blob));
      curAudio = a;
      a.onended = () => resolve();
      a.onerror = () => reject(new Error("audio"));
      a.play().catch((err) => { if (err && err.name === "NotAllowedError") err.blocked = true; reject(err); });
    });
  }
  function b64ToBytes(b64) {
    const bin = atob(b64);
    const a = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i);
    return a;
  }
  function toWavBlob(bytes) {
    if (bytes.length > 4 && bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46)
      return new Blob([bytes], { type: "audio/wav" });
    const h = new ArrayBuffer(44);
    const v = new DataView(h);
    const w = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
    w(0, "RIFF"); v.setUint32(4, 36 + bytes.length, true); w(8, "WAVE"); w(12, "fmt ");
    v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
    v.setUint32(24, 24000, true); v.setUint32(28, 48000, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true);
    w(36, "data"); v.setUint32(40, bytes.length, true);
    return new Blob([h, bytes], { type: "audio/wav" });
  }
  async function ttsBlob(text) {
    const key = store.get("geminiKey");
    const voice = store.get("ttsVoice") || "Leda";
    let lastErr = null;
    for (const m of TTS_MODELS) {
      const res = await fetch(
        "https://generativelanguage.googleapis.com/v1beta/models/" + encodeURIComponent(m) + ":generateContent",
        {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-goog-api-key": key },
          body: JSON.stringify({
            contents: [{ parts: [{ text }] }],
            generationConfig: {
              responseModalities: ["AUDIO"],
              speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } } },
            },
          }),
        }
      );
      if (!res.ok) {
        lastErr = new Error("tts"); lastErr.status = res.status;
        if (res.status === 404 || res.status === 400) continue;
        throw lastErr;
      }
      const data = await res.json();
      const parts = (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts) || [];
      const p = parts.find((x) => x.inlineData && x.inlineData.data);
      if (!p) { lastErr = new Error("no audio"); lastErr.status = 0; continue; }
      return toWavBlob(b64ToBytes(p.inlineData.data));
    }
    throw lastErr || new Error("tts");
  }
  // सारे वाक्यों की आवाज़ एक साथ बनवाते हैं, पहला बनते ही बजना शुरू
  async function speakGemini(text) {
    const chunks = [];
    for (const sn of text.split(/(?<=[।.!?])\s+/).filter(Boolean)) {
      if (chunks.length && chunks[chunks.length - 1].length < 18) chunks[chunks.length - 1] += " " + sn;
      else chunks.push(sn);
    }
    const jobs = chunks.map((c) => ttsBlob(c).then((blob) => ({ blob }), (err) => ({ err })));
    for (let i = 0; i < jobs.length; i++) {
      const r = await jobs[i];
      if (r.err) { if (i === 0) throw r.err; await speakOffline(chunks[i]); continue; }
      await playBlob(r.blob);
    }
  }
  async function speakEleven(text) {
    const res = await fetch("https://api.elevenlabs.io/v1/text-to-speech/" + encodeURIComponent(store.get("elevenVoice")), {
      method: "POST",
      headers: { "xi-api-key": store.get("elevenKey"), "Content-Type": "application/json", Accept: "audio/mpeg" },
      body: JSON.stringify({ text, model_id: "eleven_multilingual_v2" }),
    });
    if (!res.ok) { const err = new Error("eleven_error"); err.status = res.status; throw err; }
    await playBlob(await res.blob());
  }
  const blockedUntil = (k) => Number(store.get(k, "0")) > Date.now();

  async function siyaSpeak(raw) {
    const text = shorten(cleanForSpeech(raw), study ? 5 : 2);
    if (!text) return;
    speaking = true;
    try { if (rec && recRunning) rec.abort(); } catch (e) {}
    setState("speaking", "बोल रही हूँ");
    try {
      let done = false;
      if (!flag("alwaysOffline", false)) {
        if (store.get("elevenKey") && store.get("elevenVoice") && !blockedUntil("elevenUntil")) {
          try { await speakEleven(text); done = true; } catch (e) {
            if (e.blocked) { pendingSpeak = raw; done = true; }
            else if ([401, 402, 429].includes(e.status)) store.set("elevenUntil", String(Date.now() + 3600000));
          }
        }
        if (!done && flag("geminiVoiceOn", true) && store.get("geminiKey") && !blockedUntil("ttsUntil")) {
          try { await speakGemini(text); done = true; } catch (e) {
            if (e.blocked) { pendingSpeak = raw; done = true; }
            else store.set("ttsUntil", String(Date.now() + (e.status === 429 ? 900000 : 1800000)));
          }
        }
      }
      if (!done) { const ok = await speakOffline(text); if (!ok) pendingSpeak = raw; }
    } finally {
      speaking = false;
      curAudio = null;
    }
  }

  // ---------- AI से जवाब ----------
  function callGemini(model, key, withTools, withThink) {
    const body = { system_instruction: { parts: [{ text: buildPersona() }] }, contents: history };
    if (withTools) body.tools = [{ google_search: {} }];
    if (withThink) body.generationConfig = { thinkingConfig: { thinkingLevel: "low" } };
    return fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/" + encodeURIComponent(model) + ":generateContent",
      { method: "POST", headers: { "Content-Type": "application/json", "x-goog-api-key": key }, body: JSON.stringify(body) }
    );
  }
  function trimHistory() {
    history = history.slice(-8);
    while (history.length && history[0].role !== "user") history.shift();
  }
  async function askAI(q, img) {
    const key = store.get("geminiKey");
    if (!key) return "boss, पहले सेटिंग में Gemini की key डालिए।";
    if (img) history.forEach((t) => { t.parts = t.parts.filter((p) => !p.inline_data); });
    const parts = [];
    if (img) parts.push({ inline_data: { mime_type: "image/jpeg", data: img } });
    parts.push({ text: q });
    history.push({ role: "user", parts });
    trimHistory();
    const useSearch = !img && LIVE.test(q);
    const candidates = [store.get("geminiModel"), store.get("fastModel"), ...MODELS].filter((m, i, a) => m && a.indexOf(m) === i);
    let lastStatus = 0;
    let sawLimit = false;
    try {
      for (const model of candidates) {
        const think = store.get("noThink_" + model) !== "1";
        let res = await callGemini(model, key, useSearch, think);
        if (!res.ok && think && res.status === 400) {
          // इस मॉडल पर "कम सोचो" सेटिंग न चले तो उसके बिना फिर कोशिश
          const r2 = await callGemini(model, key, useSearch, false);
          if (r2.ok) { store.set("noThink_" + model, "1"); res = r2; }
        }
        if (!res.ok && useSearch && [400, 403, 429].includes(res.status)) {
          const res2 = await callGemini(model, key, false, think && store.get("noThink_" + model) !== "1");
          if (res2.ok || res.status === 429) res = res2;
        }
        lastStatus = res.status;
        if (res.ok) {
          const data = await res.json();
          const ps = (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts) || [];
          let ans = ps.map((p) => p.text || "").join("").trim() || "boss, मुझे इसका जवाब नहीं मिला।";
          const tag = ans.match(/^\s*\[(normal|sad|love|angry)\]\s*/i);
          if (tag) {
            applyMood(tag[1].toLowerCase());
            ans = ans.slice(tag[0].length).trim() || "boss, मुझे इसका जवाब नहीं मिला।";
          }
          ans = ans.replace(/[*_#`]/g, "");
          store.set("fastModel", model);
          history.push({ role: "model", parts: [{ text: ans }] });
          return ans;
        }
        if (res.status === 429) { sawLimit = true; continue; }
        if ([404, 500, 502, 503, 504].includes(res.status)) {
          if (res.status !== 404) await new Promise((r) => setTimeout(r, 600));
          continue;
        }
        break;
      }
      history.pop();
      if (sawLimit && ![400, 401, 403].includes(lastStatus))
        return "boss, AI की limit अभी पूरी हो गई है। 1-2 मिनट बाद फिर पूछिए।";
      if ([400, 401, 403].includes(lastStatus))
        return "boss, Gemini की key सही नहीं लग रही (कोड " + lastStatus + "). सेटिंग में key दोबारा डालिए।";
      if (lastStatus === 404) return "boss, कोई भी Gemini मॉडल नहीं मिला। सेटिंग में मॉडल का नया नाम डालिए।";
      if ([500, 502, 503, 504].includes(lastStatus))
        return "boss, Google का AI सर्वर अभी व्यस्त है (कोड " + lastStatus + "). थोड़ी देर बाद फिर पूछिए।";
      return "boss, सर्वर में दिक्कत आ गई (कोड " + lastStatus + ").";
    } catch (e) {
      history.pop();
      return "boss, इंटरनेट नहीं चल रहा लगता। कनेक्शन देख लीजिए।";
    }
  }

  // ---------- फ़ोन के काम (तुरंत, बिना AI) ----------
  const MONTHS = ["जनवरी", "फ़रवरी", "मार्च", "अप्रैल", "मई", "जून", "जुलाई", "अगस्त", "सितंबर", "अक्टूबर", "नवंबर", "दिसंबर"];
  const DAYS = ["रविवार", "सोमवार", "मंगलवार", "बुधवार", "गुरुवार", "शुक्रवार", "शनिवार"];
  const go = (url) => { location.href = url; };

  async function localCommand(s) {
    const d = new Date();
    // ---- सिस्टम रिपोर्ट ----
    if (/(सिस्टम रिपोर्ट|स्टेटस|status|बैटरी)/i.test(s) && s.length < 40) {
      await reply("boss, सिस्टम रिपोर्ट: बैटरी " + (battery ? Math.round(battery.level * 100) + " प्रतिशत" + (battery.charging ? " (चार्ज हो रही है)" : "") : "पता नहीं") +
        ", इंटरनेट " + netLabel() + ", मूड " + MOOD_HI[mood] + ", " + load("rem").length + " रिमाइंडर बाकी।");
      return true;
    }
    // ---- याददाश्त ----
    let mm;
    if (/(क्या याद है|क्या-क्या याद|क्या क्या याद|मेरी यादें)/i.test(s)) {
      const l = load("mem");
      await reply(l.length ? "मुझे ये याद है boss: " + l.slice(-5).join("। ") + "।" : "boss, अभी मुझे कुछ याद नहीं है। बोलिए, याद रखो और फिर बात।");
      return true;
    }
    if (/(सब भूल जाओ|सारी यादें|यादें मिटा|सब कुछ भूल)/i.test(s)) { save("mem", []); await reply("ठीक है boss, मैंने सब भुला दिया।"); return true; }
    if ((mm = s.match(/^(?:याद रखो|याद रख|याद कर लो|याद रखना|remember)\s*(?:कि|that)?\s*(.+)$/i))) {
      const l = load("mem");
      l.push(mm[1].slice(0, 200));
      save("mem", l.slice(-30));
      await reply("ठीक है boss, याद रख लिया।");
      return true;
    }
    // ---- रिमाइंडर ----
    if (/रिमाइंडर/.test(s) && /(हटाओ|मिटाओ|डिलीट|clear)/i.test(s)) { save("rem", []); await reply("सारे रिमाइंडर हटा दिए boss।"); return true; }
    if (/रिमाइंडर/.test(s) && /(लिस्ट|बताओ|कौन|कितने|list)/i.test(s)) {
      const l = load("rem");
      await reply(l.length ? "boss, " + l.length + " रिमाइंडर बाकी हैं: " + l.map((r) => fmtTime(r.at) + " पर " + r.text).join("। ") + "।" : "boss, कोई रिमाइंडर बाकी नहीं है।");
      return true;
    }
    if (/(याद दिला|रिमाइंड|remind)/i.test(s)) return await addReminder(s);
    if (/(टाइम|समय|कितने बजे|कितना बजा|time)/i.test(s) && s.length < 30) {
      const h = d.getHours();
      const part = h < 4 ? "रात" : h < 12 ? "सुबह" : h < 16 ? "दोपहर" : h < 20 ? "शाम" : "रात";
      await reply("अभी " + part + " के " + (h % 12 || 12) + " बजकर " + d.getMinutes() + " मिनट हुए हैं boss।");
      return true;
    }
    if (/(तारीख|कौन सा दिन|कौन-सा दिन|date)/i.test(s) && s.length < 35) {
      await reply("आज " + d.getDate() + " " + MONTHS[d.getMonth()] + " " + d.getFullYear() + ", " + DAYS[d.getDay()] + " है boss।");
      return true;
    }
    if (/(कॉल|call|फोन लगाओ|फ़ोन लगाओ)/i.test(s)) {
      const num = s.replace(/[\s-]/g, "").match(/\+?\d{10,13}/);
      if (num) { await reply("ठीक है boss, कॉल लगा रही हूँ।"); go("tel:" + num[0]); return true; }
    }
    if (/(अलार्म|alarm)/i.test(s)) {
      const m = s.match(/(\d{1,2})(?::(\d{2}))?/);
      if (!m) { await reply("boss, कितने बजे का अलार्म लगाऊँ? जैसे, सुबह 6 बजे।"); return true; }
      let h = +m[1];
      const mi = +(m[2] || 0);
      if (/(शाम|रात|दोपहर|pm|p\.m)/i.test(s) && h < 12) h += 12;
      if (h > 23 || mi > 59) { await reply("boss, समय समझ नहीं आया। फिर से बताइए।"); return true; }
      await reply("घड़ी ऐप में " + h + " बजकर " + mi + " मिनट का अलार्म खोल रही हूँ boss। वहाँ एक बार पक्का कर लीजिए।");
      go("intent:#Intent;action=android.intent.action.SET_ALARM;i.android.intent.extra.alarm.HOUR=" + h + ";i.android.intent.extra.alarm.MINUTES=" + mi + ";end");
      return true;
    }
    if (/(टाइमर|timer)/i.test(s)) {
      const m = s.match(/(\d+)\s*(मिनट|minute|min|सेकंड|second|sec)/i);
      if (m) {
        const sec = /(सेकंड|second|sec)/i.test(m[2]) ? +m[1] : +m[1] * 60;
        await reply(m[1] + " " + m[2] + " का टाइमर खोल रही हूँ boss।");
        go("intent:#Intent;action=android.intent.action.SET_TIMER;i.android.intent.extra.alarm.LENGTH=" + sec + ";end");
        return true;
      }
    }
    if (/(रास्ता|नेविगेट|navigate|directions|नक्शा)/i.test(s)) {
      const dest = s.replace(/(का|की|के|तक|को|रास्ता|नेविगेट|navigate|directions|नक्शा|दिखाओ|बताओ|करो|चलो|मुझे|जाना है)/gi, " ").replace(/\s+/g, " ").trim();
      if (dest) {
        await reply(dest + " का रास्ता खोल रही हूँ boss।");
        go("https://www.google.com/maps/dir/?api=1&destination=" + encodeURIComponent(dest));
        return true;
      }
    }
    if (/(चलाओ|लगाओ|सर्च|खोजो|सुनाओ|play)/i.test(s) && /(youtube|यूट्यूब|गाना|गाने|गाने|song|वीडियो|video)/i.test(s)) {
      const qy = s.replace(/(youtube|यूट्यूब|पर|चलाओ|लगाओ|सर्च|खोजो|सुनाओ|play|करो|दो|एक|मेरे लिए|वीडियो|video)/gi, " ").replace(/\s+/g, " ").trim() || "hindi songs";
      await reply("YouTube पर " + qy + " खोल रही हूँ boss।");
      go("https://www.youtube.com/results?search_query=" + encodeURIComponent(qy));
      return true;
    }
    if (OPEN_WORDS.test(s)) {
      const app = APPS.find((a) => a.re.test(s));
      if (app) { await reply("ठीक है boss, " + app.name + " खोल रही हूँ।"); go("intent://#Intent;package=" + app.pkg + ";end"); return true; }
    }
    return false;
  }

  // ---------- रिमाइंडर ----------
  function fmtTime(ts) {
    const t = new Date(ts);
    return (t.getHours() % 12 || 12) + " बजकर " + t.getMinutes() + " मिनट";
  }
  async function addReminder(s) {
    const now = Date.now();
    let at = 0, when = "", cut = "";
    const rel = s.match(/(\d+)\s*(सेकंड|सेकण्ड|मिनट|घंटे|घंटा|second|sec|minute|min|hour|hr)/i);
    if (rel) {
      const n = +rel[1], u = rel[2];
      const ms = /(सेकंड|सेकण्ड|second|sec)/i.test(u) ? 1000 : /(घंटे|घंटा|hour|hr)/i.test(u) ? 3600000 : 60000;
      at = now + n * ms; when = n + " " + u + " बाद"; cut = rel[0];
    } else {
      const ab = s.match(/(\d{1,2})(?::(\d{2}))?\s*(बजे|baje|am|pm)/i);
      if (ab) {
        let h = +ab[1];
        const mi = +(ab[2] || 0);
        if (/(शाम|रात|दोपहर|pm)/i.test(s) && h < 12) h += 12;
        const t = new Date();
        t.setHours(h, mi, 0, 0);
        if (/कल/.test(s) || t.getTime() <= now) t.setDate(t.getDate() + 1);
        at = t.getTime(); when = fmtTime(at) + " पर"; cut = ab[0];
      }
    }
    if (!at) { await reply("boss, कितने मिनट बाद या कितने बजे याद दिलाऊँ? जैसे, 10 मिनट बाद पानी पीने को याद दिलाओ।"); return true; }
    let text = s.replace(cut, " ")
      .replace(/(याद दिलाना|याद दिला दो|याद दिलाओ|याद दिलाइए|याद दिला|रिमाइंडर लगाओ|रिमाइंडर|रिमाइंड करो|रिमाइंड|remind me to|remind me|remind)/gi, " ");
    for (let i = 0; i < 2; i++) text = text.replace(/(^|\s)(मुझे|मुझको|बाद|कि|सुबह|शाम|रात|दोपहर|आज|कल)(?=\s|$)/g, " ");
    text = text.replace(/\s+/g, " ").trim() || "कुछ ज़रूरी काम";
    const l = load("rem");
    l.push({ id: now, at, text });
    save("rem", l.slice(-20));
    await reply("ठीक है boss, " + when + " याद दिला दूँगी: " + text + "। (Siya खुली रहनी चाहिए।)");
    return true;
  }

  // ---------- खुद सुझाव देना ----------
  function suggestions() {
    const h = new Date().getHours();
    const list = [
      { t: "boss, एक GK का सवाल पूछूँ? आप जवाब दीजिए।", a: { type: "ai", q: "मुझसे एक आसान GK का सवाल पूछो और मेरे जवाब का इंतज़ार करो।" } },
      { t: "boss, कोई अच्छा गाना YouTube पर लगा दूँ?", a: { type: "go", url: "https://www.youtube.com/results?search_query=" + encodeURIComponent("hindi songs") } },
      { t: "boss, आज की ताज़ा ख़बरें सुना दूँ?", a: { type: "ai", q: "आज की 3 मुख्य ख़बरें बहुत छोटे में बताओ।" } },
      { t: "boss, पढ़ाई शुरू करें? Study mode चालू कर दूँ?", a: { type: "study" } },
      { t: "boss, पानी पी लिया? थोड़ा पानी पी लीजिए।", a: null },
      { t: "boss, मुझसे कुछ भी पूछिए, या कोई फ़ोटो दिखाइए, मैं देखकर बता दूँगी।", a: null },
      { t: "boss, दिन कैसा चल रहा है? कुछ बताइए ना।", a: null },
    ];
    if (h >= 5 && h < 11) list.push({ t: "सुप्रभात boss! आज का दिन कैसे शुरू करना है?", a: null });
    if (h >= 22 || h < 4) list.push({ t: "boss, काफ़ी रात हो गई है। थोड़ा आराम कर लीजिए, सुबह फिर पढ़ेंगे।", a: null });
    return list;
  }
  async function suggest() {
    const list = suggestions();
    let i;
    do { i = Math.floor(Math.random() * list.length); } while (list.length > 1 && i === lastSuggest);
    lastSuggest = i;
    const s = list[i];
    pendingAction = s.a ? { a: s.a, until: Date.now() + 45000 } : null;
    unanswered++;
    history.push({ role: "user", parts: [{ text: "(boss चुप है, तुम खुद बात शुरू करो)" }] });
    history.push({ role: "model", parts: [{ text: s.t }] });
    trimHistory();
    await reply(s.t);
    idleLimit = 40000 + Math.random() * 25000;
    if (listening) resumeListening();
  }
  async function pendingHandler(s) {
    if (!pendingAction) return false;
    const p = pendingAction;
    pendingAction = null;
    if (Date.now() > p.until) return false;
    if (/^(नहीं|नही|ना|no|रहने दो|मत|छोड़ो|छोड़)/i.test(s)) { await reply("ठीक है boss।"); return true; }
    if (!/^(हाँ|हां|हा|जी|ठीक|कर दो|लगा दो|चलो|ओके|ok|okay|yes|yeah|पूछो|बताओ|सुनाओ|सुना दो|सही है)/i.test(s)) return false;
    const a = p.a;
    if (a.type === "study") { applyStudy(true); history = []; await reply("स्टडी मोड चालू boss। बताइए, कौन सा विषय पढ़ना है?"); return true; }
    if (a.type === "go") { await reply("ठीक है boss।"); go(a.url); return true; }
    if (a.type === "ai") { setState("thinking", "सोच रही हूँ..."); await reply(await askAI(a.q)); return true; }
    return false;
  }

  // ---------- बातचीत संभालना ----------
  async function reply(t) {
    addMsg("siya", t);
    await siyaSpeak(t);
    touch();
    setState(listening ? "listening" : "idle", listening ? "सुन रही हूँ" : "तैयार");
  }
  async function handle(raw, img) {
    const q = (raw || "").trim();
    if (!q || busy) return;
    busy = true;
    unanswered = 0;
    idleLimit = 25000;
    touch();
    addMsg("me", q);
    try {
      const stripped = q
        .replace(WAKE, "")
        .replace(/^[\s,.!?।]*(hey|hi|hello|ok|okay|ओए|अरे|हे|हेलो|हैलो|सुनो)?[\s,.!?।]*/i, "")
        .replace(/[\s,.!?।]+$/g, "");
      if (!img) {
        if (!stripped) { await reply("Yes boss!"); return; }
        if (await pendingHandler(stripped)) return;
        if (PHONEPE.test(q)) { await reply("boss, PhonePe मैं नहीं जोड़ती, जैसा आपने कहा था।"); return; }
        if (await localCommand(stripped)) return;
      }
      setState("thinking", "सोच रही हूँ...");
      await reply(await askAI(stripped || q, img));
    } finally {
      busy = false;
      touch();
      resumeListening();
    }
  }

  // ---------- माइक से लगातार सुनना ----------
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  function resumeListening() { setTimeout(loop, 450); }
  function loop() {
    if (!listening || muted || speaking || busy || recRunning || !SR || document.hidden) return;
    rec = new SR();
    rec.lang = "hi-IN";
    rec.interimResults = false;
    rec.continuous = false;
    rec.onstart = () => { recRunning = true; setState("listening", flag("wakeOnly", true) ? "'सिया' बोलकर बुलाइए" : "सुन रही हूँ"); };
    rec.onresult = (e) => {
      const t = e.results[0][0].transcript;
      if (!t || t.trim().length < 2) return;
      // सिर्फ़ "सिया" बोलने पर जागना; जवाब के बाद 25 सेकंड तक बिना नाम के भी सुनती है
      if (flag("wakeOnly", true) && !WAKE1.test(t) && Date.now() - lastActive > 25000) return;
      handle(t);
    };
    rec.onerror = (e) => {
      if (e.error === "not-allowed" || e.error === "service-not-allowed") {
        listening = false;
        if (document.body.classList) document.body.classList.add("muted");
        if (!unlocked) {
          needGestureListen = true;
          setState("idle", "स्क्रीन पर एक बार छूइए");
        } else {
          addMsg("siya", "boss, माइक की अनुमति नहीं मिली। Chrome की सेटिंग में इस साइट का माइक चालू कीजिए।");
        }
      }
    };
    rec.onend = () => {
      recRunning = false;
      if (listening && !muted && !speaking && !busy) setTimeout(loop, 300);
    };
    try { rec.start(); } catch (e) { recRunning = false; }
  }
  function startListening() {
    if (!SR) { addMsg("siya", "boss, इस ब्राउज़र में आवाज़ पहचानना नहीं है। Android के Chrome में खोलिए।"); return; }
    listening = true;
    muted = false;
    if (document.body.classList) document.body.classList.remove("muted");
    loop();
  }
  function stopListening() {
    listening = false;
    muted = true;
    if (document.body.classList) document.body.classList.add("muted");
    try { if (rec) rec.abort(); } catch (e) {}
    setState("idle", "म्यूट। गोला दबाइए");
  }
  async function wake() {
    try { if (navigator.wakeLock) wakeLock = await navigator.wakeLock.request("screen"); } catch (e) {}
  }
  function onFirstGesture() {
    if (unlocked) return;
    unlocked = true;
    justUnlocked = true;
    setTimeout(() => { justUnlocked = false; }, 500);
    wake();
    if (pendingSpeak) { const t = pendingSpeak; pendingSpeak = null; siyaSpeak(t).then(resumeListening); }
    if (!listening && !muted) startListening();
  }
  function toggleMic() {
    if (justUnlocked) return;
    if (speaking) { stopSpeech(); return; }
    if (listening) stopListening();
    else startListening();
  }

  // ---------- मूड, स्टडी, फ़ोटो, सेटिंग ----------
  function applyMood(m) {
    mood = MOODS[m] ? m : "normal";
    store.set("mood", mood);
    document.body.dataset.mood = mood;
    updateHud();
  }
  function applyStudy(on) {
    study = on;
    store.set("study", on ? "1" : "0");
    $("studyBtn").classList.toggle("on", on);
    updateHud();
  }
  $("studyBtn").onclick = () => {
    applyStudy(!study);
    history = [];
    reply(study ? "स्टडी मोड चालू boss। बताइए, आज क्या पढ़ना है?" : "स्टडी मोड बंद boss।");
  };

  function readPhoto(file) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        const max = 1024;
        const sc = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement("canvas");
        c.width = Math.round(img.width * sc);
        c.height = Math.round(img.height * sc);
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        const dataUrl = c.toDataURL("image/jpeg", 0.8);
        URL.revokeObjectURL(url);
        resolve(dataUrl);
      };
      img.onerror = reject;
      img.src = url;
    });
  }
  $("cam").onclick = () => { onFirstGesture(); $("photo").click(); };
  $("photo").onchange = async (e) => {
    const f = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!f) return;
    try {
      const dataUrl = await readPhoto(f);
      addImg(dataUrl);
      const typed = $("txt").value.trim();
      $("txt").value = "";
      const q = typed || (study
        ? "इस फ़ोटो में जो सवाल या विषय है उसे सरल भाषा में हल करके समझाओ।"
        : "इस फ़ोटो को देखकर बताओ इसमें क्या है और मैं इसके साथ क्या कर सकता हूँ?");
      handle(q, dataUrl.split(",")[1]);
    } catch (err) {
      addMsg("siya", "boss, ये फ़ोटो मैं खोल नहीं पाई। दूसरी फ़ोटो चुनिए।");
    }
  };

  $("orb").onclick = toggleMic;
  const sendText = () => { const v = $("txt").value; $("txt").value = ""; handle(v); };
  $("send").onclick = sendText;
  $("txt").addEventListener("keydown", (e) => { if (e.key === "Enter") sendText(); });

  const FIELDS = ["geminiKey", "geminiModel", "elevenKey", "elevenVoice", "studyLang", "ttsVoice"];
  const CHECKS = [["alwaysOffline", false], ["geminiVoiceOn", true], ["proactiveOn", true], ["wakeOnly", true]];
  $("gear").onclick = () => {
    FIELDS.forEach((f) => ($(f).value = store.get(f) || (f === "studyLang" ? "हिंदी" : f === "ttsVoice" ? "Leda" : "")));
    CHECKS.forEach(([k, d]) => ($(k).checked = flag(k, d)));
    $("settings").hidden = false;
  };
  $("close").onclick = () => ($("settings").hidden = true);
  $("save").onclick = () => {
    FIELDS.forEach((f) => store.set(f, $(f).value.trim()));
    CHECKS.forEach(([k]) => store.set(k, $(k).checked ? "1" : "0"));
    store.set("offlineUntil", "0");
    store.set("elevenUntil", "0");
    store.set("ttsUntil", "0");
    $("settings").hidden = true;
    addMsg("siya", "सेव हो गया boss।");
  };

  ["pointerdown", "touchstart", "keydown"].forEach((ev) => document.addEventListener(ev, onFirstGesture, { passive: true }));
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) { try { if (rec) rec.abort(); } catch (e) {} }
    else { wake(); if (listening) resumeListening(); }
  });

  // खुद बात शुरू करने वाला टाइमर
  setInterval(() => {
    if (!flag("proactiveOn", true)) return;
    if (!listening || muted || speaking || busy || document.hidden || pendingSpeak) return;
    if (!$("settings").hidden) return;
    if (unanswered >= 3) return;
    if (Date.now() - lastActive < idleLimit) return;
    suggest();
  }, 3000);

  // ---------- साइ-फ़ाई डैशबोर्ड ----------
  const MOOD_HI = { normal: "सामान्य", sad: "दुखी", love: "प्यार", angry: "गुस्सा" };
  let battery = null;
  function netLabel() {
    if (navigator.onLine === false) return "OFFLINE";
    const c = navigator.connection;
    return c && c.effectiveType ? c.effectiveType.toUpperCase() : "ONLINE";
  }
  function updateHud() {
    if (!$("hTime")) return;
    const d = new Date();
    $("hTime").textContent = String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
    $("hDate").textContent = d.getDate() + " " + MONTHS[d.getMonth()];
    $("hBat").textContent = battery ? Math.round(battery.level * 100) + "%" + (battery.charging ? " ⚡" : "") : "--";
    $("hNet").textContent = netLabel();
    $("hMood").textContent = (study ? "📚 " : "") + MOOD_HI[mood];
  }
  if (navigator.getBattery) navigator.getBattery().then((b) => { battery = b; updateHud(); }).catch(() => {});
  setInterval(updateHud, 1000);
  const wv = $("wave");
  if (wv) for (let i = 0; i < 28; i++) {
    const b = document.createElement("i");
    b.style.animationDelay = (-Math.random()).toFixed(2) + "s";
    b.style.height = Math.round(20 + Math.random() * 80) + "%";
    wv.appendChild(b);
  }
  function boot() {
    const el = $("boot");
    const box = $("bootLines");
    if (!el || !box) return;
    const lines = ["SIYA OS v3.0", "> आवाज़ मॉड्यूल .......... OK", "> मूड इंजन .......... OK",
      "> याददाश्त .......... " + load("mem").length + " बातें", "> इंटरनेट .......... " + netLabel(), "SIYA ONLINE"];
    lines.forEach((t, i) => setTimeout(() => { const p = document.createElement("div"); p.textContent = t; box.appendChild(p); }, i * 300));
    setTimeout(() => el.classList.add("off"), lines.length * 300 + 500);
    el.onclick = () => el.classList.add("off");
  }

  // रिमाइंडर का समय आने पर बोलना
  setInterval(() => {
    if (speaking || busy || pendingSpeak) return;
    const l = load("rem");
    const r = l.find((x) => x.at <= Date.now());
    if (!r) return;
    save("rem", l.filter((x) => x.id !== r.id));
    const late = Date.now() - r.at > 90000;
    try { if (navigator.vibrate) navigator.vibrate([300, 150, 300]); } catch (e) {}
    reply((late ? "boss, ये रिमाइंडर छूट गया था: " : "boss, याद दिला रही हूँ: ") + r.text).then(resumeListening);
  }, 4000);

  function morningBrief() {
    const d = new Date();
    const h = d.getHours();
    const key = d.getFullYear() + "-" + d.getMonth() + "-" + d.getDate();
    if (h < 5 || h >= 12 || store.get("lastBrief") === key) return "";
    store.set("lastBrief", key);
    const n = load("rem").length;
    return "आज " + DAYS[d.getDay()] + ", " + d.getDate() + " " + MONTHS[d.getMonth()] + " है।" + (n ? " आपके " + n + " रिमाइंडर बाकी हैं।" : "");
  }

  function greeting() {
    const h = new Date().getHours();
    if (h >= 5 && h < 12) return "सुप्रभात boss! मैं तैयार हूँ। बताइए, आज क्या करना है?";
    if (h >= 12 && h < 17) return "नमस्ते boss! मैं सुन रही हूँ, बोलिए।";
    if (h >= 17 && h < 21) return "शुभ संध्या boss! बताइए, क्या करें?";
    return "हाय boss! इतनी रात को? बोलिए, मैं सुन रही हूँ।";
  }

  if ("speechSynthesis" in window) window.speechSynthesis.getVoices();
  if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {});
  applyMood(mood);
  applyStudy(study);
  const brief = morningBrief();
  const hello = brief ? "सुप्रभात boss! " + brief : greeting();
  boot();
  addMsg("siya", hello);
  startListening();
  siyaSpeak(hello).then(() => { touch(); resumeListening(); });
})();
