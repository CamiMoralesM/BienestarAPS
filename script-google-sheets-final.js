/**
 * DIAGNÓSTICO ESPECÍFICO - PROBLEMA COLUMNA DISPONIBLE
 */

class BienestarAPSSystemDebugDisponible {
    constructor() {
        this.currentUser = null;
        this.currentWorkbook = null;
        this.EXCEL_URL = 'https://docs.google.com/spreadsheets/d/1Dqo2NUU0ufdHZ74SboNxihDcuep5UmHR/export?format=xlsx';
        this.init();
    }

    init() {
        this.bindEvents();
        this.loadExcelFromGoogleSheets();
    }

    async loadExcelFromGoogleSheets() {
        try {
            console.log('📊 Descargando Excel para diagnóstico...');
            const response = await fetch(this.EXCEL_URL, {
                method: 'GET',
                mode: 'cors',
                cache: 'no-cache'
            });

            const arrayBuffer = await response.arrayBuffer();
            const workbook = XLSX.read(new Uint8Array(arrayBuffer), { type: 'array' });
            this.currentWorkbook = workbook;
            
            console.log('✅ Excel cargado para diagnóstico');
            return true;
            
        } catch (error) {
            console.error('❌ Error:', error);
            return false;
        }
    }

    async searchCoupons() {
        const rutInput = document.getElementById('rutInput');
        const rut = rutInput.value.trim();

        if (!rut) {
            alert('Ingrese un RUT');
            return;
        }

        const normalizedRUT = this.normalizeRUT(rut);
        console.log('\n🔍 DIAGNÓSTICO ESPECÍFICO DE COLUMNAS:');
        console.log('==========================================');
        console.log('RUT buscado:', normalizedRUT);

        if (!this.currentWorkbook) {
            await this.loadExcelFromGoogleSheets();
        }

        const sheet = this.currentWorkbook.Sheets['GENERAL'];
        if (!sheet) {
            console.log('❌ Hoja GENERAL no encontrada');
            return;
        }

        const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false });
        
        // Buscar la fila específica
        for (let i = 5; i < jsonData.length; i++) {
            const row = jsonData[i];
            if (row && row[4]) { // Columna E (RUT)
                const rutEnFila = String(row[4]).trim();
                const rutNormalizado = this.normalizeRUT(rutEnFila);
                
                if (rutNormalizado === normalizedRUT) {
                    console.log(`\n✅ RUT ENCONTRADO en fila ${i + 1}`);
                    console.log('🔍 DIAGNÓSTICO DE TODAS LAS COLUMNAS RELEVANTES:');
                    
                    // Mostrar columnas importantes con sus letras
                    const columnMap = {
                        'E (RUT)': row[4],
                        'F (NOMBRES)': row[5],
                        'G (APELLIDOS)': row[6],
                        'H (ESTABLECIMIENTO)': row[7],
                        'J (LIPIGAS 5kg)': row[9],
                        'K (LIPIGAS 11kg)': row[10],
                        'L (LIPIGAS 15kg)': row[11],
                        'M (LIPIGAS 45kg)': row[12],
                        'N (ABASTIBLE 5kg)': row[13],
                        'O (ABASTIBLE 11kg)': row[14],
                        'P (ABASTIBLE 15kg)': row[15],
                        'Q (ABASTIBLE 45kg)': row[16],
                        'AF (USADO EN EL MES)': row[31],
                        'AG (DISPONIBLE)': row[32]
                    };

                    Object.entries(columnMap).forEach(([columnName, value]) => {
                        console.log(`  ${columnName}: "${value}"`);
                    });

                    // MOSTRAR LAS ÚLTIMAS 10 COLUMNAS PARA VER DÓNDE ESTÁ REALMENTE DISPONIBLE
                    console.log('\n🔍 ÚLTIMAS 10 COLUMNAS (para encontrar DISPONIBLE real):');
                    for (let col = row.length - 10; col < row.length; col++) {
                        if (col >= 0) {
                            const colLetter = this.numberToColumnName(col + 1); // +1 porque Excel es base 1
                            console.log(`  Índice ${col} (Columna ${colLetter}): "${row[col]}"`);
                        }
                    }

                    // VERIFICAR ESPECÍFICAMENTE LAS COLUMNAS DONDE PODRÍA ESTAR DISPONIBLE
                    console.log('\n🎯 VERIFICACIÓN ESPECÍFICA DISPONIBLE:');
                    console.log('  row[32] (AG):', row[32]);
                    console.log('  row[31] (AF):', row[31]);
                    console.log('  row[30] (AE):', row[30]);
                    console.log('  row[33] (AH):', row[33]);
                    
                    // Buscar la palabra "DISPONIBLE" en los headers
                    console.log('\n🔍 BUSCANDO HEADERS CON "DISPONIBLE":');
                    const headerRow = jsonData[4] || jsonData[3] || jsonData[2]; // Probar diferentes filas de header
                    if (headerRow) {
                        for (let col = 0; col < headerRow.length; col++) {
                            const header = String(headerRow[col] || '').toLowerCase();
                            if (header.includes('disponible')) {
                                const colLetter = this.numberToColumnName(col + 1);
                                console.log(`  🎯 ENCONTRADO! Columna ${col} (${colLetter}): "${headerRow[col]}" = ${row[col]}`);
                            }
                        }
                    }

                    break;
                }
            }
        }
    }

    // Función para convertir número de columna a letra (1=A, 27=AA, etc.)
    numberToColumnName(num) {
        let result = '';
        while (num > 0) {
            num--;
            result = String.fromCharCode(65 + (num % 26)) + result;
            num = Math.floor(num / 26);
        }
        return result;
    }

    normalizeRUT(rut) {
        const cleanRUT = rut.replace(/[.-\s]/g, '');
        if (cleanRUT.length < 8) return rut;
        
        const rutNumber = cleanRUT.slice(0, -1);
        const dv = cleanRUT.slice(-1).toUpperCase();
        
        return rutNumber + '-' + dv;
    }

    formatRUT(e) {
        let value = e.target.value.replace(/[^0-9kK]/g, '');
        if (value.length > 1) {
            const rut = value.slice(0, -1);
            const dv = value.slice(-1);
            value = rut + '-' + dv;
        }
        e.target.value = value;
    }

    bindEvents() {
        document.getElementById('searchBtn').addEventListener('click', () => this.searchCoupons());
        document.getElementById('rutInput').addEventListener('input', (e) => this.formatRUT(e));
    }
}

// Inicializar
let bienestarSystem;

document.addEventListener('DOMContentLoaded', function() {
    bienestarSystem = new BienestarAPSSystemDebugDisponible();
    
    console.log('🛠️ DIAGNÓSTICO ESPECÍFICO DISPONIBLE ACTIVADO');
    console.log('📋 Busca el RUT: 16743348-0');
    console.log('🔍 Veremos exactamente qué columna está leyendo para DISPONIBLE');
});

window.bienestarSystem = bienestarSystem;
