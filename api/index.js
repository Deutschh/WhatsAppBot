const express = require("express");
const app = express();
app.use(express.json());

// CONFIGURAÇÕES (Certifique-se de que estão na Vercel!)
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN;

// 1. Função para enviar MENSAGEM DE TEXTO com Logs detalhados
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

// 2. Função para enviar BOTÕES INTERATIVOS
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

// 3. WEBHOOK: Validação inicial (Handshake)
app.get("/api", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("WEBHOOK_VALIDADO ✅");
    return res.status(200).send(challenge);
  }
  res.sendStatus(403);
});

// 4. WEBHOOK: Recebimento de mensagens e Cliques
app.post("/api", async (req, res) => {
  const body = req.body;

  if (body.object === "whatsapp_business_account") {
    const value = body.entry?.[0]?.changes?.[0]?.value;
    const message = value?.messages?.[0];

    const statuses = value?.statuses?.[0];
    if (statuses) {
      console.log(`📈 Status da Mensagem (${statuses.id}): ${statuses.status}`);
      if (statuses.errors) {
        console.log("❌ Erro de Entrega Final:", JSON.stringify(statuses.errors, null, 2));
      }
    }

    if (message) {
      const from = message.from; // O número que enviou a mensagem (ex: 5511981479715)
      
      // DICA: Use o 'from' direto sem limpar o número para testar a entrega no Sandbox
      const numeroDestino = from; 

      // --- LOGICA PARA MENSAGEM DE TEXTO ---
      if (message.type === "text") {
        const msgText = message.text.body.toLowerCase().trim();
        console.log(`📩 Mensagem recebida de ${from}: ${msgText}`);

        switch (msgText) {
          case "oi":
          case "menu":
          case "ola":
            await sendInteractiveButtons(
              numeroDestino, 
              "*Atendimento DeutschBot* 🤖\nOlá! Como posso ajudar no seu projeto hoje?", 
              ["Serviços 💻", "Orçamento 📈", "Falar com Humano"]
            );
            break;

          default:
            await sendWhatsAppMessage(numeroDestino, "Não entendi. 🤔 Digite *MENU* para ver as opções.");
        }
      } 
      
      // --- LOGICA PARA CLIQUE NOS BOTÕES ---
      else if (message.type === "interactive") {
        const buttonTitle = message.interactive.button_reply.title;
        console.log(`🔘 Botão clicado por ${from}: ${buttonTitle}`);

        if (buttonTitle.includes("Serviços")) {
          await sendWhatsAppMessage(numeroDestino, "Atualmente ofereço criação de Landing Pages e automação de processos.");
        } else if (buttonTitle.includes("Orçamento")) {
          await sendWhatsAppMessage(numeroDestino, "Perfeito! Me mande uma breve descrição do que você precisa.");
        } else {
          await sendWhatsAppMessage(numeroDestino, "Em breve o Guilherme entrará em contato com você! ⏳");
        }
      }
    }
    return res.sendStatus(200);
  }
  res.sendStatus(404);
});

module.exports = app;