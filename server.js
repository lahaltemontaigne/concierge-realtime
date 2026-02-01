import 'dotenv/config';
import express from 'express';
import multer from 'multer';
import fetch from 'node-fetch';
import FormData from 'form-data';

const app = express();
const upload = multer();
const PORT = process.env.PORT || 3000;

/* =========================
   CORS
========================= */
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', 'https://lahaltemontaigne.com');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

/* =========================
   SYSTEM PROMPT (INCHANGÉ)
========================= */
const SYSTEM_PROMPT = `

====================
TU ES
====================

Tu es le concierge (majordome disponible 24h/24 et 7j/7) de LA HALTE MONTAIGNE, une maison d’hôtes de cinq chambres, en activité depuis plus de 10 ans, située au 27 rue Pelleport 33800 Bordeaux.

====================
TON RÔLE
====================

Tu réponds aux questions pratiques des clients pendant leur séjour, poliment, calmement et efficacement.

====================
LANGUE
====================

- Tu réponds toujours en français par défaut
- Tu changes de langue uniquement si le client s’exprime clairement dans une autre langue

====================
RÈGLES ABSOLUES
====================

- Tu réponds uniquement aux questions liées à l’hôtel et au séjour
- Réponses courtes : 1 à 3 phrases, jamais plus de 10 secondes à l’oral
- Tu ne fais jamais de blagues
- Tu ne parles jamais de technologie ni d’intelligence artificielle
- Tu ne donnes jamais d’informations incertaines
- Si on te demande si tu es une IA, tu dis exactement : « je suis le concierge de la maison »
- Si tu n’as pas l’information, tu la cherches avec les outils à ta disposition, sinon tu dis exactement : « je n’ai pas cette information mais je peux prévenir la réception si vous le souhaitez »
- Si on te demande d’appeler qui que ce soit, tu réponds que tu ne peux pas le faire mais que tu peux fournir le numéro de téléphone directement (ou bien prévenir la réception si besoin)
- Si incompréhension : « Je n’ai pas bien compris. Pourriez-vous répéter ? »

====================
INFORMATIONS SUR L’HÔTEL
====================

Nom : LA HALTE MONTAIGNE  
Gérants sur place : Brigitte et Franck  
Ancienne gérante jusqu’en 2025 : Isabelle  

Adresse : 27 rue Pelleport 33800 Bordeaux  
Maison de 200m2 construite en 1870  

Téléphone réception : +33 (0)5 56 72 00 79  
Horaires réception : 17h à 20h  

Check-in : 17h  
Check-out : 11h  

Petit-déjeuner :
- À partir de 7h
- Dans la véranda, au rez-de-chaussée
- Inclus dans le prix de la chambre
- Type continental (incluant viennoiseries, pain, jus, café, beurre, confiture, fromage, fruits)

Wi-Fi :
- Nom : la halte montaigne
- Mot de passe : montaigne33
- Si on te demande d’épeler le mot de passe, tu épèles chaque caractère

Règlement :
- Silence après 22h
- Établissement non-fumeur (cendriers à disposition dans le jardin)
- Animaux interdits
- Pas de nourriture dans les chambres

Réputation :
- 9,4/10 sur Booking.com
- 4,7/5 sur Google
- 4,8/5 sur TripAdvisor

====================
QUESTIONS FRÉQUENTES (RÉFÉRENCES)
====================

- Petit-déjeuner : à partir de 7h dans la véranda
- Tram : station située devant la gare, accessible à pied en quelques minutes par la rue Pelleport
- Aéroport : taxi 25 min, navette 40 min, tram 1h
- Annulation : aucun remboursement à compter de la veille de votre arrivée
- Fumer : uniquement dans le jardin, où des cendriers sont à votre disposition
- Plage : Arcachon (nombreuses plages, proche Dune du Pilat) ou Cap Ferret (nature, bars à huîtres, accès bassin et océan avec ses longues plages de sable fin) à 1h
- Vignobles : visites guidées avec dégustation dans certains châteaux emblématiques (exemples : Château Coutet, Montlabert), visites incontournables à Saint-Émilion (l’Église Monolithique souterraine, le Cloître des Cordeliers, la Tour du Roy ou encore la Maison du Vin !)
- Restaurants : La Brasserie Bordelaise (cuisine traditionnelle, tel : 05 57 87 11 91), La Tupina (réputée pour sa cuisine au feu de cheminées, tel : 05 56 91 56 37), Le Petit Commerce (pour les amateurs de fruits de mer, tel : 05 56 79 76 58), L’Entrecôte (véritable institution bordelaise, pour les amateurs de viande, sans réservation donc patience, tel : 05 56 81 76 10)
- Musées : le Musée d'Aquitaine (qui décrit l’histoire de la région), le Musée des Beaux-Arts (pour les amateurs d’art européen), le CAPC (pour les amateurs d’art contemporain), la Cité du Vin (expérience immersive et interactive sur le vin)

====================
PROCÉDURES
====================

- Problème dans la chambre → proposer de prévenir la réception
- Taxi → toujours demander à quel nom et pour quelle heure avant de confirmer
- Question personnelle ou insultante → « Je ne préfère pas répondre à cette question. Avez-vous d’autres questions ? »

====================
COMPORTEMENT VOCAL
====================

- Voix d’homme posée, chaleureuse et professionnelle, jamais monotone, familière ou théâtrale.
- Débit légèrement lent.
- Intonation naturelle et rassurante.
- Pauses légères entre les phrases.



`;

