# --- START OF FILE create_team_data.py ---
import os
import re
import unicodedata
import shutil # Importiert für das Löschen
import json

# --- Konfiguration ---
OUTPUT_BASE_DIR = "public/team_daten" # Team-Daten werden hier gespeichert
MANIFEST_FILENAME = "team_manifest.json" # Name der Manifest-Datei
IMAGE_PLACEHOLDER_SUFFIX = ".jpg"
BASE_PHONE_NUMBER_DISPLAY = "05121 93563"

# Daten der Teammitglieder in der GEWÜNSCHTEN ANZEIGEREIHENFOLGE.
# Die Position in dieser Liste bestimmt den Ordner-Präfix (01, 02, ...) und die Sortierung im Manifest.
# Struktur: ("Voller Name", ECHTE_TELEFON_DURCHWAHL, "Position", "email@domain.de")
TEAM_MEMBERS_CONFIG = [
    # Name, Echte Telefon-Durchwahl, Position, Email
    ("Sven Hirsch",                15, "Architekt BDA", "hirsch@hirsch-architekten.com"),
    ("Judith Fuhrhop",             12, "Assistentin der Geschäftsführung", "fuhrhop@hirsch-architekten.com"),
    ("Kristina Müller",            23, "Dipl.-Ing. (FH) Architektin", "mueller@hirsch-architekten.com"),
    ("Franziska Franz-Porstein",   13, "Dipl.-Ing. (FH) Architektin", "franz-porstein@hirsch-architekten.com"),
    ("Helge Hass",                 25, "M.A.", "hass@hirsch-architekten.com"),
    ("Ronald Wascher",             16, "Dipl.-Ing. (FH) Architekt", "wascher@hirsch-architekten.com"),
    ("Ulrich Claus",               11, "Bauzeichner", "claus@hirsch-architekten.com"),
    ("Sven Peters",                99, "freier Architekt", "s.peters@example.com"), # Beispiel: Echte Durchwahl 99 (anpassen!)
    ("Elena Casero",               26, "M.Sc.", "casero@hirsch-architekten.com"),
    ("Pauline Merkle",            18, "M.A.", "merkle@hirsch-architekten.com"),
    ("Clara Adolphi",             24, "B.A.", "adolphi@hirsch-architekten.com"),
    ("Finn Forner",               21, "M.Sc.", "forner@hirsch-architekten.com"),
    ("Paul Müller-Zitzke",        20, "M.Sc.", "muellerzitzke@hirsch-architekten.com"),
    ("Marcel Hagedorn",           22, "B.A.", "hagedorn@hirsch-architekten.com"),
]

# Fallbacks sind jetzt weniger relevant, da alle Infos in der Config stehen sollten.
fallback_email_addresses = []
fallback_positions = {}
ALLOWED_IMAGE_EXTENSIONS = ('.jpg', '.jpeg', '.png', '.gif', '.webp')


def normalize_string(s):
    if not s: return ""
    s = s.lower()
    s = s.replace('ä', 'ae').replace('ö', 'oe').replace('ü', 'ue').replace('ß', 'ss')
    s = unicodedata.normalize('NFKD', s).encode('ascii', 'ignore').decode('utf-8')
    return s

def sanitize_for_foldername(name_str):
    """Erstellt einen einfachen, sicheren String für Dateinamen/Teile von Ordnernamen (ohne Präfix)."""
    name_str_normalized = normalize_string(name_str)
    name_str_sanitized = re.sub(r'\s+', '_', name_str_normalized)
    name_str_sanitized = re.sub(r'[^\w_.-]', '', name_str_sanitized)
    return name_str_sanitized[:40].strip('_-')

def find_member_image(member_folder_path, base_name_sanitized):
    """Sucht nach einem Bild im Ordner des Mitglieds."""
    # Diese Funktion wird aufgerufen, nachdem der Ordner (neu) erstellt wurde.
    # Sie wird nur erfolgreich sein, wenn das Bild *nach* dem Skriptlauf hinzugefügt wird.
    # Für die Manifest-Erstellung wird sie daher wahrscheinlich immer None zurückgeben,
    # es sei denn, Bilder werden Teil des Skripts.
    # Aktuell gibt sie nur den Dateinamen zurück, wenn das Bild *zufällig* schon da ist.
    if not os.path.isdir(member_folder_path) or not base_name_sanitized:
        return None
    for ext in ALLOWED_IMAGE_EXTENSIONS:
        exact_match_filename = f"{base_name_sanitized}{ext}"
        if os.path.exists(os.path.join(member_folder_path, exact_match_filename)):
            return exact_match_filename
    try:
        for filename in sorted(os.listdir(member_folder_path)):
            if filename.lower().endswith(ALLOWED_IMAGE_EXTENSIONS):
                return filename
    except OSError:
        return None
    return None

