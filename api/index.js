const express = require("express");
const app = express();
app.use(express.json());

const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN;

// Função para mensagens de texto simples
async function sendWhatsAppMessage(to, text) {
  try {
    await fetch(`https://graph.facebook.com/v21.0/${PHONE_NUMBER_ID}/messages`, {
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
  } catch (error) {
    console.error("Erro ao enviar texto:", error);
  }
}

// Função para BOTÕES INTERATIVOS (Máximo 3 botões)
async function sendInteractiveButtons(to, text, buttons) {
  try {
    await fetch(`https://graph.facebook.com/v21.0/${PHONE_NUMBER_ID}/messages`, {
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
  } catch (error) {
    console.error("Erro ao enviar botões:", error);
  }
}

app.get("/api", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    return res.status(200).send(challenge);
  }
  res.sendStatus(403);
});

app.post("/api", async (req, res) => {
  const body = req.body;

  if (body.object === "whatsapp_business_account") {
    const value = body.entry?.[0]?.changes?.[0]?.value;
    const message = value?.messages?.[0];

    if (message) {
      const from = message.from;
      const numeroDestino = limparNumero(from); // Limpa o número antes de qualquer coisa

      // LOGICA PARA MENSAGEM DE TEXTO
      if (message.type === "text") {
        const msgText = message.text.body.toLowerCase().trim();
        let resposta = "";

        switch (msgText) {
          case "oi":
          case "menu":
            // Enviando BOTÕES em vez de apenas texto
            await sendInteractiveButtons(
              numeroDestino, 
              "*Bem-vindo!* 🤖\nEscolha uma opção:", 
              ["Serviços 💻", "Orçamento 📈", "Falar com Humano"]
            );
            return res.sendStatus(200);

          case "1":
            resposta = `*Nossos Serviços:* 💻\n- Landing Pages\n- Bots de WhatsApp\n- Sistemas.`;
            break;
          default:
            resposta = `Não entendi. Digite *MENU* para ver as opções.`;
        }
        await sendWhatsAppMessage(numeroDestino, resposta);
      } 
      
      // LOGICA PARA CLIQUE NOS BOTÕES
      else if (message.type === "interactive") {
        const buttonTitle = message.interactive.button_reply.title;
        if (buttonTitle.includes("Serviços")) {
          await sendWhatsAppMessage(numeroDestino, "Trabalho com Landing Pages e Automação.");
        } else if (buttonTitle.includes("Orçamento")) {
          await sendWhatsAppMessage(numeroDestino, "Me conte um pouco mais sobre o seu projeto!");
        }
      }
    }
    return res.sendStatus(200);
  }
  res.sendStatus(404);
});

function limparNumero(numero) {
  let limpo = numero.replace(/\D/g, "");
  if (limpo.startsWith("55") && limpo.length === 13) {
    limpo = limpo.substring(0, 4) + limpo.substring(5);
  }
  return limpo;
}

module.exports = app;