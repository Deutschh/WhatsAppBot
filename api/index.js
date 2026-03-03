const express = require('express');
const app = express();
app.use(express.json());

// Esse é o Token que você inventará para colocar no painel da Meta
const VERIFY_TOKEN = "seu_token_secreto_aqui"; 

// Validação do Webhook (GET)
app.get('/api', (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
        return res.status(200).send(challenge);
    }
    res.sendStatus(403);
});

// Recebimento de Mensagens (POST)
app.post('/api', (req, res) => {
    const body = req.body;

    if (body.object === 'whatsapp_business_account') {
        if (body.entry?.[0]?.changes?.[0]?.value?.messages?.[0]) {
            const msg = body.entry[0].changes[0].value.messages[0];
            console.log(`Mensagem de ${msg.from}: ${msg.text.body}`);
            
            // Aqui futuramente enviaremos a resposta de volta
        }
        return res.sendStatus(200);
    }
    res.sendStatus(404);
});

module.exports = app;