# --- START OF FILE crawler_extract.py ---

import requests
from bs4 import BeautifulSoup
from urllib.parse import urljoin, urlparse
import os
import time
import re
import json
import shutil

# --- Konfiguration ---
START_URL = "https://www.hirsch-architekten.com/projekte/"
ALLOWED_DOMAIN = urlparse(START_URL).netloc
OUTPUT_DATA_DIR = "public/projekt_daten" # Ziel ist jetzt im public Ordner
REQUEST_DELAY = 1
USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
MAX_PROJECTS_TO_CRAWL = 3 # Limit für den Test

# --- Hilfsfunktionen ---
def sanitize_for_foldername(text):
    text = text.lower(); text = text.replace('ä', 'ae').replace('ö', 'oe').replace('ü', 'ue').replace('ß', 'ss')
    text = re.sub(r'\s+', '_', text); text = re.sub(r'[^\w_-]', '', text)
    return text[:50].strip('_')

def sanitize_filename(filename):
    name, ext = os.path.splitext(filename); sanitized_name = name.replace('ä', 'ae').replace('ö', 'oe').replace('ü', 'ue').replace('ß', 'ss')
    sanitized_name = re.sub(r'[<>:"/\\|?*]', '_', sanitized_name); sanitized_name = re.sub(r'\s+', '_', sanitized_name)
    sanitized_name = re.sub(r'_+', '_', sanitized_name)
    return f"{sanitized_name.strip('_')}{ext.lower()}"

