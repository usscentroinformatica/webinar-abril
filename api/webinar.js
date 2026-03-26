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
    // ========== MANEJAR GET ==========
    if (req.method === 'GET') {
      const email = req.query.email;
      if (!email) {
        return res.status(200).json({ success: true, data: { registrado: false } });
      }
      
      console.log('📡 GET - Verificando email:', email);
      
      const url = `${GOOGLE_SCRIPT_URL}?email=${encodeURIComponent(email)}`;
      const response = await fetch(url);
      const text = await response.text();
      console.log('📥 GET Response:', text);
      
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        data = { registrado: false };
      }
      
      return res.status(200).json({ success: true, data });
    }
    
    // ========== MANEJAR POST ==========
    if (req.method === 'POST') {
      // Obtener el body
      let body = req.body;
      
      // Si el body es string, parsearlo
      if (typeof body === 'string') {
        try {
          body = JSON.parse(body);
        } catch (e) {
          console.error('❌ Error parsing body:', e);
          return res.status(400).json({ 
            success: false, 
            error: 'Body inválido' 
          });
        }
      }
      
      console.log('📦 Body recibido:', body);
      
      // Verificar datos mínimos
      if (!body || !body.nombreCompleto) {
        return res.status(400).json({ 
          success: false, 
          error: 'nombreCompleto es requerido' 
        });
      }
      
      // IMPORTANTE: Para estudiantes USS, necesitamos el curso y PEAD
      // Si no vienen en el body, hay que obtenerlos de alguna fuente
      // Por ahora, usamos lo que viene del frontend
      
      // Construir FormData para Google Apps Script
      const formData = new URLSearchParams();
      
      // Agregar todos los campos
      formData.append('nombreCompleto', body.nombreCompleto || '');
      formData.append('curso', body.curso || '');
      formData.append('pead', body.pead || '');
      formData.append('comentarios', body.comentarios || '');
      formData.append('solicitaCertificado', body.solicitaCertificado || 'no');
      formData.append('tipoUsuario', body.tipoUsuario || '');
      
      // Manejar el email (puede venir como email o correo)
      const email = body.email || body.correo || '';
      formData.append('email', email);
      
      console.log('📦 FormData a enviar:', formData.toString());
      
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
      
      // Intentar parsear la respuesta
      let googleResult;
      try {
        googleResult = JSON.parse(responseText);
      } catch (parseError) {
        console.log('⚠️ Google no devolvió JSON, creando respuesta');
        googleResult = { 
          success: true, 
          message: 'Registro procesado',
          raw: responseText.substring(0, 200)
        };
      }
      
      // Devolver respuesta al frontend
      return res.status(200).json({
        success: true,
        data: googleResult
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
