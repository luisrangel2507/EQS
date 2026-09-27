export const CLAVE_TEMA = "eqs_tema";

// se inyecta en <head> para aplicar el tema antes del primer pintado y evitar el parpadeo
export const SCRIPT_TEMA = `(function(){try{var t=localStorage.getItem('${CLAVE_TEMA}');if(t==='oscuro'||(!t&&window.matchMedia('(prefers-color-scheme: dark)').matches)){document.documentElement.classList.add('dark')}}catch(e){}})();`;
