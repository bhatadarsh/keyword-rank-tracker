import pandas as pd
from typing import List
from models import KeywordTask, Job


STATUS_DISPLAY = {
    "found": "Found",
    "not_found": "Not Found",
    "api_error": "API Error",
    "rate_limited": "Rate Limited",
    "timeout": "Timeout",
    "invalid": "Invalid Keyword",
    "pending": "Pending",
}


def generate_export_dataframe(job: Job, tasks: List[KeywordTask]) -> pd.DataFrame:
    """
    Converts job + task records into an institutional-grade pandas DataFrame ready for export.
    Includes rich SEO intelligence: rank deltas, cannibalization warnings, and secondary URLs.
    """
    data = []
    for task in tasks:
        rank_display = task.rank if task.rank is not None else "Not Found"
        prev_display = task.previous_rank if task.previous_rank is not None else "—"

        delta_display = "—"
        if task.rank_delta is not None:
            if task.rank_delta > 0:
                delta_display = f"+{task.rank_delta}"
            elif task.rank_delta < 0:
                delta_display = str(task.rank_delta)
            else:
                delta_display = "0"
        elif task.rank is not None and task.previous_rank is None:
            delta_display = "NEW"

        cannibalization = "⚠️ Yes (2+ URLs)" if (task.matching_urls_count and task.matching_urls_count >= 2) else "No"
        status_display = STATUS_DISPLAY.get(task.status, task.status.replace("_", " ").title())

        data.append(
            {
                "Keyword": task.keyword,
                "Company": job.company_name,
                "Domain": job.domain,
                "Engine": (job.provider or "mock").title(),
                "Country": task.country,
                "Language": task.language,
                "Device": task.device.title(),
                "Rank": rank_display,
                "Previous Rank": prev_display,
                "Delta": delta_display,
                "Ranking URL": task.ranking_url or "",
                "Cannibalization": cannibalization,
                "Secondary URL": task.secondary_ranking_url or "",
                "Page Title": task.page_title or "",
                "Status": status_display,
                "Search Date": job.created_at.strftime("%Y-%m-%d"),
            }
        )

    return pd.DataFrame(data)


def generate_csv(job: Job, tasks: List[KeywordTask], filepath: str) -> None:
    """Export results to a UTF-8 CSV file with BOM for Microsoft Excel compatibility."""
    df = generate_export_dataframe(job, tasks)
    df.to_csv(filepath, index=False, encoding="utf-8-sig")


def generate_excel(job: Job, tasks: List[KeywordTask], filepath: str) -> None:
    """Export results to an Excel (.xlsx) file with professional column widths."""
    df = generate_export_dataframe(job, tasks)

    with pd.ExcelWriter(filepath, engine="openpyxl") as writer:
        df.to_excel(writer, index=False, sheet_name="Rankings")

        worksheet = writer.sheets["Rankings"]
        for col in worksheet.columns:
            max_len = max(len(str(cell.value or "")) for cell in col)
            worksheet.column_dimensions[col[0].column_letter].width = min(max_len + 4, 65)
