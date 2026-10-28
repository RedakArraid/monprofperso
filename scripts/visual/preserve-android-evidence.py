#!/usr/bin/env python3
"""Recover already-reviewed Android evidence; never run or alter the application."""
import base64
import hashlib
import io
import json
import os
import struct
import subprocess
import sys
import zipfile
from pathlib import Path
from xml.etree import ElementTree

SOURCE = "a035f18971973179d22167d8cce84bcd2a443ea7"
TESTED_MERGE = "56308d02ad68ba4e7681cd07895fee3f559083d6"
SOURCE_TREE = "1aaaeef61cf57019621d93074d28196ef3735e0b"
ZIP_SHA = "70dca29e4e85d0133fac19259d05cb9049f6ca877f4b23f65e5edf80e50518ae"
ZIP_BYTES = 2677628
ARTIFACT_ID = 12850431280
PREFIX = "_temp/mpp-android-captures/run.rD4IKc/connected/emulator-5554 - 16/visual-proof/"
DEST = "docs/visual-evidence/android/"
WORKFLOW = ".github/workflows/preserve-visual-evidence.yml"
HELPER = "scripts/visual/preserve-android-evidence.py"
MAIN_REPORT = "docs/VISUAL-MOBILE-REVIEW.md"
XML_PATH = "monprofperso/monprofperso/android/app/build/outputs/androidTest-results/connected/debug/TEST-emulator-5554 - 16-_app-.xml"
SELECTION = {
    "inscription": ("03-signup.png", "inscription-android.png", "Inscription et barres système"),
    "otp-clavier": ("05a-otp-keyboard.png", "otp-clavier-android.png", "Code OTP et clavier logiciel"),
    "accueil-parent": ("06-parent-home.png", "accueil-parent-android.png", "Accueil parent"),
    "accueil-parent-200": ("06a-parent-home-large-text.png", "accueil-parent-200-android.png", "Accueil parent et navigation à 200 %"),
    "reservation": ("09-booking.png", "reservation-android.png", "Formulaire de réservation avant envoi"),
    "tableau-professeur-200": ("14a-teacher-dashboard-large-text.png", "tableau-professeur-200-android.png", "Espace professeur et navigation à 200 %"),
    "ressources-vides": ("16a-resources-empty.png", "ressources-vides-android.png", "Ressources vides, filtres Cours et Standard"),
    "ressources-indisponibles": ("17a-resources-error.png", "ressources-indisponibles-android.png", "Ressources indisponibles après Réessayer"),
    "bienvenue-paysage": ("18-welcome-landscape.png", "bienvenue-paysage-android.png", "Bienvenue en paysage"),
}
EXPECTED_PNG = {
    "01-welcome-phone.png", "02-welcome-large-text.png", "03-signup.png",
    "04-login.png", "04a-login-keyboard.png", "05-otp.png", "05a-otp-keyboard.png",
    "06-parent-home.png", "06a-parent-home-large-text.png", "07-search.png",
    "08-teacher-profile.png", "08a-teacher-profile-large-text.png", "09-booking.png",
    "10-courses.png", "11-course-details.png", "12-account.png", "13-privacy.png",
    "14-teacher-dashboard.png", "14a-teacher-dashboard-large-text.png",
    "15-teacher-finances.png", "16-empty-courses.png", "16a-resources-empty.png",
    "17-network-error.png", "17a-resources-error.png", "18-welcome-landscape.png",
}

def git(*args):
    return subprocess.check_output(["git", *args])

def digest(payload):
    return hashlib.sha256(payload).hexdigest()

def blob_sha(payload):
    return hashlib.sha1(b"blob " + str(len(payload)).encode("ascii") + b"\0" + payload).hexdigest()

def json_bytes(value):
    return (json.dumps(value, ensure_ascii=False, indent=2) + "\n").encode("utf-8")

head = git("rev-parse", "HEAD").decode().strip()
assert head == os.environ["SOURCE_HEAD"], "Unexpected checked-out head"
assert git("rev-parse", SOURCE + "^{tree}").decode().strip() == SOURCE_TREE
subprocess.run(["git", "merge-base", "--is-ancestor", SOURCE, head], check=True)
changed = {p.decode() for p in git("diff", "--name-only", "-z", SOURCE, head).split(b"\0") if p}
assert changed == {WORKFLOW, HELPER, MAIN_REPORT}, changed
assert not git("status", "--porcelain").strip(), "Recovery checkout must be clean"

