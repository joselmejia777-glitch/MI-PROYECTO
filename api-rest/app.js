// Importar las librerías
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const conexion = require('./conexion');

const SECRETO_JWT = process.env.JWT_SECRET || 'clave_local_de_prueba_cambiar';

// Crear la aplicación
const app = express();

app.use(cors());
app.use(express.json());

// Ruta principal
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

// Función auxiliar: compara la contraseña (cifrada o antigua sin cifrar)
async function verificarContrasena(contrasenaEscrita, contrasenaGuardada) {
    if (!contrasenaGuardada) return false;
    if (contrasenaGuardada.startsWith('$2')) {
        return await bcrypt.compare(contrasenaEscrita, contrasenaGuardada);
    }
    return contrasenaEscrita === contrasenaGuardada;
}

// Ruta para Iniciar Sesión (Login) de pacientes, empleados, médicos y administrador
app.post('/login', async (req, res) => {
    const { correo, contrasena } = req.body;

    if (!correo || !contrasena) {
        return res.status(400).json({ mensaje: 'Escribe tu correo y contraseña' });
    }

    try {
        // 1. Buscar primero entre los pacientes
        const [pacientes] = await conexion.query(
            'SELECT * FROM pacientes WHERE correo = ?',
            [correo]
        );

        if (pacientes.length > 0) {
            const paciente = pacientes[0];

            if (!(await verificarContrasena(contrasena, paciente.contrasena))) {
                return res.status(401).json({ mensaje: 'Contraseña incorrecta' });
            }

            delete paciente.contrasena;
            return res.json({
                mensaje: 'Inicio de sesión exitoso',
                rol: 'paciente',
                paciente: paciente
            });
        }

        // 2. Si no es paciente, buscar entre empleados y médicos
        const [empleados] = await conexion.query(
            'SELECT * FROM empleados WHERE correo = ?',
            [correo]
        );

        if (empleados.length === 0) {
            return res.status(401).json({ mensaje: 'Correo no registrado' });
        }

        const empleado = empleados[0];

        if (empleado.estado !== 'activo') {
            return res.status(403).json({ mensaje: 'Tu cuenta aún no está activada. Actívala en tu formulario.' });
        }

        if (!(await verificarContrasena(contrasena, empleado.contrasena))) {
            return res.status(401).json({ mensaje: 'Contraseña incorrecta' });
        }

                delete empleado.contrasena;

        const token = jwt.sign(
            { id: empleado.id_empleado, rol: empleado.rol },
            SECRETO_JWT,
            { expiresIn: '2h' }
        );

        return res.json({
            mensaje: 'Inicio de sesión exitoso',
            rol: empleado.rol,
            token: token,
            empleado: empleado
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ mensaje: 'Error interno en el servidor', error: error.message });
    }
});
// Guardia: solo deja pasar a quien tenga un token de administrador
function soloAdministrador(req, res, next) {
    const cabecera = req.headers['authorization'] || '';
    const token = cabecera.startsWith('Bearer ') ? cabecera.slice(7) : null;

    if (!token) {
        return res.status(401).json({ mensaje: 'Debes iniciar sesión como administrador' });
    }

    try {
        const datos = jwt.verify(token, SECRETO_JWT);

        if (datos.rol !== 'administrador') {
            return res.status(403).json({ mensaje: 'Solo el administrador puede hacer esto' });
        }

        req.usuario = datos;
        next();
    } catch (error) {
        return res.status(401).json({ mensaje: 'Sesión inválida o vencida. Inicia sesión de nuevo.' });
    }
}
// Ruta para que el administrador pre-registre empleados y médicos
app.post('/empleados/preregistro', soloAdministrador, async (req, res) => {
    try {
        const {
            tipo_documento, numero_documento, nombres, apellidos,
            correo, cargo, rol, especialidad
        } = req.body;

        const especialidades = ['Medicina General', 'Odontologia', 'Pediatria', 'Fisioterapia', 'Optometria'];

        // 1. Campos obligatorios
        if (!tipo_documento || !numero_documento || !nombres || !apellidos || !correo || !cargo || !rol) {
            return res.status(400).json({ mensaje: 'Faltan datos obligatorios' });
        }

        // 2. Solo se pueden pre-registrar estos dos roles
        if (rol !== 'empleado' && rol !== 'medico') {
            return res.status(400).json({ mensaje: "El rol debe ser 'empleado' o 'medico'" });
        }

        // 3. Un médico debe tener especialidad válida
        let especialidadFinal = null;
        if (rol === 'medico') {
            if (!especialidad || !especialidades.includes(especialidad)) {
                return res.status(400).json({
                    mensaje: 'Un médico necesita una especialidad: ' + especialidades.join(', ')
                });
            }
            especialidadFinal = especialidad;
        }

        // 4. Formato del correo
        const regexCorreo = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!regexCorreo.test(correo)) {
            return res.status(400).json({ mensaje: 'El correo no tiene un formato válido' });
        }

        // 5. Guardar como pendiente, sin contraseña
        const [resultado] = await conexion.query(
            `INSERT INTO empleados
            (tipo_documento, numero_documento, nombres, apellidos, correo, cargo, rol, especialidad, estado)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pendiente')`,
            [tipo_documento, numero_documento, nombres, apellidos, correo, cargo, rol, especialidadFinal]
        );

        res.status(201).json({
            mensaje: 'Pre-registro creado. La persona ya puede activar su cuenta.',
            id: resultado.insertId
        });

    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ mensaje: 'Ya existe un empleado con ese número de documento' });
        }
        console.error(error);
        res.status(500).json({ mensaje: 'Error al pre-registrar', error: error.message });
    }
});

