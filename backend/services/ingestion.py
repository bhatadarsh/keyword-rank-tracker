"""Bounded, format-aware parsing shared by upload preview and job creation."""
import csv
import io
import zipfile
from pathlib import Path

from fastapi import HTTPException, UploadFile
from openpyxl import load_workbook
from starlette.concurrency import run_in_threadpool

from providers.serpapi_provider import COUNTRY_MAP, LANGUAGE_MAP

MAX_UPLOAD_BYTES = 5 * 1024 * 1024
MAX_ROWS = 2000
MAX_KEYWORD_LENGTH = 500
MAX_COLUMNS = 20
MAX_WORKBOOK_BYTES = 50 * 1024 * 1024


def validate_settings(country, language, device):
    country, language, device = country.strip(), language.strip(), device.strip().lower()
    if country.lower() not in COUNTRY_MAP:
        raise ValueError("Choose a supported country.")
    if language.lower() not in LANGUAGE_MAP:
        raise ValueError("Choose a supported language.")
    if device not in {"desktop", "mobile"}:
        raise ValueError("Device must be desktop or mobile.")
    return country, language, device


def parse_keywords(contents, filename, country, language, device):
    """Parse strings without CSV type/NA inference; reject invalid rows atomically."""
    defaults = validate_settings(country, language, device)
    suffix = Path(filename).suffix.lower()
    workbook = None
    try:
        if suffix == ".csv":
            try:
                decoded = contents.decode("utf-8-sig")
            except UnicodeDecodeError as exc:
                raise ValueError("Save the CSV as UTF-8, or upload an .xlsx workbook.") from exc
            rows = csv.reader(io.StringIO(decoded, newline=""), strict=True)
        elif suffix == ".xlsx":
            with zipfile.ZipFile(io.BytesIO(contents)) as archive:
                if sum(item.file_size for item in archive.infolist()) > MAX_WORKBOOK_BYTES:
                    raise ValueError("Workbook expands beyond the 50 MB limit. Export a smaller CSV.")
            workbook = load_workbook(io.BytesIO(contents), read_only=True, data_only=False)
            sheet = workbook.active
            if sheet.max_row and sheet.max_row > MAX_ROWS + 1:
                raise ValueError(f"Limit: {MAX_ROWS} data rows per upload.")
            if sheet.max_column and sheet.max_column > MAX_COLUMNS:
                raise ValueError(f"Limit: {MAX_COLUMNS} columns per upload.")
            rows = sheet.iter_rows(values_only=True)
        elif suffix == ".xls":
            raise ValueError("Legacy .xls files are not supported. Save as .xlsx or .csv and try again.")
        else:
            raise ValueError("Upload a .csv or .xlsx file.")
        header_row = next(rows, None)
        if header_row is None:
            raise ValueError("The file is empty. Include a keyword column and at least one keyword.")
        columns = [str(value or "").strip().lower().lstrip("\ufeff") for value in header_row]
        if len(columns) > MAX_COLUMNS or len(columns) != len(set(columns)):
            raise ValueError("Use at most 20 uniquely named columns.")
        if "keyword" not in columns:
            raise ValueError("File must contain a keyword column.")
        tasks, seen = [], set()
        blank_rows = duplicates = 0
        for row_number, values in enumerate(rows, start=2):
            if row_number > MAX_ROWS + 1:
                raise ValueError(f"Limit: {MAX_ROWS} data rows per upload.")
            if len(values) > len(columns):
                raise ValueError(f"Row {row_number}: more fields than headers. Quote commas inside keywords.")
            row = dict(zip(columns, values))
            keyword = str(row.get("keyword") if row.get("keyword") is not None else "").strip()
            if not keyword:
                blank_rows += 1
                continue
            if len(keyword) > MAX_KEYWORD_LENGTH or "\x00" in keyword:
                raise ValueError(f"Row {row_number}: keyword must be at most {MAX_KEYWORD_LENGTH} characters with no null bytes.")
            if suffix == ".xlsx" and keyword.startswith("="):
                raise ValueError(f"Row {row_number}: replace spreadsheet formulas with keyword text values.")
            overrides = [str(row.get(key) or "").strip() or default
                         for key, default in zip(("country", "language", "device"), defaults)]
            try:
                row_country, row_language, row_device = validate_settings(*overrides)
            except ValueError as exc:
                raise ValueError(f"Row {row_number}: {exc}") from exc
            identity = (keyword.casefold(), row_country.casefold(), row_language.casefold(), row_device)
            if identity in seen:
                duplicates += 1
                continue
            seen.add(identity)
            tasks.append(dict(keyword=keyword, country=row_country, language=row_language, device=row_device))
        if not tasks:
            raise ValueError("No valid keywords found. Add at least one non-empty keyword.")
        return dict(tasks=tasks, columns=columns, row_count=len(tasks), blank_rows=blank_rows,
                    duplicates=duplicates, sample_rows=[task["keyword"] for task in tasks[:4]])
    finally:
        if workbook:
            workbook.close()


async def read_keyword_upload(file: UploadFile, country: str, language: str, device: str):
    try:
        contents = await file.read(MAX_UPLOAD_BYTES + 1)
        if len(contents) > MAX_UPLOAD_BYTES:
            raise HTTPException(413, "File exceeds the 5 MB upload limit.")
        try:
            return await run_in_threadpool(parse_keywords, contents, file.filename or "", country, language, device)
        except (ValueError, csv.Error) as exc:
            raise HTTPException(422, str(exc)) from exc
        except Exception as exc:
            raise HTTPException(422, "Could not read this file. Upload a valid UTF-8 CSV or .xlsx workbook.") from exc
    finally:
        await file.close()
