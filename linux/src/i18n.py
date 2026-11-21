"""Traductions de Folio pour Linux. Les textes de l'interface sont écrits en français ; T() renvoie la version anglaise
quand l'interface est en anglais. Langue : réglage « lang » de Folio, sinon celle du système (LANGUAGE / LANG…)."""
import json
import os
from pathlib import Path

_DATA = Path(os.environ.get("XDG_DATA_HOME", Path.home() / ".local/share")) / "folio"


def _detect():
    try:
        lang = json.loads((_DATA / "settings.json").read_text()).get("lang", "")
    except (OSError, ValueError, AttributeError):
        lang = ""
    if lang in ("fr", "en"):
        return lang
    for var in ("LANGUAGE", "LC_ALL", "LC_MESSAGES", "LANG"):
        v = os.environ.get(var, "")
        if v and v not in ("C", "POSIX", "C.UTF-8"):
            return "fr" if v.lower().startswith("fr") else "en"
    return "en"


LANG = _detect()

EN = {
    # thèmes et typographie
    "Clair": "Light", "Sépia": "Sepia", "Sombre": "Dark", "Noir": "Black", "Gris": "Grey", "Nuit": "Night", "Forêt": "Forest",
    "Celui du livre": "Book’s own", "Aucun": "None", "Normal": "Normal", "Large": "Wide",
    "Fine": "Light", "Normale": "Regular", "Moyenne": "Medium", "Demi-grasse": "Semibold", "Grasse": "Bold",
    # bibliothèque
    "Ajouter des livres (Ctrl+O)": "Add books (Ctrl+O)", "Ajouter": "Add", "Mon compte…": "My account…",
    "Dossier de synchronisation…": "Sync folder…", "Synchroniser maintenant": "Sync now", "Langue…": "Language…",
    "Compte et synchronisation": "Account and sync", "Synchroniser": "Sync", "Rechercher un titre, un auteur…": "Search a title, an author…",
    "Bibliothèque": "Library", "Tous": "All", "En cours": "Reading", "À lire": "To read", "Terminés": "Finished",
    "Votre bibliothèque est vide": "Your library is empty",
    "Ajoutez des fichiers EPUB ou glissez-les dans cette fenêtre.\nConnectez-vous pour retrouver ceux de vos autres appareils.":
        "Add EPUB files or drop them into this window.\nSign in to get the books from your other devices.",
    "Ajouter un livre": "Add a book", "Terminé": "Finished", "Options": "Options", "Retirer de la bibliothèque": "Remove from library",
    "Ajouter des livres": "Add books", "ou glissez des EPUB ici": "or drop EPUB files here",
    "Bonjour": "Good morning", "Bon après-midi": "Good afternoon", "Bonsoir": "Good evening",
    "{n} livre": "{n} book", "{n} livres": "{n} books", "{n} en cours": "{n} reading", "{n} terminé": "{n} finished", "{n} terminés": "{n} finished",
    "à l’instant": "just now", "il y a {n} min": "{n} min ago", "il y a {n} h": "{n} h ago", "hier": "yesterday",
    "il y a {n} jours": "{n} days ago", "le %d/%m/%Y": "on %d/%m/%Y",
    "REPRENDRE LA LECTURE": "CONTINUE READING", "Lu {when}": "Read {when}", "Continuer": "Continue",
    "Aucun livre en cours.": "No book in progress.", "Tous vos livres ont été commencés.": "You’ve started all your books.",
    "Aucun livre terminé pour l’instant.": "No finished book yet.", "Aucun livre ne correspond à cette recherche.": "No book matches this search.",
    "Cette collection est vide : ajoutez-y des livres depuis leur menu ⋯": "This collection is empty: add books from their ⋯ menu",
    "Livres EPUB": "EPUB books", "Impossible d’ajouter « {f} » ({e})": "Couldn’t add “{f}” ({e})",
    "{n} livre ajouté": "{n} book added", "{n} livres ajoutés": "{n} books added",
    "Retirer ce livre ?": "Remove this book?",
    "« {t} » sera retiré de la bibliothèque, ainsi que ses marque-pages et surlignages.":
        "“{t}” will be removed from the library, along with its bookmarks and highlights.",
    "Annuler": "Cancel", "Retirer": "Remove",
    # collections et couvertures
    "Collections": "Collections", "Nouvelle collection": "New collection", "Nouvelle collection…": "New collection…",
    "Nom de la collection": "Collection name", "Créer": "Create", "Renommer": "Rename", "Renommer…": "Rename…",
    "Renommer la collection": "Rename collection", "Supprimer la collection": "Delete collection",
    "Renommer le livre": "Rename book",
    "Vers la gauche": "Move left",
    "Vers la droite": "Move right",
    "Plus petite": "Smaller",
    "Plus grande": "Larger",
    "Ajouter une décoration": "Add a decoration",
    "Votre photo…": "Your photo…",
    "Modèle 3D (.glb)…": "3D model (.glb)…",
    "Photo : posée dans un cadre. Modèle 3D : fichier glTF binaire (.glb), 20 Mo max. ; cliquez dessus sur l’étagère pour le voir tourner.": "Photo: placed in a frame. 3D model: binary glTF file (.glb), 20 MB max.; click it on the shelf to watch it turn.",
    "Votre photo": "Your photo",
    "Modèles 3D (.glb)": "3D models (.glb)",
    "Modèle trop lourd (20 Mo max.)": "Model too large (20 MB max.)",
    "Ce modèle 3D ne peut pas être affiché": "This 3D model can’t be displayed",
    "Modèle 3D (.glb)": "3D model (.glb)",
    "Modèle 3D pas encore synchronisé": "3D model not synced yet",
    "Modèle 3D": "3D model",
    "Glissez pour le faire tourner": "Drag to turn it",
    "Poser sur l’étagère": "Put on the shelf",
    "Décorer": "Decorate", "Serre-livres": "Bookends", "Voir en 3D": "View in 3D",
    "Masquer les décorations": "Hide decorations", "Afficher les décorations": "Show decorations",
    "Serre-livre en métal": "Metal bookend", "Serre-livre en laiton": "Brass bookend", "Serre-livre en marbre": "Marble bookend", "Intercalaire": "Divider",
    "Glissez une décoration pour la déplacer, même sur une étagère vide. Cliquez dessus pour changer sa taille ou la retirer.": "Drag a decoration to move it, even onto an empty shelf. Click it to resize or remove it.",
    "Filtres": "Filters",
    "Afficher les livres": "Show books",
    "Pas encore commencés": "Not started yet",
    "En cours de lecture": "Currently reading",
    "Masquer les livres rangés dans une collection": "Hide books already in a collection",
    "Masquer « {t} »": "Hide “{t}”",
    "Tout afficher": "Show everything",
    "Tous les livres sont masqués par les filtres.": "All books are hidden by the filters.",
    "Succulente": "Succulent",
    "Sansevière": "Snake plant",
    "Pile de livres": "Book stack",
    "Ourson": "Teddy bear",
    "Lapin": "Bunny",
    "Chat": "Cat",
    "Lampe": "Lamp",
    "Globe": "Globe",
    "Bougie": "Candle",
    "Sablier": "Hourglass",
    "Bouquet": "Bouquet",
    "Cactus": "Cactus",
    "Tasse": "Mug",
    "Réveil": "Alarm clock",
    "Chouette": "Owl",
    "Tableau": "Painting", "Titre du livre": "Book title", "Livre renommé": "Book renamed",
    "Supprimer la collection « {t} » ?": "Delete the collection “{t}”?",
    "Les livres restent dans votre bibliothèque.": "The books stay in your library.", "Supprimer": "Delete",
    "Collection « {t} » créée": "Collection “{t}” created", "Collection supprimée": "Collection deleted",
    "Ajouter des livres…": "Add books…", "Ajouter à « {t} »": "Add to “{t}”", "OK": "OK",
    "Options de la collection": "Collection options",
    "Marquer comme terminé": "Mark as finished", "Marquer comme non lu": "Mark as unread",
    "Rangé dans « Terminés »": "Moved to “Finished”", "Rangé dans « À lire »": "Moved to “To read”",
    "Couverture": "Cover", "Changer la couverture…": "Change cover…", "Couverture d’origine": "Original cover",
    "Couverture mise à jour": "Cover updated", "Couverture d’origine rétablie": "Original cover restored",
    "Choisir une couverture": "Choose a cover", "Images": "Images", "Image illisible : {e}": "Unreadable image: {e}",
    "Image illisible": "Unreadable image",
    # langue
    "Langue": "Language", "Automatique (langue du système)": "Automatic (system language)",
    "Folio va redémarrer pour changer de langue.": "Folio will restart to change the language.",
    # compte
    "Connecté": "Signed in", "Non connecté": "Not signed in", "Erreur {n}": "Error {n}", "Serveur injoignable : {e}": "Server unreachable: {e}",
    "Mon compte": "My account", "Profil": "Profile", "Changer la photo": "Change photo", "Sans pseudo": "No name",
    "Photo de profil mise à jour": "Profile photo updated", "Choisir une photo de profil": "Choose a profile photo",
    "Photo retirée": "Photo removed", "Identité": "Identity", "Pseudo": "Display name", "Pseudo enregistré": "Name saved",
    "Email": "Email", "Serveur": "Server", "Livres synchronisés": "Synced books", "Membre depuis": "Member since",
    "Sécurité": "Security", "Double authentification": "Two-factor authentication",
    "Un code à 6 chiffres de votre application d’authentification est demandé à chaque connexion.":
        "A 6-digit code from your authenticator app is asked at each sign-in.",
    "Activée": "On", "Désactivée": "Off", "{n} code de secours restant": "{n} recovery code left", "{n} codes de secours restants": "{n} recovery codes left",
    "Fortement recommandée pour protéger votre compte": "Strongly recommended to protect your account",
    "Nouveaux codes": "New codes", "Désactiver": "Turn off", "Activer": "Turn on", "Mot de passe": "Password",
    "10 caractères minimum. Les autres appareils seront déconnectés.": "10 characters minimum. Other devices will be signed out.",
    "Mot de passe actuel": "Current password", "Nouveau mot de passe": "New password", "Confirmer le nouveau": "Confirm the new one",
    "Code de double authentification": "Two-factor code", "Changer le mot de passe": "Change password",
    "Les deux mots de passe ne correspondent pas": "The two passwords don’t match",
    "Mot de passe changé, autres appareils déconnectés": "Password changed, other devices signed out",
    "Appareils connectés": "Signed-in devices", "Déconnecter les autres": "Sign out the others",
    "Dernière activité : {when} · IP {ip}": "Last active: {when} · IP {ip}", "%d/%m/%Y %H:%M": "%d/%m/%Y %H:%M",
    "Cet appareil": "This device", "Déconnecter cet appareil": "Sign out this device", "Appareil déconnecté": "Device signed out",
    "{n} appareil(s) déconnecté(s)": "{n} device(s) signed out", "Se déconnecter de cet appareil": "Sign out of this device",
    "Vos livres restent sur cet ordinateur": "Your books stay on this computer", "Se déconnecter": "Sign out",
    "Zone sensible": "Danger zone", "Supprimer mon compte": "Delete my account",
    "Efface définitivement le compte et tout ce qui est stocké sur le serveur": "Permanently erases the account and everything stored on the server",
    "Supprimer…": "Delete…", "Confirmer": "Confirm", "Code à 6 chiffres ou code de secours": "6-digit code or recovery code",
    "Codes de secours": "Recovery codes",
    "Chaque code ne sert qu’une fois et remplace le code de l’application si vous perdez votre téléphone. Gardez-les en lieu sûr : ils ne seront plus affichés.":
        "Each code works once and replaces the app’s code if you lose your phone. Keep them somewhere safe: they won’t be shown again.",
    "Copier": "Copy", "Enregistrer…": "Save…", "J’ai mis mes codes en lieu sûr": "I’ve stored my codes safely",
    "Codes de secours Folio — chaque code ne fonctionne qu'une fois": "Folio recovery codes — each code works only once",
    "Codes copiés": "Codes copied", "Codes enregistrés": "Codes saved", "Enregistrer les codes de secours": "Save recovery codes",
    "folio-codes-de-secours.txt": "folio-recovery-codes.txt", "Activer la double authentification": "Turn on two-factor authentication",
    "1. Scannez ce QR code avec une application d’authentification (Aegis, 2FAS, Google Authenticator, Bitwarden…).\n2. Entrez le code à 6 chiffres qu’elle affiche.":
        "1. Scan this QR code with an authenticator app (Aegis, 2FAS, Google Authenticator, Bitwarden…).\n2. Enter the 6-digit code it shows.",
    "Code à 6 chiffres": "6-digit code", "Double authentification activée": "Two-factor authentication turned on",
    "Confirmez votre mot de passe pour continuer.": "Confirm your password to continue.",
    "Double authentification désactivée": "Two-factor authentication turned off",
    "Désactiver la double authentification ?": "Turn off two-factor authentication?",
    "Votre compte ne sera plus protégé que par le mot de passe.": "Your account will only be protected by its password.",
    "Nouveaux codes de secours": "New recovery codes", "Les anciens codes ne fonctionneront plus.": "The old codes will stop working.",
    "Générer": "Generate", "Déconnecté": "Signed out", "Session expirée : reconnectez-vous (menu du compte)": "Session expired: sign in again (account menu)",
    "Compte supprimé": "Account deleted", "Supprimer votre compte ?": "Delete your account?",
    "Votre compte, vos livres synchronisés, votre progression et vos notes seront effacés du serveur. Cette action est irréversible. Les livres déjà présents sur cet ordinateur sont conservés.":
        "Your account, synced books, progress and notes will be erased from the server. This cannot be undone. Books already on this computer are kept.",
    "Supprimer définitivement": "Delete permanently", "Compte Folio": "Folio account",
    "Connectez-vous pour synchroniser vos livres, votre progression et votre apparence.": "Sign in to sync your books, progress and appearance.",
    "https://folio.exemple.org": "https://folio.example.org",
    "Mot de passe (10 caractères min. pour un nouveau compte)": "Password (10 characters min. for a new account)",
    "Mot de passe oublié": "Forgot password", "Créer le compte": "Create account", "Connexion": "Sign in",
    "Connecté et synchronisé": "Signed in and synced", "Saisissez d’abord votre adresse mail": "Enter your email address first",
    "Erreur": "Error", "Le lien s’ouvre dans le navigateur pour choisir un nouveau mot de passe.": "The link opens in the browser to choose a new password.",
    "Vérifiez votre boîte mail": "Check your inbox", "Adresse non confirmée": "Address not confirmed", "Fermer": "Close",
    "Renvoyer le mail": "Resend the email", "Mail renvoyé": "Email sent again", "Code incorrect": "Incorrect code",
    "Code incorrect, réessayez.": "Incorrect code, try again.", "Valider": "Confirm",
    "Entrez le code à 6 chiffres de votre application d’authentification, ou un code de secours.":
        "Enter the 6-digit code from your authenticator app, or a recovery code.",
    "Dossier de synchronisation (Syncthing, Nextcloud, Dropbox…)": "Sync folder (Syncthing, Nextcloud, Dropbox…)",
    "Synchronisation activée": "Sync turned on", "Synchronisé": "Synced", "Synchronisation impossible : {e}": "Sync failed: {e}",
    "Repris à la position de l’autre appareil": "Resumed at the other device’s position",
    # lecteur
    "Bibliothèque (Échap)": "Library (Esc)", "Marque-page (Ctrl+D)": "Bookmark (Ctrl+D)", "Sommaire et notes (Ctrl+T)": "Contents and notes (Ctrl+T)",
    "Apparence (taille, police, thème)": "Appearance (size, font, theme)", "Marque-page ajouté": "Bookmark added", "Copié": "Copied",
    "Erreur de lecture : {e}": "Reading error: {e}",
    "THÈME": "THEME", "TEXTE ET MISE EN PAGE": "TEXT AND LAYOUT", "Couleur de fond": "Background colour", "Couleur du texte": "Text colour",
    "Police du livre": "Book’s font", "Police": "Font", "Taille du texte": "Text size", "Interligne": "Line spacing", "Marges": "Margins",
    "Texte justifié": "Justified text", "Pages": "Pages", "Défilement": "Scrolling", "Lecture": "Reading", "Deux pages (écran large)": "Two pages (wide screen)",
    "Livre": "Book", "Espace entre paragraphes": "Paragraph spacing", "Retrait de 1re ligne": "First-line indent", "Graisse du texte": "Text weight",
    "Espacement des lettres": "Letter spacing", "TYPOGRAPHIE": "TYPOGRAPHY", "Réinitialiser l’apparence": "Reset appearance", "SYNCHRONISATION ENTRE APPAREILS": "SYNC ACROSS DEVICES",
    "Décochez ce que cet appareil doit garder pour lui : il ne l’enverra plus et ne recevra plus celui des autres.": "Untick what this device should keep to itself: it will no longer send it, nor receive the one from your other devices.",
    "Thème et couleurs": "Theme and colours", "Interligne et typographie": "Line height and typography",
    "Justification, pages ou défilement": "Justification, pages or scrolling",
    "Apparence réinitialisée": "Appearance reset",
    "Étagère": "Bookshelf", "Décorations": "Decorations", "Tout voir": "See all", "Livre papier": "Paper book", "Ajouter un livre papier": "Add a paper book",
    "Replier": "Collapse", "Déplier": "Expand", "Auteur": "Author", "Titre": "Title", "Récents": "Recent",
    "Livre numérique": "Ebook", "Importer la photo de la tranche": "Import a photo of the spine", "Photo de la tranche": "Spine photo",
    "Faire pivoter": "Rotate", "Recadrer": "Crop", "Utiliser": "Use", "Ajustez le cadre sur la tranche": "Adjust the frame to the spine", "Retirer la photo": "Remove photo", "Ouvrir le livre": "Open the book", "Enregistrer": "Save",
    "Retirer de l’étagère": "Remove from the shelf", "Tranche mise à jour": "Spine updated", "Photo retirée": "Photo removed",
    "Indiquez au moins le titre": "Enter at least the title", "« {t} » rangé sur l’étagère": "“{t}” added to the shelf",
    "Livre retiré de l’étagère": "Book removed from the shelf", "Sans titre": "Untitled",
    "Astuce : livre debout, tranche bien droite et cadrée serrée. Une photo prise à plat est redressée.": "Tip: stand the book up, keep the spine straight and frame it tightly. A photo taken flat is straightened.",
    "Importez la photo de la tranche de vos livres, numériques ou papier : votre étagère se compose et vous suit sur tous vos appareils. Depuis votre téléphone, vous pouvez la photographier directement.": "Import a photo of the spine of your books, digital or paper: your bookshelf builds itself and follows you on all your devices. From your phone, you can photograph it directly.",
    # écrire un livre, lecture à voix haute
    "Écrire un livre": "Write a book", "Mes manuscrits": "My manuscripts", "Lecture à voix haute": "Read aloud",
    "Exporter en EPUB": "Export as EPUB", "EPUB enregistré": "EPUB saved", "Enregistrement impossible : {e}": "Couldn’t save: {e}",
    "Mises à jour…": "Updates…", "Site de Folio ↗": "Folio website ↗", "Folio est à jour": "Folio is up to date",
    "Folio {v} est disponible": "Folio {v} is available", "Mettre à jour": "Update", "Mise à jour impossible": "Update failed",
    "Mise à jour annulée": "Update cancelled", "Téléchargement de la mise à jour…": "Downloading the update…",
    "Mise à jour : seulement pour Folio installé depuis le paquet .deb": "Updates: only for Folio installed from the .deb package",
    "Tranche et infos": "Spine and details",
    "Couverture et dos (vue 3D)": "Cover and back (3D view)", "Couverture": "Cover", "Dos": "Back", "Photo enregistrée": "Photo saved",
    "Cadrez la couverture du livre": "Fit the book’s cover in the frame", "Cadrez le dos du livre (4e de couverture)": "Fit the back cover in the frame",
    "Importer une image": "Import an image",
}


def T(s, **kw):
    """Texte traduit ; les {variables} sont remplacées par les arguments nommés."""
    t = EN.get(s, s) if LANG == "en" else s
    return t.format(**kw) if kw else t


def pct(p):
    """« 42 % » en français, « 42% » en anglais."""
    return f"{round(p * 100)}{'%' if LANG == 'en' else ' %'}"
