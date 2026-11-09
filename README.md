# Tekstkluis

Tekstkluis is een lokale webapp. Met de app kan ik tekst versleutelen en weer ontsleutelen. Daarnaast zijn er aparte tabbladen om wachtwoorden en gebruikersnamen te maken.

Voor het versleutelen hoef ik geen wachtwoord te bedenken. De app maakt zelf een geheime sleutel. Die sleutel heb ik nodig om de tekst later weer leesbaar te maken.

**GitHub-repository:** https://github.com/shemar-OTF/cyber_security_encryptie

## Installeren en starten

Gebruik Python 3.12 of nieuwer. Voer deze opdrachten uit vanuit de projectmap:

```bash
python3 -m venv .venv
source .venv/bin/activate
python3 -m pip install -r requirements.txt
python3 app.py
```

Op Windows activeer je de omgeving met `.venv\Scripts\activate`.

De browser opent automatisch op **http://127.0.0.1:8000**. Als dat niet gebeurt, kan ik de link zelf openen. De terminal moet open blijven zolang ik de webapp gebruik. Met **Ctrl+C** stop ik de server.

Na het installeren kan ik de app opnieuw starten met:

```bash
python3 app.py
```

Het startscript gebruikt zo nodig automatisch de geïnstalleerde `.venv`. Rechtstreeks starten kan ook met `.venv/bin/python app.py`.

## Tekst versleutelen

1. Open het tabblad **Versleutelen**.
2. Typ of plak de tekst die je wilt beschermen.
3. Klik op **Versleutel tekst**.
4. Kopieer het resultaat of download het met **Bewaar bestand**. Dit wordt een `.cipher`-bestand.
5. Download ook de sleutel met **Bewaar geheime sleutel**. Dit wordt een apart `.key`-bestand.

Elke versleuteling krijgt een nieuwe sleutel. Bij ieder bewaard bericht moet ik daarom ook de bijbehorende sleutel bewaren. De app zet de sleutel niet in het `.cipher`-bestand.

## Tekst ontsleutelen

In hetzelfde browsertabblad onthoudt de app tijdelijk welke sleutel bij welke tekst hoort. Met **Verder naar ontsleutelen** zet ik de versleutelde tekst over. Daarna klik ik op **Ontsleutel tekst**.

Als ik de pagina heb vernieuwd of gesloten, werkt het zo:

1. Open het tabblad **Ontsleutelen**.
2. Plak de versleutelde tekst of kies **Open .cipher-bestand**.
3. Kies **Open sleutelbestand** en selecteer de bijbehorende `.key`.
4. Klik op **Ontsleutel tekst**.

Een verkeerde sleutel, gewijzigde gegevens of een ongeldig bestand geeft een foutmelding. Zonder de juiste sleutel kan de app de tekst niet terughalen.

## Wachtwoorden maken

Het tabblad **Wachtwoord** heeft drie vooraf ingestelde niveaus:

| Niveau | Lengte | Tekensoorten |
| --- | --- | --- |
| Simpel | 16 tekens | Kleine letters |
| Matig | 20 tekens | Kleine letters, hoofdletters en cijfers |
| Moeilijk | 24 tekens | Kleine letters, hoofdletters, cijfers en speciale tekens |

Standaard staat **Moeilijk** geselecteerd. Ik kan de lengte zelf aanpassen van **16 tot 128 tekens**. Met vier selectievakjes kies ik welke tekensoorten ik wil gebruiken.

Er moet minimaal één tekensoort aan staan. Elke gekozen soort komt minstens één keer in het wachtwoord voor. Uitgeschakelde soorten worden niet gebruikt. Als ik de instellingen aanpas, toont de app **Eigen instelling**, tenzij de gekozen instellingen precies overeenkomen met een niveau.

Het resultaat kan ik tonen, kopiëren of met **Versleutel dit wachtwoord** overzetten naar het versleutelscherm.

## Gebruikersnamen maken

Het tabblad **Gebruikersnaam** staat los van de wachtwoordgenerator. De app bedenkt namen met woorden en willekeurige tekens.

| Niveau | Opbouw | Voorbeeld |
| --- | --- | --- |
| Simpel | Een woord en twee cijfers | `Otter47` |
| Matig | Twee woorden, een underscore en vier cijfers | `VlotteOtter_2481` |
| Moeilijk | Twee woorden, een underscore en tien hextekens | `VlotteOtter_a3b9c2d817` |

Deze niveaus bepalen de stijl van de naam, niet de beveiliging van een account.

Bij **Eigen naam of idee** kan ik bijvoorbeeld `Shemar` of `Pixel` invullen. De app gebruikt dat dan als begin en voegt de tekens van het gekozen niveau toe. Ik mag maximaal 24 letters van a–z of A–Z, cijfers, streepjes en underscores invoeren. Het eerste teken moet een letter of cijfer zijn.

Ik kan de gebruikersnaam kopiëren of overzetten naar het versleutelscherm. De app maakt geen account aan en controleert niet of de naam op een website beschikbaar is.

