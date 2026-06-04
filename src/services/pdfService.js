import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export const ExportPDF = {
  /**
   * Genera el PDF de la Planilla Oficial (7 columnas por cuatrimestre)
   */
  notas: (curso, alumnos, planillaOficial, docenteNombre) => {
    const doc = new jsPDF('l', 'mm', 'a4'); // Apaisado
    const pageWidth = doc.internal.pageSize.getWidth();

    // Encabezado Institucional
    doc.setFontSize(14);
    doc.setTextColor(40, 40, 40);
    doc.text('ANEXO DE CALIFICACIONES - PLANILLA OFICIAL', pageWidth / 2, 15, { align: 'center' });
    
    doc.setFontSize(9);
    doc.text(`DOCENTE: ${docenteNombre.toUpperCase()}`, 14, 22);
    
    // Extracción de datos institucionales (v_cursos_con_escuela)
    const escuelaInfo = curso.escuela_nombre_completo || curso.escuelas?.nombre || 'ESCUELA NO ASIGNADA';
    doc.text(`ESCUELA: ${escuelaInfo.toUpperCase()}`, 14, 27);
    
    const matInfo = curso.materia || 'SIN MATERIA';
    doc.text(`CURSO: ${curso.anio_o_grado}° ${curso.division || ''} - MATERIA: ${matInfo.toUpperCase()}`, 14, 32);
    
    // Definición de Columnas y Doble Encabezado (9 por Cuatrimestre)
    const head1 = [
      { content: '#', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
      { content: 'APELLIDO Y NOMBRES', rowSpan: 2, styles: { halign: 'left', valign: 'middle' } },
      { content: '1° CUATRIMESTRE', colSpan: 9, styles: { halign: 'center', fillColor: [79, 70, 229], textColor: 255 } },
      { content: '2° CUATRIMESTRE', colSpan: 9, styles: { halign: 'center', fillColor: [79, 70, 229], textColor: 255 } },
      { content: 'CIERRES', colSpan: 4, styles: { halign: 'center', fillColor: [16, 185, 129], textColor: 255 } }
    ];
    const head2 = [
      'P1', 'P2', 'BIM 1', 'INT', 'P3', 'P4', 'BIM 2', 'INT', 'C1',
      'P5', 'P6', 'BIM 3', 'INT', 'P7', 'P8', 'BIM 4', 'INT', 'C2',
      'ANUAL', 'DIC', 'FEB', 'FINAL'
    ];

    const tableBody = alumnos.map((al, idx) => {
      const data = planillaOficial.find(p => p.alumno_id === al.id) || {};
      return [
        idx + 1,
        `${al.apellido.toUpperCase()}, ${al.nombre}`,
        // 1er Cuat (9 cols)
        data.c1_p1_sigla || '-', data.c1_p2_sigla || '-', data.c1_bim1_nota || '-', data.c1_b1_int || '-',
        data.c1_p3_sigla || '-', data.c1_p4_sigla || '-', data.c1_bim2_nota || '-', data.c1_b2_int || '-',
        data.c1_final || '-',
        // 2do Cuat (9 cols)
        data.c1_p5_sigla || '-', data.c1_p6_sigla || '-', data.c2_bim1_nota || '-', data.c2_b3_int || '-',
        data.c1_p7_sigla || '-', data.c1_p8_sigla || '-', data.c2_bim2_nota || '-', data.c2_b4_int || '-',
        data.c2_final || '-',
        // Cierres (4 cols)
        data.nota_anual || '-', data.intensif_dic || '-', data.intensif_feb || '-', data.nota_final || '-'
      ];
    });

    autoTable(doc, {
      startY: 40,
      head: [head1, head2],
      body: tableBody,
      theme: 'grid',
      styles: { fontSize: 6.5, cellPadding: 0.8 }, // Ajuste para que entre todo
      headStyles: { lineWidth: 0.1, fontStyle: 'bold' },
      columnStyles: {
        1: { halign: 'left', cellWidth: 40 },
        2: { halign: 'center' }, 3: { halign: 'center' }, 4: { halign: 'center', fontStyle: 'bold' }, 5: { halign: 'center', fillColor: [240, 247, 255] }, // INT 1
        6: { halign: 'center' }, 7: { halign: 'center' }, 8: { halign: 'center', fontStyle: 'bold' }, 9: { halign: 'center', fillColor: [240, 247, 255] }, // INT 2
        10: { halign: 'center', fontStyle: 'bold', fillColor: [240, 240, 240] } // C1
      },
      didParseCell: (data) => {
        if (data.section === 'body') {
          const val = data.cell.raw;
          if (val === 'TEA') { data.cell.styles.textColor = [79, 70, 229]; data.cell.styles.fontStyle = 'bold'; }
          if (val === 'TEP') { data.cell.styles.textColor = [16, 120, 80]; data.cell.styles.fontStyle = 'bold'; }
          if (val === 'TED' || val === 'A') { data.cell.styles.textColor = [200, 0, 0]; data.cell.styles.fontStyle = 'bold'; }
          
          // Resaltar Columnas INT con color azulado
          if ([5, 9, 14, 18].includes(data.column.index)) {
             data.cell.styles.textColor = [59, 130, 246];
             data.cell.styles.fontStyle = 'bold';
             data.cell.styles.fillColor = [240, 247, 255];
          }

          // Resaltar BIM y Notas Finales
          if ([4, 8, 10, 13, 17, 19, 23].includes(data.column.index)) {
             data.cell.styles.fontStyle = 'bold';
             data.cell.styles.fillColor = [245, 245, 245];
          }
        }
      }
    });

    doc.save(`Planilla_Oficial_${curso.anio_o_grado}_${curso.division}.pdf`);
  },

  /**
   * Genera la Planilla de Asistencia Mensual Completa (Grilla 1-31)
   */
  asistencia: (curso, alumnos, historial, mesNombre, docenteNombre) => {
    const doc = new jsPDF('l', 'mm', 'a4'); // Paisaje para que entre la grilla
    const pageWidth = doc.internal.pageSize.getWidth();

    // Título y Encabezado
    doc.setFontSize(16);
    doc.setTextColor(40);
    doc.text(`PLANILLA DE ASISTENCIA MENSUAL - ${mesNombre}`, 14, 15);
    
    doc.setFontSize(10);
    doc.text(`Escuela: ${curso.escuelas?.nombre || 'General'}`, 14, 22);
    doc.text(`Curso: ${curso.anio_o_grado} ${curso.division || ''} | Docente: ${docenteNombre}`, 14, 27);
    
    doc.line(14, 30, pageWidth - 14, 30);

    // Generar días del mes para el encabezado
    // Asumimos que el historial nos dice qué días hubo (o generamos 31)
    const diasUnicos = Array.from(new Set(historial.map(h => h.fecha))).sort();
    
    // Si no hay datos, mostramos un mensaje
    if (diasUnicos.length === 0) {
      doc.setFontSize(12);
      doc.text("No hay datos de asistencia registrados para este período.", 14, 45);
      doc.save(`Asistencia_${mesNombre}.pdf`);
      return;
    }

    // Cabecera: [#, Alumno, 1, 2, 3, ..., Totales]
    const head = [['#', 'Apellido y Nombre', ...diasUnicos.map(d => d.split('-')[2]), 'P', 'A']];

    const body = alumnos.map((al, index) => {
      const asistenciasAlumno = historial.filter(h => h.alumno_id === al.id);
      const row = [index + 1, `${al.apellido}, ${al.nombre}`];
      
      let pCount = 0;
      let aCount = 0;

      diasUnicos.forEach(dia => {
        const registro = asistenciasAlumno.find(h => h.fecha === dia);
        if (registro) {
          row.push(registro.estado);
          if (registro.estado === 'P') pCount++;
          if (registro.estado === 'A') aCount++;
        } else {
          row.push('-');
        }
      });

      row.push(pCount, aCount);
      return row;
    });

    autoTable(doc, {
      startY: 35,
      head: head,
      body: body,
      theme: 'grid',
      styles: { fontSize: 7, cellPadding: 1, halign: 'center' },
      columnStyles: {
        1: { halign: 'left', cellWidth: 40 } // Nombre más ancho
      },
      headStyles: { fillColor: [51, 65, 85] }
    });

    doc.save(`Asistencia_${mesNombre}_${curso.anio_o_grado}.pdf`);
  }
};
