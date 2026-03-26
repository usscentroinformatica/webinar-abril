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
      console.log('📡 GET - URL:', url);
      
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
    
    // POST - Enviar registro
    if (req.method === 'POST') {
      // Obtener los datos del body
      const body = req.body;
      console.log('📦 Body recibido:', JSON.stringify(body, null, 2));
      
      // Verificar datos mínimos
      if (!body || !body.nombreCompleto) {
        console.error('❌ Datos incompletos');
        return res.status(400).json({ 
          success: false, 
          error: 'Faltan datos: nombreCompleto es requerido'
        });
      }
      
      // CONSTRUIR FormData EXACTAMENTE como lo hace tu prueba en Apps Script
      const formData = new URLSearchParams();
      
      // Agregar todos los campos que tu doPost espera
      formData.append('nombreCompleto', body.nombreCompleto || '');
      formData.append('curso', body.curso || '');
      formData.append('pead', body.pead || '');
      formData.append('comentarios', body.comentarios || '');
      formData.append('solicitaCertificado', body.solicitaCertificado || 'no');
      formData.append('tipoUsuario', body.tipoUsuario || '');
      formData.append('email', body.email || '');
      formData.append('correo', body.correo || body.email || ''); // Por si acaso
      
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
      
      // Intentar parsear la respuesta
      let result;
      try {
        result = JSON.parse(text);
        console.log('✅ Respuesta parseada:', result);
      } catch (parseError) {
        console.error('❌ Error parseando JSON:', parseError.message);
        // Si no es JSON, pero la respuesta indica éxito, asumir éxito
        if (text.includes('exitoso') || text.includes('success') || text.includes('registrado')) {
          result = { success: true, message: 'Registro procesado' };
        } else {
          result = { success: false, error: 'Respuesta inválida', raw: text };
        }
      }
      
      // Devolver respuesta al frontend
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
