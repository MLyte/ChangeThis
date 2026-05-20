# Template e-mail Supabase Auth

## Objectif
Le signup ChangeThis demande uniquement l'e-mail. Supabase envoie ensuite un code à usage unique que l'utilisateur recopie dans ChangeThis. Après vérification du code, ChangeThis pose la session puis redirige vers `/signup/set-password` pour choisir le mot de passe.

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
   - Modifier le template `Confirm signup`.
   - Modifier aussi le template `Magic Link`.
   - Coller le même sujet et le même HTML dans les deux templates.
   - Afficher le code `{{ .Token }}` dans l'e-mail.
   - Ne pas utiliser `{{ .ConfirmationURL }}` pour ce flow: certaines protections mail comme SafeLinks peuvent ouvrir le lien avant l'utilisateur.
4. Authentication > SMTP Settings
   - Utiliser le SMTP choisi pour l'envoi réel.
   - Pour OVH: renseigner l'hôte, le port, l'utilisateur et le mot de passe SMTP OVH du domaine.
   - Pour une meilleure délivrabilité: Brevo ou Resend restent de bonnes alternatives si OVH limite ou classe les mails.

## Pourquoi deux templates?
Supabase peut envoyer `Confirm signup` quand l'adresse crée/confirme un nouveau compte, et `Magic Link` quand le flow passe par l'OTP e-mail. Pour éviter une différence de comportement selon l'état de l'utilisateur ou les tests précédents, garde les deux templates synchronisés.

## Template `Confirm signup`

### Sujet
```text
Votre code ChangeThis
```

### HTML
```html
<div style="margin:0;background:#f4f4f5;padding:32px 16px;font-family:Inter,Arial,sans-serif;color:#171717;">
  <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #d8d8dd;border-radius:12px;overflow:hidden;">
    <div style="padding:28px 30px 18px;border-bottom:1px solid #ececef;">
      <p style="margin:0 0 8px;color:#3f51b5;font-size:12px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;">ChangeThis</p>
      <h1 style="margin:0;color:#171717;font-size:24px;line-height:1.15;">Votre code de vérification</h1>
    </div>
    <div style="padding:24px 30px 30px;">
      <p style="margin:0 0 16px;color:#3f3f46;font-size:15px;line-height:1.55;">
        Copiez ce code dans ChangeThis pour vérifier votre adresse e-mail et choisir votre mot de passe.
      </p>
      <p style="margin:0 0 24px;color:#52525b;font-size:14px;line-height:1.5;">
        Ce code est personnel. Si vous n'avez pas demandé cet accès, vous pouvez ignorer cet e-mail.
      </p>
      <p style="margin:0 0 24px;background:#f4f5ff;border:1px solid #d9ddff;border-radius:10px;color:#3f51b5;font-size:32px;font-weight:800;letter-spacing:.14em;line-height:1;text-align:center;padding:18px 16px;">
        {{ .Token }}
      </p>
      <p style="margin:0;color:#71717a;font-size:12px;line-height:1.5;">
        Le code expire rapidement. Retournez sur ChangeThis et collez-le dans le champ prévu.
      </p>
    </div>
  </div>
</div>
```

## Template `Magic Link`

### Sujet
```text
Votre code ChangeThis
```

### HTML
```html
<div style="margin:0;background:#f4f4f5;padding:32px 16px;font-family:Inter,Arial,sans-serif;color:#171717;">
  <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #d8d8dd;border-radius:12px;overflow:hidden;">
    <div style="padding:28px 30px 18px;border-bottom:1px solid #ececef;">
      <p style="margin:0 0 8px;color:#3f51b5;font-size:12px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;">ChangeThis</p>
      <h1 style="margin:0;color:#171717;font-size:24px;line-height:1.15;">Votre code de vérification</h1>
    </div>
    <div style="padding:24px 30px 30px;">
      <p style="margin:0 0 16px;color:#3f3f46;font-size:15px;line-height:1.55;">
        Copiez ce code dans ChangeThis pour vérifier votre adresse e-mail et choisir votre mot de passe.
      </p>
      <p style="margin:0 0 24px;color:#52525b;font-size:14px;line-height:1.5;">
        Ce code est personnel. Si vous n'avez pas demandé cet accès, vous pouvez ignorer cet e-mail.
      </p>
      <p style="margin:0 0 24px;background:#f4f5ff;border:1px solid #d9ddff;border-radius:10px;color:#3f51b5;font-size:32px;font-weight:800;letter-spacing:.14em;line-height:1;text-align:center;padding:18px 16px;">
        {{ .Token }}
      </p>
      <p style="margin:0;color:#71717a;font-size:12px;line-height:1.5;">
        Le code expire rapidement. Retournez sur ChangeThis et collez-le dans le champ prévu.
      </p>
    </div>
  </div>
</div>
```
