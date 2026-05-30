from __future__ import annotations

import argparse
import os
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_ZIP_NAME = "tabletop-arena-upload.zip"

INCLUDE_DIRS = {
    "apps",
    "docs",
    "packages",
    "resources",
    "scripts",
}

INCLUDE_ROOT_FILES = {
    ".dockerignore",
    ".env.example",
    ".gitignore",
    "Caddyfile",
    "docker-compose.yml",
    "package.json",
    "pnpm-lock.yaml",
    "pnpm-workspace.yaml",
    "README.md",
    "tsconfig.base.json",
}

EXCLUDED_DIR_NAMES = {
    ".conda",
    ".git",
    ".next",
    ".pgdata",
    ".pytest_cache",
    ".turbo",
    ".tmp",
    ".vitest",
    "__pycache__",
    "build",
    "coverage",
    "dist",
    "node_modules",
}

EXCLUDED_FILE_NAMES = {
    ".env",
    ".env.local",
    ".env.development.local",
    ".env.production.local",
    "postgres.log",
    "server.dev.err.log",
    "server.dev.log",
    "web.dev.err.log",
    "web.dev.log",
}

EXCLUDED_SUFFIXES = {
    ".log",
    ".pyc",
    ".tmp",
    ".zip",
}


def is_inside_included_area(path: Path) -> bool:
    relative = path.relative_to(ROOT)
    if len(relative.parts) == 1:
        return relative.name in INCLUDE_ROOT_FILES
    return relative.parts[0] in INCLUDE_DIRS


def should_skip(path: Path, output_zip: Path, temp_zip: Path) -> bool:
    relative = path.relative_to(ROOT)

    if path == output_zip or path == temp_zip:
        return True

    if any(part in EXCLUDED_DIR_NAMES for part in relative.parts):
        return True

    if path.name in EXCLUDED_FILE_NAMES:
        return True

    if path.name.startswith(".env") and path.name != ".env.example":
        return True

    if path.suffix.lower() in EXCLUDED_SUFFIXES:
        return True

    return not is_inside_included_area(path)


def iter_files(output_zip: Path, temp_zip: Path) -> list[Path]:
    files: list[Path] = []
    for path in ROOT.rglob("*"):
        if not path.is_file():
            continue
        if should_skip(path, output_zip, temp_zip):
            continue
        files.append(path)
    return sorted(files, key=lambda item: item.relative_to(ROOT).as_posix().lower())


def create_zip(output_name: str) -> Path:
    output_zip = ROOT / output_name
    temp_zip = ROOT / f"{output_name}.tmp"
    files = iter_files(output_zip, temp_zip)

    if temp_zip.exists():
        temp_zip.unlink()

    with zipfile.ZipFile(temp_zip, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
        for path in files:
            archive.write(path, path.relative_to(ROOT).as_posix())

    os.replace(temp_zip, output_zip)
    size_mb = output_zip.stat().st_size / (1024 * 1024)
    print(f"Created {output_zip.name}")
    print(f"Files included: {len(files)}")
    print(f"Size: {size_mb:.2f} MB")
    print("Excluded secrets/runtime folders: .env, node_modules, .conda, .pgdata, logs, build caches")
    return output_zip


def main() -> None:
    parser = argparse.ArgumentParser(description="Create a clean upload zip for the tabletop-arena project.")
    parser.add_argument(
        "--output",
        default=DEFAULT_ZIP_NAME,
        help=f"Zip filename to create in the project root. Default: {DEFAULT_ZIP_NAME}",
    )
    args = parser.parse_args()

    if Path(args.output).name != args.output:
        raise SystemExit("--output must be a filename, not a path.")

    create_zip(args.output)


if __name__ == "__main__":
    main()
