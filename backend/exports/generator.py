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
    Converts job + task records into a pandas DataFrame ready for export.
    Matches the spec:
      Keyword | Company | Domain | Country | Language | Device |
      Rank | Ranking URL | Page Title | Status | Search Date
    """
    data = []
    for task in tasks:
        rank_display = task.rank if task.rank is not None else "Not Found"
        status_display = STATUS_DISPLAY.get(task.status, task.status.replace("_", " ").title())

        data.append(
            {
                "Keyword": task.keyword,
                "Company": job.company_name,
                "Domain": job.domain,
                "Country": task.country,
                "Language": task.language,
                "Device": task.device.title(),
                "Rank": rank_display,
                "Ranking URL": task.ranking_url or "",
                "Page Title": task.page_title or "",
                "Status": status_display,
                "Search Date": job.created_at.strftime("%Y-%m-%d"),
            }
        )

    return pd.DataFrame(data)


def generate_csv(job: Job, tasks: List[KeywordTask], filepath: str) -> None:
    """Export results to a UTF-8 CSV file."""
    df = generate_export_dataframe(job, tasks)
    df.to_csv(filepath, index=False, encoding="utf-8-sig")  # utf-8-sig for Excel compatibility


def generate_excel(job: Job, tasks: List[KeywordTask], filepath: str) -> None:
    """Export results to an Excel (.xlsx) file with basic column width formatting."""
    df = generate_export_dataframe(job, tasks)

    with pd.ExcelWriter(filepath, engine="openpyxl") as writer:
        df.to_excel(writer, index=False, sheet_name="Rankings")

        # Auto-fit column widths
        worksheet = writer.sheets["Rankings"]
        for col in worksheet.columns:
            max_len = max(len(str(cell.value or "")) for cell in col)
            worksheet.column_dimensions[col[0].column_letter].width = min(max_len + 4, 60)
