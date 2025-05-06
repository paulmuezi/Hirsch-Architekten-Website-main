# --- START OF FILE generate_html.py ---
import os
import re
import html # Für HTML-Escaping
from bs4 import BeautifulSoup # Import für die Aktualisierung der HTML-Dateien

PROJECT_DATA_DIR = "projekt_daten" # <- Stelle sicher, dass dieser Ordner im Hauptverzeichnis liegt, NICHT in public
TEMPLATE_FILE = "projekt_template.html"
OUTPUT_PROJECT_DIR = "." # Speichere Projekt-HTMLs im Hauptverzeichnis
INDEX_HTML_FILE = "index.html"
PROJECTS_HTML_FILE = "projects.html"

# Erlaubte Bild-Endungen
IMAGE_EXTENSIONS = ('.jpg', '.jpeg', '.png', '.gif', '.webp')

def sanitize_filename_for_html(text):
    """Erstellt einen sicheren Dateinamen für HTML-Seiten."""
    text = text.lower()
    text = text.replace('ä', 'ae').replace('ö', 'oe').replace('ü', 'ue').replace('ß', 'ss')
    text = re.sub(r'\s+', '_', text)
    text = re.sub(r'[^\w_]', '', text)
    return text[:50]

def generate_project_pages():
    """Liest Projektdaten (beschreibung.txt + Bilder) und generiert statische HTML-Seiten."""
    if not os.path.exists(PROJECT_DATA_DIR):
        print(f"Fehler: Datenordner '{PROJECT_DATA_DIR}' nicht gefunden.")
        return

    if not os.path.exists(TEMPLATE_FILE):
        print(f"Fehler: Vorlagedatei '{TEMPLATE_FILE}' nicht gefunden.")
        return

    # Lese HTML-Template
    try:
        with open(TEMPLATE_FILE, 'r', encoding='utf-8') as f:
            template_content = f.read()
    except Exception as e:
        print(f"Fehler beim Lesen der Vorlagedatei '{TEMPLATE_FILE}': {e}")
        return

    all_projects_data = [] # Liste für die Übersichtseiten

    # Gehe durch alle Projektordner (sortiert nach Namen für Konsistenz)
    try:
        # Filtere nur Ordner heraus
        project_folders = sorted([d for d in os.listdir(PROJECT_DATA_DIR)
                                 if os.path.isdir(os.path.join(PROJECT_DATA_DIR, d))])
    except Exception as e:
        print(f"Fehler beim Auflisten der Ordner in '{PROJECT_DATA_DIR}': {e}")
        return

    if not project_folders:
        print(f"Keine Projektordner in '{PROJECT_DATA_DIR}' gefunden.")
        return

    for folder_name in project_folders:
        project_path = os.path.join(PROJECT_DATA_DIR, folder_name)
        description_file = os.path.join(project_path, "beschreibung.txt")

        if not os.path.exists(description_file):
            print(f"Warnung: 'beschreibung.txt' nicht gefunden in '{project_path}'. Überspringe.")
            continue

        print(f"Verarbeite Projekt: {folder_name}")

        # Lese Titel und Beschreibung aus beschreibung.txt
        try:
            with open(description_file, 'r', encoding='utf-8') as f:
                lines = f.readlines()
        except Exception as e:
            print(f"  -> Fehler beim Lesen von '{description_file}': {e}")
            continue

        if not lines:
            print(f"Warnung: 'beschreibung.txt' in '{project_path}' ist leer. Überspringe.")
            continue

        projekt_titel = lines[0].strip()
        projekt_kategorie = lines[1].strip() if len(lines) > 1 and lines[1].strip() else ""
        beschreibungs_zeilen = [line.strip() for line in lines[2:]] if len(lines) > 2 else []

        # Erstelle HTML für Beschreibung
        beschreibung_html = ""
        current_paragraph = []
        for line in beschreibungs_zeilen:
            if line:
                safe_line = html.escape(line)
                current_paragraph.append(safe_line)
            else:
                if current_paragraph:
                    beschreibung_html += f"<p>{'<br>'.join(current_paragraph)}</p>\n"
                    current_paragraph = []
        if current_paragraph:
             beschreibung_html += f"<p>{'<br>'.join(current_paragraph)}</p>\n"


        # Finde Bilder und erstelle Galerie-HTML
        bilder_html = ""
        bilder_liste = []
        thumbnail = None
        try:
            files = sorted(os.listdir(project_path))
            for filename in files:
                if filename.lower().endswith(IMAGE_EXTENSIONS):
                     bilder_liste.append(filename)
                     # Pfad relativ zum HTML-Root
                     image_path = f"{PROJECT_DATA_DIR.replace(os.sep, '/')}/{folder_name}/{filename}"
                     bilder_html += f'<div class="project-gallery-item">\n'
                     bilder_html += f'  <img src="{image_path}" alt="Bild für {html.escape(projekt_titel)}" loading="lazy">\n'
                     bilder_html += f'</div>\n'
                     if thumbnail is None:
                         thumbnail = image_path
        except OSError as e:
            print(f"Fehler beim Lesen der Bilder in '{project_path}': {e}")

        if not bilder_html:
            bilder_html = "<p>Keine Bilder verfügbar.</p>"


        # Erstelle Dateinamen für die Output-HTML
        # Verwende den Ordnernamen (inkl. Zähler) für Eindeutigkeit und als ID
        output_filename = f"projekt_{folder_name}.html"
        output_filepath = os.path.join(OUTPUT_PROJECT_DIR, output_filename)

        # Ersetze Platzhalter im Template
        projekt_html = template_content.replace("{{PROJEKT_TITEL}}", html.escape(projekt_titel))
        beschreibung_kurz = ' '.join(beschreibungs_zeilen).strip()[:150] + ('...' if len(' '.join(beschreibungs_zeilen).strip()) > 150 else '')
        projekt_html = projekt_html.replace("{{BESCHREIBUNG_KURZ}}", html.escape(beschreibung_kurz))
        projekt_html = projekt_html.replace("{{PROJEKT_BESCHREIBUNG_HTML}}", beschreibung_html)
        projekt_html = projekt_html.replace("{{PROJEKT_GALERIE_HTML}}", bilder_html)

        # Speichere die generierte HTML-Datei
        try:
            with open(output_filepath, 'w', encoding='utf-8') as f:
                f.write(projekt_html)
            print(f"  -> Seite generiert: {output_filename}")

            all_projects_data.append({
                "id": folder_name,
                "title": projekt_titel,
                "category": projekt_kategorie,
                "thumbnail": thumbnail,
                "html_file": output_filename
            })

        except IOError as e:
            print(f"  -> Fehler beim Schreiben der Datei '{output_filepath}': {e}")

    print(f"\n{len(all_projects_data)} Projektseiten generiert.")

    # 4. Aktualisiere index.html und projects.html
    update_overview_page(INDEX_HTML_FILE, all_projects_data, 4) # Limit 4 für Index
    update_overview_page(PROJECTS_HTML_FILE, all_projects_data, 0) # Kein Limit für Alle Projekte

    print("\nÜbersichtsseiten aktualisiert.")


