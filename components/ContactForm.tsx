import { LoginButton } from "./ui/LoginButton";
import { useEffect, useState } from "react";
import { supabase } from "@/services/supabaseClient";

export function Login() {
  const [session, setSession] = useState(null);

  useEffect(() => {
    // 1. Verificar si ya existe una sesión activa al cargar
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    // 2. Escuchar cambios en la autenticación (LOGIN, LOGOUT)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log("Evento de Auth:", _event); // Debería salir SIGNED_IN
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (!session) {
    // Mostrar botón de login
    return <LoginButton />;
  }

  return (
    <div>
      <h1>¡Logueado!</h1>
      <p>Steam ID: {session.user.user_metadata.steam_id}</p>
      <p>NickName: {session.user.user_metadata.full_name}</p>
      <img src={session.user.user_metadata.avatar_url} alt="Avatar" />
      <button onClick={() => supabase.auth.signOut()}>Cerrar Sesión</button>
    </div>
  );
}
