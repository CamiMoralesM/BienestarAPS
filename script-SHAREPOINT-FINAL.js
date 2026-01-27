class BienestarAPSSystem {
    constructor() {
        this.sharePointUrls = [
            'https://cmesapa-my.sharepoint.com/:x:/g/personal/alejandro_ponce_cmpuentealto_cl/IQDMU9-cU2OESYO8ETvodgptAU2lRYCtsFgLjHcMfgBQd-I?e=z8r8sT&download=1',
            'https://cmesapa-my.sharepoint.com/_layouts/15/download.aspx?share=IQDMU9-cU2OESYO8ETvodgptAU2lRYCtsFgLjHcMfgBQd-I',
            'https://cmesapa-my.sharepoint.com/:x:/g/personal/alejandro_ponce_cmpuentealto_cl/IQDMU9-cU2OESYO8ETvodgptAU2lRYCtsFgLjHcMfgBQd-I'
        ];
        this.cache = { data: null, timestamp: null };
        this.cacheTimeout = 5 * 60 * 1000; // 5 minutos
        this.initializeSystem();
    }

    initializeSystem() {
        // ✅ LOG GENÉRICO - NO SENSIBLE
        console.log('Sistema iniciado');
        this.loadSharePointData();
    }

    async loadSharePointData() {
        console.log('Conectando a base de datos...');
        
        // Verificar cache
        if (this.cache.data && this.isValidCache()) {
            console.log('Usando datos en caché');
            return this.cache.data;
        }

        // Intentar descarga con múltiples métodos
        for (let i = 0; i < this.sharePointUrls.length; i++) {
            try {
                // ❌ ELIMINADO: console.log('URL principal:', this.sharePointUrls[i]);
                console.log(`Método ${i + 1}: Conectando...`);
                
                const response = await fetch(this.sharePointUrls[i], {
                    method: 'GET',
                    headers: { 'Accept': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }
                });

                if (!response.ok) {
                    console.log(`Método ${i + 1}: Error ${response.status}`);
                    continue;
                }

                const contentType = response.headers.get('content-type');
                if (!this.isExcelContent(contentType)) {
                    console.log(`Método ${i + 1}: Tipo contenido inválido`);
                    continue;
                }

                const arrayBuffer = await response.arrayBuffer();
                const workbook = XLSX.read(arrayBuffer, { type: 'array' });
                
                console.log(`Método ${i + 1}: Conexión exitosa`);
                console.log('Archivo procesado:', `${Math.round(arrayBuffer.byteLength / 1024)} KB`);
                
                // ❌ ELIMINADO: console.log('Hojas encontradas:', workbook.SheetNames.length);
                console.log('Datos cargados correctamente');
                
                // Actualizar cache
                this.cache = { data: workbook, timestamp: Date.now() };
                return workbook;

            } catch (error) {
                console.log(`Método ${i + 1}: Falló conexión`);
                // ❌ ELIMINADO: console.error('Error detallado:', error);
            }
        }

        throw new Error('No se pudo conectar a la base de datos');
    }

    isValidCache() {
        return Date.now() - this.cache.timestamp < this.cacheTimeout;
    }

    isExcelContent(contentType) {
        return contentType && (
            contentType.includes('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') ||
            contentType.includes('application/vnd.ms-excel')
        );
    }

    async searchRUT(rut) {
        if (!rut || rut.trim() === '') {
            this.showError('Por favor ingrese un RUT válido');
            return;
        }

        const cleanRUT = this.formatRUT(rut.replace(/\./g, '').replace(/-/g, '').toUpperCase());
        console.log('Buscando RUT...');

        this.showLoading(true);

        try {
            const workbook = await this.loadSharePointData();
            const result = this.processWorkbook(workbook, cleanRUT);
            
            if (result.found) {
                console.log('Búsqueda exitosa');
                this.displayResults(result);
            } else {
                console.log('RUT no encontrado');
                this.showError('RUT no encontrado en el sistema. Verifique el número ingresado.');
            }
        } catch (error) {
            console.log('Error en la búsqueda');
            this.showError('Error al buscar datos. Intente nuevamente en unos momentos.');
        } finally {
            this.showLoading(false);
        }
    }

    processWorkbook(workbook, cleanRUT) {
        const sheetsToSearch = ['GENERAL', 'CUPONES DISPONIBLES', 'BASE DE DATOS'];
        
        for (const sheetName of sheetsToSearch) {
            if (!workbook.Sheets[sheetName]) continue;
            
            console.log(`Procesando datos...`);
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
            
            const result = this.searchInSheet(jsonData, cleanRUT, sheetName);
            if (result.found) {
                console.log('Datos encontrados');
                return result;
            }
        }
        
        return { found: false };
    }

    searchInSheet(jsonData, cleanRUT, sheetName) {
        let totalUsado = 0;
        let totalDisponible = 0;
        let personData = null;
        let usadoValue = null;
        let disponibleValue = null;

        for (let i = 0; i < jsonData.length; i++) {
            const row = jsonData[i];
            const cellRUT = row[4] ? String(row[4]).replace(/\./g, '').replace(/-/g, '').toUpperCase() : '';

            if (cellRUT === cleanRUT) {
                if (!personData) {
                    personData = {
                        nombre: `${row[5] || ''} ${row[6] || ''} ${row[7] || ''}`.trim(),
                        establecimiento: row[8] || '',
                        rut: cleanRUT
                    };

                    if (sheetName === 'GENERAL') {
                        usadoValue = this.parseNumericValue(row[31]);
                        disponibleValue = this.parseNumericValue(row[32]);
                    }
                }

                // Sumar cupones de Lipigas (columnas J-M)
                totalUsado += this.parseNumericValue(row[9]);   // J
                totalUsado += this.parseNumericValue(row[10]);  // K  
                totalUsado += this.parseNumericValue(row[11]);  // L
                totalUsado += this.parseNumericValue(row[12]);  // M

                // Sumar cupones de Abastible (columnas N-Q)
                totalUsado += this.parseNumericValue(row[13]);  // N
                totalUsado += this.parseNumericValue(row[14]);  // O
                totalUsado += this.parseNumericValue(row[15]);  // P
                totalUsado += this.parseNumericValue(row[16]);  // Q
            }
        }

        if (personData) {
            const finalUsado = sheetName === 'GENERAL' && usadoValue !== null ? usadoValue : totalUsado;
            const finalDisponible = sheetName === 'GENERAL' && disponibleValue !== null ? disponibleValue : Math.max(0, totalDisponible);

            return {
                found: true,
                personData,
                usado: finalUsado,
                disponible: finalDisponible,
                totalUsado,
                sheetName
            };
        }

        return { found: false };
    }

    parseNumericValue(value) {
        if (value === null || value === undefined || value === '') return 0;
        const parsed = parseFloat(value);
        return isNaN(parsed) ? 0 : parsed;
    }

    formatRUT(rut) {
        if (rut.length < 2) return rut;
        
        const dv = rut.slice(-1);
        const numbers = rut.slice(0, -1);
        
        return numbers.replace(/\B(?=(\d{3})+(?!\d))/g, '.') + '-' + dv;
    }

    displayResults(result) {
        document.getElementById('personName').textContent = result.personData.nombre.toUpperCase();
        document.getElementById('personRUT').textContent = result.personData.rut;
        
        if (result.personData.establecimiento) {
            document.getElementById('personCenter').textContent = result.personData.establecimiento;
            document.getElementById('centerInfo').style.display = 'block';
        } else {
            document.getElementById('centerInfo').style.display = 'none';
        }

        document.getElementById('usadoCount').textContent = result.usado;
        document.getElementById('disponibleCount').textContent = result.disponible;

        document.getElementById('resultsSection').style.display = 'block';
        document.getElementById('resultsSection').scrollIntoView({ behavior: 'smooth' });
    }

    showLoading(show) {
        const button = document.getElementById('searchButton');
        const input = document.getElementById('rutInput');
        
        if (show) {
            button.textContent = 'Buscando...';
            button.disabled = true;
            input.disabled = true;
        } else {
            button.textContent = 'Buscar Cupones';
            button.disabled = false;
            input.disabled = false;
        }
    }

    showError(message) {
        alert(message);
        document.getElementById('resultsSection').style.display = 'none';
    }
}

// ✅ LOG GENÉRICO AL INICIAR - NO SENSIBLE
console.log('Sistema de consulta iniciado');

// Inicializar sistema
let bienestarSystem;

document.addEventListener('DOMContentLoaded', function() {
    console.log('Cargando interfaz...');
    
    bienestarSystem = new BienestarAPSSystem();

    const rutInput = document.getElementById('rutInput');
    const searchButton = document.getElementById('searchButton');

    if (rutInput) {
        rutInput.addEventListener('input', function(e) {
            let value = e.target.value.replace(/[^0-9kK]/g, '');
            if (value.length > 0) {
                value = bienestarSystem.formatRUT(value);
                e.target.value = value;
            }
        });

        rutInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                bienestarSystem.searchRUT(rutInput.value);
            }
        });
    }

    if (searchButton) {
        searchButton.addEventListener('click', function() {
            const rutValue = document.getElementById('rutInput').value;
            bienestarSystem.searchRUT(rutValue);
        });
    }

    console.log('Sistema listo');
});
