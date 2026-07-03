import os
import csv
import unittest
import math
import src.bi_engine as bi

class TestBiEngineAdversarial(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.data_dir = os.path.join(os.path.dirname(__file__), "data")
        os.makedirs(cls.data_dir, exist_ok=True)

    def create_temp_csv(self, filename, rows):
        path = os.path.join(self.data_dir, filename)
        with open(path, "w", newline="", encoding="utf-8") as f:
            writer = csv.writer(f)
            writer.writerow(["Date", "Customer", "Rebar Grade", "Tonnage", "Unit Price", "Status", "Conversion"])
            for row in rows:
                writer.writerow(row)
        return path

    def safe_remove(self, path):
        if os.path.exists(path):
            try:
                os.remove(path)
            except OSError:
                pass

    # 1. Negative Values
    def test_negative_values(self):
        # We test tonnage < 0 and unit_price < 0
        # Rows:
        # Row 1: Negative tonnage (should be skipped)
        # Row 2: Negative price (should be skipped)
        # Row 3: Valid positive values
        rows = [
            ["2026-07-01", "C1", "A3", "-10.0", "500.0", "Closed", "1"],
            ["2026-07-02", "C2", "A4", "20.0", "-100.0", "Closed", "1"],
            ["2026-07-03", "C3", "A3", "10.0", "300.0", "Closed", "1"]
        ]
        csv_path = self.create_temp_csv("temp_neg.csv", rows)
        try:
            kpis = bi.calculate_kpis(csv_path)
            # Only the 3rd row should be processed
            self.assertEqual(kpis["tonnage"], 10.0)
            self.assertEqual(kpis["revenue"], 3000.0)
            self.assertEqual(kpis["avg_price"], 300.0)
            self.assertEqual(kpis["conversion_rate"], 100.0) # 1 inquiry total (others skipped)
        finally:
            self.safe_remove(csv_path)

    def test_negative_conversion_and_status(self):
        # Negative conversion or invalid conversion should fallback to status
        rows = [
            ["2026-07-01", "C1", "A3", "10.0", "500.0", "Closed", "-1"], # status closed, conv is -1 -> parsed conversion is -1, but status closed makes it count as converted
            ["2026-07-02", "C2", "A4", "20.0", "600.0", "Open", "-1"]     # status Open, conv is -1 -> not counted
        ]
        csv_path = self.create_temp_csv("temp_neg_conv.csv", rows)
        try:
            kpis = bi.calculate_kpis(csv_path)
            # Row 1 is converted because status is Closed. Row 2 is not converted.
            # Total inquiries: 2 (both rows have positive tonnage and price)
            self.assertEqual(kpis["tonnage"], 10.0) # Only Row 1 tonnage
            self.assertEqual(kpis["revenue"], 5000.0)
            self.assertEqual(kpis["conversion_rate"], 50.0)
        finally:
            self.safe_remove(csv_path)

    # 2. Extremely Large Values
    def test_extremely_large_values(self):
        # Extremely large values can cause overflow (inf) or floating point inaccuracies
        rows = [
            ["2026-07-01", "C1", "A3", "1e300", "1e300", "Closed", "1"]
        ]
        csv_path = self.create_temp_csv("temp_large.csv", rows)
        try:
            kpis = bi.calculate_kpis(csv_path)
            # 1e300 * 1e300 overflows to inf
            self.assertTrue(math.isinf(kpis["revenue"]))
            self.assertEqual(kpis["tonnage"], 1e300)
            # inf / 1e300 = inf. Let's see if python behaves. Yes, inf / 1e300 is inf.
            self.assertTrue(math.isinf(kpis["avg_price"]))
        finally:
            self.safe_remove(csv_path)

    # 3. String NaN and Inf values
    def test_nan_and_inf_strings(self):
        # Passing "nan" or "inf" as strings in numeric fields
        rows = [
            ["2026-07-01", "C1", "A3", "nan", "500.0", "Closed", "1"],
            ["2026-07-02", "C2", "A4", "inf", "600.0", "Closed", "1"],
            ["2026-07-03", "C3", "A3", "10.0", "300.0", "Closed", "1"]
        ]
        csv_path = self.create_temp_csv("temp_nan_inf.csv", rows)
        try:
            kpis = bi.calculate_kpis(csv_path)
            print("\n[DEBUG] KPIs with NaN/Inf strings:", kpis)
            # If "nan" is parsed as float, it is float('nan').
            # Since float('nan') < 0 is False, it passes the negative filter.
            # Then it gets added to total_tonnage, making it nan.
            # Same for "inf".
        finally:
            self.safe_remove(csv_path)

    # 4. Division by Zero
    def test_division_by_zero(self):
        # Case A: Zero inquiries
        rows_empty = []
        csv_path_empty = self.create_temp_csv("temp_div_zero_empty.csv", rows_empty)
        # Case B: Inquiries exist, but tonnage is 0.0
        rows_zero_tonnage = [
            ["2026-07-01", "C1", "A3", "0.0", "500.0", "Closed", "1"],
            ["2026-07-02", "C2", "A4", "0.0", "600.0", "Open", "0"]
        ]
        csv_path_zero = self.create_temp_csv("temp_div_zero_tonnage.csv", rows_zero_tonnage)
        
        try:
            kpis_empty = bi.calculate_kpis(csv_path_empty)
            self.assertEqual(kpis_empty["revenue"], 0.0)
            self.assertEqual(kpis_empty["tonnage"], 0.0)
            self.assertEqual(kpis_empty["avg_price"], 0.0)
            self.assertEqual(kpis_empty["conversion_rate"], 0.0)

            kpis_zero = bi.calculate_kpis(csv_path_zero)
            self.assertEqual(kpis_zero["tonnage"], 0.0)
            self.assertEqual(kpis_zero["avg_price"], 0.0)
            self.assertEqual(kpis_zero["conversion_rate"], 50.0)
        finally:
            self.safe_remove(csv_path_empty)
            self.safe_remove(csv_path_zero)

    # 5. Custom Formatting
    def test_custom_formatting(self):
        # Spaces, commas, symbols, different cases
        rows = [
            # Spaces inside numeric fields (e.g. tabs or internal spaces)
            ["2026-07-01", "C1", "A3", "1\t000", "500", "Closed", "1"], # Should fail float parsing and be skipped
            # Commas and common symbols: $, €, £
            ["2026-07-02", "C2", "A4", "1,500.00", "$600.00", "Closed", "1"], # Tonnage=1500, Price=600 -> processed
            ["2026-07-03", "C3", "A3", "2 000.00", "€700.00", "Closed", "1"], # Tonnage=2000, Price=700 -> processed
            # Unsupported symbol: ¥ (Yen)
            ["2026-07-04", "C4", "A4", "100.00", "¥800.00", "Closed", "1"], # Should fail and be skipped
            # European format with commas as decimal separators (e.g., 1,5 instead of 1.5)
            ["2026-07-05", "C5", "A3", "1,5", "400.00", "Closed", "1"], # Comma removed -> "15", becomes 15.0 tons!
        ]
        csv_path = self.create_temp_csv("temp_format.csv", rows)
        try:
            kpis = bi.calculate_kpis(csv_path)
            print("\n[DEBUG] KPIs with custom formatting:", kpis)
            # Row 2: 1500 * 600 = 900,000 revenue, 1500 tonnage
            # Row 3: 2000 * 700 = 1,400,000 revenue, 2000 tonnage
            # Row 5: 15 * 400 = 6,000 revenue, 15 tonnage (Due to European comma removal)
            # Expected Total Tonnage (if Row 5 counts as 15.0): 1500 + 2000 + 15 = 3515.0
            # Expected Total Revenue (if Row 5 counts as 15.0): 900000 + 1400000 + 6000 = 2306000.0
            self.assertEqual(kpis["tonnage"], 3515.0)
            self.assertEqual(kpis["revenue"], 2306000.0)
        finally:
            self.safe_remove(csv_path)

    # 6. Malformed Conversions
    def test_malformed_conversions(self):
        # Test non-boolean strings, floats, other cases in conversion
        rows = [
            ["2026-07-01", "C1", "A3", "10.0", "500.0", "Closed", "yes"],      # conv yes -> 1
            ["2026-07-02", "C2", "A4", "20.0", "600.0", "Closed", "true"],     # conv true -> 1
            ["2026-07-03", "C3", "A3", "30.0", "700.0", "Closed", "1.0"],      # conv 1.0 -> 1
            ["2026-07-04", "C4", "A4", "40.0", "800.0", "Closed", "no"],        # conv no -> 0, but status Closed -> counts as 1!
            ["2026-07-05", "C5", "A3", "50.0", "900.0", "Open", "0.0"],        # conv 0.0 -> 0, status Open -> 0
            ["2026-07-06", "C6", "A4", "60.0", "1000.0", "Open", "1.5"],       # conv 1.5 -> int(1.5) = 1, status Open -> 1
            ["2026-07-07", "C7", "A3", "70.0", "1100.0", "Open", "0.9"],       # conv 0.9 -> int(0.9) = 0, status Open -> 0
            ["2026-07-08", "C8", "A4", "80.0", "1200.0", "Open", "invalid"],    # conv invalid -> status Open -> 0
        ]
        csv_path = self.create_temp_csv("temp_conv.csv", rows)
        try:
            kpis = bi.calculate_kpis(csv_path)
            print("\n[DEBUG] KPIs with malformed conversions:", kpis)
        finally:
            self.safe_remove(csv_path)

if __name__ == "__main__":
    unittest.main()
