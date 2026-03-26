// api/webinar.js
export default async function handler(req, res) {
    // Habilitar CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // URL de tu Google Apps Script del WEBINAR
    const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxty2dZgvWmRbdpPNar6rPBh6NhaNdUhhRDAI7mfyHIpXL4-hdiIriiBJmhmiGQOQGx/exec";

    try {
        let url = GOOGLE_SCRIPT_URL;
        let options = { method: req.method };

        // GET para verificar duplicados
        if (req.method === 'GET') {
            if (req.query.email) {
                url += `?email=${encodeURIComponent(req.query.email)}`;
            }
            console.log('📡 Verificando registro:', url);
        }

        // POST para enviar registro
        if (req.method === 'POST') {
            const formData = new URLSearchParams();

            // Agregar todos los campos
            for (const [key, value] of Object.entries(req.body)) {
                formData.append(key, value);
            }

            options.headers = {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Accept': 'application/json'
            };
            options.body = formData.toString();

            console.log('📤 Enviando registro a Google Script:', req.body);
        }

        const response = await fetch(url, options);
        const text = await response.text();

        console.log('📥 Respuesta de Google Script:', text.substring(0, 200));

        let data;
        try {
            data = JSON.parse(text);
        } catch (parseError) {
            data = { success: true, raw: text };
        }

        return res.status(200).json({
            success: true,
            data: data
        });

    } catch (error) {
        console.error('❌ Error en función serverless:', error);
        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
}