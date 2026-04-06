import { ref } from "vue";

export interface ConfigEmpresa {
  nombre: string;
  nif: string;
  direccion: string;
  email: string;
  ivaPorcentaje: number;
  id: number;
  fecha: string;
  logo?: string | null;
}

const defaultConfig = (): ConfigEmpresa => ({
  nombre: "Mi Empresa S.L.",
  nif: "11223344A",
  direccion: "Calle Falsa 123, Madrid",
  email: "tuemail@gmail.com",
  ivaPorcentaje: 21,
  id: Math.floor(10000 + Math.random() * 90000),
  fecha: new Date().toLocaleDateString("es-ES"),
  logo: null,
});

export function useConfig() {
  const configEmpresa = ref<ConfigEmpresa>(defaultConfig());
  const verConfig = ref(false);

  const cargarConfig = () => {
    if (!process.client) return;
    const guardado = localStorage.getItem("perfil_fiscal");
    if (guardado) {
      try {
        configEmpresa.value = JSON.parse(guardado);
      } catch (e) {
        console.error("Error al cargar el perfil fiscal:", e);
      }
    }
  };

  const guardarConfig = () => {
    if (!process.client) return;
    localStorage.setItem("perfil_fiscal", JSON.stringify(configEmpresa.value));
    verConfig.value = false;
  };

  const subirLogo = (e: Event) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      alert("El logo es demasiado pesado. Máximo 2MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      configEmpresa.value.logo = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const eliminarLogo = () => {
    configEmpresa.value.logo = null;
    if (process.client) {
      localStorage.setItem("perfil_fiscal", JSON.stringify(configEmpresa.value));
    }
  };

  return {
    configEmpresa,
    verConfig,
    cargarConfig,
    guardarConfig,
    subirLogo,
    eliminarLogo,
  };
}