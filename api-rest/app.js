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
// Ruta para registrar un paciente
app.post('/pacientes', async (req, res) => {
    try {
        const {
            tipo_documento, numero_documento, nombres, apellidos,
            fecha_nacimiento, sexo, telefono, correo,
            direccion, municipio, contrasena
        } = req.body;

        // Validar solo el formato del correo (rápido, sin consultas externas)
        const regexCorreo = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!regexCorreo.test(correo)) {
            return res.status(400).json({ mensaje: 'El correo no tiene un formato válido' });
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
// Ruta para Iniciar Sesión (Login)
app.post('/login', async (req, res) => {
  const { correo, contrasena } = req.body;

  if (!correo || !contrasena) {
    return res.status(400).json({ mensaje: 'Escribe tu correo y contraseña' });
  }

  try {
    // Buscar si el paciente existe en la base de datos
    const [filas] = await conexion.query(
      'SELECT * FROM pacientes WHERE correo = ?', 
      [correo]
    );

    if (filas.length === 0) {
      return res.status(401).json({ mensaje: 'Correo no registrado' });
    }

    const paciente = filas[0];

    // Verificar si la contraseña coincide
    if (paciente.contrasena !== contrasena) {
      return res.status(401).json({ mensaje: 'Contraseña incorrecta' });
    }

    // Responder con éxito si los datos son correctos
    res.json({
      mensaje: 'Inicio de sesión exitoso',
      paciente: paciente
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error interno en el servidor', error: error.message });
  }
});
// Configurar el puerto del servidor
const PORT = 10000;

// Iniciar el servidor
app.listen(PORT, () => {
    console.log(`Servidor ejecutándose en http://localhost:${PORT}`);
});