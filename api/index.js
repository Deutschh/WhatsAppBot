const express = require("express");
const app = express();
app.use(express.json());

// CONFIGURAÇÕES (Certifique-se de que estas variáveis estão na Vercel!)
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN;

// 1. Função Central de Envio
// Esta função lida com qualquer tipo de mensagem (texto, botões ou template)
async function sendRequest(payload) {
  try {
    const response = await fetch(`https://graph.facebook.com/v22.0/${PHONE_NUMBER_ID}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${WHATSAPP_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ 
        messaging_product: "whatsapp", 
        ...payload 
      }),
    });

    const data = await response.json();
    console.log("📡 Resposta da Meta:", JSON.stringify(data, null, 2));
  } catch (error) {
    console.error("❌ Erro na requisição à Meta:", error);
  }
}

// 2. Funções Auxiliares (Simplificam a chamada no seu código)
const sendWhatsAppTemplate = (to) => 
  sendRequest({ to, type: "template", template: { name: "hello_world", language: { code: "en_us" } } });

const sendWhatsAppMessage = (to, text) => 
  sendRequest({ to, type: "text", text: { body: text } });

const sendInteractiveButtons = (to, text, buttons) => 
  sendRequest({
    to,
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
  });

// 3. WEBHOOK: Validação inicial (Handshake com a Meta)
app.get("/api", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    return res.status(200).send(challenge);
  }
  res.sendStatus(403);
});

// 4. WEBHOOK: Recebimento de Mensagens e Logs de Status
app.post("/api", async (req, res) => {
  const value = req.body.entry?.[0]?.changes?.[0]?.value;
  const message = value?.messages?.[0];
  const statuses = value?.statuses?.[0];

  // Monitoramento de Entrega (Para ver se deu erro de localização 130497)
  if (statuses) {
    console.log(`📈 Status: ${statuses.status} | ID: ${statuses.id}`);
    if (statuses.errors) {
      console.log("❌ Erro de Entrega Final:", JSON.stringify(statuses.errors, null, 2));
    }
  }

  // Processamento de Mensagens Recebidas
  if (message) {
    const from = message.from;
    console.log(`📩 Mensagem de ${from}: ${message.text?.body || "Tipo: " + message.type}`);

    // Lógica para Mensagens de Texto
    if (message.type === "text") {
      const msgText = message.text.body.toLowerCase().trim();

      if (["oi", "menu", "ola"].includes(msgText)) {
        await sendInteractiveButtons(
          from, 
          "*Deutsch Solutions* 🤖\nOlá! Escolha uma opção para continuarmos:", 
          ["Serviços 💻", "Orçamento 📈", "Falar com Humano"]
        );
      } else {
        await sendWhatsAppMessage(from, "Ainda não entendo essa mensagem. 🤔 Digite *MENU* para ver as opções.");
      }
    } 
    
    // Lógica para Cliques nos Botões
    else if (message.type === "interactive") {
      const buttonTitle = message.interactive.button_reply.title;
      console.log(`🔘 Botão clicado: ${buttonTitle}`);

      if (buttonTitle.includes("Serviços")) {
        await sendWhatsAppMessage(from, "Trabalho com Landing Pages, Bots de WhatsApp e sistemas sob medida.");
      } else if (buttonTitle.includes("Orçamento")) {
        await sendWhatsAppMessage(from, "Me conte um pouco mais sobre o seu projeto para eu gerar um orçamento!");
      } else {
        await sendWhatsAppMessage(from, "O Guilherme será notificado e entrará em contato em breve! ⏳");
      }
    }
  }

  res.sendStatus(200);
});

module.exports = app;