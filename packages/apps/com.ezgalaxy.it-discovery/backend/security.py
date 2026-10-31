"""Pseudo validation, PIN hashing and session tokens."""
import hashlib
import hmac
import re
import secrets
import unicodedata

PSEUDO_RE = re.compile(r"^[A-Za-z0-9_-]{3,16}$")
PIN_RE = re.compile(r"^\d{4}$")

# Short list on purpose: the tutor can rename anything that slips through.
BANNED_WORDS = (
    "admin", "tuteur", "root", "moderateur", "connard", "salope", "pute",
    "encule", "nique", "merde", "batard", "nazi", "hitler", "fuck", "shit",
)

SCRYPT_N = 2 ** 14
SCRYPT_R = 8
SCRYPT_P = 1


def pseudo_key(pseudo: str) -> str:
    return unicodedata.normalize("NFKC", pseudo or "").strip().lower()


def validate_pseudo(pseudo: str):
    """Return an error message, or None when the pseudo is acceptable."""
    pseudo = (pseudo or "").strip()
    if not PSEUDO_RE.match(pseudo):
        return "Le pseudo doit faire 3 à 16 caractères : lettres, chiffres, _ ou -."
    key = pseudo_key(pseudo)
    if any(word in key for word in BANNED_WORDS):
        return "Ce pseudo n'est pas autorisé, choisis-en un autre."
    return None


def sanitize_legacy_pseudo(pseudo: str) -> str:
    """Turn any legacy pseudo into one that passes PSEUDO_RE."""
    cleaned = re.sub(r"[^A-Za-z0-9_-]", "_", unicodedata.normalize("NFKC", pseudo or "").strip())
    cleaned = cleaned[:16]
    if len(cleaned) < 3:
        cleaned = (cleaned + "___")[:3]
    return cleaned


def validate_pin(pin) -> bool:
    return isinstance(pin, str) and bool(PIN_RE.match(pin))


def hash_pin(pin: str, salt_hex: str = None):
    salt = bytes.fromhex(salt_hex) if salt_hex else secrets.token_bytes(16)
    digest = hashlib.scrypt(pin.encode(), salt=salt, n=SCRYPT_N, r=SCRYPT_R, p=SCRYPT_P, dklen=32)
    return digest.hex(), salt.hex()


def verify_pin(pin: str, hash_hex: str, salt_hex: str) -> bool:
    candidate, _ = hash_pin(pin, salt_hex)
    return hmac.compare_digest(candidate, hash_hex)


def verify_code(given: str, expected: str) -> bool:
    return hmac.compare_digest((given or "").encode(), (expected or "").encode())


def new_token():
    """Return (token sent to the client, hash stored in the database)."""
    token = secrets.token_urlsafe(32)
    return token, token_hash(token)


def token_hash(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def random_pin() -> str:
    return f"{secrets.randbelow(10000):04d}"
