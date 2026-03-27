// ==================== CONFIGURACIÓN WEBINAR ====================
const SPREADSHEET_ID = '11ZaEQz5_Yxo7lmk0cyKYPWJWwKC2HHRi2iRJkjRUtOI';
const SHEET_NAME_RESPUESTAS = 'Respuestas de formulario 1';
const SHEET_NAME_ESTUDIANTES = 'BaseUnificada';

// ==================== FUNCIÓN PARA ASEGURAR ENCABEZADOS ====================
function asegurarEncabezados() {
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = spreadsheet.getSheetByName(SHEET_NAME_RESPUESTAS);
  
  const headers = [
    "Marca temporal",
    "NOMBRE COMPLETO",
    "CURSO",
    "PEAD",
    "Déjanos tu opinión",
    "SOLICITAR CERTIFICADO WEBINAR - S/ 10.00",
    "Tipo Usuario",
    "Correo"
  ];
  
  // Si la hoja no existe, crearla
  if (!sheet) {
    Logger.log('📝 Creando nueva hoja...');
    sheet = spreadsheet.insertSheet(SHEET_NAME_RESPUESTAS);
    sheet.appendRow(headers);
    
    // Formatear
    const headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setFontWeight("bold");
    headerRange.setBackground("#5a2290");
    headerRange.setFontColor("white");
    headerRange.setHorizontalAlignment("center");
    sheet.setFrozenRows(1);
    
    // Ajustar anchos
    sheet.setColumnWidth(1, 150);
    sheet.setColumnWidth(2, 250);
    sheet.setColumnWidth(3, 150);
    sheet.setColumnWidth(4, 100);
    sheet.setColumnWidth(5, 400);
    sheet.setColumnWidth(6, 200);
    sheet.setColumnWidth(7, 120);
    sheet.setColumnWidth(8, 200);
    
    Logger.log('✅ Hoja creada con encabezados');
    return sheet;
  }
  
  // Si la hoja existe pero está vacía
  if (sheet.getLastRow() === 0) {
    Logger.log('📝 Hoja vacía, agregando encabezados...');
    sheet.appendRow(headers);
    
    const headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setFontWeight("bold");
    headerRange.setBackground("#5a2290");
    headerRange.setFontColor("white");
    headerRange.setHorizontalAlignment("center");
    sheet.setFrozenRows(1);
    
    Logger.log('✅ Encabezados agregados');
    return sheet;
  }
  
  // Verificar que los encabezados existan y sean correctos
  const firstRow = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  
  // Si los encabezados no coinciden, corregirlos
  if (firstRow[0] !== headers[0]) {
    Logger.log('⚠️ Encabezados incorrectos, corrigiendo...');
    sheet.insertRowBefore(1);
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    
    const headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setFontWeight("bold");
    headerRange.setBackground("#5a2290");
    headerRange.setFontColor("white");
    headerRange.setHorizontalAlignment("center");
    sheet.setFrozenRows(1);
    
    Logger.log('✅ Encabezados corregidos');
  }
  
  return sheet;
}

