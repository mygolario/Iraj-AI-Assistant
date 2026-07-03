import os
import csv
import random
from datetime import datetime, timedelta

def ensure_dir(path: str):
    os.makedirs(os.path.dirname(path), exist_ok=True)

def generate_mock_sales_csv(file_path: str, num_rows: int = 50, seed: int = 42):
    random.seed(seed)
    customers = ["Tehran Steel Corp", "Isfahan Builders", "Alborz Construction", "Tabriz Metallurgy", "Shiraz Contractors"]
    grades = ["A3", "A4", "Grade 60", "B500B", "SD400", "HRB400"]
    statuses = ["Inquiry", "Negotiation", "Quotation", "Closed"]
    
    start_date = datetime(2026, 1, 1)
    ensure_dir(file_path)
    
    with open(file_path, mode='w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerow(["Date", "Customer", "Rebar Grade", "Tonnage", "Unit Price", "Status", "Conversion"])
        
        for _ in range(num_rows):
            date_val = (start_date + timedelta(days=random.randint(0, 180))).strftime("%Y-%m-%d")
            cust = random.choice(customers)
            grade = random.choice(grades)
            tonnage = round(random.uniform(10.0, 500.0), 2)
            unit_price = round(random.uniform(400.0, 750.0), 2)
            # Make sure Closed status maps to Conversion=1, others to 0
            status = random.choice(statuses)
            conversion = 1 if status == "Closed" else 0
            
            writer.writerow([date_val, cust, grade, tonnage, unit_price, status, conversion])
    print(f"Generated CSV mock sales: {file_path}")

def generate_mock_sales_xlsx(file_path: str, num_rows: int = 50, seed: int = 42):
    random.seed(seed)
    customers = ["Tehran Steel Corp", "Isfahan Builders", "Alborz Construction", "Tabriz Metallurgy", "Shiraz Contractors"]
    grades = ["A3", "A4", "Grade 60", "B500B", "SD400", "HRB400"]
    statuses = ["Inquiry", "Negotiation", "Quotation", "Closed"]
    start_date = datetime(2026, 1, 1)
    
    ensure_dir(file_path)
    
    data = []
    for _ in range(num_rows):
        date_val = (start_date + timedelta(days=random.randint(0, 180))).strftime("%Y-%m-%d")
        cust = random.choice(customers)
        grade = random.choice(grades)
        tonnage = round(random.uniform(10.0, 500.0), 2)
        unit_price = round(random.uniform(400.0, 750.0), 2)
        status = random.choice(statuses)
        conversion = 1 if status == "Closed" else 0
        data.append([date_val, cust, grade, tonnage, unit_price, status, conversion])
        
    try:
        import pandas as pd
        df = pd.DataFrame(data, columns=["Date", "Customer", "Rebar Grade", "Tonnage", "Unit Price", "Status", "Conversion"])
        df.to_excel(file_path, index=False)
        print(f"Generated XLSX mock sales: {file_path}")
    except ImportError:
        # If pandas is not available, we can't easily write a binary xlsx without it
        # But we'll try to write a simple HTML/XML spreadsheet or output a warning.
        # Typically openpyxl and pandas are installed in the workspace.
        print("pandas/openpyxl not available. Skipping XLSX generation or writing CSV as placeholder.")
        # Let's write CSV to xlsx path as a placeholder, but in a real test env pandas should be available.
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write("Date,Customer,Rebar Grade,Tonnage,Unit Price,Status,Conversion\n")
            for row in data:
                f.write(",".join(map(str, row)) + "\n")

def generate_mock_standards(output_dir: str):
    os.makedirs(output_dir, exist_ok=True)
    
    # Generate DIN standard txt
    din_path = os.path.join(output_dir, "DIN_488.txt")
    with open(din_path, 'w', encoding='utf-8') as f:
        f.write("DIN 488 Reinforcing Steels - Part 1.\n")
        f.write("Scope: Weldable reinforcing steel Grade B500B specifications.\n")
        f.write("Yield Strength: Grade B500B specifies yield point (Re) of at least 500 MPa.\n")
        f.write("Tensile/Yield Ratio: Rm / Re ratio must be at least 1.08.\n")
        f.write("Elongation: Total elongation at maximum force (Agt) >= 5.0%.\n")
    print(f"Generated DIN text standard: {din_path}")

    # Generate JIS standard txt
    jis_path = os.path.join(output_dir, "JIS_G3112.txt")
    with open(jis_path, 'w', encoding='utf-8') as f:
        f.write("JIS G3112 Japanese Industrial Standard.\n")
        f.write("Steel bars for concrete reinforcement.\n")
        f.write("Grade SD390 specifies yield points between 390 and 510 N/mm².\n")
        f.write("Minimum tensile strength is 560 N/mm².\n")
    print(f"Generated JIS text standard: {jis_path}")

    # Generate SAE standard txt
    sae_path = os.path.join(output_dir, "SAE_J403.txt")
    with open(sae_path, 'w', encoding='utf-8') as f:
        f.write("SAE J403 Chemical Compositions of Carbon Steels.\n")
        f.write("Scope: Standard Grade 1008.\n")
        f.write("Carbon: 0.10% max.\n")
        f.write("Manganese: 0.30% - 0.50%.\n")
        f.write("Phosphorus: 0.04% max.\n")
    print(f"Generated SAE text standard: {sae_path}")

    # Generate PDF standard (ASTM)
    pdf_path = os.path.join(output_dir, "ASTM_A615.pdf")
    try:
        from reportlab.lib.pagesizes import letter
        from reportlab.pdfgen import canvas
        
        c = canvas.Canvas(pdf_path, pagesize=letter)
        c.drawString(100, 750, "ASTM A615 Standard Specification")
        c.drawString(100, 730, "Scope: Concrete reinforcement steel Grade 60.")
        c.drawString(100, 710, "Yield Strength Requirement: 60,000 psi (420 MPa).")
        c.drawString(100, 690, "Tensile Strength Requirement: 90,000 psi (620 MPa).")
        c.save()
        print(f"Generated ASTM PDF (reportlab): {pdf_path}")
    except ImportError:
        # Fallback binary PDF writing
        with open(pdf_path, 'wb') as f:
            f.write(b"%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R >>\nendobj\n4 0 obj\n<< /Length 100 >>\nstream\nBT /F1 12 Tf 100 700 Td (ASTM A615 Grade 60 yield 60000 psi tensile 90000 psi) Tj ET\nendstream\nendobj\nxref\n0 5\n0000000000 65535 f\n0000000009 00000 n\n0000000058 00000 n\n0000000115 00000 n\n0000000220 00000 n\ntrailer\n<< /Size 5 /Root 1 0 R >>\nstartxref\n370\n%%EOF\n")
        print(f"Generated ASTM PDF (fallback): {pdf_path}")

def generate_mock_telegram_html(file_path: str, channel_name: str, messages: list[dict]):
    ensure_dir(file_path)
    
    html_content = f"""<!DOCTYPE html>
<html>
<head>
    <title>Telegram Web Preview - {channel_name}</title>
</head>
<body>
    <div class="tgme_channel_info">
        <div class="tgme_channel_info_header">
            <span class="tgme_channel_info_header_title">{channel_name} Price Feed</span>
        </div>
    </div>
"""
    for msg in messages:
        html_content += f"""
    <div class="tgme_widget_message_wrap">
        <div class="tgme_widget_message">
            <div class="tgme_widget_message_bubble">
                <a class="tgme_widget_message_owner_name" href="https://t.me/{channel_name}">{channel_name}</a>
                <div class="tgme_widget_message_text js-message_text" dir="auto">
                    {msg['text']}
                </div>
                <div class="tgme_widget_message_footer">
                    <time class="time" datetime="{msg['datetime']}">{msg['date_str']}</time>
                </div>
            </div>
        </div>
    </div>
"""
    html_content += """
</body>
</html>
"""
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(html_content)
    print(f"Generated Telegram HTML: {file_path}")

def main():
    data_dir = os.path.join(os.path.dirname(__file__), "data")
    os.makedirs(data_dir, exist_ok=True)
    
    # 1. Sales Spreadsheets
    generate_mock_sales_csv(os.path.join(data_dir, "mock_sales.csv"))
    generate_mock_sales_xlsx(os.path.join(data_dir, "mock_sales.xlsx"))
    
    # 2. Standards
    generate_mock_standards(data_dir)
    
    # 3. Telegram HTML Pages
    messages_chan1 = [
        {
            "text": "Price Update - 2026-07-03<br>Isfahan Steel Rebar A3 Size 12: 24,500 Tomans per kg.<br>Isfahan Steel Rebar A3 Size 14: 24,100 Tomans per kg.",
            "datetime": "2026-07-03T00:00:00+03:30",
            "date_str": "12:00 AM"
        },
        {
            "text": "Market analysis: Demand for JIS grade steel is growing in the regional market.",
            "datetime": "2026-07-02T18:00:00+03:30",
            "date_str": "6:00 PM"
        }
    ]
    messages_chan2 = [
        {
            "text": "Steel Price Alert: Grade 60 rebar exports offered at $550/t FOB.",
            "datetime": "2026-07-03T00:30:00+03:30",
            "date_str": "12:30 AM"
        },
        {
            "text": "Standard update: DIN 488 standards compliance checked at customs.",
            "datetime": "2026-07-02T15:00:00+03:30",
            "date_str": "3:00 PM"
        }
    ]
    
    generate_mock_telegram_html(os.path.join(data_dir, "telegram_feed_1.html"), "steel_prices_iran", messages_chan1)
    generate_mock_telegram_html(os.path.join(data_dir, "telegram_feed_2.html"), "steel_export_news", messages_chan2)

if __name__ == "__main__":
    main()
