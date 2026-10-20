function validarFormulario(event) {
    // 1. Capturar todos los campos del formulario con los IDs exactos de tu HTML
    const tipoDocumento = document.getElementById("tipo_documento") ? document.getElementById("tipo_documento").value.trim() : "";
    const numeroDocumento = document.getElementById("numero_documento") ? document.getElementById("numero_documento").value.trim() : "";
    const nombres = document.getElementById("nombres") ? document.getElementById("nombres").value.trim() : "";
    const apellidos = document.getElementById("apellidos") ? document.getElementById("apellidos").value.trim() : "";
    const fechaNacimiento = document.getElementById("fecha_nacimiento") ? document.getElementById("fecha_nacimiento").value.trim() : "";
    const sexo = document.getElementById("sexo") ? document.getElementById("sexo").value.trim() : "";
    const telefono = document.getElementById("telefono") ? document.getElementById("telefono").value.trim() : "";
    const correo = document.getElementById("correo") ? document.getElementById("correo").value.trim() : "";
    const direccion = document.getElementById("direccion") ? document.getElementById("direccion").value.trim() : "";
    const municipio = document.getElementById("municipio") ? document.getElementById("municipio").value.trim() : "";
    const password = document.getElementById("password") ? document.getElementById("password").value.trim() : "";
    const confirmPassword = document.getElementById("confirm_password") ? document.getElementById("confirm_password").value.trim() : "";
    const aceptaTerminos = document.getElementById("aceptaTerminos") ? document.getElementById("aceptaTerminos").checked : false;

    // ---------------------------------------------------------
    // PASO 1: Validar campos de texto obligatorios (sin dejar vacíos)
    // ---------------------------------------------------------
    if (
        numeroDocumento === "" || 
        nombres === "" || 
        apellidos === "" || 
        fechaNacimiento === "" || 
        telefono === "" || 
        correo === "" || 
        direccion === "" || 
        password === ""
    ) {
        alert("⚠️ Por favor, complete todos los campos obligatorios del formulario.");
        event.preventDefault(); // Detiene el envío hacia el backend
        return false;
    }

    // ---------------------------------------------------------
    // PASO 2: Validar menús desplegables (selects)
    // ---------------------------------------------------------
    if (tipoDocumento === "" || tipoDocumento === "Tipo de documento") {
        alert("⚠️ Por favor, seleccione un tipo de documento.");
        event.preventDefault();
        return false;
    }

    if (sexo === "" || sexo === "Sexo") {
        alert("⚠️ Por favor, seleccione el sexo del paciente.");
        event.preventDefault();
        return false;
    }

    if (municipio === "" || municipio === "Municipio Atlántico") {
        alert("⚠️ Por favor, seleccione un municipio.");
        event.preventDefault();
        return false;
    }

    // ---------------------------------------------------------
    // PASO 3: Validar coincidencia de contraseñas
    // ---------------------------------------------------------
    if (confirmPassword !== "" && password !== confirmPassword) {
        alert("❌ Las contraseñas ingresadas no coinciden. Verifíquelas e intente nuevamente.");
        event.preventDefault();
        return false;
    }

    // ---------------------------------------------------------
    // PASO 4: Validar casilla de términos (aceptaTerminos)
    // ---------------------------------------------------------
    if (!aceptaTerminos) {
        alert("⚠️ Debe aceptar los Términos del servicio, Política de privacidad y Ley de datos personales para continuar.");
        event.preventDefault();
        return false;
    }

    // ---------------------------------------------------------
    // PASO 5: Validar formato estricto de correo electrónico
    // ---------------------------------------------------------
    const regexCorreo = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

    if (!regexCorreo.test(correo)) {
        alert("❌ El formato del correo electrónico no es válido (ejemplo: usuario@dominio.com).");
        event.preventDefault();
        return false;
    }

    return true;
}