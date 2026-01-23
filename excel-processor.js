// Procesador de archivos Excel específico para el sistema de cupones
class ExcelProcessor {
    constructor() {
        this.currentWorkbook = null;
        this.processedData = null;
    }

    async processExcelFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (e) => {
                try {
                    // Verificar que XLSX esté disponible
                    if (typeof XLSX === 'undefined') {
                        reject(new Error('Librería XLSX no disponible. Intente recargar la página.'));
                        return;
                    }

                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, { type: 'array' });
                    
                    this.currentWorkbook = workbook;
                    const processedData = this.extractDataFromWorkbook(workbook);
                    
                    this.processedData = processedData;
                    resolve(processedData);
                    
                } catch (error) {
                    console.error('Error procesando Excel:', error);
                    reject(error);
                }
            };
            
            reader.onerror = () => reject(new Error('Error al leer el archivo'));
            reader.readAsArrayBuffer(file);
        });
    }

    extractDataFromWorkbook(workbook) {
        const result = {
            affiliates: [],
            transactions: [],
            summary: {},
            sheetNames: workbook.SheetNames
        };

        try {
            // Procesar hoja "BASE DE DATOS"
            if (workbook.Sheets['BASE DE DATOS']) {
                result.affiliates = this.processAffiliatesSheet(workbook.Sheets['BASE DE DATOS']);
            }

            // Procesar hoja "GENERAL"
            if (workbook.Sheets['GENERAL']) {
                result.transactions = this.processTransactionsSheet(workbook.Sheets['GENERAL']);
            }

            // Procesar hoja "CUPONES DISPONIBLES" para obtener configuración
            if (workbook.Sheets['CUPONES DISPONIBLES']) {
                result.summary = this.processSummarySheet(workbook.Sheets['CUPONES DISPONIBLES']);
            }

            console.log('📊 Datos procesados:', {
                affiliates: result.affiliates.length,
                transactions: result.transactions.length,
                sheets: result.sheetNames
            });

        } catch (error) {
            console.error('Error extrayendo datos:', error);
            throw error;
        }

        return result;
    }

    processAffiliatesSheet(sheet) {
        const affiliates = [];
        const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false });
        
        // Buscar fila de encabezados
        let headerRowIndex = -1;
        for (let i = 0; i < Math.min(10, jsonData.length); i++) {
            const row = jsonData[i];
            if (row && row.some(cell => cell && cell.toString().includes('RUT'))) {
                headerRowIndex = i;
                break;
            }
        }

        if (headerRowIndex === -1) return affiliates;

        const headers = jsonData[headerRowIndex];
        
        // Mapear columnas
        const columnMap = {
            rut: this.findColumnIndex(headers, ['RUT']),
            nombres: this.findColumnIndex(headers, ['NOMBRES', 'NOMBRE']),
            apellidos: this.findColumnIndex(headers, ['APELLIDOS', 'APELLIDO']),
            establecimiento: this.findColumnIndex(headers, ['ESTABLECIMIENTO', 'CENTRO']),
            nombreCompleto: this.findColumnIndex(headers, ['NOMBRE COMPLETO', 'NOMBRE'])
        };

        // Procesar filas de datos
        for (let i = headerRowIndex + 1; i < jsonData.length; i++) {
            const row = jsonData[i];
            if (!row || !row[columnMap.rut]) continue;

            const affiliate = {
                rut: this.cleanRUT(row[columnMap.rut]),
                nombres: row[columnMap.nombres] || '',
                apellidos: row[columnMap.apellidos] || '',
                establecimiento: row[columnMap.establecimiento] || ''
            };

            // Si no hay nombres y apellidos separados, usar nombre completo
            if (!affiliate.nombres && !affiliate.apellidos && columnMap.nombreCompleto >= 0) {
                const nombreCompleto = row[columnMap.nombreCompleto] || '';
                const partes = nombreCompleto.split(' ');
                affiliate.nombres = partes.slice(0, 2).join(' ');
                affiliate.apellidos = partes.slice(2).join(' ');
            }

            if (affiliate.rut) {
                affiliates.push(affiliate);
            }
        }

        return affiliates;
    }

    processTransactionsSheet(sheet) {
        const transactions = [];
        const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false });
        
        // Buscar fila de encabezados
        let headerRowIndex = -1;
        for (let i = 0; i < Math.min(10, jsonData.length); i++) {
            const row = jsonData[i];
            if (row && row.some(cell => cell && cell.toString().includes('RUT AFILIADO'))) {
                headerRowIndex = i;
                break;
            }
        }

        if (headerRowIndex === -1) return transactions;

        const headers = jsonData[headerRowIndex];
        
        // Mapear columnas importantes
        const columnMap = {
            fecha: this.findColumnIndex(headers, ['FECHA']),
            rut: this.findColumnIndex(headers, ['RUT']),
            rutAfiliado: this.findColumnIndex(headers, ['RUT AFILIADO']),
            nombres: this.findColumnIndex(headers, ['NOMBRES']),
            apellidos: this.findColumnIndex(headers, ['APELLIDOS']),
            concepto: this.findColumnIndex(headers, ['CONCEPTO']),
            monto: this.findColumnIndex(headers, ['MONTO']),
            
            // Columnas de Lipigas
            lipigas5: this.findColumnIndex(headers, ['05 KILOS']),
            lipigas11: this.findColumnIndex(headers, ['11 KILOS']),
            lipigas15: this.findColumnIndex(headers, ['15 KILOS']),
            lipigas45: this.findColumnIndex(headers, ['45 KILOS']),
            
            // Columnas de Abastible (pueden tener .1 al final)
            abastible5: this.findColumnIndex(headers, ['05 KILOS.1']) >= 0 ? 
                       this.findColumnIndex(headers, ['05 KILOS.1']) : 
                       this.findColumnIndex(headers, ['05 KILOS']),
            abastible11: this.findColumnIndex(headers, ['11 KILOS.1']) >= 0 ? 
                        this.findColumnIndex(headers, ['11 KILOS.1']) : 
                        this.findColumnIndex(headers, ['11 KILOS']),
            abastible15: this.findColumnIndex(headers, ['15 KILOS.1']) >= 0 ? 
                        this.findColumnIndex(headers, ['15 KILOS.1']) : 
                        this.findColumnIndex(headers, ['15 KILOS']),
            abastible45: this.findColumnIndex(headers, ['45 KILOS.1']) >= 0 ? 
                        this.findColumnIndex(headers, ['45 KILOS.1']) : 
                        this.findColumnIndex(headers, ['45 KILOS'])
        };

        // Procesar filas de datos
        for (let i = headerRowIndex + 1; i < jsonData.length; i++) {
            const row = jsonData[i];
            if (!row || !row[columnMap.rutAfiliado]) continue;

            const transaction = {
                fecha: this.parseDate(row[columnMap.fecha]),
                rut: this.cleanRUT(row[columnMap.rut]),
                rutAfiliado: this.cleanRUT(row[columnMap.rutAfiliado]),
                nombres: row[columnMap.nombres] || '',
                apellidos: row[columnMap.apellidos] || '',
                concepto: row[columnMap.concepto] || '',
                monto: this.parseNumber(row[columnMap.monto]),
                
                // Cantidades por kilo
                '05 KILOS': this.parseNumber(row[columnMap.lipigas5]),
                '11 KILOS': this.parseNumber(row[columnMap.lipigas11]),
                '15 KILOS': this.parseNumber(row[columnMap.lipigas15]),
                '45 KILOS': this.parseNumber(row[columnMap.lipigas45]),
                
                // Para distinguir Abastible
                '05 KILOS.1': this.parseNumber(row[columnMap.abastible5]),
                '11 KILOS.1': this.parseNumber(row[columnMap.abastible11]),
                '15 KILOS.1': this.parseNumber(row[columnMap.abastible15]),
                '45 KILOS.1': this.parseNumber(row[columnMap.abastible45])
            };

            if (transaction.rutAfiliado) {
                transactions.push(transaction);
            }
        }

        return transactions;
    }

    processSummarySheet(sheet) {
        const summary = {};
        const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false });
        
        // Buscar información de resumen en las primeras filas
        for (let i = 0; i < Math.min(5, jsonData.length); i++) {
            const row = jsonData[i];
            if (row && row[0]) {
                const cell = row[0].toString();
                if (cell.includes('CUPON ENTREGADO LIPIGAS')) {
                    summary.totalLipigas = this.parseNumber(row[1]);
                } else if (cell.includes('CUPON ENTREGADO ABASTIBLE')) {
                    summary.totalAbastible = this.parseNumber(row[1]);
                }
            }
        }

        return summary;
    }

    // Métodos auxiliares
    findColumnIndex(headers, searchTerms) {
        for (const term of searchTerms) {
            const index = headers.findIndex(header => 
                header && header.toString().toUpperCase().includes(term.toUpperCase())
            );
            if (index >= 0) return index;
        }
        return -1;
    }

    cleanRUT(rut) {
        if (!rut) return '';
        
        // Convertir a string y limpiar
        let cleanRUT = rut.toString().replace(/[.\s]/g, '').toUpperCase();
        
        // Agregar guión si no lo tiene
        if (cleanRUT.length > 1 && !cleanRUT.includes('-')) {
            cleanRUT = cleanRUT.slice(0, -1) + '-' + cleanRUT.slice(-1);
        }
        
        return cleanRUT;
    }

    parseDate(dateValue) {
        if (!dateValue) return null;
        
        // Si ya es una fecha
        if (dateValue instanceof Date) {
            return dateValue;
        }
        
        // Si es un string o número de Excel
        const dateStr = dateValue.toString();
        
        // Intentar parsear como fecha de Excel (número serial)
        if (!isNaN(dateStr) && dateStr.length > 5) {
            // Excel fecha serial a fecha JavaScript
            const excelDate = new Date((parseFloat(dateStr) - 25569) * 86400 * 1000);
            if (excelDate.getFullYear() > 1900) {
                return excelDate;
            }
        }
        
        // Intentar parsear como string de fecha
        const parsed = new Date(dateStr);
        return isNaN(parsed.getTime()) ? null : parsed;
    }

    parseNumber(value) {
        if (value === null || value === undefined || value === '') return 0;
        const num = parseFloat(value.toString().replace(/[^\d.-]/g, ''));
        return isNaN(num) ? 0 : num;
    }

    // Método para exportar datos procesados
    exportProcessedData() {
        if (!this.processedData) return null;
        
        return {
            affiliates: this.processedData.affiliates,
            transactions: this.processedData.transactions,
            summary: this.processedData.summary,
            metadata: {
                processedAt: new Date().toISOString(),
                totalAffiliates: this.processedData.affiliates.length,
                totalTransactions: this.processedData.transactions.length,
                sheetNames: this.processedData.sheetNames
            }
        };
    }
}

// Integración con el sistema principal
if (typeof window !== 'undefined') {
    window.ExcelProcessor = ExcelProcessor;
}
