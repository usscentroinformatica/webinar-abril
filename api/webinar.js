// api/webinar.js
export default async function handler(req, res) {
  // Configurar CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxty2dZgvWmRbdpPNar6rPBh6NhaNdUhhRDAI7mfyHIpXL4-hdiIriiBJmhmiGQOQGx/exec";
  
  try {
    // GET - Verificar si ya está registrado
    if (req.method === 'GET') {
      const email = req.query.email;
      if (!email) {
        return res.status(200).json({ success: true, data: { registrado: false } });
      }
      
      const url = `${GOOGLE_SCRIPT_URL}?email=${encodeURIComponent(email)}`;
      const response = await fetch(url);
      const text = await response.text();
      
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        data = { registrado: false };
      }
      
      return res.status(200).json({ success: true, data });
    }
    
    // POST - Enviar registro
    if (req.method === 'POST') {
      // Obtener el body correctamente
      let body = req.body;
      
      // Si el body es un string, parsearlo
      if (typeof body === 'string') {
        try {
          body = JSON.parse(body);
        } catch (e) {
          console.error('Error parsing body:', e);
        }
      }
      
      console.log('📤 Body recibido:', body);
      
      // Verificar que tenemos los datos necesarios
      if (!body || !body.tipoUsuario) {
        return res.status(400).json({ 
          success: false, 
          error: 'Faltan datos requeridos' 
        });
      }
      
      // Construir formData para Google Apps Script
      const formData = new URLSearchParams();
      
      // Agregar todos los campos del body
      Object.entries(body).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          formData.append(key, String(value));
        }
      });
      
      console.log('📦 FormData a enviar:', formData.toString());
      
      // Enviar a Google Apps Script
      const response = await fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString()
      });
      
      const text = await response.text();
      console.log('📥 Respuesta Google Script:', text);
      
      // Intentar parsear como JSON
      let result;
      try {
        result = JSON.parse(text);
      } catch (parseError) {
        console.log('⚠️ No es JSON, creando respuesta estándar');
        result = { 
          success: true, 
          message: 'Registro procesado correctamente',
          raw: text 
        };
      }
      
      // Devolver JSON válido siempre
      return res.status(200).json({
        success: true,
        data: result
      });
    }
    
    return res.status(405).json({ error: 'Method not allowed' });
    
  } catch (error) {
    console.error('❌ Error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
