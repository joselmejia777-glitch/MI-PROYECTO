// Importar la librería Express
const express = require('express');
const cors = require('cors');
const conexion = require('./conexion');
const dns = require('dns').promises;

// Crear la aplicación
const app = express();

app.use(cors());
app.use(express.json());

// Definir la ruta principal
app.get('/', (req, res) => {
    res.send('Prueba 1: respuesta del servidor');
});

// Ruta para registrar un paciente
app.post('/pacientes', async (req, res) => {
    try {
        const {
            tipo_documento, numero_documento, nombres, apellidos,
            fecha_nacimiento, sexo, telefono, correo,
            direccion, municipio, contrasena
        } = req.body;

                // Validar formato del correo
        const regexCorreo = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!regexCorreo.test(correo)) {
            return res.status(400).json({ mensaje: 'El correo no tiene un formato válido' });
        }

        // Validar que el dominio del correo exista y reciba mensajes
        try {
            const dominio = correo.split('@')[1];
            const registros = await dns.resolveMx(dominio);
            if (!registros || registros.length === 0) throw new Error('sin MX');
        } catch (e) {
            return res.status(400).json({ mensaje: 'El dominio del correo no existe o no recibe correos' });
        }

        const [resultado] = await conexion.query(
            `INSERT INTO pacientes
            (tipo_documento, numero_documento, nombres, apellidos, fecha_nacimiento, sexo, telefono, correo, direccion, municipio, contrasena)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [tipo_documento, numero_documento, nombres, apellidos, fecha_nacimiento, sexo, telefono, correo, direccion, municipio, contrasena]
        );

        res.status(201).json({ mensaje: 'Paciente registrado', id: resultado.insertId });

    } catch (error) {
        console.error(error);
        res.status(500).json({ mensaje: 'Error al registrar paciente', error: error.message });
    }
});

// Configurar el puerto del servidor
const PORT = 10000;

// Iniciar el servidor
app.listen(PORT, () => {
    console.log(`Servidor ejecutándose en http://localhost:${PORT}`);
});