## Hoe de encryptie werkt

De app gebruikt **AES-256-GCM** uit de bestaande Python-library **cryptography**. Ik gebruik dus een bestaande cryptografische implementatie.

Bij iedere versleuteling maakt de library een willekeurige sleutel van **32 bytes**, oftewel **256 bits**. De app maakt ook een nieuwe **nonce van 12 bytes**. GCM voegt een authenticatietag toe waarmee de library wijzigingen aan de beschermde gegevens controleert.

Het `.cipher`-bestand bevat een versieaanduiding (`CSE2`), de nonce, de versleutelde tekst en de tag. Het resultaat wordt met Base64 omgezet naar kopieerbare tekst. Base64 zelf is geen encryptie. De geheime sleutel wordt apart als Base64-tekst in het `.key`-bestand bewaard.

Deze versie gebruikt geen hoofdwachtwoord of sleutelafleiding uit een wachtwoord. De AES-sleutel wordt rechtstreeks willekeurig gegenereerd.

## Sleutels bewaren en delen

De app bewaart de sleutels tijdelijk in het geheugen van het browsertabblad. Ze worden niet automatisch in cookies, browseropslag of een database gezet. Bij vernieuwen of sluiten van het tabblad verdwijnt de tijdelijke koppeling.

**Wis velden** maakt de invoer en resultaten leeg. Automatisch gemaakte sleutels blijven tijdens die sessie beschikbaar. Een handmatig geladen sleutel wordt bij het wissen van het ontsleutelformulier losgelaten.

Het `.key`-bestand is niet met een wachtwoord beschermd. Iedereen met zowel de sleutel als de versleutelde tekst kan ontsleutelen. Ik moet de sleutel daarom apart bewaren en niet naar GitHub uploaden. Bij verlies van de sleutel is er geen herstelmogelijkheid als de sessie ook gesloten is.

Als ik tekst met iemand deel, heeft die persoon dezelfde sleutel nodig. Ik moet die via een afzonderlijk, gecontroleerd kanaal delen. De app regelt deze uitwisseling niet. Bij veel gebruikers wordt het beheren en delen van al die sleutels ingewikkeld.

## Symmetrische encryptie en Kerckhoffs

AES is symmetrische encryptie: dezelfde geheime sleutel wordt gebruikt om te versleutelen en te ontsleutelen. Bij asymmetrische cryptografie wordt gewerkt met een publieke en een private sleutel. Deze app gebruikt de symmetrische aanpak.

Volgens **Kerckhoffs's Principe** moet een systeem veilig kunnen blijven als het ontwerp openbaar is, zolang de sleutel geheim blijft. Dat past bij deze app: de code, AES en het bestandsformaat mogen bekend zijn. De beveiliging hoort af te hangen van de geheime sleutel.

Dat betekent niet dat de app automatisch tegen ieder risico beschermt. Iemand die de sleutel steelt, malware op de computer of een onveilige browserextensie kan de gegevens alsnog blootleggen.

## Lokale verwerking en grenzen

De webapp draait op **127.0.0.1:8000**, alleen op mijn eigen computer. De browser stuurt de tekst en sleutel naar de lokale Python-server. Daar gebeurt de encryptie. De app gebruikt geen externe dienst om de gegevens te verwerken.

De server heeft de debugger uitgeschakeld. API-verzoeken gebruiken JSON, een eigen requestheader en controles op de herkomst en host. Reacties krijgen een instructie om ze niet te cachen. De app schrijft geen ingevoerde teksten of sleutels naar een database.

De invoer mag maximaal **100.000 UTF-8-bytes** bevatten. Lege tekst en tekst met alleen witruimte worden geweigerd. Versleutelde invoer mag maximaal 140.000 tekens bevatten. De app is bedoeld als lokale schoolapp; de ingebouwde ontwikkelserver is niet bedoeld om rechtstreeks op internet te zetten.

## Bestanden in het project

| Bestand of map | Functie |
| --- | --- |
| `app.py` | Start de Flask-webserver en verwerkt de API-verzoeken |
| `crypto_service.py` | Encryptie, ontsleuteling, sleutelgeneratie en de twee generators |
| `templates/index.html` | De pagina met vier tabbladen |
| `static/app.js` | Bediening, niveaus, kopiëren, bestanden en tijdelijke sleutels |
| `static/style.css` | Vormgeving en aanpassing aan kleinere schermen |
| `static/favicon.svg` | Het pictogram in het browsertabblad |
| `requirements.txt` | De benodigde Python-packages: Flask en cryptography |
| `.gitignore` | Houdt onder andere de Python-omgeving en sleutelbestanden buiten Git |

## Bronnen

- [cryptography — AESGCM en sleutelgeneratie](https://cryptography.io/en/latest/hazmat/primitives/aead/)
- [NIST — Advanced Encryption Standard](https://csrc.nist.gov/pubs/fips/197/final)
- [Python — secrets](https://docs.python.org/3/library/secrets.html)
- [Flask — Security Considerations](https://flask.palletsprojects.com/en/stable/web-security/)