meta = json.loads(Path(os.environ["RUNNER_TEMP"], "mpp-evidence-metadata.json").read_text())
assert meta["id"] == ARTIFACT_ID and meta["expired"] is False
assert meta["name"] == "android-visual-" + TESTED_MERGE
assert meta["workflow_run"]["id"] == 40764741671
assert meta["workflow_run"]["head_sha"] == SOURCE
assert meta.get("digest") in (None, "sha256:" + ZIP_SHA)
archive = Path(os.environ["RUNNER_TEMP"], "mpp-evidence.zip").read_bytes()
assert len(archive) == ZIP_BYTES and digest(archive) == ZIP_SHA, "Archive integrity failure"
z = zipfile.ZipFile(io.BytesIO(archive))
members = z.namelist()
assert len(members) == len(set(members)), "Duplicate archive entries"
assert sum(i.file_size for i in z.infolist()) < 30_000_000, "Unexpected archive size"
png_names = {n[len(PREFIX):] for n in members if n.startswith(PREFIX) and n.endswith(".png")}
json_names = {n[len(PREFIX):] for n in members if n.startswith(PREFIX) and n.endswith(".json")}
assert png_names == EXPECTED_PNG, png_names
assert json_names == {p.removesuffix(".png") + ".json" for p in EXPECTED_PNG}
xml_bytes = z.read(XML_PATH)
suite = ElementTree.fromstring(xml_bytes)
assert suite.tag == "testsuite" and suite.attrib["name"] == "ci.monprofperso.app.VisualRegressionTest"
assert {k: int(suite.attrib[k]) for k in ("tests", "failures", "errors", "skipped")} == {
    "tests": 1, "failures": 0, "errors": 0, "skipped": 0}
cases = suite.findall("testcase")
assert len(cases) == 1 and not cases[0].findall("failure")
assert suite.attrib["time"] == "55.524" and cases[0].attrib["time"] == "48.58"

screenshots = []
png_payloads = {}
for name in sorted(EXPECTED_PNG):
    raw = z.read(PREFIX + name)
    assert raw[:8] == b"\x89PNG\r\n\x1a\n" and raw[12:16] == b"IHDR"
    width, height = struct.unpack(">II", raw[16:24])
    assert (width, height) == ((1600, 1000) if name == "18-welcome-landscape.png" else (720, 1280))
    sidecar_name = PREFIX + name.removesuffix(".png") + ".json"
    sidecar_bytes = z.read(sidecar_name)
    sidecar = json.loads(sidecar_bytes)
    assert sidecar["screen"] == name.removesuffix(".png")
    assert sidecar["captureMethod"] == "display-verified-with-window-pixelcopy"
    assert sidecar["pixelTolerance"] == 0 and sidecar["apiLevel"] == 36
    assert (sidecar["imageWidth"], sidecar["imageHeight"]) == (width, height)
    png_payloads[name] = raw
    screenshots.append({
        "source_file": name, "archive_member": PREFIX + name,
        "sha256": digest(raw), "git_blob_sha1": blob_sha(raw), "bytes": len(raw),
        "width": width, "height": height,
        "metadata_archive_member": sidecar_name, "metadata_sha256": digest(sidecar_bytes),
        "native_metadata": sidecar,
    })
assert len({row["sha256"] for row in screenshots}) == 25
by_name = {row["source_file"]: row for row in screenshots}
assert all(by_name[name]["native_metadata"]["imeVisible"] is True for name in
           ("04a-login-keyboard.png", "05a-otp-keyboard.png"))
nav_bytes = z.read(PREFIX + "navigation-text-metrics.jsonl")
gesture_bytes = z.read(PREFIX + "navigation-gestures.jsonl")
navigation = [json.loads(line) for line in nav_bytes.decode().splitlines()]
gestures = [json.loads(line) for line in gesture_bytes.decode().splitlines()]
assert len(navigation) == 10 and len(gestures) == 4
for row in navigation:
    assert row["fontScale"] == 2 and row["lineCount"] == 1
    assert not row["didOverflowHeight"] and not row["didExceedMaxLines"] and not row["ellipsized"]
    assert row["maxIntrinsicWidth"] <= row["layoutWidth"] and row["lineEnd"] == len(row["label"])