// Ruta para que un empleado o médico pre-registrado active su cuenta
app.post('/empleados/activar', async (req, res) => {
    try {
        const {
            formulario,
            numero_documento, correo,
            fecha_nacimiento, telefono, direccion, lugar_residencia,
            usuario, contrasena
        } = req.body;

        if (!formulario || !numero_documento || !correo || !fecha_nacimiento || !usuario || !contrasena) {
            return res.status(400).json({ mensaje: 'Faltan datos obligatorios' });
        }

       if (formulario !== 'medico' && formulario !== 'empleado' && formulario !== 'administrador') {
            return res.status(400).json({ mensaje: 'Formulario no válido' });
        }

        if (contrasena.length < 6) {
            return res.status(400).json({ mensaje: 'La contraseña debe tener mínimo 6 caracteres' });
        }

        const [filas] = await conexion.query(
            'SELECT id_empleado, rol, estado FROM empleados WHERE numero_documento = ? AND correo = ?',
            [numero_documento, correo]
        );

        if (filas.length === 0) {
            return res.status(403).json({ mensaje: 'No estás autorizado. Contacta al administrador.' });
        }

        const empleado = filas[0];

        if (empleado.rol !== formulario) {
            return res.status(403).json({ mensaje: `Tu registro no corresponde al formulario de ${formulario}.` });
        }

        if (empleado.estado !== 'pendiente') {
            return res.status(409).json({ mensaje: 'Esta cuenta ya fue activada o está inactiva.' });
        }

        const [repetido] = await conexion.query(
            'SELECT id_empleado FROM empleados WHERE usuario = ?',
            [usuario]
        );
        if (repetido.length > 0) {
            return res.status(409).json({ mensaje: 'Ese nombre de usuario ya está en uso.' });
        }

        const contrasenaCifrada = await bcrypt.hash(contrasena, 10);

        await conexion.query(
            `UPDATE empleados
             SET fecha_nacimiento = ?, telefono = ?, direccion = ?, lugar_residencia = ?,
                 usuario = ?, contrasena = ?, estado = 'activo'
             WHERE id_empleado = ? AND estado = 'pendiente'`,
            [fecha_nacimiento, telefono, direccion, lugar_residencia,
             usuario, contrasenaCifrada, empleado.id_empleado]
        );

        res.json({ mensaje: 'Cuenta activada. Ya puedes iniciar sesión.' });

    } catch (error) {
        console.error(error);
        res.status(500).json({ mensaje: 'Error al activar la cuenta', error: error.message });
    }
});

