import os
import csv

# Graceful fallback for matplotlib
try:
    import matplotlib
    matplotlib.use('Agg')  # Non-interactive backend
    import matplotlib.pyplot as plt
    from matplotlib.figure import Figure
    _HAS_MATPLOTLIB = True
except ImportError:
    class Figure:
        def __init__(self):
            self.axes = []
    _HAS_MATPLOTLIB = False


def _clean_numeric_string(val) -> str:
    """
    Cleans a numeric string by removing spaces, commas, and common currency symbols.
    Also handles NaN floats gracefully.
    """
    if val is None:
        return ""
    
    # Check for float NaN without needing pandas
    if isinstance(val, float):
        import math
        if math.isnan(val):
            return ""
            
    s = str(val).strip()
    cleaned = s.replace(",", "").replace(" ", "")
    for symbol in ["$", "€", "£"]:
        cleaned = cleaned.replace(symbol, "")
    return cleaned


def _parse_conversion(c_val, status_val: str) -> int:
    """
    Parses the conversion column. Handles boolean-like strings ('yes', 'true', 'no', 'false', etc.)
    and floats. If parsing fails, falls back to the status value.
    """
    if c_val is None:
        return 1 if status_val in ['closed', 'converted'] else 0
        
    if isinstance(c_val, float):
        import math
        if math.isnan(c_val):
            return 1 if status_val in ['closed', 'converted'] else 0
            
    s = str(c_val).strip().lower()
    if s == '':
        return 1 if status_val in ['closed', 'converted'] else 0
        
    if s in ['yes', 'true', 'y', '1', '1.0']:
        return 1
    elif s in ['no', 'false', 'n', '0', '0.0']:
        return 0
        
    try:
        return int(float(s))
    except (ValueError, TypeError):
        return 1 if status_val in ['closed', 'converted'] else 0


def _load_rows(file_path: str) -> list[dict]:
    """
    Loads rows from a CSV or XLSX file. Performs file checks,
    detects binary corruption, standardizes headers to lower-case,
    and returns a list of dictionaries.
    """
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"File not found: {file_path}")

    # Check for binary garbage if it's supposed to be CSV
    if file_path.endswith('.csv'):
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                # Read a snippet to check for binary garbage
                snippet = f.read(1024)
                if '\0' in snippet:
                    raise ValueError("Corrupt file format (binary garbage detected).")
        except UnicodeDecodeError:
            raise ValueError("Corrupt file format (encoding issue).")

    rows = []
    # Read XLSX or CSV
    if file_path.endswith('.xlsx'):
        try:
            import pandas as pd
            df = pd.read_excel(file_path)
            # Standardize columns to lower case for schema divergence handling
            df.columns = [c.strip().lower() for c in df.columns]
            for _, r in df.iterrows():
                rows.append(dict(r))
        except ImportError:
            # Fallback to reading it as a CSV text file (which is what generate_mock_data.py creates as placeholder)
            try:
                with open(file_path, mode='r', encoding='utf-8') as f:
                    # check if it looks like a text CSV file
                    first_line = f.readline()
                    if ',' in first_line and '\0' not in first_line:
                        f.seek(0)
                        reader = csv.DictReader(f)
                        if reader.fieldnames is not None:
                            for row in reader:
                                standard_row = {}
                                for k, v in row.items():
                                    if k:
                                        standard_row[k.strip().lower()] = v
                                rows.append(standard_row)
                    else:
                        raise ValueError("Failed to parse XLSX: pandas/openpyxl not available and file is not text-based.")
            except Exception as e:
                raise ValueError(f"Failed to parse XLSX: pandas not available. {e}")
        except Exception as e:
            # Fallback or propagate
            raise ValueError(f"Failed to parse XLSX: {e}")
    else:
        # CSV
        try:
            with open(file_path, mode='r', encoding='utf-8') as f:
                reader = csv.DictReader(f)
                if reader.fieldnames is None:
                    return []
                # Standardize fieldnames
                for row in reader:
                    standard_row = {}
                    for k, v in row.items():
                        if k:
                            standard_row[k.strip().lower()] = v
                    rows.append(standard_row)
        except Exception as e:
            raise ValueError(f"Failed to parse CSV: {e}")
            
    return rows