def create_team_data_and_manifest():
    """Löscht immer den alten Datenordner und erstellt Ordner, info.txt und team_manifest.json."""

    # --- IMMER Löschen und Neu Erstellen ---
    if os.path.exists(OUTPUT_BASE_DIR):
        try:
            shutil.rmtree(OUTPUT_BASE_DIR)
            print(f"Bestehender Ordner '{OUTPUT_BASE_DIR}' wurde gelöscht.")
        except OSError as e:
            print(f"FEHLER beim Löschen des Ordners '{OUTPUT_BASE_DIR}': {e}")
            print("Skript wird abgebrochen.")
            return # Beende das Skript, wenn Löschen fehlschlägt

    try:
        os.makedirs(OUTPUT_BASE_DIR)
        print(f"Ordner '{OUTPUT_BASE_DIR}' neu erstellt.")
    except OSError as e:
        print(f"FEHLER beim Erstellen des Ordners '{OUTPUT_BASE_DIR}': {e}")
        print("Skript wird abgebrochen.")
        return # Beende das Skript, wenn Erstellen fehlschlägt
    # --- Ende Löschen/Neu Erstellen ---


    team_manifest_data = []

    for index, member_config_tuple in enumerate(TEAM_MEMBERS_CONFIG):
        sequential_id = index + 1
        if len(member_config_tuple) < 4:
            print(f"WARNUNG: Ungültiger Eintrag (Index {index}) in TEAM_MEMBERS_CONFIG: {member_config_tuple}")
            continue

        full_name, actual_phone_extension, member_position, member_email = member_config_tuple
        member_position = member_position or fallback_positions.get(full_name, "Mitarbeiter/in")
        member_email = member_email or ""

        print(f"\nVerarbeite {sequential_id}. {full_name} (Tel-Durchwahl: {actual_phone_extension})")

        base_name_sanitized = sanitize_for_foldername(full_name)
        member_id_for_url_and_folder = f"{sequential_id:02d}_{base_name_sanitized}"
        member_dir = os.path.join(OUTPUT_BASE_DIR, member_id_for_url_and_folder)

        # Erstelle den spezifischen Mitgliederordner (Basisordner existiert bereits)
        try:
             if not os.path.exists(member_dir):
                os.makedirs(member_dir)
                print(f"  Ordner erstellt: {member_dir}")
        except OSError as e:
             print(f"  FEHLER beim Erstellen des Mitgliederordners '{member_dir}': {e}")
             continue # Überspringe dieses Mitglied

        print(f"  Position: {member_position}")
        email_to_write = member_email if member_email else "E-Mail hier eintragen"
        if member_email: print(f"  E-Mail: {member_email}")

        formatted_phone_display = f"{BASE_PHONE_NUMBER_DISPLAY}-{actual_phone_extension}"
        member_description = [f"Details zu {full_name}.",]

        info_txt_path = os.path.join(member_dir, "info.txt")
        try:
            with open(info_txt_path, 'w', encoding='utf-8') as f:
                f.write(f"{full_name}\n")
                f.write(f"{member_position}\n")
                f.write(f"{email_to_write}\n")
                f.write(f"{formatted_phone_display}\n")
                f.write("\n".join(member_description) + "\n")
            print(f"  info.txt erstellt: {info_txt_path}")
        except IOError as e:
            print(f"  FEHLER beim Schreiben von info.txt für {full_name}: {e}")
            continue

        # Bild für Manifest finden (wird nur einen Namen finden, wenn das Bild *vor* dem Skriptlauf schon da war)
        # Da wir den Ordner immer löschen, wird hier normalerweise None zurückgegeben.
        # Das ist OK, da das Bild manuell hinzugefügt werden muss.
        # Wir können einen erwarteten Bildnamen ins Manifest schreiben.
        expected_image_filename = f"{base_name_sanitized}{IMAGE_PLACEHOLDER_SUFFIX}"
        print(f"  -> Erwartetes Bild: {expected_image_filename}")
        # image_filename = find_member_image(member_dir, base_name_sanitized) # Gibt wahrscheinlich None zurück

        name_parts = full_name.split(" ", 1)
        first_name = name_parts[0]
        last_name = name_parts[1] if len(name_parts) > 1 else ""

        team_manifest_data.append({
            "id": member_id_for_url_and_folder,
            "name": full_name,
            "firstName": first_name,
            "lastName": last_name,
            "position": member_position,
            # Wir nehmen den erwarteten Bildpfad ins Manifest auf
            "image": f"{member_id_for_url_and_folder}/{expected_image_filename}",
        })

    manifest_filepath = os.path.join(OUTPUT_BASE_DIR, MANIFEST_FILENAME)
    try:
        with open(manifest_filepath, 'w', encoding='utf-8') as f:
            json.dump(team_manifest_data, f, ensure_ascii=False, indent=4)
        print(f"\nTeam-Manifest-Datei '{MANIFEST_FILENAME}' erfolgreich in '{OUTPUT_BASE_DIR}' erstellt.")
        print(f"Die Reihenfolge im Manifest entspricht der Reihenfolge in TEAM_MEMBERS_CONFIG.")
    except IOError as e:
        print(f"\nFEHLER beim Schreiben der Team-Manifest-Datei: {e}")

    print("\nSkript abgeschlossen.")
    print("\nWICHTIG: Bitte fügen Sie jetzt die Bilder für jedes Teammitglied in die entsprechenden Ordner ein!")

if __name__ == "__main__":
    # Führt die Funktion direkt aus, die Löschlogik ist jetzt in der Funktion selbst.
    create_team_data_and_manifest()

# --- END OF FILE create_team_data.py ---