// ============================================================
// GUARDIAS POR ROL (usan el token que entrega el login)
// ============================================================
function verificarToken(req, res, next) {
    const cabecera = req.headers['authorization'] || '';
    const token = cabecera.startsWith('Bearer ') ? cabecera.slice(7) : null;

    if (!token) {
        return res.status(401).json({ mensaje: 'Debes iniciar sesión' });
    }

    try {
        req.usuario = jwt.verify(token, SECRETO_JWT);
        next();
    } catch (error) {
        return res.status(401).json({ mensaje: 'Sesión inválida o vencida. Inicia sesión de nuevo.' });
    }
}

function permitirRoles(...rolesPermitidos) {
    return [
        verificarToken,
        (req, res, next) => {
            if (!rolesPermitidos.includes(req.usuario.rol)) {
                return res.status(403).json({ mensaje: 'No tienes permiso para hacer esto' });
            }
            next();
        }
    ];
}

// ============================================================
// VER CITAS (recepcionista, médico y administrador)
// El médico solo ve las suyas. Filtros opcionales: ?fecha=AAAA-MM-DD &estado= &documento=
// ============================================================
app.get('/citas', permitirRoles('empleado', 'medico', 'administrador'), async (req, res) => {
    try {
        const { fecha, estado, documento } = req.query;

        let sql = `
            SELECT c.id_cita, c.identificacion, c.nombre, c.celular, c.correo,
                   DATE_FORMAT(c.fecha, '%Y-%m-%d') AS fecha,
                   TIME_FORMAT(c.hora, '%H:%i') AS hora,
                   c.servicio, c.estado, c.motivo, c.canal, c.id_medico,
                   CONCAT(e.nombres, ' ', e.apellidos) AS medico
            FROM citas c
            LEFT JOIN empleados e ON e.id_empleado = c.id_medico
            WHERE 1 = 1`;
        const params = [];

        if (req.usuario.rol === 'medico') {
            sql += ' AND c.id_medico = ?';
            params.push(req.usuario.id);
        }
        if (fecha) {
            sql += ' AND c.fecha = ?';
            params.push(fecha);
        }
        if (estado) {
            sql += ' AND c.estado = ?';
            params.push(estado);
        }
        if (documento) {
            sql += ' AND c.identificacion = ?';
            params.push(documento);
        }

        sql += ' ORDER BY c.fecha, c.hora';

        const [filas] = await conexion.query(sql, params);
        res.json(filas);

    } catch (error) {
        console.error(error);
        res.status(500).json({ mensaje: 'Error al consultar las citas', error: error.message });
    }
});

// ============================================================
// BUSCAR PACIENTES POR DOCUMENTO (recepcionista y administrador)
// Nunca devuelve la contraseña ni datos clínicos
// ============================================================
app.get('/pacientes/buscar', permitirRoles('empleado', 'administrador'), async (req, res) => {
    try {
        const documento = (req.query.documento || '').trim();

        if (documento.length < 3) {
            return res.status(400).json({ mensaje: 'Escribe al menos 3 números del documento' });
        }

        const [filas] = await conexion.query(
            `SELECT id_paciente, tipo_documento, numero_documento, nombres, apellidos,
                    DATE_FORMAT(fecha_nacimiento, '%Y-%m-%d') AS fecha_nacimiento,
                    sexo, telefono, correo, direccion, municipio
             FROM pacientes
             WHERE numero_documento LIKE ?
             LIMIT 20`,
            [documento + '%']
        );

        res.json(filas);

    } catch (error) {
        console.error(error);
        res.status(500).json({ mensaje: 'Error al buscar pacientes', error: error.message });
    }
});