def calculate_kpis(file_path: str) -> dict:
    """
    Loads sales spreadsheets (CSV/XLSX) and calculates KPIs:
    - revenue: sum of (tonnage * unit_price) for converted deals
    - tonnage: sum of tonnage for converted deals
    - avg_price: revenue / tonnage (for converted deals)
    - conversion_rate: (converted deals / total inquiries) * 100.0
    
    Returns:
        dict: {"revenue": float, "tonnage": float, "avg_price": float, "conversion_rate": float}
        All values are rounded to 2 decimal places.
    """
    rows = _load_rows(file_path)

    total_inquiries = 0
    converted_deals = 0
    total_revenue = 0.0
    total_tonnage = 0.0

    for row in rows:
        # Check if row is empty/only contains None or empty strings
        if not any(row.values()):
            continue
        
        # We need conversion, tonnage, unit price
        tonnage_key = 'tonnage'
        price_key = 'unit price'
        conv_key = 'conversion'
        status_key = 'status'

        # Check if keys exist
        if tonnage_key not in row or price_key not in row:
            continue

        try:
            # Parse values
            t_val = row[tonnage_key]
            p_val = row[price_key]
            c_val = row.get(conv_key, 0)
            status_val = str(row.get(status_key, '')).strip().lower()

            if t_val is None or p_val is None or t_val == '' or p_val == '':
                continue  # Skip missing crucial fields

            cleaned_t = _clean_numeric_string(t_val)
            cleaned_p = _clean_numeric_string(p_val)
            tonnage = float(cleaned_t)
            unit_price = float(cleaned_p)
            
            conversion = _parse_conversion(c_val, status_val)

            # Boundary/Corner check: Negative values
            if tonnage < 0 or unit_price < 0:
                # filter out/skip negative values
                continue

            total_inquiries += 1
            if conversion == 1 or status_val in ['closed', 'converted']:
                converted_deals += 1
                total_revenue += tonnage * unit_price
                total_tonnage += tonnage

        except (ValueError, TypeError):
            # Skip malformed row
            continue

    # Final calculations
    avg_price = total_revenue / total_tonnage if total_tonnage > 0 else 0.0
    conversion_rate = (converted_deals / total_inquiries * 100.0) if total_inquiries > 0 else 0.0

    return {
        "revenue": round(total_revenue, 2),
        "tonnage": round(total_tonnage, 2),
        "avg_price": round(avg_price, 2),
        "conversion_rate": round(conversion_rate, 2)
    }


def generate_charts(file_path: str) -> list[Figure]:
    """
    Generates a list of matplotlib Figure objects representing sales data.
    If matplotlib is available, parses file_path and creates real plots for
    tonnage and revenue grouped by rebar grade.
    """
    rows = _load_rows(file_path)
    
    # Process/aggregate data by rebar grade
    grade_data = {} # rebar_grade -> {'tonnage': 0.0, 'revenue': 0.0}
    
    for row in rows:
        if not any(row.values()):
            continue
        
        tonnage_key = 'tonnage'
        price_key = 'unit price'
        conv_key = 'conversion'
        status_key = 'status'
        grade_key = 'rebar grade'

        if tonnage_key not in row or price_key not in row or grade_key not in row:
            continue

        try:
            t_val = row[tonnage_key]
            p_val = row[price_key]
            c_val = row.get(conv_key, 0)
            status_val = str(row.get(status_key, '')).strip().lower()
            grade_val = str(row[grade_key]).strip()

            if not grade_val or t_val is None or p_val is None or t_val == '' or p_val == '':
                continue

            cleaned_t = _clean_numeric_string(t_val)
            cleaned_p = _clean_numeric_string(p_val)
            tonnage = float(cleaned_t)
            unit_price = float(cleaned_p)
            
            conversion = _parse_conversion(c_val, status_val)

            # Boundary/Corner check: Negative values
            if tonnage < 0 or unit_price < 0:
                continue

            if conversion == 1 or status_val in ['closed', 'converted']:
                if grade_val not in grade_data:
                    grade_data[grade_val] = {'tonnage': 0.0, 'revenue': 0.0}
                grade_data[grade_val]['tonnage'] += tonnage
                grade_data[grade_val]['revenue'] += tonnage * unit_price

        except (ValueError, TypeError):
            continue

    if _HAS_MATPLOTLIB:
        fig1 = plt.figure(figsize=(8, 5))
        ax1 = fig1.add_subplot(111)
        
        fig2 = plt.figure(figsize=(8, 5))
        ax2 = fig2.add_subplot(111)
        
        if grade_data:
            grades = list(grade_data.keys())
            tonnages = [grade_data[g]['tonnage'] for g in grades]
            revenues = [grade_data[g]['revenue'] for g in grades]
            
            # Plot 1: Tonnage by Grade
            ax1.bar(grades, tonnages, color='skyblue', edgecolor='black')
            ax1.set_title('Total Tonnage by Rebar Grade')
            ax1.set_xlabel('Rebar Grade')
            ax1.set_ylabel('Tonnage (Tons)')
            ax1.tick_params(axis='x', rotation=30)
            fig1.tight_layout()
            
            # Plot 2: Revenue by Grade
            ax2.bar(grades, revenues, color='salmon', edgecolor='black')
            ax2.set_title('Total Revenue by Rebar Grade')
            ax2.set_xlabel('Rebar Grade')
            ax2.set_ylabel('Revenue ($)')
            ax2.tick_params(axis='x', rotation=30)
            fig2.tight_layout()
        else:
            # Handle empty data
            ax1.text(0.5, 0.5, 'No converted sales data available', ha='center', va='center')
            ax1.set_title('Total Tonnage by Rebar Grade')
            ax2.text(0.5, 0.5, 'No converted sales data available', ha='center', va='center')
            ax2.set_title('Total Revenue by Rebar Grade')
            
        return [fig1, fig2]
    else:
        return [Figure()]