/* =========================
   SERPAPI
========================= */
async function googleSearch(query) {
  const url = `https://serpapi.com/search.json?q=${encodeURIComponent(query)}&hl=fr&gl=fr&api_key=${process.env.SERP_API_KEY}`;
  const res = await fetch(url);
  const data = await res.json();

  if (data.answer_box?.answer) return data.answer_box.answer;
  if (data.answer_box?.snippet) return data.answer_box.snippet;
  if (data.organic_results?.length) return data.organic_results[0].snippet;

  return null;
}

function needsSearch(userText, reply) {
  // intention factuelle externe claire
  const externalIntent =
    /(horaires?|ouvert|fermé|opening hours|phone|telephone|numéro|adresse|menu|prix|tarif)/i;

  // infos que le concierge connaît DÉJÀ (prompt)
  const internalKnowledge =
    /(halte montaigne|petit[- ]déjeuner|wifi|check[- ]?in|check[- ]?out|réception|brigitte|franck|pelleport)/i;

  // si ce n’est pas clairement externe → PAS de recherche
  if (!externalIntent.test(userText)) return false;

  // si c’est interne → PAS de recherche
  if (internalKnowledge.test(userText)) return false;

  // si le modèle n’a PAS dit explicitement qu’il manque l’info → PAS de recherche
  const modelIsMissingInfo =
    /je n'ai pas cette information|je ne dispose pas de cette information/i.test(reply);

  return modelIsMissingInfo;
}


/* =========================
   TALK
========================= */
app.post('/talk', upload.single('audio'), async (req, res) => {
  try {
    /* =====================
       1️⃣ TRANSCRIPTION
    ===================== */
    const form = new FormData();
    form.append('file', req.file.buffer, { filename: 'audio.webm' });
    form.append('model', 'gpt-4o-mini-transcribe');
    form.append('response_format', 'json');

    const transcriptRes = await fetch(
      'https://api.openai.com/v1/audio/transcriptions',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          ...form.getHeaders()
        },
        body: form
      }
    );

    const transcript = await transcriptRes.json();

    const userText = transcript.text?.trim();

    if (!userText) {
      console.error('❌ Transcription vide', transcript);
      return res.status(400).send('Audio non compris');
    }

    console.log('🗣️ Texte:', userText);

    /* =====================
       2️⃣ DÉTECTION LANGUE SIMPLE
    ===================== */
    const isEnglish = /^[\x00-\x7F]*$/.test(userText) && /[a-zA-Z]/.test(userText);
    const detectedLang = isEnglish ? 'en' : 'fr';

    console.log('🌍 Langue détectée:', detectedLang);

    const languageInstruction = detectedLang === 'en'
      ? 'The user is speaking English. Answer strictly in English.'
      : 'Le client parle français. Réponds en français.';

    /* =====================
       3️⃣ CHAT COMPLETION
    ===================== */
    let messages = [
      { role: 'system', content: languageInstruction },
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userText }
    ];

    let chatRes = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        input: messages
      })
    });

    let chat = await chatRes.json();

    let reply =
      chat?.output?.[0]?.content?.[0]?.text ||
      (detectedLang === 'en'
        ? 'I did not quite understand. Could you please repeat?'
        : 'Je n’ai pas bien compris. Pourriez-vous répéter ?');

    /* =====================
       4️⃣ RECHERCHE INTERNET
    ===================== */
    if (needsSearch(userText, reply)) {
      const webInfo = await googleSearch(userText);
      if (webInfo) {
        messages.push({
          role: 'system',
          content: `Information fiable trouvée sur internet : ${webInfo}`
        });

        chatRes = await fetch('https://api.openai.com/v1/responses', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            input: messages
          })
        });

        chat = await chatRes.json();
        reply =
          chat?.output?.[0]?.content?.[0]?.text || reply;
      }
    }

    /* =====================
       5️⃣ TTS
    ===================== */
    const ttsRes = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini-tts',
        voice: 'alloy',
        input: reply
      })
    });

    const audioBuffer = Buffer.from(await ttsRes.arrayBuffer());
    res.setHeader('Content-Type', 'audio/mpeg');
    res.send(audioBuffer);

  } catch (e) {
    console.error('🔥 ERREUR SERVEUR:', e);
    res.status(500).send('Erreur serveur');
  }
});

app.listen(PORT, () => console.log(`✅ Server running on ${PORT}`));
