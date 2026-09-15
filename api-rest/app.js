// Importar la librería Express
const express = require('express');
const cors = require('cors');
const conexion = require('./conexion');

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