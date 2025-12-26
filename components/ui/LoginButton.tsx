export function LoginButton() {
  const authUrl =
    "https://obfrxccyavwhfwdpvlkm.supabase.co/functions/v1/steam-auth?action=login";

  return (
    <a href={authUrl} className="btn-steam">
      Login with Steam
    </a>
  );
}
