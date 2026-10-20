function validarFormulario(event) {
    // 1. Capturar los valores de los campos principales
    const cedula = document.getElementById("cedula").value.trim();
    const nombre = document.getElementById("nombre").value.trim();
    const correo = document.getElementById("correo").value.trim();
    const password = document.getElementById("password").value.trim();

    // ---------------------------------------------------------
    // PASO 1: Validar campos vacíos (¡Esto debe ir de primero!)
    // ---------------------------------------------------------
    if (cedula === "" || nombre === "" || correo === "" || password === "") {
        alert("⚠️ Por favor, complete todos los campos obligatorios antes de registrar.");
        event.preventDefault(); // Detiene el envío del formulario
        return false;
    }

    // ---------------------------------------------------------
    // PASO 2: Validar el formato correcto del correo electrónico
    // ---------------------------------------------------------
    // Expresión regular robusta para correos electrónicos
    const regexCorreo = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

    if (!regexCorreo.test(correo)) {
        alert("❌ El formato del correo electrónico no es válido. Verifique que esté bien escrito (ejemplo: usuario@domain.com).");
        event.preventDefault(); // Detiene el envío del formulario
        return false;
    }

    // Si todo está correcto, permite el registro
    return true;
}