# --- Hauptlogik ---
def crawl_projects(start_url):
    project_links = set(); session = requests.Session(); session.headers.update({'User-Agent': USER_AGENT})
    project_manifest = []

    # --- Löschen/Erstellen Datenordner ---
    if not os.path.exists("public"): print("Erstelle Ordner 'public'..."); os.makedirs("public")
    if os.path.exists(OUTPUT_DATA_DIR):
        print(f"Lösche alten Datenordner: {OUTPUT_DATA_DIR}"); shutil.rmtree(OUTPUT_DATA_DIR); print("Gelöscht.")
    try: os.makedirs(OUTPUT_DATA_DIR); print(f"Datenordner '{OUTPUT_DATA_DIR}' neu erstellt.")
    except OSError as e: print(f"Fehler: {e}"); return
    # --- Ende Ordner ---

    print("Suche nach Projektlinks..."); found_project_urls_count = 0
    try: # Linksuche (vereinfacht)
        time.sleep(REQUEST_DELAY); response = session.get(start_url, timeout=15); response.raise_for_status()
        soup = BeautifulSoup(response.text, 'html.parser')
        project_container = soup.find('div', class_='et_pb_salvattore_content')
        links_to_check = project_container.find_all('a', href=True) if project_container else soup.find_all('a', href=True)
        for link in links_to_check:
            href = link['href']; absolute_url = urljoin(start_url, href); parsed_url = urlparse(absolute_url)
            if (parsed_url.netloc == ALLOWED_DOMAIN and parsed_url.path.startswith('/projekte/') and
                len(parsed_url.path.strip('/').split('/')) >= 2 and parsed_url.path != urlparse(start_url).path):
                 normalized_url = parsed_url._replace(fragment="", query="").geturl()
                 if normalized_url.endswith('/'): test_url_no_slash = normalized_url[:-1]
                 else: test_url_no_slash = normalized_url + '/'
                 if normalized_url not in project_links and test_url_no_slash not in project_links:
                     project_links.add(normalized_url); found_project_urls_count += 1
    except Exception as e: print(f"Fehler bei Linksuche: {e}"); return
    print(f"Gefunden: {found_project_urls_count} Projektlinks.")
    if not project_links: print("Keine Projektlinks."); return

    # Crawle Projektseiten
    crawled_count = 0; project_counter = 1; visited_projects = set(); sorted_project_links = sorted(list(project_links))

    for project_url in sorted_project_links:
        if crawled_count >= MAX_PROJECTS_TO_CRAWL: print(f"Limit {MAX_PROJECTS_TO_CRAWL} erreicht."); break
        if project_url in visited_projects: continue
        visited_projects.add(project_url); print(f"\nVerarbeite Projekt {project_counter}: {project_url}")

        try:
            time.sleep(REQUEST_DELAY); response = session.get(project_url, timeout=15); response.raise_for_status()
            content_type = response.headers.get('content-type', '').lower()
            if 'text/html' not in content_type: print(f"  -> Kein HTML"); continue
            soup = BeautifulSoup(response.text, 'html.parser')

            # Daten extrahieren
            title = "Unbekanntes Projekt"; description_lines = []; image_urls_to_download = []; downloaded_image_filenames = []; projekt_kategorie = ""

            # Titel
            title_element = None; selectors_to_try = ['.et_pb_text_0 .et_pb_text_inner h1 strong', '.et_pb_text_0 .et_pb_text_inner h2 strong', '.entry-title', 'h1']
            for selector in selectors_to_try:
                title_element = soup.select_one(selector);
                if title_element: title = title_element.get_text(strip=True); print(f"  -> Titel: {title}"); break
            if not title_element: title_tag = soup.find('title'); title = title_tag.get_text(strip=True).replace('- Hirsch Architekten', '').strip() if title_tag else title; print(f"  -> Titel aus <title>: {title}")

            # Beschreibung und Kategorie
            description_module = None; desc_selectors = ['.et_pb_text_0 .et_pb_text_inner', '.entry-content', 'article .post-content']
            for selector in desc_selectors:
                description_module = soup.select_one(selector)
                if description_module:
                    print(f"  -> Beschreibung aus '{selector}'."); paragraphs = description_module.find_all('p', recursive=False) or description_module.find_all('p')
                    first_p_text = paragraphs[0].get_text(strip=True) if paragraphs else ""
                    if title in first_p_text: paragraphs = paragraphs[1:] # Titel entfernen
                    # Kategorie aus nächstem kurzen Absatz?
                    if paragraphs and len(paragraphs[0].get_text(strip=True)) < 50 and not paragraphs[0].find('strong'):
                        projekt_kategorie = paragraphs[0].get_text(strip=True)
                        paragraphs = paragraphs[1:]
                        print(f"     -> Kategorie gefunden: {projekt_kategorie}")
                    description_lines = [p.get_text() for p in paragraphs if p.get_text(strip=True) and p.get_text(strip=True) != ' '] # Behalte Umbrüche innerhalb <p>
                    break
            if not description_module: print("  -> WARNUNG: Keine Beschreibung.")

            # Bilder extrahieren
            image_gallery_links = []; gallery_selectors = ['.et_pb_4divi_masonry_gallery_0 .et_pb_gallery_item a', '.et_pb_gallery .et_pb_gallery_item a', '.wp-block-gallery .blocks-gallery-item a', '.gallery .gallery-item a']
            for selector in gallery_selectors: image_gallery_links = soup.select(selector);
            if image_gallery_links: print(f"  -> Bilder aus Galerie '{selector}'."); break
            if not image_gallery_links: print("  -> Keine Galerie, suche einzelne Bilder..."); main_content = soup.select_one('.entry-content') or soup; image_gallery_links = main_content.select('img[src]') if main_content else []
            for item in image_gallery_links:
                img_url = item.get('href') if item.name == 'a' else item.get('src');
                if img_url and isinstance(img_url, str) and not img_url.startswith('data:'):
                    absolute_img_url = urljoin(project_url, img_url);
                    if re.search(r'\.(jpg|jpeg|png|gif|webp)$', urlparse(absolute_img_url).path, re.IGNORECASE): image_urls_to_download.append(absolute_img_url)
            print(f"  -> {len(image_urls_to_download)} Bilder zum Download.")

            # Projektordner erstellen
            sanitized_title = sanitize_for_foldername(title)
            project_id = f"{project_counter:03d}_{sanitized_title}"
            project_folder_path = os.path.join(OUTPUT_DATA_DIR, project_id)
            os.makedirs(project_folder_path, exist_ok=True)

            # Bilder herunterladen
            for idx, img_url in enumerate(image_urls_to_download):
                try:
                    print(f"    -> Lade Bild {idx+1}: {img_url.split('/')[-1]}")
                    time.sleep(0.2); img_response = session.get(img_url, stream=True, timeout=20); img_response.raise_for_status()
                    original_filename = os.path.basename(urlparse(img_url).path); base, ext = os.path.splitext(original_filename)
                    safe_filename = sanitize_filename(f"{idx:02d}_{base}{ext}")
                    img_filepath = os.path.join(project_folder_path, safe_filename)
                    with open(img_filepath, 'wb') as f: shutil.copyfileobj(img_response.raw, f)
                    print(f"      -> Gespeichert als: {safe_filename}"); downloaded_image_filenames.append(safe_filename)
                except Exception as e: print(f"      -> Fehler bei Bild {img_url}: {e}")

            # --- info.txt erstellen ---
            info_filepath = os.path.join(project_folder_path, "info.txt")
            with open(info_filepath, 'w', encoding='utf-8') as f:
                f.write(f"{title}\n")
                f.write(f"{projekt_kategorie}\n") # Schreibe Kategorie (auch wenn leer)
                # Schreibe Beschreibung, behalte interne Zeilenumbrüche und Absätze bei
                for line in description_lines:
                    f.write(f"{line}\n") # Schreibe jeden Paragraphen (oder Zeile aus <p>) als eigene Zeile

                if downloaded_image_filenames:
                    f.write("\n---Bilder---\n") # Trennlinie
                    for img_name in downloaded_image_filenames:
                        f.write(f"{img_name}\n")
            print(f"  -> Daten gespeichert in: {info_filepath}")
            # --- Ende info.txt ---

            # Manifest aktualisieren
            thumbnail_filename = downloaded_image_filenames[0] if downloaded_image_filenames else None
            project_manifest.append({
                "id": project_id, "title": title, "category": projekt_kategorie,
                "thumbnail": f"{project_id}/{thumbnail_filename}" if thumbnail_filename else None
            })

            crawled_count += 1; project_counter += 1
        except Exception as e: print(f"  -> Fehler bei {project_url}: {e}")

    # Globales Manifest speichern
    manifest_filepath = os.path.join(OUTPUT_DATA_DIR, "projekte_manifest.json")
    if project_manifest:
        try:
            with open(manifest_filepath, 'w', encoding='utf-8') as f: json.dump(project_manifest, f, ensure_ascii=False, indent=4)
            print(f"\nGlobales Manifest gespeichert: {manifest_filepath}")
        except IOError as e: print(f"\nFehler beim Speichern des Manifests: {e}")
    else: print("\nKein Manifest gespeichert.")
    print("Crawling abgeschlossen.")

if __name__ == "__main__":
    try: from bs4 import BeautifulSoup; import requests
    except ImportError: print("Fehler: 'requests' und 'beautifulsoup4' benötigt (pip install requests beautifulsoup4)"); exit()
    crawl_projects(START_URL)

# --- END OF FILE crawler_extract.py ---