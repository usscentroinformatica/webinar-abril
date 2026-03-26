// CONFIGURACIÓN PRINCIPAL
const SHEET_ID = '1KyW-NvcPYMWXvMtlx_D79DSi9ydAow4jdnQRUBsXgUY'; // ID de tu nueva hoja
const HOJA_NOMBRE = 'Respuestas de formulario 1'; // Nombre exacto de la hoja

// Orden exacto de las 8 columnas (igual que en la hoja)
// A: Marca temporal | B: NOMBRE COMPLETO | C: CURSO | D: PEAD | E: Déjanos tu opinión | F: SOLICITAR CERTIFICADO... | G: Columna 6 | H: Correo

function doPost(e) {
  try {
    if (!e.postData || !e.postData.contents) {
      throw new Error('No se recibieron datos');
    }
    const data = JSON.parse(e.postData.contents);

    // Validaciones básicas (los mismos nombres que envía el React)
    if (!data.nombreCompleto || !data.tipoUsuario) {
      throw new Error('Faltan datos obligatorios (nombreCompleto, tipoUsuario)');
    }

    const spreadsheet = SpreadsheetApp.openById(SHEET_ID);
    let sheet = spreadsheet.getSheetByName(HOJA_NOMBRE);

    if (!sheet) {
      sheet = spreadsheet.insertSheet(HOJA_NOMBRE);
      const encabezados = [
        'Marca temporal',
        'NOMBRE COMPLETO',
        'CURSO',
        'PEAD',
        'Déjanos tu opinión',
        'SOLICITAR CERTIFICADO WEBINAR - S/ 10.00',
        'Columna 6',
        'Correo'
      ];
      sheet.getRange(1, 1, 1, 8).setValues([encabezados]);
      sheet.getRange(1, 1, 1, 8).setFontWeight('bold');
      sheet.setFrozenRows(1);
    }

    const filaDatos = prepararDatosParaGuardar(data);
    const ultimaFila = sheet.getLastRow() + 1;

    // Escribir UNA fila en A:H (notación A1 evita errores de getRange)
    const rango = sheet.getRange('A' + ultimaFila + ':H' + ultimaFila);
    rango.setValues([filaDatos]);

    sheet.getRange(ultimaFila, 1).setNumberFormat('dd/mm/yyyy hh:mm:ss');

    if (String(data.solicitaCertificado || '').toLowerCase() === 'si') {
      sheet.getRange(ultimaFila, 6).setBackground('#FFF2CC');
      sheet.getRange(ultimaFila, 6).setFontWeight('bold');
    }

    return ContentService
      .createTextOutput(JSON.stringify({
        success: true,
        message: 'Encuesta registrada exitosamente',
        fila: ultimaFila,
        timestamp: new Date().toLocaleString('es-PE')
      }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        error: error.message,
        message: 'Error al procesar la encuesta'
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// Prepara el array de 8 valores en el orden exacto de las columnas
function prepararDatosParaGuardar(data) {
  const fechaActual = new Date();
  const nombre = String(data.nombreCompleto || '').trim();
  const tipoUsuario = String(data.tipoUsuario || '').trim();
  const comentarios = String(data.comentarios || '').trim();
  const solicitaCertificado = String(data.solicitaCertificado || 'no').toLowerCase();
  const correo = String(data.correo || '').trim();

  // Siempre 8 columnas en este orden (A a H)
  return [
    fechaActual,                    // A: Marca temporal
    nombre,                          // B: NOMBRE COMPLETO
    String(data.curso || '').trim(), // C: CURSO
    String(data.pead || '').trim(),  // D: PEAD
    comentarios,                     // E: Déjanos tu opinión
    solicitaCertificado === 'si' ? 'si' : 'no', // F: SOLICITAR CERTIFICADO...
    tipoUsuario,                     // G: Columna 6 (Estudiante USS / Externo)
    correo                            // H: Columna 1 (correo)
  ];
}

function doGet(e) {
  try {
    const accion = e && e.parameter ? e.parameter.accion : null;
    const spreadsheet = SpreadsheetApp.openById(SHEET_ID);
    const sheet = spreadsheet.getSheetByName(HOJA_NOMBRE);

    if (accion === 'verificar') {
      const correo = (e.parameter.correo || '').toLowerCase().trim();
      const curso = (e.parameter.curso || '').trim();
      
      const registrado = checkRegistro(sheet, correo, curso);
      return ContentService.createTextOutput(JSON.stringify({ 
        registrado: registrado,
        mensaje: registrado ? 'Ya registrado' : 'No registrado'
      })).setMimeType(ContentService.MimeType.JSON);
    }

    const totalRegistros = sheet ? sheet.getLastRow() - 1 : 0;

    return ContentService
      .createTextOutput(JSON.stringify({
        status: 'API funcionando correctamente',
        hoja: HOJA_NOMBRE,
        totalRegistros: totalRegistros,
        columnas: 8,
        estructura: [
          'A: Marca temporal',
          'B: NOMBRE COMPLETO',
          'C: CURSO',
          'D: PEAD',
          'E: Déjanos tu opinión',
          'F: SOLICITAR CERTIFICADO WEBINAR - S/ 10.00',
          'G: Columna 6',
          'H: Correo'
        ]
      }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({
        status: 'Error',
        error: error.message
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function pruebaAPI() {
  console.log('Probando la API...');

  const pruebaUSS = {
    nombreCompleto: 'GONZALEZ PEREZ, MARIA LUISA',
    correo: 'mgonzalez@uss.edu.pe',
    tipoUsuario: 'Estudiante USS',
    curso: 'COMPUTACIÓN II',
    pead: 'PEAD-a',
    solicitaCertificado: 'si',
    comentarios: 'Excelente webinar'
  };

  const pruebaExterno = {
    nombreCompleto: 'RODRIGUEZ LOPEZ, CARLOS',
    tipoUsuario: 'Externo',
    correo: 'carlos@email.com',
    solicitaCertificado: 'no',
    comentarios: 'Muy interesante'
  };

  try {
    doPost({ postData: { contents: JSON.stringify(pruebaUSS) } });
    console.log('Prueba USS OK');
    doPost({ postData: { contents: JSON.stringify(pruebaExterno) } });
    console.log('Prueba externo OK');
    return 'Pruebas completadas. Revisa la hoja.';
  } catch (error) {
    console.error('Error:', error);
    return 'Error: ' + error.message;
  }
}

function verUltimosRegistros(cantidad) {
  cantidad = cantidad || 5;
  const spreadsheet = SpreadsheetApp.openById(SHEET_ID);
  const sheet = spreadsheet.getSheetByName(HOJA_NOMBRE);

  if (!sheet || sheet.getLastRow() <= 1) {
    return 'No hay registros aun';
  }

  const totalFilas = sheet.getLastRow();
  const inicio = Math.max(2, totalFilas - cantidad + 1);
  const numFilas = totalFilas - inicio + 1;
  const datos = sheet.getRange(inicio, 1, numFilas, 8).getValues();

  return datos.map(function (fila, index) {
    return {
      fila: inicio + index,
      datos: {
        fecha: fila[0],
        nombre: fila[1],
        curso: fila[2],
        pead: fila[3],
        comentario: fila[4],
        certificado: fila[5],
        tipo: fila[6],
        correo: fila[7]
      }
    };
  });
}

  if (sheet && sheet.getLastRow() > 1) {
    const ultimaFila = sheet.getLastRow();
    sheet.getRange(2, 1, ultimaFila, 8).clearContent();
    return 'Datos limpiados (se mantienen los encabezados)';
  }
  return 'No hay datos para limpiar';
}

function checkRegistro(sheet, correo, curso) {
  if (!sheet || sheet.getLastRow() <= 1) return false;
  
  const totalFilas = sheet.getLastRow();
  const datos = sheet.getRange(2, 3, totalFilas - 1, 6).getValues(); // Columnas C a H
  
  // Columna C (índice 0): CURSO
  // Columna H (índice 5): Correo
  for (let i = 0; i < datos.length; i++) {
    const cursoFila = String(datos[i][0] || '').trim();
    const correoFila = String(datos[i][5] || '').toLowerCase().trim();
    
    if (cursoFila === curso && correoFila === correo) {
      return true;
    }
  }
  return false;
}
