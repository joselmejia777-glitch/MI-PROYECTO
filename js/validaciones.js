function validarFormulario(event) {
    // 1. Capturar todos los campos obligatorios del formulario
    const cedula = document.getElementById("cedula") ? document.getElementById("cedula").value.trim() : "";
    const nombre = document.getElementById("nombre") ? document.getElementById("nombre").value.trim() : "";
    const fechaNacimiento = document.getElementById("fecha_nacimiento") ? document.getElementById("fecha_nacimiento").value.trim() : "";
    const correo = document.getElementById("correo") ? document.getElementById("correo").value.trim() : "";
    const password = document.getElementById("password") ? document.getElementById("password").value.trim() : "";

    // ---------------------------------------------------------
    // PASO 1: Validar que ningún campo obligatorio esté vacío
    // ---------------------------------------------------------
    if (cedula === "" || nombre === "" || fechaNacimiento === "" || correo === "" || password === "") {
        alert("⚠️ Por favor, complete todos los campos obligatorios (incluyendo la fecha de nacimiento) antes de registrar.");
        event.preventDefault(); // Detiene el envío
        return false;
    }

    // ---------------------------------------------------------
    // PASO 2: Validar formato correcto del correo electrónico
    // ---------------------------------------------------------
    const regexCorreo = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

    if (!regexCorreo.test(correo)) {
        alert("❌ El formato del correo electrónico no es válido. Verifique que esté bien escrito (ejemplo: usuario@domain.com).");
        event.preventDefault(); // Detiene el envío
        return false;
    }

    return true;
}