// ==================== DO POST ====================
function doPost(e) {
  try {
    let datos;
    
    if (e.postData) {
      datos = JSON.parse(e.postData.contents);
    } else if (e.parameter) {
      datos = e.parameter;
    } else {
      throw new Error('No se recibieron datos');
    }
    
    // Asegurar que la hoja existe y tiene encabezados
    const sheet = asegurarEncabezados();
    
    // === VERIFICAR DUPLICADOS ===
    if (datos.tipoUsuario === 'Estudiante USS') {
      // Verificar si ya existe este email
      const yaRegistrado = verificarRegistroExistente(datos.email);
      if (yaRegistrado) {
        Logger.log(`🔴 DUPLICADO: ${datos.email} ya está registrado`);
        return createJsonResponse({
          success: false,
          error: 'Ya te has registrado a este webinar. Solo se permite un registro por persona.'
        });
      }
      
      // Verificar que el estudiante existe en BaseUnificada
      const estudiante = buscarEstudianteEnBaseUnificada(datos.email);
      if (!estudiante || estudiante.cursos.length === 0) {
        return createJsonResponse({
          success: false,
          error: 'No eres un estudiante registrado en la base de datos de la USS. Verifica tu correo institucional.'
        });
      }
      
      const cursoEstudiante = estudiante.cursos[0];
      
      // Preparar datos
      const ahora = new Date();
      const datosParaGuardar = [
        ahora,
        datos.nombreCompleto,
        cursoEstudiante.curso,
        cursoEstudiante.pead,
        datos.comentarios || '',
        datos.solicitaCertificado || 'no',
        datos.tipoUsuario,
        datos.email
      ];
      
      sheet.appendRow(datosParaGuardar);
      const ultimaFila = sheet.getLastRow();
      
      Logger.log(`✅ Registro guardado en fila ${ultimaFila}`);
      Logger.log(`   Email: ${datos.email}`);
      Logger.log(`   Curso: ${cursoEstudiante.curso}`);
      
      return createJsonResponse({
        success: true,
        message: '✅ Registro exitoso. ¡Te esperamos en el webinar!',
        fila: ultimaFila
      });
      
    } else if (datos.tipoUsuario === 'Externo') {
      // Verificar si ya existe este nombre
      const yaRegistrado = verificarRegistroExterno(datos.nombreCompleto);
      if (yaRegistrado) {
        Logger.log(`🔴 DUPLICADO EXTERNO: ${datos.nombreCompleto} ya está registrado`);
        return createJsonResponse({
          success: false,
          error: 'Este nombre ya está registrado. Solo se permite un registro por persona.'
        });
      }
      
      // Preparar datos
      const ahora = new Date();
      const datosParaGuardar = [
        ahora,
        datos.nombreCompleto,
        '',
        '',
        datos.comentarios || '',
        datos.solicitaCertificado || 'no',
        datos.tipoUsuario,
        datos.email || '', // <--- CAMBIO AQUÍ PARA GUARDAR EL CORREO
      ];
      
      sheet.appendRow(datosParaGuardar);
      const ultimaFila = sheet.getLastRow();
      
      Logger.log(`✅ Externo registrado en fila ${ultimaFila}`);
      Logger.log(`   Nombre: ${datos.nombreCompleto}`);
      
      return createJsonResponse({
        success: true,
        message: '✅ Registro exitoso. ¡Te esperamos en el webinar!',
        fila: ultimaFila
      });
    }
    
    return createJsonResponse({
      success: false,
      error: 'Tipo de usuario no válido'
    });
    
  } catch (error) {
    Logger.log(`❌ ERROR: ${error.toString()}`);
    Logger.log(`Stack: ${error.stack}`);
    return createJsonResponse({
      success: false,
      error: error.toString()
    });
  }
}

// ==================== DO GET ====================
function doGet(e) {
  try {
    // Asegurar que la hoja existe
    asegurarEncabezados();
    
    if (e && e.parameter && e.parameter.email) {
      const email = e.parameter.email;
      const yaRegistrado = verificarRegistroExistente(email);
      
      return createJsonResponse({
        success: true,
        email: email,
        registrado: yaRegistrado,
        message: yaRegistrado ? 'Ya estás registrado' : 'Puedes registrarte'
      });
    }
    
    return createJsonResponse({
      status: 'API Webinar funcionando',
      hora: new Date().toLocaleString('es-PE')
    });
    
  } catch (error) {
    return createJsonResponse({ success: false, error: error.toString() });
  }
}

// ==================== BUSCAR ESTUDIANTE EN BASE UNIFICADA ====================
function buscarEstudianteEnBaseUnificada(email) {
  try {
    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = spreadsheet.getSheetByName(SHEET_NAME_ESTUDIANTES);
    
    if (!sheet) {
      Logger.log(`❌ No se encontró la hoja "${SHEET_NAME_ESTUDIANTES}"`);
      return null;
    }
    
    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) return null;
    
    const headers = data[0];
    
    const emailIndex = headers.findIndex(h => 
      h.toString().toLowerCase().includes('correo')
    );
    const nombreIndex = headers.findIndex(h => 
      h.toString().toLowerCase().includes('nombre')
    );
    const cursoIndex = headers.findIndex(h => 
      h.toString().toLowerCase() === 'curso'
    );
    const peadIndex = headers.findIndex(h => 
      h.toString().toLowerCase().includes('sección') || 
      h.toString().toLowerCase().includes('pead')
    );
    
    if (emailIndex === -1) {
      Logger.log("❌ No se encontró columna de email");
      return null;
    }
    
    const emailLower = email.toLowerCase().trim();
    const cursosEncontrados = [];
    
    for (let i = 1; i < data.length; i++) {
      const rowEmail = data[i][emailIndex] ? data[i][emailIndex].toString().toLowerCase().trim() : '';
      
      if (rowEmail === emailLower) {
        cursosEncontrados.push({
          nombre: nombreIndex !== -1 ? data[i][nombreIndex] || 'N/D' : 'N/D',
          curso: cursoIndex !== -1 ? data[i][cursoIndex] || 'N/D' : 'N/D',
          pead: peadIndex !== -1 ? data[i][peadIndex] || 'N/D' : 'N/D'
        });
      }
    }
    
    return cursosEncontrados.length > 0 ? { email, cursos: cursosEncontrados } : null;
    
  } catch (error) {
    Logger.log("Error buscando:", error);
    return null;
  }
}

