import React, { useState, useEffect } from 'react';
import logoUss from '../assets/uss.png';

// Iconos SVG
const BookIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#5a2290" strokeWidth="2.5">
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
    <path d="M6 2h14a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z" />
  </svg>
);

const UserIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#63ed12" strokeWidth="2.5">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

const EmailIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#5a2290" strokeWidth="2.5">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
    <polyline points="22,6 12,13 2,6" />
  </svg>
);

const SuccessIcon = () => (
  <svg width="100" height="100" viewBox="0 0 100 100" fill="none">
    <circle cx="50" cy="50" r="45" fill="#63ed12" />
    <path d="M30 50 L43 63 L70 37" stroke="white" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const EncuestaWebinar = () => {
  // URL de tu Google Apps Script del WEBINAR
  const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxty2dZgvWmRbdpPNar6rPBh6NhaNdUhhRDAI7mfyHIpXL4-hdiIriiBJmhmiGQOQGx/exec';

  // URL de la API de Vercel (para producción)
  const API_URL = typeof window !== 'undefined' && window.location.hostname === 'localhost'
    ? GOOGLE_SCRIPT_URL
    : '/api/webinar';

  // Estados principales
  const [tipoUsuario, setTipoUsuario] = useState(''); // 'uss' o 'externo'
  const [nombreUsuario, setNombreUsuario] = useState('');
  const [correoExterno, setCorreoExterno] = useState('');
  const [estudiantesEncontrados, setEstudiantesEncontrados] = useState([]);
  const [formData, setFormData] = useState({
    nombreCompleto: '',
    comentarios: '',
    solicitaCertificado: 'no'
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [exitoModal, setExitoModal] = useState(false);
  const [baseEstudiantes, setBaseEstudiantes] = useState([]);
  const [paso, setPaso] = useState('seleccion');
  const [mensajeExito, setMensajeExito] = useState('');

  // Cargar base de datos al iniciar
  useEffect(() => {
    const cargarBaseEstudiantes = async () => {
      try {
        // Usar la misma hoja que la encuesta
        const SHEET_ID = '11ZaEQz5_Yxo7lmk0cyKYPWJWwKC2HHRi2iRJkjRUtOI';
        const response = await fetch(`https://opensheet.elk.sh/${SHEET_ID}/BaseUnificada`);

        if (response.ok) {
          const data = await response.json();
          console.log('📚 Base cargada:', data.length, 'estudiantes');
          setBaseEstudiantes(data);
        } else {
          console.warn('No se pudo cargar la base');
        }
      } catch (error) {
        console.error('Error cargando base:', error);
      }
    };

    cargarBaseEstudiantes();
  }, []);

  // Manejar selección de tipo de usuario
  const handleSeleccionTipo = (tipo) => {
    setTipoUsuario(tipo);
    setError('');

    if (tipo === 'uss') {
      setPaso('login');
    } else {
      setFormData({
        nombreCompleto: '',
        comentarios: '',
        solicitaCertificado: 'no'
      });
      setCorreoExterno('');
      setPaso('formulario');
    }
  };

  // Verificar correo USS y obtener datos desde BaseUnificada
  const verificarCorreoUSS = async () => {
    if (!nombreUsuario.trim()) {
      setError('Por favor, ingresa tu nombre de usuario');
      return;
    }

    setLoading(true);
    setError('');

    let nombreLimpio = nombreUsuario.trim().toLowerCase();
    if (nombreLimpio.includes('@')) {
      nombreLimpio = nombreLimpio.split('@')[0];
    }
    const emailCompleto = `${nombreLimpio}@uss.edu.pe`;

    console.log('🔍 Buscando registros para:', emailCompleto);

    // Buscar en BaseUnificada
    const encontrados = baseEstudiantes.filter(estudiante => {
      const emailKey = Object.keys(estudiante).find(key =>
        key.toLowerCase().includes('correo') && key.toLowerCase().includes('inst')
      ) || "Correo institucional";
      const valorEnHoja = String(estudiante[emailKey] || '').toLowerCase().trim();
      return valorEnHoja === emailCompleto;
    });

    if (encontrados.length > 0) {
      console.log('✅ Se encontraron', encontrados.length, 'cursos');

      // Verificar si ya está registrado en el webinar
      try {
        const checkUrl = `${API_URL}?email=${encodeURIComponent(emailCompleto)}`;
        const res = await fetch(checkUrl);
        const data = await res.json();

        if (data.data?.registrado === true) {
          setError('⚠️ Ya te has registrado a este webinar. Solo se permite un registro por persona.');
          setLoading(false);
          return;
        }
      } catch (e) {
        console.warn('Error verificando registro:', e);
      }

      setEstudiantesEncontrados(encontrados);

      // Obtener nombre del estudiante desde el primer curso
      const nombreKey = Object.keys(encontrados[0]).find(k =>
        k.toLowerCase().includes('nombre')
      ) || "Nombre completo";

      setFormData({
        nombreCompleto: encontrados[0][nombreKey] || '',
        comentarios: '',
        solicitaCertificado: 'no'
      });

      setPaso('formulario');
    } else {
      setError('❌ Correo no encontrado. Verifica tu nombre de usuario o contacta al administrador.');
    }

    setLoading(false);
  };

  // Manejar cambios en el formulario
  const handleChange = (e) => {
    const { name, value, type } = e.target;

    if (type === 'radio') {
      setFormData(prev => ({ ...prev, [name]: value }));
    } else if (name === 'correoExterno') {
      setCorreoExterno(value);
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  // Enviar registro
  const enviarRegistro = async () => {
    if (!formData.nombreCompleto.trim()) {
      setError('El nombre completo es requerido');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const esEstudianteUSS = tipoUsuario === 'uss' && estudiantesEncontrados.length > 0;
      const correoParaEnviar = esEstudianteUSS
        ? `${nombreUsuario}@uss.edu.pe`.toLowerCase()
        : correoExterno;

      // Construir datos según el tipo de usuario
      const datosEnvio = {
        tipoUsuario: esEstudianteUSS ? 'Estudiante USS' : 'Externo',
        nombreCompleto: formData.nombreCompleto.trim(),
        comentarios: formData.comentarios || '',
        solicitaCertificado: formData.solicitaCertificado
      };

      if (esEstudianteUSS) {
        datosEnvio.email = correoParaEnviar;
      } else {
        datosEnvio.correoExterno = correoParaEnviar;
      }

      console.log('📤 Enviando registro:', datosEnvio);

      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(datosEnvio)
      });

      const result = await response.json();
      console.log('📥 Respuesta:', result);

      if (result.success && result.data?.success) {
        setMensajeExito(result.data.message || '✅ Registro exitoso. ¡Te esperamos en el webinar!');
        setExitoModal(true);
        setTimeout(() => {
          resetearTodo();
          setExitoModal(false);
          setPaso('seleccion');
        }, 3000);
      } else {
        throw new Error(result.data?.error || 'Error al registrar');
      }

    } catch (error) {
      console.error('❌ Error:', error);
      setError(error.message || 'Error al enviar. Intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  // Resetear todo
  const resetearTodo = () => {
    setTipoUsuario('');
    setNombreUsuario('');
    setCorreoExterno('');
    setEstudiantesEncontrados([]);
    setFormData({
      nombreCompleto: '',
      comentarios: '',
      solicitaCertificado: 'no'
    });
  };

  // Modal de éxito
  if (exitoModal) {
    return (
      <div style={{
        position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.8)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
      }}>
        <div style={{
          backgroundColor: 'white', padding: '60px 50px', borderRadius: '20px',
          textAlign: 'center', maxWidth: '520px', boxShadow: '0 20px 60px rgba(0,0,0,0.4)'
        }}>
          <SuccessIcon />
          <h1 style={{ color: '#5a2290', fontSize: '36px', margin: '30px 0 16px', fontWeight: '700' }}>
            ¡Registro Exitoso!
          </h1>
          <p style={{ fontSize: '20px', color: '#555', marginBottom: '30px' }}>
            {mensajeExito}
          </p>
          <div style={{ backgroundColor: '#e8f5e1', padding: '20px', borderRadius: '12px', color: '#1a5e20', fontWeight: '600' }}>
            Tu asistencia ha sido registrada
          </div>
          <p style={{ marginTop: '30px', color: '#888', fontSize: '15px' }}>
            Redirigiendo en 3 segundos...
          </p>
        </div>
      </div>
    );
  }

  // Pantalla de selección de tipo de usuario
  if (paso === 'seleccion') {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#f5f5f5', fontFamily: 'Roboto, Arial, sans-serif' }}>
        <header style={{ backgroundColor: '#ffffff', borderBottom: '6px solid #63ed12', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
          <div style={{ maxWidth: '680px', margin: '0 auto', padding: '30px 20px', display: 'flex', justifyContent: 'center' }}>
            <img src={logoUss} alt="Universidad Señor de Sipán" style={{ width: '200px', height: 'auto' }} />
          </div>
        </header>

        <main style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '40px 20px' }}>
          <div style={{ width: '100%', maxWidth: '680px', backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 1px 6px rgba(32,33,36,0.28)', overflow: 'hidden' }}>
            <div style={{ backgroundColor: '#5a2290', color: 'white', padding: '32px 48px', textAlign: 'center' }}>
              <h2 style={{ margin: 0, fontSize: '28px', fontWeight: '400' }}>REGISTRO WEBINAR</h2>
              <div style={{ marginTop: '12px', fontSize: '16px', fontWeight: '500' }}>2026 ABRIL</div>
            </div>

            <div style={{ padding: '40px' }}>
              <div style={{ textAlign: 'center', marginBottom: '40px' }}>
                <h3 style={{ fontSize: '22px', color: '#202124', marginBottom: '16px' }}>Selecciona tu tipo de usuario</h3>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '500px', margin: '0 auto' }}>
                <button onClick={() => handleSeleccionTipo('uss')} style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  padding: '30px 20px', border: '2px solid #5a2290', borderRadius: '12px',
                  background: 'transparent', color: '#5a2290', cursor: 'pointer'
                }}>
                  <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎓</div>
                  <div style={{ fontSize: '20px', fontWeight: '600', marginBottom: '8px' }}>Estudiante USS</div>
                  <div style={{ fontSize: '14px', color: '#5f6368' }}>Ingresa con tu usuario institucional</div>
                </button>

                <button onClick={() => handleSeleccionTipo('externo')} style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  padding: '30px 20px', border: '2px solid #63ed12', borderRadius: '12px',
                  background: 'transparent', color: '#63ed12', cursor: 'pointer'
                }}>
                  <div style={{ fontSize: '48px', marginBottom: '16px' }}>👨‍💼</div>
                  <div style={{ fontSize: '20px', fontWeight: '600', marginBottom: '8px' }}>Usuario Externo</div>
                  <div style={{ fontSize: '14px', color: '#5f6368' }}>Si no eres estudiante USS</div>
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Pantalla de login (estudiantes USS)
  if (paso === 'login') {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
        <header style={{ backgroundColor: '#ffffff', borderBottom: '6px solid #63ed12', padding: '30px', textAlign: 'center' }}>
          <img src={logoUss} alt="Universidad Señor de Sipán" style={{ width: '200px' }} />
        </header>

        <main style={{ display: 'flex', justifyContent: 'center', padding: '40px 20px' }}>
          <div style={{ width: '100%', maxWidth: '500px', backgroundColor: 'white', borderRadius: '8px', padding: '32px' }}>
            <button onClick={() => { setPaso('seleccion'); setTipoUsuario(''); }} style={{ marginBottom: '24px', background: 'none', border: 'none', color: '#5a2290', cursor: 'pointer' }}>
              ← Cambiar tipo de usuario
            </button>

            <h3 style={{ marginBottom: '24px', color: '#5a2290' }}>Ingresa tu usuario institucional</h3>

            <div style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', border: '1px solid #dadce0', borderRadius: '4px', overflow: 'hidden' }}>
                <input
                  type="text"
                  value={nombreUsuario}
                  onChange={(e) => setNombreUsuario(e.target.value.toLowerCase().trim())}
                  onKeyDown={(e) => e.key === 'Enter' && verificarCorreoUSS()}
                  placeholder="tuusuario"
                  disabled={loading}
                  style={{ flex: 1, padding: '14px', border: 'none', outline: 'none', fontSize: '16px' }}
                />
                <span style={{ padding: '14px', backgroundColor: '#f5f5f5', color: '#5f6368' }}>@uss.edu.pe</span>
              </div>
              <div style={{ fontSize: '12px', color: '#5f6368', marginTop: '8px' }}>
                Ingresa solo tu nombre de usuario sin el @uss.edu.pe
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <button onClick={() => { setPaso('seleccion'); setTipoUsuario(''); }} style={{ padding: '12px 24px', border: '1px solid #dadce0', background: 'white', borderRadius: '4px' }}>
                Cancelar
              </button>
              <button onClick={verificarCorreoUSS} disabled={loading || !nombreUsuario.trim()} style={{
                padding: '12px 32px',
                backgroundColor: loading || !nombreUsuario.trim() ? '#f1f3f4' : '#5a2290',
                color: loading || !nombreUsuario.trim() ? '#9aa0a6' : 'white',
                border: 'none', borderRadius: '4px', cursor: loading || !nombreUsuario.trim() ? 'not-allowed' : 'pointer'
              }}>
                {loading ? 'Verificando...' : 'Continuar'}
              </button>
            </div>

            {error && <div style={{ marginTop: '24px', padding: '12px', backgroundColor: '#fce8e6', color: '#c5221f', borderRadius: '4px' }}>{error}</div>}
          </div>
        </main>
      </div>
    );
  }

  // Pantalla del formulario
  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
      <header style={{ backgroundColor: '#ffffff', borderBottom: '6px solid #63ed12', padding: '30px', textAlign: 'center' }}>
        <img src={logoUss} alt="Universidad Señor de Sipán" style={{ width: '200px' }} />
      </header>

      <main style={{ padding: '40px 20px' }}>
        <div style={{ width: '100%', maxWidth: '600px', margin: '0 auto', backgroundColor: 'white', borderRadius: '8px', padding: '32px' }}>
          <div style={{ backgroundColor: '#5a2290', color: 'white', padding: '24px', textAlign: 'center', borderRadius: '8px', marginBottom: '32px' }}>
            <h1 style={{ fontSize: '24px', margin: 0 }}>REGISTRO WEBINAR</h1>
            <div style={{ marginTop: '8px' }}>2026 ABRIL</div>
          </div>

          {error && <div style={{ marginBottom: '24px', padding: '12px', backgroundColor: '#fce8e6', color: '#c5221f', borderRadius: '4px' }}>{error}</div>}

          {/* Nombre completo */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Nombre completo *</label>
            <input
              type="text"
              name="nombreCompleto"
              value={formData.nombreCompleto}
              onChange={handleChange}
              readOnly={estudiantesEncontrados.length > 0}
              style={{ width: '100%', padding: '12px', border: '1px solid #dadce0', borderRadius: '4px' }}
            />
          </div>

          {/* Correo (solo para externos) */}
          {tipoUsuario === 'externo' && (
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Correo electrónico *</label>
              <input
                type="email"
                name="correoExterno"
                value={correoExterno}
                onChange={handleChange}
                placeholder="ejemplo@email.com"
                style={{ width: '100%', padding: '12px', border: '1px solid #dadce0', borderRadius: '4px' }}
              />
            </div>
          )}

          {/* Mostrar cursos (solo para estudiantes USS con múltiples cursos) */}
          {estudiantesEncontrados.length > 1 && (
            <div style={{ marginBottom: '24px', padding: '16px', backgroundColor: '#e8f5e1', borderRadius: '8px' }}>
              <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>📚 Te registrarás para todos tus cursos:</div>
              <ul style={{ margin: 0, paddingLeft: '20px' }}>
                {estudiantesEncontrados.map((c, i) => {
                  const cursoKey = Object.keys(c).find(k => k.toLowerCase() === 'curso') || "Curso";
                  const peadKey = Object.keys(c).find(k => k.toLowerCase().includes('sección')) || "Sección (PEAD)";
                  return <li key={i}>{c[cursoKey]} – {c[peadKey]}</li>;
                })}
              </ul>
            </div>
          )}

          {/* Certificado */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', marginBottom: '12px', fontWeight: '500' }}>🏆 Solicitar certificado webinar - S/ 10.00</label>
            <div style={{ display: 'flex', gap: '24px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input type="radio" name="solicitaCertificado" value="si" checked={formData.solicitaCertificado === 'si'} onChange={handleChange} />
                Sí, solicito certificado
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input type="radio" name="solicitaCertificado" value="no" checked={formData.solicitaCertificado === 'no'} onChange={handleChange} />
                No, solo registro de asistencia
              </label>
            </div>
          </div>

          {/* Comentarios */}
          <div style={{ marginBottom: '32px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>💬 Déjanos tu opinión (opcional)</label>
            <textarea
              name="comentarios"
              value={formData.comentarios}
              onChange={handleChange}
              rows={4}
              placeholder="¿Qué te pareció el webinar? ¿Alguna sugerencia?"
              style={{ width: '100%', padding: '12px', border: '1px solid #dadce0', borderRadius: '4px', resize: 'vertical' }}
            />
          </div>

          {/* Botones */}
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <button onClick={() => {
              if (tipoUsuario === 'uss') setPaso('login');
              else { setPaso('seleccion'); setTipoUsuario(''); }
            }} style={{ padding: '12px 24px', border: '1px solid #dadce0', background: 'white', borderRadius: '4px' }}>
              Volver
            </button>
            <button onClick={enviarRegistro} disabled={loading || !formData.nombreCompleto || (tipoUsuario === 'externo' && !correoExterno)} style={{
              padding: '12px 32px',
              backgroundColor: loading || !formData.nombreCompleto ? '#f1f3f4' : '#5a2290',
              color: loading || !formData.nombreCompleto ? '#9aa0a6' : 'white',
              border: 'none', borderRadius: '4px', cursor: loading || !formData.nombreCompleto ? 'not-allowed' : 'pointer'
            }}>
              {loading ? 'Registrando...' : 'Registrarme'}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default EncuestaWebinar;