import os
import unittest
import csv
import math
from unittest.mock import patch, MagicMock

import src.bi_engine as bi
import src.rag_engine as rag
import src.live_scraper as scraper
import src.sales_consultant as consultant

class TestChallengerStress(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.data_dir = os.path.join(os.path.dirname(__file__), "data")
        os.makedirs(cls.data_dir, exist_ok=True)
        cls.din_txt_path = os.path.join(cls.data_dir, "DIN_488.txt")

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

    # ==========================================
    # 1. RAG ENGINE EDGE CASES & FALLBACKS
    # ==========================================
    def test_rag_empty_inputs(self):
        # Index document with empty or None paths
        self.assertFalse(rag.index_document(""))
        self.assertFalse(rag.index_document(None))
        
        # Query with empty or whitespace queries
        self.assertEqual(rag.query_standards(""), [])
        self.assertEqual(rag.query_standards("   "), [])
        self.assertEqual(rag.query_standards(None), [])

    def test_rag_missing_api_key_fallback(self):
        # Backup key
        orig_key = os.environ.get("OPENROUTER_API_KEY")
        if "OPENROUTER_API_KEY" in os.environ:
            del os.environ["OPENROUTER_API_KEY"]
        
        try:
            # Embedding must return None
            self.assertIsNone(rag.get_embedding("hello"))
            
            # Index DIN 488 under no-key environment
            rag._DOCUMENT_INDEX.clear()
            rag._INDEXED_FILES.clear()
            success = rag.index_document(self.din_txt_path)
            self.assertTrue(success)
            
            # Since no key is present, all entries in _DOCUMENT_INDEX should have embedding = None
            for item in rag._DOCUMENT_INDEX:
                self.assertIsNone(item["embedding"])
                
            # Perform query "yield point". It should fall back to keyword overlap
            # DIN 488 contains "yield point" or "yield strength".
            results = rag.query_standards("yield point")
            self.assertTrue(len(results) > 0)
            
            # Verify the synonym matching worked
            # "yield point" synonyms: ["yield strength", "re", "r_e", "minimum yield"]
            # Let's verify that the match score is computed and matches exist
            matched_texts = [r["text"].lower() for r in results]
            found = any("yield" in text for text in matched_texts)
            self.assertTrue(found)
        finally:
            if orig_key is not None:
                os.environ["OPENROUTER_API_KEY"] = orig_key

    # ==========================================
    # 2. SALES CONSULTANT EDGE CASES & FALLBACKS
    # ==========================================
    def test_sales_consultant_missing_api_key_fallback(self):
        # Backup key
        orig_key = os.environ.get("OPENROUTER_API_KEY")
        if "OPENROUTER_API_KEY" in os.environ:
            del os.environ["OPENROUTER_API_KEY"]
            
        try:
            # 1. Contract draft fallback
            draft = consultant.generate_contract_draft("Buyer Corp", "Seller Inc", "A3", 100.0, 600.0)
            self.assertIn("Steel Rebar Sales Agreement", draft)
            self.assertIn("Buyer Corp", draft)
            self.assertIn("Seller Inc", draft)
            self.assertIn("60000.0 USD", draft) # 100 * 600
            
            # 2. Sales roadmap fallback
            roadmap = consultant.generate_sales_roadmap("Iraj Steel", "GCC Region")
            self.assertIn("Sales Roadmap for Iraj Steel", roadmap)
            self.assertIn("Target Market: GCC Region", roadmap)
            self.assertIn("Identify local distributors", roadmap)
            
            # 3. Chat consultant fallback
            chat_res = consultant.consult_sales([{"role": "user", "content": "hello"}], "system prompt")
            self.assertIsNone(chat_res)
        finally:
            if orig_key is not None:
                os.environ["OPENROUTER_API_KEY"] = orig_key

    # ==========================================
    # 3. SCRAPER EDGE CASES & NORMALIZATION
    # ==========================================
    def test_scraper_url_normalization(self):
        # Mock urlopen to avoid actual requests
        with patch('urllib.request.urlopen') as mock_open:
            mock_resp = MagicMock()
            mock_resp.read.return_value = b"<html><body>No content here</body></html>"
            mock_open.return_value.__enter__.return_value = mock_resp
            
            # Test direct channel URL (with https scheme)
            results = scraper.scrape_channels(["https://t.me/test_channel"])
            # Check if urlopen was called with the normalized version
            called_arg = mock_open.call_args[0][0]
            # It should have Mozilla User-Agent headers, so it is a Request object
            self.assertIn("/s/test_channel", called_arg.full_url)
            
            # Test HTTP channel URL
            results = scraper.scrape_channels(["http://t.me/test_channel_2"])
            called_arg_2 = mock_open.call_args[0][0]
            self.assertIn("/s/test_channel_2", called_arg_2.full_url)

    def test_scraper_invalid_urls(self):
        # Scraper should gracefully handle non-telegram or completely invalid URLs without raising exceptions
        results = scraper.scrape_channels(["https://google.com/invalid_page", "not_a_url"])
        self.assertEqual(results, [])

    # ==========================================
    # 4. BUSINESS INTELLIGENCE EDGE CASES
    # ==========================================
    def test_bi_engine_corrupt_files(self):
        # 1. Non-existent file
        with self.assertRaises(FileNotFoundError):
            bi.calculate_kpis("non_existent_file.csv")
            
        # 2. Corrupt file with binary garbage
        corrupt_path = os.path.join(self.data_dir, "temp_corrupt.csv")
        with open(corrupt_path, "wb") as f:
            f.write(b"\x00\x1f\xff\x00\x00junk\x00")
        try:
            with self.assertRaises(ValueError):
                bi.calculate_kpis(corrupt_path)
        finally:
            self.safe_remove(corrupt_path)

    def test_bi_engine_empty_file_and_missing_keys(self):
        # Empty csv
        empty_path = self.create_temp_csv("temp_empty.csv", [])
        try:
            kpis = bi.calculate_kpis(empty_path)
            self.assertEqual(kpis["revenue"], 0.0)
            self.assertEqual(kpis["tonnage"], 0.0)
            self.assertEqual(kpis["avg_price"], 0.0)
            self.assertEqual(kpis["conversion_rate"], 0.0)
        finally:
            self.safe_remove(empty_path)
            
        # Missing columns
        missing_col_path = os.path.join(self.data_dir, "temp_missing_cols.csv")
        with open(missing_col_path, "w", newline="", encoding="utf-8") as f:
            writer = csv.writer(f)
            writer.writerow(["Date", "Customer", "Status"])
            writer.writerow(["2026-07-01", "C1", "Closed"])
        try:
            kpis = bi.calculate_kpis(missing_col_path)
            self.assertEqual(kpis["revenue"], 0.0)
            self.assertEqual(kpis["tonnage"], 0.0)
        finally:
            self.safe_remove(missing_col_path)

if __name__ == "__main__":
    unittest.main()
