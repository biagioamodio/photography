# 🔐 Configurazione GitHub per pubblicare le modifiche

GitHub richiede un "Personal Access Token" (PAT) per pubblicare le modifiche. Segui questi passaggi una sola volta:

## Passo 1: Crea un Personal Access Token su GitHub

1. Vai su GitHub e accedi al tuo account
2. Clicca sulla tua foto profilo in alto a destra → **Settings**
3. Scorri in basso e clicca su **Developer settings** (nella barra laterale sinistra)
4. Clicca su **Personal access tokens** → **Tokens (classic)**
5. Clicca su **Generate new token** → **Generate new token (classic)**
6. Dai un nome al token: `Photography Website CMS`
7. Seleziona la scadenza: **No expiration** (nessuna scadenza)
8. Seleziona i permessi: spunta solo **repo** (questo dà accesso ai repository)
9. Clicca **Generate token**
10. ⚠️ **IMPORTANTE**: Copia il token che appare (inizia con `ghp_...`) - lo vedrai solo una volta!

## Passo 2: Salva il token sul tuo Mac

Apri il **Terminale** (lo trovi in Applicazioni → Utility → Terminale) e incolla questo comando:

```bash
git config --global credential.helper osxkeychain
```

Premi Invio.

## Passo 3: Usa il token

La prossima volta che provi a pubblicare dal CMS:
1. Quando chiede **Username**: inserisci il tuo username GitHub (es. `biagioamodio`)
2. Quando chiede **Password**: incolla il **token** che hai copiato (NON la tua password normale!)

Il Mac salverà queste credenziali e non te le chiederà più.

---

## Alternativa: Usa GitHub Desktop

Se preferisci un'interfaccia grafica:

1. Scarica [GitHub Desktop](https://desktop.github.com/)
2. Accedi con il tuo account GitHub
3. Il CMS userà automaticamente le credenziali di GitHub Desktop

---

## Problemi?

Se hai problemi, contatta Remo! 📞