assert [row["target"] for row in gestures] == ["Compte", "Accueil", "Compte", "Accueil"]
assert [row["direction"] for row in gestures] == ["left", "right", "left", "right"]
assert all(row["swipeCount"] > 0 and row["fullyVisibleAfterGesture"] is True for row in gestures)
bars = by_name["03-signup.png"]["native_metadata"]["systemBars"]
assert bars["expectedDarkIcons"] is True and bars["minimumContrastRatio"] == 4.5
for region in (bars["statusClock"], bars["navigationHandle"]):
    assert region["uniformWindowBackground"] is True
    assert region["matchingBackgroundPixels"] * 2 > region["totalPixels"]
    assert region["contrastingGlyphPixels"] >= 16

inputs = {}
extra_inputs = {
    "android/build.gradle.kts", "android/app/build.gradle.kts", "android/settings.gradle.kts",
    "android/gradle.properties", "android/gradlew", "android/gradlew.bat",
    "scripts/visual/fixture-server.mjs", ".github/workflows/ci.yml",
}
for name_bytes in git("ls-files", "-z").split(b"\0"):
    if not name_bytes:
        continue
    name = name_bytes.decode("utf-8")
    if name.startswith(("android/app/src/", "android/gradle/", "android/scripts/")) or name in extra_inputs:
        p = Path(name)
        assert p.is_file() and not p.is_symlink(), name
        inputs[name] = digest(p.read_bytes())
assert "android/app/src/main/java/ci/monprofperso/app/ui/screens/NotificationBell.kt" in inputs
selected = []
files = {}
for key, (source_name, destination, description) in SELECTION.items():
    raw = png_payloads[source_name]
    files[DEST + destination] = raw
    selected.append({
        "file": destination, "description": description, "source_file": source_name,
        "sha256": digest(raw), "git_blob_sha1": blob_sha(raw), "bytes": len(raw),
        "width": by_name[source_name]["width"], "height": by_name[source_name]["height"],
    })
manifest = {
    "scope": "Recette native Android avec données exclusivement fictives",
    "review_date": "2026-10-28",
    "source_commit": SOURCE, "tested_merge_commit": TESTED_MERGE, "source_tree": SOURCE_TREE,
    "ci": {"run_id": 40764741671, "job_id": 123085728504,
           "run_url": "https://github.com/RedakArraid/monprofperso/actions/runs/40764741671",
           "job_url": "https://github.com/RedakArraid/monprofperso/actions/runs/40764741671/job/123085728504"},
    "artifact": {"id": ARTIFACT_ID, "name": meta["name"], "zip_bytes": len(archive),
                 "sha256": ZIP_SHA, "expires_at": meta["expires_at"]},
    "device": {"api_level": 36, "android_version": "16", "portrait_dp": [360, 640],
               "landscape_dp": [1067, 667], "portrait_density_dpi": 320, "landscape_density_dpi": 240},
    "instrumented_tests": {"tests": 1, "failures": 0, "errors": 0, "skipped": 0,
                          "suite_seconds": 55.524, "scenario_seconds": 48.58,
                          "timestamp_from_xml_utc": suite.attrib["timestamp"],
                          "xml_archive_member": XML_PATH, "xml_sha256": digest(xml_bytes)},
    "visual_review": {"exported_png": 25, "distinct_png": 25, "inspected_png": 25,
                      "selected_png": 9, "selected_bytes": sum(row["bytes"] for row in selected),
                      "finding": "Aucun nouveau défaut de mise en page bloquant observé sur les 25 captures originales."},
    "navigation": {"text_metrics": navigation, "text_metrics_sha256": digest(nav_bytes),
                   "gestures": gestures, "gestures_sha256": digest(gesture_bytes)},
    "screenshots": screenshots, "selected_screenshots": selected,
    "source_inputs_sha256": inputs,
    "preservation": {
        "method": "Copie des octets du ZIP vérifié, sans décodage ni réencodage des PNG",
        "reason": "Archivage final repris après indisponibilité du workspace local",
        "transport_workflow_run_id": int(os.environ["GITHUB_RUN_ID"]),
        "transport_source_head": head,
        "original_validation_provenance_unchanged": True,
    },
    "limits": [
        "Émulateur API 36 seulement ; aucun appareil physique ni TalkBack validé.",
        "Le pipeline utilise un serveur local de fixtures et une connexion challenge/OTP.",
        "Aucune réservation, aucun paiement ni versement réel, aucune suppression de compte exécutés.",
        "Cette preuve ne constitue ni certification d’accessibilité ni livraison Google Play signée.",
        "Les 15 tests JVM historiques gardent la provenance du premier build local ; ce ZIP contient le XML instrumenté.",
    ],
}
files[DEST + "manifest.json"] = json_bytes(manifest)
table = "\n".join("| [" + row["description"] + "](" + row["file"] + ") | " +
                  str(row["width"]) + " × " + str(row["height"]) + " |" for row in selected)