// ==================== VERIFICAR REGISTRO EXISTENTE ====================
function verificarRegistroExistente(email) {
  try {
    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = spreadsheet.getSheetByName(SHEET_NAME_RESPUESTAS);
    
    if (!sheet) return false;
    
    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) return false;
    
    const headers = data[0];
    const correoIndex = headers.findIndex(h => h === "Correo");
    const tipoIndex = headers.findIndex(h => h === "Tipo Usuario");
    
    if (correoIndex === -1 || tipoIndex === -1) return false;
    
    const emailLower = email.toLowerCase().trim();
    
    for (let i = 1; i < data.length; i++) {
      const rowCorreo = data[i][correoIndex]?.toString().toLowerCase().trim() || '';
      const rowTipo = data[i][tipoIndex]?.toString() || '';
      
      if (rowTipo === 'Estudiante USS' && rowCorreo === emailLower) {
        return true;
      }
    }
    
    return false;
    
  } catch (error) {
    Logger.log("Error:", error);
    return false;
  }
}

// ==================== VERIFICAR REGISTRO EXTERNO ====================
function verificarRegistroExterno(nombre) {
  try {
    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = spreadsheet.getSheetByName(SHEET_NAME_RESPUESTAS);
    
    if (!sheet) return false;
    
    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) return false;
    
    const headers = data[0];
    const nombreIndex = headers.findIndex(h => h === "NOMBRE COMPLETO");
    const tipoIndex = headers.findIndex(h => h === "Tipo Usuario");
    
    if (nombreIndex === -1 || tipoIndex === -1) return false;
    
    const nombreLower = nombre.toLowerCase().trim();
    
    for (let i = 1; i < data.length; i++) {
      const rowNombre = data[i][nombreIndex]?.toString().toLowerCase().trim() || '';
      const rowTipo = data[i][tipoIndex]?.toString() || '';
      
      if (rowTipo === 'Externo' && rowNombre === nombreLower) {
        return true;
      }
    }
    
    return false;
    
  } catch (error) {
    Logger.log("Error:", error);
    return false;
  }
}

// ==================== FUNCIÓN HELPER ====================
function createJsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// ==================== FUNCIONES DE PRUEBA ====================

// 🧪 PRUEBA 1: Crear/verificar encabezados
function probarCrearEncabezados() {
  Logger.log('\n=== 📝 CREANDO ENCABEZADOS ===');
  const sheet = asegurarEncabezados();
  Logger.log('✅ Encabezados verificados/creados');
  return 'Encabezados listos';
}

// 🧪 PRUEBA 2: Probar registro de estudiante
function probarRegistrarEstudiante() {
  Logger.log('\n=== 🧪 PROBANDO REGISTRO DE ESTUDIANTE ===');
  
  const datos = {
    tipoUsuario: 'Estudiante USS',
    email: 'mmujicamiguelan@uss.edu.pe',
    nombreCompleto: 'MIGUEL ANGEL MAQUEN MUJICA',
    comentarios: 'Me interesa el webinar',
    solicitaCertificado: 'si'
  };
  
  Logger.log('📤 Enviando datos...');
  
  const evento = { postData: { contents: JSON.stringify(datos) } };
  const resultado = doPost(evento);
  const contenido = JSON.parse(resultado.getContent());
  
  Logger.log('📥 Respuesta:', JSON.stringify(contenido, null, 2));
  
  if (contenido.success) {
    Logger.log('✅ REGISTRO EXITOSO');
  } else {
    Logger.log('❌ ERROR:', contenido.error);
  }
  
  return contenido;
}

// 🧪 PRUEBA 3: Probar duplicado (debe fallar)
function probarDuplicado() {
  Logger.log('\n=== 🧪 PROBANDO DUPLICADO ===');
  
  const datos = {
    tipoUsuario: 'Estudiante USS',
    email: 'mmujicamiguelan@uss.edu.pe',
    nombreCompleto: 'MIGUEL ANGEL MAQUEN MUJICA',
    comentarios: 'Segundo intento',
    solicitaCertificado: 'si'
  };
  
  Logger.log('📤 Intentando registrar nuevamente...');
  
  const evento = { postData: { contents: JSON.stringify(datos) } };
  const resultado = doPost(evento);
  const contenido = JSON.parse(resultado.getContent());
  
  Logger.log('📥 Respuesta:', JSON.stringify(contenido, null, 2));
  
  if (!contenido.success && contenido.error.includes('Ya te has registrado')) {
    Logger.log('✅ PRUEBA EXITOSA: Detectó duplicado');
  } else {
    Logger.log('⚠️ PRUEBA FALLIDA');
  }
  
  return contenido;
}