// ============================================================
// REPROGRAMAR UNA CITA (recepcionista, médico y administrador)
// Guarda quién la cambió, cuándo, qué había antes, el motivo y el canal
// ============================================================
app.put('/citas/:id/reprogramar', permitirRoles('empleado', 'medico', 'administrador'), async (req, res) => {
    try {
        const idCita = Number(req.params.id);
        const { fecha, hora, motivo, canal } = req.body;

        // 1. Validar datos
        if (!fecha || !hora || !motivo || !canal) {
            return res.status(400).json({ mensaje: 'Faltan datos: fecha, hora, motivo y canal' });
        }
        if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha) || !/^\d{2}:\d{2}$/.test(hora)) {
            return res.status(400).json({ mensaje: 'Usa el formato fecha AAAA-MM-DD y hora HH:MM' });
        }
        if (!['telefono', 'presencial', 'web'].includes(canal)) {
            return res.status(400).json({ mensaje: "El canal debe ser 'telefono', 'presencial' o 'web'" });
        }

        const hoy = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });
        if (fecha < hoy) {
            return res.status(400).json({ mensaje: 'La nueva fecha no puede estar en el pasado' });
        }

        // 2. Buscar la cita actual
        const [citas] = await conexion.query(
            `SELECT id_cita, id_medico, estado,
                    DATE_FORMAT(fecha, '%Y-%m-%d') AS fecha,
                    TIME_FORMAT(hora, '%H:%i:%s') AS hora
             FROM citas WHERE id_cita = ?`,
            [idCita]
        );

        if (citas.length === 0) {
            return res.status(404).json({ mensaje: 'La cita no existe' });
        }

        const cita = citas[0];

        // 3. El médico solo puede mover sus propias citas
        if (req.usuario.rol === 'medico' && cita.id_medico !== req.usuario.id) {
            return res.status(403).json({ mensaje: 'Esta cita no es tuya' });
        }

        // 4. No se mueven citas canceladas ni atendidas
        if (cita.estado === 'Cancelada' || cita.estado === 'Atendida') {
            return res.status(409).json({ mensaje: `No se puede reprogramar una cita ${cita.estado.toLowerCase()}` });
        }

        // 5. Aviso de choque: el médico no puede tener dos citas a la misma hora
        if (cita.id_medico) {
            const [choque] = await conexion.query(
                `SELECT id_cita FROM citas
                 WHERE id_medico = ? AND fecha = ? AND hora = ?
                   AND estado <> 'Cancelada' AND id_cita <> ?`,
                [cita.id_medico, fecha, hora + ':00', idCita]
            );
            if (choque.length > 0) {
                return res.status(409).json({ mensaje: 'El médico ya tiene una cita a esa fecha y hora' });
            }
        }

        // 6. Guardar el cambio y dejar el historial
        await conexion.query(
            `UPDATE citas
             SET fecha = ?, hora = ?, estado = 'Reprogramada', motivo = ?, canal = ?
             WHERE id_cita = ?`,
            [fecha, hora + ':00', motivo, canal, idCita]
        );

        await conexion.query(
            `INSERT INTO citas_historial
             (id_cita, id_empleado, accion, fecha_anterior, hora_anterior, fecha_nueva, hora_nueva, motivo, canal)
             VALUES (?, ?, 'reprogramada', ?, ?, ?, ?, ?, ?)`,
            [idCita, req.usuario.id, cita.fecha, cita.hora, fecha, hora + ':00', motivo, canal]
        );

        res.json({ mensaje: 'Cita reprogramada correctamente', id_cita: idCita, fecha, hora });

    } catch (error) {
        console.error(error);
        res.status(500).json({ mensaje: 'Error al reprogramar la cita', error: error.message });
    }
});


