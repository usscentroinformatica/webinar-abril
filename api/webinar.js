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
  
  // Solo permitir POST para este endpoint principal
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }
  
  try {
    // OBTENER EL BODY CORRECTAMENTE
    let body = req.body;
    
    // Si el body es un string, parsearlo
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
        console.log('✅ Body parseado correctamente');
      } catch (e) {
        console.error('❌ Error parsing body:', e);
        return res.status(400).json({ 
          success: false, 
          error: 'Body inválido, se esperaba JSON' 
        });
      }
    }
    
    console.log('📦 Body recibido:', JSON.stringify(body, null, 2));
    
    // Verificar datos mínimos
    if (!body || !body.nombreCompleto) {
      return res.status(400).json({ 
        success: false, 
        error: 'Faltan datos: nombreCompleto es requerido' 
      });
    }
    
    // CONSTRUIR FormData para Google Apps Script
    const formData = new URLSearchParams();
    
    // Agregar TODOS los campos que tu doPost espera
    formData.append('nombreCompleto', body.nombreCompleto || '');
    formData.append('curso', body.curso || '');
    formData.append('pead', body.pead || '');
    formData.append('comentarios', body.comentarios || '');
    formData.append('solicitaCertificado', body.solicitaCertificado || 'no');
    formData.append('tipoUsuario', body.tipoUsuario || '');
    formData.append('email', body.email || '');
    formData.append('correo', body.email || body.correo || '');
    
    console.log('📦 FormData a enviar:', formData.toString());
    console.log('🌐 Enviando a:', GOOGLE_SCRIPT_URL);
    
    // Enviar a Google Apps Script
    const response = await fetch(GOOGLE_SCRIPT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString()
    });
    
    const responseText = await response.text();
    console.log('📥 Respuesta Google Script:', responseText);
    
    // Intentar parsear la respuesta como JSON
    let googleResult;
    try {
      googleResult = JSON.parse(responseText);
      console.log('✅ Respuesta Google parseada:', googleResult);
    } catch (parseError) {
      console.error('❌ Google no devolvió JSON:', parseError.message);
      // Si no es JSON, crear una respuesta de éxito
      googleResult = { 
        success: true, 
        message: 'Registro procesado por Google',
        raw: responseText.substring(0, 200)
      };
    }
    
    // Devolver respuesta JSON válida al frontend
    return res.status(200).json({
      success: true,
      data: googleResult,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Error en handler:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}
