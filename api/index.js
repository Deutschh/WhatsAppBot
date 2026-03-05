const express = require("express");
const app = express();
app.use(express.json());

const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN;

// 1. Função para enviar TEMPLATE (Boas-vindas)
async function sendWhatsAppTemplate(to) {
  try {
    const response = await fetch(`https://graph.facebook.com/v22.0/${PHONE_NUMBER_ID}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${WHATSAPP_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: to,
        type: "template",
        template: {
          name: "boas_vindas_deutschbot",
          language: { code: "pt_BR" }
        }
      }),
    });
    const data = await response.json();
    console.log("Status do envio do Template:", JSON.stringify(data, null, 2));
  } catch (error) {
    console.error("Erro ao enviar template:", error);
  }
}

// 2. Função para enviar MENSAGEM DE TEXTO (Corrigida)
async function sendWhatsAppMessage(to, text) {
  try {
    const response = await fetch(`https://graph.facebook.com/v22.0/${PHONE_NUMBER_ID}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${WHATSAPP_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: to,
        type: "text",
        text: { body: text },
      }),
    });
    const data = await response.json();
    console.log(`📡 Resposta da Meta (Texto) para ${to}:`, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error("❌ Erro ao enviar texto:", error);
  }
}

// 3. Função para BOTÕES INTERATIVOS
async function sendInteractiveButtons(to, text, buttons) {
  try {
    const response = await fetch(`https://graph.facebook.com/v22.0/${PHONE_NUMBER_ID}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${WHATSAPP_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: to,
        type: "interactive",
        interactive: {
          type: "button",
          body: { text: text },
          action: {
            buttons: buttons.map((btn, index) => ({
              type: "reply",
              reply: { id: `btn_${index}`, title: btn }
            }))
          }
        }
      }),
    });
    const data = await response.json();
    console.log(`📡 Resposta da Meta (Botões) para ${to}:`, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error("❌ Erro ao enviar botões:", error);
  }
}

// WEBHOOK Handshake
app.get("/api", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    return res.status(200).send(challenge);
  }
  res.sendStatus(403);
});

// WEBHOOK Recebimento
app.post("/api", async (req, res) => {
  const body = req.body;
  if (body.object === "whatsapp_business_account") {
    const value = body.entry?.[0]?.changes?.[0]?.value;
    const message = value?.messages?.[0];
    const statuses = value?.statuses?.[0];

    if (statuses) {
      console.log(`📈 Status: ${statuses.status} | ID: ${statuses.id}`);
      if (statuses.errors) console.log("❌ Erro:", JSON.stringify(statuses.errors, null, 2));
    }

    if (message) {
      const from = message.from;
      const numeroDestino = from;

      if (message.type === "text") {
        const msgText = message.text.body.toLowerCase().trim();
        if (["oi", "menu", "ola"].includes(msgText)) {
          await sendInteractiveButtons(
            numeroDestino, 
            "*Atendimento DeutschBot* 🤖\nEscolha uma opção:", 
            ["Serviços 💻", "Orçamento 📈", "Falar com Humano"]
          );
        } else {
          await sendWhatsAppMessage(numeroDestino, "Digite *MENU* para ver as opções.");
        }
      } else if (message.type === "interactive") {
        const title = message.interactive.button_reply.title;
        await sendWhatsAppMessage(numeroDestino, `Você escolheu: ${title}`);
      }
    }
    return res.sendStatus(200);
  }
  res.sendStatus(404);
});

module.exports = app;