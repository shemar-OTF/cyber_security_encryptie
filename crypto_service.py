"""Encryptie via cryptography; dit bestand bevat geen zelfbedacht algoritme."""
import base64
import binascii
import secrets
import re
import string

from cryptography.exceptions import InvalidTag
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

MAX_TEXT_BYTES = 100_000
MAX_TOKEN_LENGTH = 140_000
MAGIC = b"CSE2"
AAD = b"Cyber Security Encryptie versie 2"


class InputError(ValueError):
    """Een fout die de interface veilig aan de gebruiker kan tonen."""


def generate_key() -> str:
    """Een echte AES-256-sleutel; Base64 is alleen de verpakking voor opslag."""
    return base64.urlsafe_b64encode(AESGCM.generate_key(bit_length=256)).decode("ascii")


def _key(value: str) -> bytes:
    if not isinstance(value, str) or not value.strip():
        raise InputError("Open het bijbehorende sleutelbestand om deze tekst te ontsleutelen.")
    if len(value) > 100:
        raise InputError("Dit is geen geldige AES-256-sleutel.")
    try:
        raw = base64.b64decode(value.strip().encode("ascii"), altchars=b"-_", validate=True)
    except (UnicodeError, binascii.Error, ValueError) as exc:
        raise InputError("Dit is geen geldig sleutelbestand.") from exc
    if len(raw) != 32:
        raise InputError("De AES-256-sleutel moet precies 32 bytes bevatten.")
    return raw


def encrypt_text(text: str, key: str) -> str:
    if not isinstance(text, str) or not text.strip():
        raise InputError("Voer eerst tekst in om te versleutelen.")
    raw = text.encode("utf-8")
    if len(raw) > MAX_TEXT_BYTES:
        raise InputError("De tekst mag maximaal 100.000 UTF-8 bytes bevatten.")
    nonce = secrets.token_bytes(12)
    ciphertext = AESGCM(_key(key)).encrypt(nonce, raw, AAD + MAGIC)
    return base64.urlsafe_b64encode(MAGIC + nonce + ciphertext).decode("ascii")


def decrypt_text(token: str, key: str) -> str:
    if not isinstance(token, str) or not token.strip():
        raise InputError("Plak eerst de versleutelde tekst.")
    if len(token) > MAX_TOKEN_LENGTH:
        raise InputError("De versleutelde tekst is te groot.")
    token = token.strip()
    try:
        packed = base64.b64decode(token.encode("ascii"), altchars=b"-_", validate=True)
    except (UnicodeError, binascii.Error, ValueError) as exc:
        raise InputError("Dit is geen geldige versleutelde tekst van deze app.") from exc
    if packed[:4] == b"CSE1":
        raise InputError("Dit is een oud wachtwoordbestand. Deze versie gebruikt losse sleutelbestanden.")
    if len(packed) < 33 or packed[:4] != MAGIC:
        raise InputError("Het formaat of de versie van de versleutelde tekst klopt niet.")
    if len(packed) > 32 + MAX_TEXT_BYTES:
        raise InputError("De versleutelde tekst is te groot.")
    nonce, ciphertext = packed[4:16], packed[16:]
    try:
        raw = AESGCM(_key(key)).decrypt(nonce, ciphertext, AAD + MAGIC)
        return raw.decode("utf-8")
    except (InvalidTag, UnicodeDecodeError) as exc:
        raise InputError("Ontsleutelen mislukt: de sleutel hoort niet bij deze tekst of de gegevens zijn gewijzigd.") from exc


def generate_password(length: int = 24, *, lowercase: bool = True,
                      uppercase: bool = True, digits: bool = True,
                      special: bool = True) -> str:
    if type(length) is not int or not 16 <= length <= 128:
        raise InputError("Kies een wachtwoordlengte tussen 16 en 128.")
    choices = ((lowercase, string.ascii_lowercase), (uppercase, string.ascii_uppercase),
               (digits, string.digits), (special, "!@#$%&*+-=?_"))
    if any(type(enabled) is not bool for enabled, _ in choices):
        raise InputError("Gebruik aan of uit voor iedere tekensoort.")
    groups = tuple(characters for enabled, characters in choices if enabled)
    if not groups:
        raise InputError("Kies minimaal één tekensoort voor je wachtwoord.")
    alphabet = "".join(groups)
    # Rejection sampling: alleen kandidaten met alle gekozen tekensoorten accepteren.
    while True:
        result = "".join(secrets.choice(alphabet) for _ in range(length))
        if all(any(c in group for c in result) for group in groups):
            return result


def generate_username(level: str = 'simple', idea: str = '') -> str:
    """Maak een naamvoorstel; niveaus bepalen de stijl, niet accountbeveiliging."""
    if level not in ('simple', 'medium', 'hard'):
        raise InputError('Kies Simpel, Matig of Moeilijk voor je gebruikersnaam.')
    if not isinstance(idea, str):
        raise InputError('Vul een naam of idee in als tekst.')
    idea = idea.strip()
    if idea and not re.fullmatch(r'[A-Za-z0-9][A-Za-z0-9_-]{0,23}', idea):
        raise InputError('Gebruik maximaal 24 letters (a-z), cijfers, - of _. Begin met een letter of cijfer.')
    nouns = ('Otter', 'Panda', 'Vos', 'Valk', 'Tijger', 'Koala', 'Lynx', 'Dolfijn',
             'Uil', 'Wolf', 'Orka', 'Egel', 'Leeuw', 'Arend', 'Maan', 'Ster')
    adjectives = ('Snelle', 'Stille', 'Vrolijke', 'Blauwe', 'Groene', 'Slimme', 'Heldere', 'Frisse',
                  'Dappere', 'Rustige', 'Lichte', 'Vlotte', 'Sterke', 'Vrije', 'Zonnige', 'Mooie')
    base = idea or (secrets.choice(nouns) if level == 'simple' else secrets.choice(adjectives) + secrets.choice(nouns))
    if level == 'simple':
        return base + ''.join(secrets.choice(string.digits) for _ in range(2))
    if level == 'medium':
        return base + '_' + ''.join(secrets.choice(string.digits) for _ in range(4))
    return base + '_' + secrets.token_hex(5)
