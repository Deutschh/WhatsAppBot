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
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    // Verifica se o modo e o token foram enviados
    if (mode && token) {
        // Confere se o modo é 'subscribe' e se o token bate com o seu VERIFY_TOKEN
        if (mode === 'subscribe' && token === VERIFY_TOKEN) {
            console.log('WEBHOOK_VALIDADO ✅');
            // Responde com o challenge (exigência da Meta)
            return res.status(200).send(challenge);
        } else {
            // Se o token não bater, responde com 'Forbidden'
            return res.sendStatus(403);
        }
    }
    // Caso a requisição não tenha os parâmetros necessários
    res.sendStatus(400);
});

app.post('/api', async (req, res) => {
    const body = req.body;

    if (body.object === 'whatsapp_business_account') {
        const message = body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
        
        if (message && message.type === 'text') {
            const from = message.from;
            const msgText = message.text.body.toLowerCase().trim();

            console.log(`Mensagem de ${from}: ${msgText}`);

            let resposta = "";

            // LÓGICA DE DECISÃO (O Cérebro do Bot)
            switch (msgText) {
                case 'oi':
                case 'olá':
                case 'ola':
                case 'menu':
                    resposta = `*Bem-vindo ao Atendimento Inteligente!* 🤖\n\nComo posso ajudar você hoje?\n\n1️⃣ - Ver serviços de desenvolvimento\n2️⃣ - Solicitar orçamento rápido\n3️⃣ - Falar com o Guilherme (Humano)\n\n_Digite apenas o número da opção desejada._`;
                    break;
                
                case '1':
                    resposta = `*Nossos Serviços:* 💻\n\n- Criação de Landing Pages de alta conversão\n- Desenvolvimento de Bots para WhatsApp\n- Sistemas de Gestão (Logística/Financeiro)\n\nDigite *MENU* para voltar.`;
                    break;
                
                case '2':
                    resposta = `Legal! Para um orçamento rápido, por favor, descreva brevemente o que você precisa. Um de nossos especialistas entrará em contato em breve! 📈`;
                    break;
                
                case '3':
                    resposta = `Entendido! Estou avisando o Guilherme. Enquanto isso, você pode deixar sua dúvida aqui! ⏳`;
                    // Dica: Aqui você poderia disparar um e-mail para você mesmo avisando do cliente.
                    break;

                default:
                    resposta = `Desculpe, não entendi. 🤔\n\nDigite *MENU* para ver as opções disponíveis.`;
            }

            await sendWhatsAppMessage(from, resposta);
        }
        return res.sendStatus(200);
    }
    res.sendStatus(404);
});

module.exports = app;