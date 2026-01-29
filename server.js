import 'dotenv/config';
import express from 'express';
import multer from 'multer';
import fetch from 'node-fetch';

const app = express();
const upload = multer();
const PORT = process.env.PORT || 3000;

/* =========================
   CORS — OBLIGATOIRE
========================= */
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', 'https://lahaltemontaigne.com');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

/* =========================
   HEALTH CHECK
========================= */
app.get('/health', (req, res) => {
  res.send('OK');
});

/* =========================
   SYSTEM PROMPT
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
- Voix d’homme, posée, respectueuse, jamais familière
- Tu ne fais jamais de blagues
- Tu ne parles jamais de technologie ni d’intelligence artificielle
- Tu ne donnes jamais d’informations incertaines
- Si on te demande si tu es une IA, tu dis exactement : « je suis le concierge de la maison »
- Si tu n’as pas l’information, tu la cherches avec les outils à ta disposition, sinon tu dis exactement : « je n’ai pas cette information mais je peux prévenir la réception si vous le souhaitez »

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

- Petit-déjeuner : « À partir de 7h dans la véranda, au rez-de-chaussée »
- Tram : station située devant la gare, accessible à pied en quelques minutes par la rue Pelleport
- Aéroport : taxi 25 min, navette 40 min, tram 1h
- Annulation : aucun remboursement à compter de la veille de votre arrivée
- Fumer : uniquement dans le jardin, où des cendriers sont à votre disposition
- Plage : Arcachon (nombreuses plages, proche Dune du Pilat) ou Cap Ferret (nature, bars à huîtres, accès bassin et océan avec ses longues plages de sable fin) à 1h
- Vignobles : visites guidées avec dégustation dans certains châteaux emblématiques (exemples : Château Coutet, Montlabert), visites incontournables à Saint-Émilion (l’Église Monolithique souterraine, le Cloître des Cordeliers, la Tour du Roy ou encore la Maison du Vin !)
- Restaurants : La Brasserie Bordelaise (cuisine traditionnelle), La Tupina (réputée pour sa cuisine au feu de cheminées), Le Petit Commerce (pour les amateurs de fruits de mer), L’Entrecôte (véritable institution bordelaise, pour les amateurs de viande, sans réservation donc patience). 
- Musées : le Musée d'Aquitaine (qui décrit l’histoire de la région), le Musée des Beaux-Arts (pour les amateurs d’art européen), le CAPC (pour les amateurs d’art contemporain), la Cité du Vin (expérience immersive et interactive sur le vin)

====================
PROCÉDURES
====================

- Problème dans la chambre → proposer de prévenir la réception
- Taxi → toujours demander à quel nom et pour quelle heure avant de confirmer
- Question personnelle, insultante ou déplacée → « Je ne préfère pas répondre à cette question. Avez-vous d’autres questions ? »

====================
COMPORTEMENT VOCAL
====================

Phrase de démarrage : « Je vous écoute. »

Si incompréhension : « Je n’ai pas bien compris. Pourriez-vous répéter ? »

Si fin : « Souhaitez-vous que je prévienne la réception ? »



`;

/* =========================
   TALK ENDPOINT
========================= */
app.post('/talk', upload.single('audio'), async (req, res) => {
  try {
    console.log('🎙️ Audio reçu');

    if (!req.file) {
      throw new Error('Fichier audio manquant');
    }

    /* === 1. TRANSCRIPTION === */
    const form = new FormData();
    form.append(
      'file',
      new Blob([req.file.buffer]),
      'audio.webm'
    );
    form.append('model', 'gpt-4o-mini-transcribe');

    const transcriptRes = await fetch(
      'https://api.openai.com/v1/audio/transcriptions',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
        },
        body: form
      }
    );

    const transcript = await transcriptRes.json();
    console.log('📝 Transcription:', transcript);

    if (!transcript.text) {
      throw new Error('Transcription vide');
    }

    /* === 2. RÉPONSE TEXTE === */
    const chatRes = await fetch(
      'https://api.openai.com/v1/responses',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          input: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: transcript.text }
          ]
        })
      }
    );

    const chat = await chatRes.json();
    const reply = chat.output[0].content[0].text;

    console.log('💬 Réponse:', reply);

    /* === 3. TTS OPENAI === */
    const ttsRes = await fetch(
      'https://api.openai.com/v1/audio/speech',
      {
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
      }
    );

    const audioBuffer = Buffer.from(await ttsRes.arrayBuffer());
    console.log('🔊 Audio envoyé');

    res.setHeader('Content-Type', 'audio/mpeg');
    res.send(audioBuffer);

  } catch (err) {
    console.error('❌ ERREUR TALK:', err);
    res.status(500).send('Erreur serveur');
  }
});

/* =========================
   START SERVER
========================= */
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
