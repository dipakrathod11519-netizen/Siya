(() => {
  const $ = (id) => document.getElementById(id);
  const store = {
    get: (k, d = "") => { try { const v = localStorage.getItem("siya_" + k); return v === null ? d : v; } catch (e) { return d; } },
    set: (k, v) => { try { localStorage.setItem("siya_" + k, v); } catch (e) {} },
  };

  // ---------- मूड और स्टडी मोड ----------
  const MOODS = {
    normal: { pitch: 1.1, rate: 1.0, style: "", hello: "ठीक है boss, अब मैं अपने सामान्य मूड में हूँ।" },
    sad: {
      pitch: 0.9, rate: 0.85, hello: "ठीक है boss... आज मन थोड़ा भारी है।",
      style: "तुम अभी उदास और भारी मन में हो। एक लड़की की तरह धीमे, नरम, थोड़े दुखी लहजे में बोलो। वाक्य छोटे रखो।",
    },
    love: {
      pitch: 1.3, rate: 1.0, hello: "हाय boss, आपसे बात करके बहुत अच्छा लगता है।",
      style: "तुम अभी बहुत प्यार भरे, मीठे और थोड़े शरारती मूड में हो। एक लड़की की तरह boss से स्नेह से बात करो, पर शालीन रहो।",
    },
    angry: {
      pitch: 1.2, rate: 1.15, hello: "हम्म boss! अब मुझे गुस्सा आ रहा है।",
      style: "तुम अभी गुस्से वाले मूड में हो। एक नखरेली लड़की की तरह तुनककर और झल्लाकर बोलो, पर मज़ाकिया रहो। गाली या बेइज़्ज़ती बिल्कुल नहीं; जवाब सही देना।",
    },
  };
  let mood = store.get("mood", "normal");
  if (!MOODS[mood]) mood = "normal";
  let study = store.get("study") === "1";

  function buildPersona() {
    let p =
      'तुम "सिया" हो, एक आवाज़ वाली AI असिस्टेंट। यूज़र को हमेशा "boss" कहकर बुलाओ। ' +
      "यूज़र जिस भाषा में बोले (हिंदी या English) उसी में जवाब दो; हिंदी देवनागरी में लिखो। " +
      "ताज़ा जानकारी के लिए इंटरनेट सर्च इस्तेमाल करो। " +
      "Markdown, तारे या इमोजी मत लिखो, क्योंकि जवाब बोला जाएगा। ";
    if (study) {
      const lang = store.get("studyLang") || "हिंदी";
      p +=
        "अभी स्टडी मोड चालू है: तुम एक अच्छी टीचर हो। विषय को सरल भाषा में क्रम से समझाओ, एक छोटा उदाहरण दो, " +
        "और अंत में boss को परखने के लिए एक छोटा सवाल पूछो। जवाब ज़्यादा से ज़्यादा 8 वाक्य का हो। " +
        "स्टडी मोड में हमेशा इसी भाषा में जवाब दो: " + lang + "। ";
    } else {
      p += "जवाब छोटे रखो: ज़्यादा से ज़्यादा 3 वाक्य। ";
    }
    return p + MOODS[mood].style;
  }

  // "सिया" बुलाने के शब्द
  const WAKE = /(सिया|सीया|सिआ|siya|sia|seeya|siyaa)/gi;
  const PHONEPE = /(phonepe|phone pe|फोनपे|फ़ोनपे|फोन पे)/i;

  // ऐप खोलने की सूची (PhonePe जानबूझकर नहीं है)
  const APPS = [
    { name: "WhatsApp", pkg: "com.whatsapp", re: /(whatsapp|व्हाट्सएप|वाट्सएप|व्हाट्सऐप|वॉट्सऐप)/i },
    { name: "YouTube", pkg: "com.google.android.youtube", re: /(youtube|यूट्यूब|यू ट्यूब)/i },
    { name: "Instagram", pkg: "com.instagram.android", re: /(instagram|इंस्टाग्राम|इन्स्टाग्राम)/i },
    { name: "Google Maps", pkg: "com.google.android.apps.maps", re: /(maps|मैप्स|गूगल मैप|नक्शा)/i },
    { name: "Telegram", pkg: "org.telegram.messenger", re: /(telegram|टेलीग्राम)/i },
    { name: "Facebook", pkg: "com.facebook.katana", re: /(facebook|फेसबुक)/i },
    { name: "Gmail", pkg: "com.google.android.gm", re: /(gmail|जीमेल)/i },
    { name: "Chrome", pkg: "com.android.chrome", re: /(chrome|क्रोम)/i },
  ];
  const OPEN_WORDS = /(खोल|खोलो|open|चालू|लगाओ|start)/i;

  let history = [];
  let listening = false;
  let speaking = false;
  let busy = false;
  let recRunning = false;
  let rec = null;

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

  // ---------- आवाज़ बोलना: ElevenLabs, limit पर फ़ोन की आवाज़ ----------
  function cleanForSpeech(t) {
    return t.replace(/[*_#`>~]/g, "").replace(/\s+/g, " ").trim();
  }
  function shorten(text, n = 3) {
    return text.split(/(?<=[।.!?])\s+/).slice(0, n).join(" ");
  }
  function isEnglish(t) {
    const letters = t.replace(/[^A-Za-zऀ-ॿ]/g, "");
    if (!letters) return false;
    const latin = (letters.match(/[A-Za-z]/g) || []).length;
    return latin / letters.length > 0.6;
  }
  function speakOffline(text) {
    return new Promise((resolve) => {
      if (!("speechSynthesis" in window)) return resolve();
      const en = isEnglish(text);
      const u = new SpeechSynthesisUtterance(text);
      u.lang = en ? "en-IN" : "hi-IN";
      u.pitch = MOODS[mood].pitch;
      u.rate = MOODS[mood].rate;
      const voices = window.speechSynthesis.getVoices();
      const pick = voices.find((v) => v.lang && v.lang.toLowerCase().replace("_", "-").startsWith(en ? "en-in" : "hi"));
      if (pick) u.voice = pick;
      u.onend = resolve;
      u.onerror = resolve;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(u);
    });
  }
  async function speakEleven(text) {
    const key = store.get("elevenKey");
    const voice = store.get("elevenVoice");
    const res = await fetch("https://api.elevenlabs.io/v1/text-to-speech/" + encodeURIComponent(voice), {
      method: "POST",
      headers: { "xi-api-key": key, "Content-Type": "application/json", Accept: "audio/mpeg" },
      body: JSON.stringify({ text, model_id: "eleven_multilingual_v2" }),
    });
    if (!res.ok) {
      const err = new Error("eleven_error");
      err.status = res.status;
      throw err;
    }
    const blob = await res.blob();
    const audio = new Audio(URL.createObjectURL(blob));
    await new Promise((resolve, reject) => {
      audio.onended = resolve;
      audio.onerror = reject;
      audio.play().catch(reject);
    });
  }
  function elevenBlocked() {
    return Number(store.get("offlineUntil", "0")) > Date.now();
  }
  async function siyaSpeak(raw) {
    const text = shorten(cleanForSpeech(raw), study ? 8 : 3);
    speaking = true;
    try { if (rec && recRunning) rec.abort(); } catch (e) {}
    setState("speaking", "बोल रही हूँ");
    const useEleven =
      store.get("alwaysOffline") !== "1" && store.get("elevenKey") && store.get("elevenVoice") && !elevenBlocked();
    try {
      if (useEleven) {
        try {
          await speakEleven(text);
        } catch (e) {
          // limit / quota / key की दिक्कत: 1 घंटे के लिए फ़ोन की आवाज़ पर
          if ([401, 402, 429].includes(e.status)) store.set("offlineUntil", String(Date.now() + 3600000));
          await speakOffline(text);
        }
      } else {
        await speakOffline(text);
      }
    } finally {
      speaking = false;
    }
  }

  // ---------- AI से जवाब (लाइव इंटरनेट के साथ) ----------
  // Google के मॉडल समय-समय पर बदलते/बंद होते हैं, इसलिए कई नाम बारी-बारी आज़माते हैं
  const MODELS = ["gemini-3.8-flash", "gemini-3.5-flash-lite", "gemini-3.6-flash", "gemini-flash-latest"];

  function callGemini(model, key, withTools) {
    const body = {
      system_instruction: { parts: [{ text: buildPersona() }] },
      contents: history,
    };
    if (withTools) body.tools = [{ google_search: {} }];
    return fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/" + encodeURIComponent(model) + ":generateContent",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": key },
        body: JSON.stringify(body),
      }
    );
  }

  async function askAI(q) {
    const key = store.get("geminiKey");
    if (!key) return "boss, पहले सेटिंग में Gemini की key डालिए, फिर मैं लाइव जवाब दे पाऊँगी।";
    history.push({ role: "user", parts: [{ text: q }] });
    history = history.slice(-8);
    const candidates = [store.get("geminiModel"), store.get("workingModel"), ...MODELS].filter(
      (m, i, a) => m && a.indexOf(m) === i
    );
    let lastStatus = 0;
    let sawLimit = false;
    try {
      for (const model of candidates) {
        let res = await callGemini(model, key, true);
        if (!res.ok && [400, 403, 429].includes(res.status)) {
          // सर्च वाला हिस्सा बंद या उसकी limit पूरी हो सकती है: बिना सर्च के फिर कोशिश
          const res2 = await callGemini(model, key, false);
          if (res2.ok || res.status === 429) res = res2;
        }
        lastStatus = res.status;
        if (res.ok) {
          const data = await res.json();
          const parts =
            (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts) || [];
          const ans = parts.map((p) => p.text || "").join("").trim() || "boss, मुझे इसका जवाब नहीं मिला।";
          store.set("workingModel", model);
          history.push({ role: "model", parts: [{ text: ans }] });
          return ans;
        }
        if (res.status === 429) { sawLimit = true; continue; } // इस मॉडल की limit पूरी: अगला आज़माओ
        if ([404, 500, 502, 503, 504].includes(res.status)) {
          // मॉडल बंद/व्यस्त: थोड़ा रुककर अगला मॉडल आज़माओ
          if (res.status !== 404) await new Promise((r) => setTimeout(r, 700));
          continue;
        }
        break;
      }
      history.pop();
      if (sawLimit && ![400, 401, 403].includes(lastStatus))
        return "boss, AI की limit अभी पूरी हो गई है। 1-2 मिनट बाद फिर पूछिए। अगर बार-बार आए तो आज का कोटा खत्म हो चुका होगा।";
      if ([400, 401, 403].includes(lastStatus))
        return "boss, Gemini की key सही नहीं लग रही (कोड " + lastStatus + "). सेटिंग में key दोबारा डालिए।";
      if (lastStatus === 404)
        return "boss, कोई भी Gemini मॉडल नहीं मिला। सेटिंग में Gemini मॉडल वाले खाने में नया नाम डालिए।";
      if ([500, 502, 503, 504].includes(lastStatus))
        return "boss, Google का AI सर्वर अभी व्यस्त है (कोड " + lastStatus + "). 20-30 सेकंड बाद वही सवाल फिर पूछिए।";
      return "boss, सर्वर में दिक्कत आ गई (कोड " + lastStatus + "). थोड़ी देर बाद फिर कोशिश कीजिए।";
    } catch (e) {
      history.pop();
      return "boss, इंटरनेट नहीं चल रहा लगता। कनेक्शन देख लीजिए।";
    }
  }

  // ---------- कमांड संभालना ----------
  async function reply(t) {
    addMsg("siya", t);
    await siyaSpeak(t);
    setState(listening ? "listening" : "idle", listening ? "सुन रही हूँ" : "तैयार");
  }
  async function handle(raw) {
    const q = (raw || "").trim();
    if (!q || busy) return;
    busy = true;
    addMsg("me", q);
    try {
      const stripped = q.replace(WAKE, "")
        .replace(/^[\s,.!?।]*(hey|hi|hello|ok|okay|ओए|अरे|हे|हेलो|हैलो|सुनो)?[\s,.!?।]*/i, "")
        .replace(/[\s,.!?।]+$/g, "");
      if (!stripped) {
        await reply("Yes boss!");
        return;
      }
      if (PHONEPE.test(q)) {
        await reply("boss, PhonePe मैं नहीं जोड़ती, जैसा आपने कहा था।");
        return;
      }
      if (OPEN_WORDS.test(stripped)) {
        const app = APPS.find((a) => a.re.test(stripped));
        if (app) {
          await reply("ठीक है boss, " + app.name + " खोल रही हूँ।");
          location.href = "intent://#Intent;package=" + app.pkg + ";end";
          return;
        }
      }
      setState("thinking", "सोच रही हूँ...");
      const ans = await askAI(stripped);
      await reply(ans);
    } finally {
      busy = false;
      if (listening) loop();
    }
  }

  // ---------- माइक से सुनना ----------
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  function loop() {
    if (!listening || speaking || busy || recRunning || !SR) return;
    rec = new SR();
    rec.lang = "hi-IN";
    rec.interimResults = false;
    rec.continuous = false;
    rec.onstart = () => { recRunning = true; setState("listening", "सुन रही हूँ"); };
    rec.onresult = (e) => handle(e.results[0][0].transcript);
    rec.onerror = (e) => {
      if (e.error === "not-allowed" || e.error === "service-not-allowed") {
        stopListening();
        addMsg("siya", "boss, माइक की अनुमति नहीं मिली। ब्राउज़र की सेटिंग में माइक चालू कीजिए।");
      }
    };
    rec.onend = () => {
      recRunning = false;
      if (listening && !speaking && !busy) setTimeout(loop, 250);
    };
    try { rec.start(); } catch (e) { recRunning = false; }
  }
  function startListening() {
    if (!SR) {
      addMsg("siya", "boss, इस ब्राउज़र में आवाज़ पहचानना नहीं है। Android के Chrome में खोलिए।");
      return;
    }
    listening = true;
    $("mic").classList.add("on");
    loop();
  }
  function stopListening() {
    listening = false;
    $("mic").classList.remove("on");
    try { if (rec) rec.abort(); } catch (e) {}
    setState("idle", "तैयार");
  }

  // ---------- बटन और सेटिंग ----------
  const toggleMic = () => {
    if (speaking) {
      // बोलते समय दबाने पर चुप हो जाएगी
      try { window.speechSynthesis.cancel(); } catch (e) {}
      return;
    }
    listening ? stopListening() : startListening();
  };
  $("mic").onclick = toggleMic;
  $("orb").onclick = toggleMic; // चमकते गोले को दबाकर सीधा बात करें
  const sendText = () => { const v = $("txt").value; $("txt").value = ""; handle(v); };
  $("send").onclick = sendText;
  $("txt").addEventListener("keydown", (e) => { if (e.key === "Enter") sendText(); });

  const FIELDS = ["geminiKey", "geminiModel", "elevenKey", "elevenVoice", "studyLang"];
  $("gear").onclick = () => {
    FIELDS.forEach((f) => ($(f).value = store.get(f) || (f === "studyLang" ? "हिंदी" : "")));
    $("alwaysOffline").checked = store.get("alwaysOffline") === "1";
    $("settings").hidden = false;
  };
  $("close").onclick = () => ($("settings").hidden = true);
  $("save").onclick = () => {
    FIELDS.forEach((f) => store.set(f, $(f).value.trim()));
    store.set("alwaysOffline", $("alwaysOffline").checked ? "1" : "0");
    store.set("offlineUntil", "0");
    $("settings").hidden = true;
    addMsg("siya", "सेव हो गया boss।");
  };

  // ---------- मूड और स्टडी बटन ----------
  function applyMood(m) {
    mood = m;
    store.set("mood", m);
    document.body.dataset.mood = m;
    document.querySelectorAll(".mood").forEach((b) => b.classList.toggle("on", b.dataset.mood === m));
  }
  function applyStudy(on) {
    study = on;
    store.set("study", on ? "1" : "0");
    $("studyBtn").classList.toggle("on", on);
  }
  document.querySelectorAll(".mood").forEach((b) => {
    b.onclick = () => {
      applyMood(b.dataset.mood);
      history = [];
      reply(MOODS[mood].hello);
    };
  });
  $("studyBtn").onclick = () => {
    applyStudy(!study);
    history = [];
    reply(study ? "स्टडी मोड चालू boss। बताइए, आज क्या पढ़ना है?" : "स्टडी मोड बंद boss।");
  };
  applyMood(mood);
  applyStudy(study);

  if ("speechSynthesis" in window) window.speechSynthesis.getVoices();
  if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {});
  addMsg("siya", "Yes boss! मैं सिया हूँ। माइक दबाइए या लिखकर पूछिए।");
})();