// 🧪 PRUEBA 4: Probar registro externo
function probarRegistrarExterno() {
  Logger.log('\n=== 🧪 PROBANDO REGISTRO EXTERNO ===');
  
  const datos = {
    tipoUsuario: 'Externo',
    nombreCompleto: 'CARLOS PEREZ TEST',
    comentarios: 'Quiero aprender más',
    solicitaCertificado: 'no'
  };
  
  Logger.log('📤 Enviando datos...');
  
  const evento = { postData: { contents: JSON.stringify(datos) } };
  const resultado = doPost(evento);
  const contenido = JSON.parse(resultado.getContent());
  
  Logger.log('📥 Respuesta:', JSON.stringify(contenido, null, 2));
  
  if (contenido.success) {
    Logger.log('✅ REGISTRO EXTERNO EXITOSO');
  } else {
    Logger.log('❌ ERROR:', contenido.error);
  }
  
  return contenido;
}

// 🧪 PRUEBA 5: Ver registros
function probarVerRegistros() {
  Logger.log('\n=== 📊 VERIFICANDO REGISTROS ===');
  
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = spreadsheet.getSheetByName(SHEET_NAME_RESPUESTAS);
  
  if (!sheet) {
    Logger.log('⚠️ La hoja no existe');
    return;
  }
  
  const data = sheet.getDataRange().getValues();
  Logger.log(`📝 Total de filas: ${data.length}`);
  
  if (data.length > 0) {
    Logger.log(`📋 Encabezados: ${data[0].join(' | ')}`);
  }
  
  if (data.length > 1) {
    Logger.log(`\n📊 Registros:`);
    for (let i = 1; i < data.length; i++) {
      const tipo = data[i][6] || '';
      const nombre = data[i][1] || '';
      const curso = data[i][2] || '';
      const email = data[i][7] || '';
      Logger.log(`  ${i}. ${tipo} - ${nombre} ${curso ? `(${curso})` : ''}`);
    }
  }
  
  return `Total: ${data.length - 1} registros`;
}

// 🧪 PRUEBA 6: Limpiar registros de prueba
function probarLimpiarRegistrosPrueba() {
  Logger.log('\n=== 🧹 LIMPIANDO REGISTROS DE PRUEBA ===');
  
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = spreadsheet.getSheetByName(SHEET_NAME_RESPUESTAS);
  
  if (!sheet) return;
  
  const data = sheet.getDataRange().getValues();
  const emailsPrueba = ['mmujicamiguelan@uss.edu.pe'];
  const nombresPrueba = ['CARLOS PEREZ TEST'];
  let filasEliminadas = 0;
  
  for (let i = data.length - 1; i >= 1; i--) {
    const email = data[i][7]?.toString() || '';
    const nombre = data[i][1]?.toString() || '';
    
    if (emailsPrueba.includes(email) || nombresPrueba.includes(nombre)) {
      sheet.deleteRow(i + 1);
      filasEliminadas++;
    }
  }
  
  Logger.log(`✅ Eliminadas ${filasEliminadas} filas de prueba`);
  return `Eliminadas ${filasEliminadas} filas`;
}

// 🧪 PRUEBA 7: Ejecutar todo
function probarTodo() {
  Logger.log('\n' + '='.repeat(60));
  Logger.log('🚀 EJECUTANDO TODAS LAS PRUEBAS');
  Logger.log('='.repeat(60));
  
  Logger.log('\n1️⃣ Creando encabezados...');
  probarCrearEncabezados();
  
  Logger.log('\n2️⃣ Limpiando registros previos...');
  probarLimpiarRegistrosPrueba();
  
  Logger.log('\n3️⃣ Registrando estudiante...');
  probarRegistrarEstudiante();
  
  Logger.log('\n4️⃣ Probando duplicado...');
  probarDuplicado();
  
  Logger.log('\n5️⃣ Registrando externo...');
  probarRegistrarExterno();
  
  Logger.log('\n6️⃣ Verificando registros...');
  probarVerRegistros();
  
  Logger.log('\n' + '='.repeat(60));
  Logger.log('🎉 PRUEBAS COMPLETADAS');
  Logger.log('='.repeat(60));
  
  return 'Pruebas completadas';
}