readme = f"""# Preuves visuelles Android

Recette du **28 octobre 2026**, pour le candidat
[a035f18](https://github.com/RedakArraid/monprofperso/commit/{SOURCE}).
Le [job Android 123085728504](https://github.com/RedakArraid/monprofperso/actions/runs/40764741671/job/123085728504)
a réussi le build, les tests JVM, le parcours instrumenté et la collecte UTP.

## Résultat natif inspecté

**Un test instrumenté réussi, zéro échec, erreur ou test ignoré.** La suite XML
dure **55,524 secondes**, dont **48,58 secondes** pour le scénario. Les
**25 PNG distincts ont été inspectés en résolution originale** : aucun nouveau
défaut de mise en page bloquant observé sur cette configuration.

L’émulateur utilise **Android 16 / API 36**, un téléphone de **360 × 640 dp**
(captures 720 × 1280 px), puis un paysage de 1067 × 667 dp
(capture 1600 × 1000 px). Quatre captures utilisent une taille de texte de **200 %**.
Les dix mesures de libellés et les quatre glissements réels confirment que
Compte puis Accueil restent accessibles, pour le parent et le professeur.

L’inscription présente une horloge et une poignée système sombres. Le JSON
conserve les pixels qualifiés dans les régions contrôlées : **574** pour la
région horloge et **1 708** pour la poignée, sur des fonds uniformes et majoritaires.
Les captures de connexion et d’OTP montrent le clavier logiciel ouvert.
Les ressources vides et indisponibles restent distinctes, sans anciens exemples.
Réessayer satisfait le minimum explicite de **48 dp**, puis le message d’erreur
reste présent lorsque le serveur répond toujours 503. Le paysage est correctement
présenté, sans ancienne frame portrait.

## Neuf PNG originaux conservés

Ces fichiers sont identiques octet par octet aux captures natives de l’archive ;
ils représentent au total **{manifest["visual_review"]["selected_bytes"]:,} octets**.
Les noms, comptes et montants affichés sont des données de recette fictives.

| Capture | Dimensions en pixels |
| --- | --- |
{table}

Le [manifeste](manifest.json) conserve les SHA256 des 25 PNG, leurs 25 métadonnées
JSON natives, les mesures de navigation et les empreintes des sources d’entrée.
La fusion exécutée est **{TESTED_MERGE}**, avec l’arbre
**{SOURCE_TREE}**, identique au candidat.

L’[artefact original](https://github.com/RedakArraid/monprofperso/actions/runs/40764741671/artifacts/12850431280)
est identifié par son SHA256 **{ZIP_SHA}** et ses **{ZIP_BYTES} octets**.
Sa rétention expire le 11 novembre 2026. La sélection versionnée reste dans le dépôt.

L’archivage a été terminé depuis ce ZIP après l’indisponibilité du workspace
local. Le workflow de transport, en lecture seule sur GitHub, est identifié
séparément dans le manifeste. Les images sont celles du parcours a035f18 déjà
inspecté ; aucun rendu ou test natif supplémentaire n’a été fabriqué pour cet archivage.

## Portée

Cette recette ne valide pas un appareil physique, TalkBack, les claviers
constructeurs, les paiements externes, la signature de distribution ou Google Play.
Les commandes de reproduction et l’historique sont dans le
[rapport Android](../../../android/VISUAL-VALIDATION.md).
"""
old_readme = git("show", SOURCE + ":" + DEST + "README.md").decode("utf-8")
old_readme = old_readme.replace("# Validation locale Android", "## Historique de la compilation locale", 1)
old_readme = old_readme.replace("\n## Premier passage natif et correction", "\n### Premier passage natif et correction")
files[DEST + "README.md"] = (readme + "\n" + old_readme).encode("utf-8")
validation = git("show", SOURCE + ":android/VISUAL-VALIDATION.md").decode("utf-8")
validation += f"""

## Révision a035f18 : recette finale réussie et inspectée

Le [job Android 123085728504](https://github.com/RedakArraid/monprofperso/actions/runs/40764741671/job/123085728504)
valide la tête **{SOURCE}**, par la fusion
**{TESTED_MERGE}**, d’arbre **{SOURCE_TREE}**.

Le build, les tests JVM et le parcours instrumenté ont réussi. Le XML indique
**1 test, 0 échec, 0 erreur et 0 ignoré**, suite **55,524 s**, scénario **48,58 s**.
La collecte conserve **25 PNG distincts**, leurs 25 JSON et les deux journaux
de navigation. Les 25 images ont toutes été inspectées en résolution originale :
aucun nouveau défaut de mise en page bloquant n’a été observé.

Les dix mesures confirment des libellés entiers à 200 %. Quatre vrais gestes
permettent d’atteindre Compte et de revenir à Accueil pour les deux rôles.
Le garde SystemUI valide l’horloge et la poignée sombres. Le bouton Réessayer
satisfait le minimum explicite de 48 dp ; son activation laisse un état
d’indisponibilité explicite lorsque la fixture retourne toujours 503.
Le vide, le clavier de connexion/OTP et le paysage ont également été inspectés.

Les [neuf PNG originaux et leur manifeste](../docs/visual-evidence/android/README.md)
sont conservés à partir de l’artefact **12850431280**, ZIP de **{ZIP_BYTES} octets**,
SHA256 **{ZIP_SHA}**. L’archivage a été repris depuis GitHub après la panne du
workspace local, sans changer les captures ni leur provenance de validation.
Les compilations historiques ci-dessus gardent leurs révisions d’origine ;
cette archive ne réattribue pas le décompte initial de 15 tests JVM.

Les limites restent celles de l’émulateur API 36 et des fixtures locales :
appareils physiques, TalkBack, distribution signée et prestataires réels
demandent leur propre recette.
"""
files["android/VISUAL-VALIDATION.md"] = validation.encode("utf-8")

