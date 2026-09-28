const API_KEY = "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";

// 1. Funzione per comprimere e ridimensionare l'immagine
function comprimiImmagine(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX_WIDTH = 1024;
        let width = img.width;
        let height = img.height;

        if (width > MAX_WIDTH) {
          height *= MAX_WIDTH / width;
          width = MAX_WIDTH;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);
        
        resolve(canvas.toDataURL("image/jpeg", 0.7));
      };
    };
    reader.onerror = (error) => reject(error);
  });
}

// 2. Chiamata API corretta con max_tokens ridotto
async function inviaRichiestaAI(messagesPayload) {
  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: messagesPayload,
        temperature: 0.2,
        max_tokens: 4000 // Risolve l'errore dei crediti OpenRouter
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || "Errore API");
    }

    return data.choices[0].message.content;
  } catch (err) {
    throw err;
  }
}

// 3. Funzione di analisi della versione
async function analizzaVersione() {
  const fileInput = document.getElementById("fotoVersione");
  const titoloLibro = document.getElementById("titoloLibro").value.trim();
  const isbn = document.getElementById("isbn").value.trim();
  const titolo = document.getElementById("titolo").value.trim();
  const incipit = document.getElementById("incipit").value.trim();

  const risultatiSection = document.getElementById("risultati");
  const outputAnalisi = document.getElementById("output-analisi");

  const haFoto = fileInput && fileInput.files.length > 0;

  if (!haFoto && !titolo && !incipit) {
    alert("Carica una foto oppure inserisci il titolo e l'incipit.");
    return;
  }

  risultatiSection.classList.remove("hidden");
  outputAnalisi.innerHTML = "<p style='color: #0d6efd;'><b>Analisi in corso...</b></p>";

  const promptAnalisi = `
Sei un docente di latino. Analizza il testo in modo schematico e diretto:
${haFoto ? "Leggi il testo dall'immagine." : ""}
Contesto: Titolo: "${titolo}", Libro: "${titoloLibro}" (${isbn}), Incipit: "${incipit}".

Fornisci:
1. TESTO LATINO
2. TRADUZIONE ITALIANA
3. ANALISI PERIODO (Principali e Subordinate)
4. ANALISI LOGICA (Soggetto, Predicato, Complementi)
5. PARADIGMI VERBI
6. COSTRUTTI PARTICOLARI
`;

  try {
    let messages = [];

    if (haFoto) {
      const base64Compresso = await comprimiImmagine(fileInput.files[0]);
      messages = [
        {
          role: "user",
          content: [
            { type: "text", text: promptAnalisi },
            { type: "image_url", image_url: { url: base64Compresso } }
          ]
        }
      ];
    } else {
      messages = [{ role: "user", content: promptAnalisi }];
    }

    const risp = await inviaRichiestaAI(messages);
    outputAnalisi.innerHTML = `<div style="white-space: pre-wrap; font-family: inherit; line-height: 1.5;">${risp}</div>`;
  } catch (error) {
    outputAnalisi.innerHTML = `<p style='color:red;'><b>Errore:</b> ${error.message}</p>`;
  }
}

async function inviaDomandaChat() {
  const chatInput = document.getElementById("chat-input");
  const chatBox = document.getElementById("chat-box");
  const testoDomanda = chatInput.value.trim();

  if (!testoDomanda) return;

  chatBox.innerHTML += `<div class="msg-user"><b>Tu:</b> ${testoDomanda}</div>`;
  chatInput.value = "";
  chatBox.scrollTop = chatBox.scrollHeight;

  try {
    const rispChat = await inviaRichiestaAI([{ role: "user", content: `Rispondi in modo conciso al dubbio di latino: "${testoDomanda}"` }]);
    chatBox.innerHTML += `<div class="msg-ai"><b>Tutor:</b> ${rispChat}</div>`;
    chatBox.scrollTop = chatBox.scrollHeight;
  } catch (error) {
    chatBox.innerHTML += `<div class="msg-ai" style="color:red;"><b>Tutor:</b> Errore di connessione.</div>`;
  }
}
