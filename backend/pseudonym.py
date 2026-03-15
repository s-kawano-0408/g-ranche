import hashlib


def generate_hash(certificate_number: str, birth_date: str) -> str:
    raw = f"{certificate_number}:{birth_date}"
    return hashlib.sha256(raw.encode()).hexdigest()[:16]