for path, payload in files.items():
    p = Path(path)
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_bytes(payload)
subprocess.run(["git", "add", "--", *sorted(files)], check=True, capture_output=True)
subprocess.run(["git", "rm", "--cached", "--", WORKFLOW, HELPER], check=True, capture_output=True)
expected_tree = git("write-tree").decode().strip()
assert len(expected_tree) == 40
bundle = [{"path": path, "bytes": len(raw), "sha256": digest(raw), "git_sha1": blob_sha(raw)}
          for path, raw in sorted(files.items())]
key = os.environ["EVIDENCE_KEY"]
path = DEST + SELECTION[key][1] if key in SELECTION else {
    "manifest": DEST + "manifest.json", "readme": DEST + "README.md",
    "validation": "android/VISUAL-VALIDATION.md",
}[key]
raw = files[path]
encoded = base64.b64encode(raw).decode("ascii")
chunks = [encoded[i:i + 8192] for i in range(0, len(encoded), 8192)]
header = {"version": 1, "path": path, "bytes": len(raw), "sha256": digest(raw),
          "git_sha1": blob_sha(raw), "chunks": len(chunks), "base64_length": len(encoded),
          "base_commit": head, "expected_tree": expected_tree, "bundle": bundle}
print("MPPEVIDENCE_HEADER " + json.dumps(header, separators=(",", ":")), flush=True)
for index, chunk in enumerate(chunks):
    print("MPPEVIDENCE_CHUNK " + json.dumps({"path": path, "index": index, "data": chunk},
                                           separators=(",", ":")), flush=True)
print("MPPEVIDENCE_END " + json.dumps({"path": path, "chunks": len(chunks),
                                      "git_sha1": blob_sha(raw), "expected_tree": expected_tree},
                                     separators=(",", ":")), flush=True)
