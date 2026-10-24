"""Local pre-publication checks. Never prints a matched secret or sends files away."""
import re
import subprocess
import sys
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
DENIED_SUFFIXES={'.p12','.pfx','.pem','.key','.token','.log','.wgt','.zip','.heic','.mov'}
PATTERNS={
    'private key':re.compile(rb'-----BEGIN (?:RSA |EC |OPENSSH |ENCRYPTED )?PRIVATE KEY-----'),
    'access token':re.compile(rb'(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{40,}|sk-[A-Za-z0-9_-]{30,})'),
    'personal computer path':re.compile(rb'(?:/Users/|C:\\Users\\)[A-Za-z0-9_.-]+(?:/|\\)'),
    'private LAN address':re.compile(rb'\b(?:192\.168\.[0-9]{1,3}\.[0-9]{1,3}|10\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}|172\.(?:1[6-9]|2[0-9]|3[01])\.[0-9]{1,3}\.[0-9]{1,3})\b'),
    'hardware address':re.compile(rb'(?i)\b[0-9a-f]{2}(?::[0-9a-f]{2}){5}\b'),
    'credential in URL':re.compile(rb'https?://[^\s/<>"\x27]+:[^\s/<>"\x27]+@'),
}


def files():
    if (ROOT/'.git').is_dir():
        result=subprocess.run(['git','ls-files','-z'],cwd=ROOT,check=True,capture_output=True)
        return [ROOT/name.decode() for name in result.stdout.split(b'\0') if name]
    excluded={'.git','dist','local','__pycache__','.venv','node_modules'}
    return [p for p in ROOT.rglob('*') if p.is_file() and not any(part in excluded for part in p.relative_to(ROOT).parts) and not p.relative_to(ROOT).as_posix().startswith('app/assets/local/')]


def inspect(paths):
    problems=[]
    for path in paths:
        name=path.relative_to(ROOT).as_posix()
        if path.is_symlink() or path.suffix.lower() in DENIED_SUFFIXES or name.startswith(('local/','dist/','app/assets/local/')) or path.name.startswith('.env') or path.name in {'.env','profiles.xml','device-profile.xml','author-signature.xml','signature1.xml'}:
            problems.append((name,'private/build file'));continue
        data=path.read_bytes()
        for label,pattern in PATTERNS.items():
            if pattern.search(data):
                problems.append((name,label))
    return problems


if __name__=='__main__':
    paths=files();problems=inspect(paths)
    for name,label in problems:
        print(f'{name}: {label}; matching content withheld.',file=sys.stderr)
    if problems:
        raise SystemExit(1)
    print(f'Checked {len(paths)} publication files: no forbidden artifacts or configured secret patterns found. Review images and Git identity separately.')