def update_overview_page(html_filename, projects, limit=0):
    """Aktualisiert das Projekt-Grid in einer HTML-Datei mittels Markern."""
    if not os.path.exists(html_filename):
        print(f"Warnung: Übersichtsseite '{html_filename}' nicht gefunden.")
        return

    try:
        with open(html_filename, 'r', encoding='utf-8') as f:
            content = f.read()

        # Finde die Marker
        grid_start_marker = ""
        grid_end_marker = ""

        if "index.html" in html_filename:
            grid_start_marker = '<!-- START INDEX PROJECTS GRID -->'
            grid_end_marker = '<!-- END INDEX PROJECTS GRID -->'
        elif "projects.html" in html_filename:
            grid_start_marker = '<!-- START ALL PROJECTS GRID -->'
            grid_end_marker = '<!-- END ALL PROJECTS GRID -->'
        else:
            print(f"Unbekannte Übersichtsseite zum Aktualisieren: {html_filename}")
            return

        start_index = content.find(grid_start_marker)
        end_index = content.find(grid_end_marker)

        if start_index == -1 or end_index == -1:
            print(f"Warnung: Grid-Marker ('{grid_start_marker}' oder '{grid_end_marker}') nicht in '{html_filename}' gefunden. Überspringe Aktualisierung für diese Datei.")
            return

        start_insert_index = start_index + len(grid_start_marker)
        end_insert_index = end_index

        # Generiere den neuen HTML-Inhalt für das Grid
        grid_html = generate_grid_html(projects, limit)

        # Ersetze den Inhalt zwischen den Markern
        # Behalte Einrückung bei (angenommen, die Marker sind eingerückt)
        indentation = content[end_index - end_index.lstrip().find(grid_end_marker):end_index].split('\n')[-1]
        new_content = content[:start_insert_index] + "\n" + grid_html + "\n" + indentation + content[end_insert_index:]

        # Schreibe die aktualisierte HTML-Datei
        with open(html_filename, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"'{html_filename}' aktualisiert.")

    except Exception as e:
        print(f"Fehler beim Aktualisieren von '{html_filename}': {e}")
        import traceback
        traceback.print_exc()

def generate_grid_html(projects, limit=0):
    """Erzeugt den HTML-Code für das Projekt-Grid."""
    grid_items_html = ""
    projects_to_show = projects[:limit] if limit > 0 else projects

    if not projects_to_show:
        return "              <p>Keine Projekte zum Anzeigen vorhanden.</p>" # Korrekte Einrückung

    indent = "              " # Einrückung für Grid-Items
    for project in projects_to_show:
        # Verwende den Pfad aus all_projects_data, der bereits relativ zum Root ist
        thumbnail_url = project['thumbnail'] if project['thumbnail'] else 'https://via.placeholder.com/300x400?text=Bild'
        category_html = f'<span class="project-category">{html.escape(project["category"])}</span>' if project.get("category") else ''

        grid_items_html += f'{indent}<div class="project-card">\n'
        grid_items_html += f'{indent}  <a href="{project["html_file"]}" class="project-card-link">\n'
        grid_items_html += f'{indent}    <div class="project-image">\n'
        grid_items_html += f'{indent}      <img src="{thumbnail_url}" alt="{html.escape(project["title"])}" loading="lazy" />\n'
        grid_items_html += f'{indent}    </div>\n'
        grid_items_html += f'{indent}    <div class="project-info">\n'
        grid_items_html += f'{indent}      {category_html}\n'
        grid_items_html += f'{indent}      <h3 class="project-title">{html.escape(project["title"])}</h3>\n'
        grid_items_html += f'{indent}    </div>\n'
        grid_items_html += f'{indent}  </a>\n'
        grid_items_html += f'{indent}</div>\n'
    return grid_items_html

# --- Skript starten ---
if __name__ == "__main__":
    try:
        from bs4 import BeautifulSoup
    except ImportError:
        print("Fehler: Das Paket 'beautifulsoup4' wird benötigt.")
        print("Bitte installieren Sie es mit: pip install beautifulsoup4")
        exit()

    generate_project_pages()

# --- END OF FILE generate_html.py ---