// ============================================================
// CREAR UNA REMISIÓN (solo el médico general)
// Se hace sobre una cita que el médico está atendiendo
// ============================================================
app.post('/remisiones', permitirRoles('medico'), async (req, res) => {
    try {
        const { id_cita, especialidad, motivo } = req.body;
        const especialidadesRemision = ['Odontologia', 'Pediatria', 'Fisioterapia', 'Optometria'];

        // 1. Validar datos
        if (!id_cita || !especialidad || !motivo) {
            return res.status(400).json({ mensaje: 'Faltan datos: id_cita, especialidad y motivo' });
        }
        if (!especialidadesRemision.includes(especialidad)) {
            return res.status(400).json({
                mensaje: 'La especialidad debe ser: ' + especialidadesRemision.join(', ')
            });
        }

        // 2. Solo un médico general puede remitir
        const [medicos] = await conexion.query(
            'SELECT especialidad FROM empleados WHERE id_empleado = ?',
            [req.usuario.id]
        );
        if (medicos.length === 0 || medicos[0].especialidad !== 'Medicina General') {
            return res.status(403).json({ mensaje: 'Solo un médico general puede crear remisiones' });
        }

        // 3. La cita debe existir y ser de este médico
        const [citas] = await conexion.query(
            'SELECT id_cita, id_paciente, id_medico FROM citas WHERE id_cita = ?',
            [id_cita]
        );
        if (citas.length === 0) {
            return res.status(404).json({ mensaje: 'La cita no existe' });
        }
        const cita = citas[0];

        if (cita.id_medico !== req.usuario.id) {
            return res.status(403).json({ mensaje: 'Esta cita no es tuya' });
        }
        if (!cita.id_paciente) {
            return res.status(400).json({ mensaje: 'La cita no está vinculada a un paciente registrado' });
        }

        // 4. Evitar remisiones pendientes repetidas
        const [repetida] = await conexion.query(
            `SELECT id_remision FROM remisiones
             WHERE id_paciente = ? AND especialidad = ? AND estado = 'pendiente'`,
            [cita.id_paciente, especialidad]
        );
        if (repetida.length > 0) {
            return res.status(409).json({ mensaje: 'Ya existe una remisión pendiente a esa especialidad' });
        }

        // 5. Guardar la remisión
        const [resultado] = await conexion.query(
            `INSERT INTO remisiones (id_paciente, id_cita_origen, id_medico_origen, especialidad, motivo)
             VALUES (?, ?, ?, ?, ?)`,
            [cita.id_paciente, cita.id_cita, req.usuario.id, especialidad, motivo]
        );

        res.status(201).json({
            mensaje: 'Remisión creada. El recepcionista agendará la cita con el especialista.',
            id_remision: resultado.insertId
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ mensaje: 'Error al crear la remisión', error: error.message });
    }
});

// ============================================================
// VER REMISIONES (recepcionista y administrador ven todas; el médico, las que creó)
// Filtro opcional: ?estado=pendiente
// ============================================================
app.get('/remisiones', permitirRoles('empleado', 'medico', 'administrador'), async (req, res) => {
    try {
        const { estado } = req.query;

        let sql = `
            SELECT r.id_remision, r.especialidad, r.motivo, r.estado,
                   DATE_FORMAT(r.fecha_remision, '%Y-%m-%d %H:%i') AS fecha_remision,
                   p.numero_documento, CONCAT(p.nombres, ' ', p.apellidos) AS paciente, p.telefono,
                   CONCAT(e.nombres, ' ', e.apellidos) AS medico_remite
            FROM remisiones r
            JOIN pacientes p ON p.id_paciente = r.id_paciente
            JOIN empleados e ON e.id_empleado = r.id_medico_origen
            WHERE 1 = 1`;
        const params = [];

        if (req.usuario.rol === 'medico') {
            sql += ' AND r.id_medico_origen = ?';
            params.push(req.usuario.id);
        }
        if (estado) {
            sql += ' AND r.estado = ?';
            params.push(estado);
        }

        sql += ' ORDER BY r.fecha_remision DESC';

        const [filas] = await conexion.query(sql, params);
        res.json(filas);

    } catch (error) {
        console.error(error);
        res.status(500).json({ mensaje: 'Error al consultar las remisiones', error: error.message });
    }
});
// Configurar el puerto del servidor
const PORT = 10000;

// Iniciar el servidor
app.listen(PORT, () => {
    console.log(`Servidor ejecutándose en http://localhost:10000`);
});