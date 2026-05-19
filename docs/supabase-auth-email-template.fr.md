# Template e-mail Supabase Auth

## Objectif
Le signup ChangeThis demande uniquement l'e-mail. Supabase envoie ensuite un lien sécurisé qui vérifie l'adresse, pose la session via `/auth/confirm`, puis redirige vers `/signup/set-password` pour choisir le mot de passe.

## Configuration Supabase
Dans Supabase Dashboard:

1. Authentication > URL Configuration
   - Site URL: `https://app.changethis.dev`
   - Redirect URLs:
     - `https://app.changethis.dev/auth/confirm`
     - `https://app.changethis.dev/signup/set-password`
2. Authentication > Providers > Email
   - Activer `Confirm email`.
3. Authentication > Email Templates
   - Modifier le template `Magic Link`.
   - Garder le lien sur `{{ .ConfirmationURL }}`.
4. Authentication > SMTP Settings
   - Utiliser le SMTP choisi pour l'envoi réel.
   - Pour OVH: renseigner l'hôte, le port, l'utilisateur et le mot de passe SMTP OVH du domaine.
   - Pour une meilleure délivrabilité: Brevo ou Resend restent de bonnes alternatives si OVH limite ou classe les mails.

## Sujet conseillé
```text
Finalisez votre accès ChangeThis
```

## HTML conseillé
```html
<div style="margin:0;background:#f4f4f5;padding:32px 16px;font-family:Inter,Arial,sans-serif;color:#171717;">
  <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #d8d8dd;border-radius:12px;overflow:hidden;">
    <div style="padding:28px 30px 18px;border-bottom:1px solid #ececef;">
      <p style="margin:0 0 8px;color:#3f51b5;font-size:12px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;">ChangeThis</p>
      <h1 style="margin:0;color:#171717;font-size:24px;line-height:1.15;">Finalisez votre accès</h1>
    </div>
    <div style="padding:24px 30px 30px;">
      <p style="margin:0 0 16px;color:#3f3f46;font-size:15px;line-height:1.55;">
        Confirmez cette adresse e-mail pour choisir votre mot de passe et ouvrir votre espace ChangeThis.
      </p>
      <p style="margin:0 0 24px;color:#52525b;font-size:14px;line-height:1.5;">
        Ce lien est personnel. Si vous n'avez pas demandé cet accès, vous pouvez ignorer cet e-mail.
      </p>
      <a href="{{ .ConfirmationURL }}" style="display:inline-block;background:#3f51b5;color:#ffffff;text-decoration:none;border-radius:8px;padding:12px 16px;font-size:14px;font-weight:800;">
        Choisir mon mot de passe
      </a>
      <p style="margin:24px 0 0;color:#71717a;font-size:12px;line-height:1.5;">
        Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur:<br>
        <span style="word-break:break-all;">{{ .ConfirmationURL }}</span>
      </p>
    </div>
  </div>
</div>
```
