const express = require('express');
const app = express();
app.use(express.json());

// CONFIGURAÇÕES (Use variáveis de ambiente na Vercel para produção!)
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN;

async function sendWhatsAppMessage(to, text) {
    try {
        const response = await fetch(`https://graph.facebook.com/v21.0/${PHONE_NUMBER_ID}/messages`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${WHATSAPP_TOKEN}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                messaging_product: "whatsapp",
                to: to,
                type: "text",
                text: { body: text }
            })
        });
        const data = await response.json();
        console.log("Resposta da Meta:", data);
    } catch (error) {
        console.error("Erro ao enviar mensagem:", error);
    }
}

app.get('/api', (req, res) => {
    // ... (Mantenha seu código de validação igual)
});

app.post('/api', async (req, res) => {
    const body = req.body;

    if (body.object === 'whatsapp_business_account') {
        const message = body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
        
        if (message) {
            const from = message.from; // Número do cliente
            const msgText = message.text.body; // Texto que ele enviou

            console.log(`Recebido de ${from}: ${msgText}`);

            // LÓGICA DE RESPOSTA SIMPLES
            let resposta = `Olá! Você disse: "${msgText}". Eu sou o DeutschBot e logo serei um assistente completo!`;

            if (msgText.toLowerCase() === 'oi') {
                resposta = "Olá, Guilherme! Como posso ajudar com seu novo projeto hoje?";
            }

            await sendWhatsAppMessage(from, resposta);
        }
        return res.sendStatus(200);
    }
    res.sendStatus(404);
});

module.exports = app;