import os
import unittest
import inspect
import json
import csv
import urllib.request
import urllib.error
from unittest.mock import patch, MagicMock

# Import the backend stubs/modules
import src.bi_engine as bi
import src.rag_engine as rag
import src.live_scraper as scraper

# Helper mock response for urllib calls
class MockResponse:
    def __init__(self, content):
        self.content = content

    def read(self):
        return self.content

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        pass

def mock_urlopen(req, timeout=10):
    url = req.full_url if hasattr(req, 'full_url') else req
    data_dir = os.path.join(os.path.dirname(__file__), "data")
    
    if "steel_prices_iran" in url:
        html_path = os.path.join(data_dir, "telegram_feed_1.html")
        with open(html_path, "rb") as f:
            return MockResponse(f.read())
    elif "steel_export_news" in url:
        html_path = os.path.join(data_dir, "telegram_feed_2.html")
        with open(html_path, "rb") as f:
            return MockResponse(f.read())
    elif "empty_channel" in url:
        return MockResponse(b"<html><body>No messages here</body></html>")
    elif "malformed_channel" in url:
        return MockResponse(b"<html><body><div class='tgme_widget_message_wrap'>Broken HTML without end tags")
    else:
        # Simulate network 404
        fp = MagicMock()
        raise urllib.error.HTTPError(url, 404, "Not Found", {}, fp)


class TestIrajE2E(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        # Determine data directory path
        cls.data_dir = os.path.join(os.path.dirname(__file__), "data")
        cls.csv_path = os.path.join(cls.data_dir, "mock_sales.csv")
        cls.xlsx_path = os.path.join(cls.data_dir, "mock_sales.xlsx")
        cls.din_txt_path = os.path.join(cls.data_dir, "DIN_488.txt")
        cls.sae_txt_path = os.path.join(cls.data_dir, "SAE_J403.txt")
        cls.astm_pdf_path = os.path.join(cls.data_dir, "ASTM_A615.pdf")

        # Verify test data files exist (setup check)
        if not os.path.exists(cls.csv_path):
            raise RuntimeError("Mock data not found. Please run generate_mock_data.py first.")

    # ----------------------------------------------------
    # Signature & Interface Contract Checks
    # ----------------------------------------------------
    def test_signatures_conformance(self):
        # 1. bi_engine.py
        # calculate_kpis(file_path: str) -> dict
        sig = inspect.signature(bi.calculate_kpis)
        self.assertIn('file_path', sig.parameters)
        self.assertEqual(sig.parameters['file_path'].annotation, str)
        self.assertEqual(sig.return_annotation, dict)

        # generate_charts(file_path: str) -> list[matplotlib.figure.Figure] or list
        sig = inspect.signature(bi.generate_charts)
        self.assertIn('file_path', sig.parameters)
        self.assertEqual(sig.parameters['file_path'].annotation, str)

        # 2. rag_engine.py
        # index_document(file_path: str) -> bool
        sig = inspect.signature(rag.index_document)
        self.assertIn('file_path', sig.parameters)
        self.assertEqual(sig.parameters['file_path'].annotation, str)
        self.assertEqual(sig.return_annotation, bool)

        # query_standards(query_str: str) -> list[dict]
        sig = inspect.signature(rag.query_standards)
        self.assertIn('query_str', sig.parameters)
        self.assertEqual(sig.parameters['query_str'].annotation, str)

        # 3. live_scraper.py
        # scrape_channels(urls: list[str]) -> list[dict]
        sig = inspect.signature(scraper.scrape_channels)
        self.assertIn('urls', sig.parameters)
        self.assertEqual(sig.parameters['urls'].annotation, list[str])

        # read_cached_prices() -> list[dict]
        sig = inspect.signature(scraper.read_cached_prices)
        self.assertEqual(sig.return_annotation, list[dict])


    # ----------------------------------------------------
    # Tier 1: Feature Coverage Tests
    # ----------------------------------------------------
    
    # --- BI Engine ---
    def test_tier1_bi_csv_parsing(self):
        kpis = bi.calculate_kpis(self.csv_path)
        self.assertIsInstance(kpis, dict)
        self.assertIn("revenue", kpis)
        self.assertIn("tonnage", kpis)
        self.assertIn("avg_price", kpis)
        self.assertIn("conversion_rate", kpis)

    def test_tier1_bi_xlsx_parsing(self):
        kpis = bi.calculate_kpis(self.xlsx_path)
        self.assertIsInstance(kpis, dict)
        self.assertIn("revenue", kpis)
        self.assertIn("tonnage", kpis)
        self.assertIn("avg_price", kpis)
        self.assertIn("conversion_rate", kpis)

    def test_tier1_bi_precision(self):
        kpis = bi.calculate_kpis(self.csv_path)
        self.assertIsInstance(kpis["revenue"], float)
        self.assertIsInstance(kpis["tonnage"], float)
        self.assertIsInstance(kpis["avg_price"], float)
        self.assertIsInstance(kpis["conversion_rate"], float)
        
        # Verify average price formula: avg_price = revenue / tonnage
        if kpis["tonnage"] > 0:
            calc_avg = round(kpis["revenue"] / kpis["tonnage"], 2)
            self.assertAlmostEqual(kpis["avg_price"], calc_avg, places=2)

    def test_tier1_bi_chart_rendering(self):
        charts = bi.generate_charts(self.csv_path)
        self.assertIsInstance(charts, list)
        self.assertTrue(len(charts) > 0)
        try:
            from matplotlib.figure import Figure
        except ImportError:
            Figure = bi.Figure
        for fig in charts:
            self.assertIsInstance(fig, Figure)

    def test_tier1_bi_conversion_math(self):
        # Create a temp file with 100% conversion
        temp_csv = os.path.join(self.data_dir, "temp_100_percent.csv")
        with open(temp_csv, "w", newline="", encoding="utf-8") as f:
            writer = csv.writer(f)
            writer.writerow(["Date", "Customer", "Rebar Grade", "Tonnage", "Unit Price", "Status", "Conversion"])
            writer.writerow(["2026-07-01", "C1", "A3", "10.0", "500.0", "Closed", "1"])
            writer.writerow(["2026-07-02", "C2", "A4", "20.0", "600.0", "Closed", "1"])
        
        try:
            kpis = bi.calculate_kpis(temp_csv)
            self.assertEqual(kpis["conversion_rate"], 100.0)
            self.assertEqual(kpis["tonnage"], 30.0)
            self.assertEqual(kpis["revenue"], 17000.0)
        finally:
            if os.path.exists(temp_csv):
                os.remove(temp_csv)

    # --- RAG Engine ---
    def test_tier1_rag_text_indexing(self):
        # Clear index state for clean test
        rag._DOCUMENT_INDEX.clear()
        rag._INDEXED_FILES.clear()
        
        success = rag.index_document(self.din_txt_path)
        self.assertTrue(success)
        self.assertTrue(len(rag._DOCUMENT_INDEX) > 0)

    def test_tier1_rag_pdf_indexing(self):
        success = rag.index_document(self.astm_pdf_path)
        self.assertTrue(success)

    def test_tier1_rag_query_retrieval(self):
        rag.index_document(self.din_txt_path)
        results = rag.query_standards("yield strength")
        self.assertIsInstance(results, list)
        self.assertTrue(len(results) > 0)

    def test_tier1_rag_metadata_verification(self):
        rag.index_document(self.din_txt_path)
        results = rag.query_standards("B500B")
        self.assertTrue(len(results) > 0)
        match = results[0]
        self.assertIn("passage", match)
        self.assertIn("metadata", match)
        self.assertEqual(match["metadata"]["standard"], "DIN")
        self.assertEqual(match["metadata"]["source"], "DIN_488.txt")

    def test_tier1_rag_semantic_lookup(self):
        # DIN 488 contains "yield point" or "yield strength".
        # Let's index both DIN and SAE
        rag.index_document(self.din_txt_path)
        rag.index_document(self.sae_txt_path)
        
        # Searching synonym "yield point" should fetch the yield strength specifications
        results = rag.query_standards("yield point")
        self.assertTrue(len(results) > 0)
        found_yield_mention = False
        for res in results:
            if "yield strength" in res["text"].lower() or "yield point" in res["text"].lower():
                found_yield_mention = True
        self.assertTrue(found_yield_mention)

    # --- Scraper Engine ---
    @patch('urllib.request.urlopen', side_effect=mock_urlopen)
    def test_tier1_scraper_execution(self, mock_url):
        urls = ["https://t.me/s/steel_prices_iran", "https://t.me/s/steel_export_news"]
        results = scraper.scrape_channels(urls)
        self.assertIsInstance(results, list)
        self.assertTrue(len(results) > 0)

    @patch('urllib.request.urlopen', side_effect=mock_urlopen)
    def test_tier1_scraper_json_serialization(self, mock_url):
        cache_file = "live_prices.json"
        if os.path.exists(cache_file):
            os.remove(cache_file)
            
        urls = ["https://t.me/s/steel_prices_iran"]
        scraper.scrape_channels(urls)
        self.assertTrue(os.path.exists(cache_file))

    @patch('urllib.request.urlopen', side_effect=mock_urlopen)
    def test_tier1_scraper_read_cache(self, mock_url):
        urls = ["https://t.me/s/steel_prices_iran"]
        scraped = scraper.scrape_channels(urls)
        cached = scraper.read_cached_prices()
        self.assertEqual(len(scraped), len(cached))

    @patch('urllib.request.urlopen', side_effect=mock_urlopen)
    def test_tier1_scraper_aggregation(self, mock_url):
        urls = ["https://t.me/s/steel_prices_iran", "https://t.me/s/steel_export_news"]
        results = scraper.scrape_channels(urls)
        channels = {r["channel"] for r in results}
        self.assertIn("steel_prices_iran", channels)
        self.assertIn("steel_export_news", channels)

    @patch('urllib.request.urlopen', side_effect=mock_urlopen)
    def test_tier1_scraper_price_extraction(self, mock_url):
        urls = ["https://t.me/s/steel_prices_iran", "https://t.me/s/steel_export_news"]
        results = scraper.scrape_channels(urls)
        
        # Verify that prices are parsed into float or None
        prices = [r["price"] for r in results if r["price"] is not None]
        self.assertTrue(len(prices) > 0)
        for p in prices:
            self.assertIsInstance(p, float)


    # ----------------------------------------------------
    # Tier 2: Boundary & Corner Case Tests
    # ----------------------------------------------------
    
    # --- BI Engine ---
    def test_tier2_bi_empty_file(self):
        empty_csv = os.path.join(self.data_dir, "empty_headers_only.csv")
        with open(empty_csv, "w", newline="", encoding="utf-8") as f:
            writer = csv.writer(f)
            writer.writerow(["Date", "Customer", "Rebar Grade", "Tonnage", "Unit Price", "Status", "Conversion"])
        
        try:
            kpis = bi.calculate_kpis(empty_csv)
            self.assertEqual(kpis["revenue"], 0.0)
            self.assertEqual(kpis["tonnage"], 0.0)
            self.assertEqual(kpis["avg_price"], 0.0)
            self.assertEqual(kpis["conversion_rate"], 0.0)
        finally:
            if os.path.exists(empty_csv):
                os.remove(empty_csv)

    def test_tier2_bi_extremely_large_values(self):
        large_csv = os.path.join(self.data_dir, "large_values.csv")
        with open(large_csv, "w", newline="", encoding="utf-8") as f:
            writer = csv.writer(f)
            writer.writerow(["Date", "Customer", "Rebar Grade", "Tonnage", "Unit Price", "Status", "Conversion"])
            writer.writerow(["2026-07-01", "Huge Corp", "A3", "1000000000.0", "5000000000.0", "Closed", "1"])
        
        try:
            kpis = bi.calculate_kpis(large_csv)
            self.assertTrue(kpis["revenue"] > 1e15)
        finally:
            if os.path.exists(large_csv):
                os.remove(large_csv)

    def test_tier2_bi_missing_and_null_fields(self):
        null_csv = os.path.join(self.data_dir, "null_fields.csv")
        with open(null_csv, "w", newline="", encoding="utf-8") as f:
            writer = csv.writer(f)
            writer.writerow(["Date", "Customer", "Rebar Grade", "Tonnage", "Unit Price", "Status", "Conversion"])
            # Row with missing price
            writer.writerow(["2026-07-01", "C1", "A3", "10.0", "", "Closed", "1"])
            # Row with invalid tonnage
            writer.writerow(["2026-07-02", "C2", "A4", "invalid", "60.0", "Closed", "1"])
            # Correct row
            writer.writerow(["2026-07-03", "C3", "A3", "15.0", "400.0", "Closed", "1"])
        
        try:
            kpis = bi.calculate_kpis(null_csv)
            self.assertEqual(kpis["tonnage"], 15.0)
            self.assertEqual(kpis["revenue"], 6000.0)
        finally:
            if os.path.exists(null_csv):
                os.remove(null_csv)

    def test_tier2_bi_zero_tonnage_transactions(self):
        zero_csv = os.path.join(self.data_dir, "zero_tonnage.csv")
        with open(zero_csv, "w", newline="", encoding="utf-8") as f:
            writer = csv.writer(f)
            writer.writerow(["Date", "Customer", "Rebar Grade", "Tonnage", "Unit Price", "Status", "Conversion"])
            writer.writerow(["2026-07-01", "C1", "A3", "0.0", "500.0", "Closed", "1"])
        
        try:
            kpis = bi.calculate_kpis(zero_csv)
            self.assertEqual(kpis["tonnage"], 0.0)
            self.assertEqual(kpis["avg_price"], 0.0)  # division by zero check
        finally:
            if os.path.exists(zero_csv):
                os.remove(zero_csv)

    def test_tier2_bi_negative_values(self):
        neg_csv = os.path.join(self.data_dir, "negative_values.csv")
        with open(neg_csv, "w", newline="", encoding="utf-8") as f:
            writer = csv.writer(f)
            writer.writerow(["Date", "Customer", "Rebar Grade", "Tonnage", "Unit Price", "Status", "Conversion"])
            writer.writerow(["2026-07-01", "C1", "A3", "-50.0", "500.0", "Closed", "1"])
            writer.writerow(["2026-07-02", "C2", "A4", "100.0", "-400.0", "Closed", "1"])
            writer.writerow(["2026-07-03", "C3", "A3", "10.0", "300.0", "Closed", "1"])
        
        try:
            kpis = bi.calculate_kpis(neg_csv)
            # Only the 3rd row is valid (10.0 tons * 300.0 price = 3000.0 revenue)
            self.assertEqual(kpis["tonnage"], 10.0)
            self.assertEqual(kpis["revenue"], 3000.0)
        finally:
            if os.path.exists(neg_csv):
                os.remove(neg_csv)

    def test_tier2_bi_corrupt_file_format(self):
        corrupt_file = os.path.join(self.data_dir, "corrupt.csv")
        # Write binary junk
        with open(corrupt_file, "wb") as f:
            f.write(b"\x00\xff\x00\xffbinarygarbage\x00")
        
        try:
            with self.assertRaises(ValueError):
                bi.calculate_kpis(corrupt_file)
        finally:
            if os.path.exists(corrupt_file):
                os.remove(corrupt_file)

    def test_tier2_bi_formatted_numeric_and_boolean_parsing(self):
        formatted_csv = os.path.join(self.data_dir, "formatted_numeric_bool.csv")
        with open(formatted_csv, "w", newline="", encoding="utf-8") as f:
            writer = csv.writer(f)
            writer.writerow(["Date", "Customer", "Rebar Grade", "Tonnage", "Unit Price", "Status", "Conversion"])
            # row 1: currency symbol, commas, and string boolean
            writer.writerow(["2026-07-01", "C1", "A3", "1,500.50", "$500.00", "Closed", "true"])
            # row 2: spaces, currency symbols, and string boolean
            writer.writerow(["2026-07-02", "C2", "A4", " 2 000.00 ", " € 600.00 ", "Converted", "yes"])
            # row 3: unconverted/no conversion
            writer.writerow(["2026-07-03", "C3", "A3", "100.00", "$300.00", "Open", "false"])
        
        try:
            kpis = bi.calculate_kpis(formatted_csv)
            self.assertEqual(kpis["tonnage"], 3500.50)
            self.assertEqual(kpis["revenue"], 1950250.0)
            self.assertEqual(kpis["conversion_rate"], 66.67)
            self.assertEqual(kpis["avg_price"], 557.13)
        finally:
            if os.path.exists(formatted_csv):
                os.remove(formatted_csv)

    def test_tier2_bi_chart_data_aggregation(self):
        chart_csv = os.path.join(self.data_dir, "chart_aggregation.csv")
        with open(chart_csv, "w", newline="", encoding="utf-8") as f:
            writer = csv.writer(f)
            writer.writerow(["Date", "Customer", "Rebar Grade", "Tonnage", "Unit Price", "Status", "Conversion"])
            writer.writerow(["2026-07-01", "C1", "A3", "100.0", "500.0", "Closed", "1"])
            writer.writerow(["2026-07-02", "C2", "A4", "200.0", "600.0", "Closed", "1"])
        
        try:
            charts = bi.generate_charts(chart_csv)
            self.assertIsInstance(charts, list)
            self.assertTrue(len(charts) > 0)
            
            # If matplotlib is available, let's verify there are 2 charts with correct titles/axes
            if bi._HAS_MATPLOTLIB:
                self.assertEqual(len(charts), 2)
                fig1, fig2 = charts
                # Verify plot 1 title
                self.assertEqual(fig1.axes[0].get_title(), 'Total Tonnage by Rebar Grade')
                # Verify plot 2 title
                self.assertEqual(fig2.axes[0].get_title(), 'Total Revenue by Rebar Grade')
                
                # Check that axes have labels
                self.assertEqual(fig1.axes[0].get_xlabel(), 'Rebar Grade')
                self.assertEqual(fig1.axes[0].get_ylabel(), 'Tonnage (Tons)')
                self.assertEqual(fig2.axes[0].get_xlabel(), 'Rebar Grade')
                self.assertEqual(fig2.axes[0].get_ylabel(), 'Revenue ($)')
        finally:
            if os.path.exists(chart_csv):
                os.remove(chart_csv)

    # --- RAG Engine ---
    def test_tier2_rag_non_existent_document(self):
        success = rag.index_document("non_existent_path.txt")
        self.assertFalse(success)

    def test_tier2_rag_empty_file_indexing(self):
        empty_doc = os.path.join(self.data_dir, "empty_standard.txt")
        with open(empty_doc, "w") as f:
            f.write("")
        
        try:
            success = rag.index_document(empty_doc)
            self.assertFalse(success)
        finally:
            if os.path.exists(empty_doc):
                os.remove(empty_doc)

    def test_tier2_rag_zero_match_query(self):
        rag.index_document(self.din_txt_path)
        results = rag.query_standards("banana cake recipe")
        self.assertEqual(results, [])

    def test_tier2_rag_reindexing_collision(self):
        # Index same file again
        count_before = len(rag._DOCUMENT_INDEX)
        rag.index_document(self.din_txt_path)
        count_after = len(rag._DOCUMENT_INDEX)
        self.assertEqual(count_before, count_after)

    def test_tier2_rag_special_character_queries(self):
        rag.index_document(self.din_txt_path)
        # Emojis, SQL injection attempt, wildcard characters
        special_queries = [
            "B500B OR '1'='1' --",
            "yield strength !!! 🔥",
            "$$$ DIN &&&",
            "\\^*+?{}[]"
        ]
        for sq in special_queries:
            results = rag.query_standards(sq)
            self.assertIsInstance(results, list)  # Should not raise exception

    # --- Scraper Engine ---
    @patch('urllib.request.urlopen', side_effect=mock_urlopen)
    def test_tier2_scraper_invalid_url_domain(self, mock_url):
        urls = ["https://google.com/invalid_page", "https://t.me/s/steel_prices_iran"]
        results = scraper.scrape_channels(urls)
        # Verify it skips google.com (raises HTTPError/skipped) but proceeds with steel_prices_iran
        self.assertTrue(len(results) > 0)
        channels = {r["channel"] for r in results}
        self.assertIn("steel_prices_iran", channels)

    @patch('urllib.request.urlopen', side_effect=mock_urlopen)
    def test_tier2_scraper_empty_message_feeds(self, mock_url):
        urls = ["https://t.me/s/empty_channel"]
        results = scraper.scrape_channels(urls)
        self.assertEqual(results, [])

    @patch('urllib.request.urlopen', side_effect=mock_urlopen)
    def test_tier2_scraper_malformed_html(self, mock_url):
        urls = ["https://t.me/s/malformed_channel"]
        results = scraper.scrape_channels(urls)
        # Should parse what it can or handle gracefully
        self.assertIsInstance(results, list)

    def test_tier2_scraper_cache_dir_permission_issues(self):
        # We can simulate locked json file or check safety of serialization.
        # Here we just mock json.dump to raise an IOError and check that scraper handles it.
        urls = ["https://t.me/s/steel_prices_iran"]
        with patch('urllib.request.urlopen', side_effect=mock_urlopen):
            with patch('json.dump', side_effect=IOError("Permission Denied")):
                try:
                    # Scraping should not crash completely
                    results = scraper.scrape_channels(urls)
                    self.assertIsInstance(results, list)
                except Exception as e:
                    self.fail(f"Scraper crashed on JSON write permission failure: {e}")


    # ----------------------------------------------------
    # Tier 3: Cross-Feature Integration Tests
    # ----------------------------------------------------
    @patch('urllib.request.urlopen', side_effect=mock_urlopen)
    def test_tier3_bi_scraper_comparison(self, mock_url):
        # TC-X-1: Run scraper to get current price, calculate BI avg price, compute deviation
        scraped_feed = scraper.scrape_channels(["https://t.me/s/steel_prices_iran"])
        
        # Get live price of A3 Size 12 (extracted as 24500.0 from mock)
        live_price_item = [s for s in scraped_feed if "Size 12" in s["text"]]
        self.assertTrue(len(live_price_item) > 0)
        live_price = live_price_item[0]["price"]
        self.assertIsNotNone(live_price)

        # Calculate sales average using BI Engine
        kpis = bi.calculate_kpis(self.csv_path)
        sales_avg = kpis["avg_price"]
        self.assertTrue(sales_avg > 0)

        # Compute percentage deviation
        deviation = round(((sales_avg - live_price) / live_price) * 100, 2)
        self.assertIsInstance(deviation, float)

    def test_tier3_rag_bi_governance(self):
        # TC-X-2: Retrieve standards for B500B from RAG, check if BI sales has transactions with B500B
        rag._DOCUMENT_INDEX.clear()
        rag._INDEXED_FILES.clear()
        
        rag.index_document(self.din_txt_path)
        spec_results = rag.query_standards("B500B")
        self.assertTrue(len(spec_results) > 0)
        
        # Check standard specs text has B500B
        matched_passage = spec_results[0]["text"]
        self.assertIn("B500B", matched_passage)

        # BI KPI check for A3, B500B etc.
        # Filter CSV rows that match "B500B"
        # We can implement governance test: verify that sales spreadsheet matches indexed grades
        grades_in_sales = set()
        with open(self.csv_path, mode='r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                grades_in_sales.add(row["Rebar Grade"].strip())
        
        # Verify B500B is in sales spreadsheet
        self.assertIn("B500B", grades_in_sales)

    @patch('urllib.request.urlopen', side_effect=mock_urlopen)
    def test_tier3_scraper_rag_enrichment(self, mock_url):
        # TC-X-3: Extract standard name mentioned in scraper post, search spec in RAG
        scraped_feed = scraper.scrape_channels(["https://t.me/s/steel_export_news"])
        # Find post mentioning "DIN 488"
        din_post = [s for s in scraped_feed if "DIN 488" in s["text"]]
        self.assertTrue(len(din_post) > 0)
        
        # Search the standard in RAG
        rag._DOCUMENT_INDEX.clear()
        rag._INDEXED_FILES.clear()
        rag.index_document(self.din_txt_path)
        
        query_res = rag.query_standards("DIN 488")
        self.assertTrue(len(query_res) > 0)
        self.assertIn("DIN_488.txt", query_res[0]["source"])

    @patch('urllib.request.urlopen', side_effect=mock_urlopen)
    def test_tier3_full_pipeline_sync(self, mock_url):
        # TC-X-4: Run full chain sequentially
        # 1. Update scraper cache
        scraper.scrape_channels(["https://t.me/s/steel_prices_iran"])
        self.assertTrue(os.path.exists("live_prices.json"))
        
        # 2. Index standard document
        success = rag.index_document(self.din_txt_path)
        self.assertTrue(success)
        
        # 3. Calculate BI KPIs
        kpis = bi.calculate_kpis(self.csv_path)
        self.assertTrue(kpis["revenue"] > 0)
        
        # Confirm cache is readable
        cached_prices = scraper.read_cached_prices()
        self.assertTrue(len(cached_prices) > 0)


    # ----------------------------------------------------
    # Tier 4: Real-World Scenarios
    # ----------------------------------------------------
    @patch('urllib.request.urlopen', side_effect=mock_urlopen)
    def test_tier4_rw1_weekly_report(self, mock_url):
        # TC-RW-1: Weekly Sales Review and Competitive Analysis
        # 1. Scrape latest pricing feeds
        scraped = scraper.scrape_channels(["https://t.me/s/steel_prices_iran"])
        self.assertTrue(len(scraped) > 0)
        
        # 2. Parse weekly sales report
        kpis = bi.calculate_kpis(self.xlsx_path)
        self.assertTrue(kpis["avg_price"] > 0)
        
        # 3. Compare historical average with scraped price for competitive margin analysis
        market_benchmark = scraped[0]["price"] # 24500.0 from mock
        deviation = round(((kpis["avg_price"] - market_benchmark) / market_benchmark) * 100, 2)
        self.assertIsInstance(deviation, float)

    @patch('urllib.request.urlopen', side_effect=mock_urlopen)
    def test_tier4_rw2_customer_negotiation(self, mock_url):
        # TC-RW-2: Technical Compliance Verification during Negotiation
        # Customer requests quote for Grade 60 (ASTM A615 Grade 60)
        requested_grade = "Grade 60"
        
        # 1. Index standards to verify mechanical specification
        rag._DOCUMENT_INDEX.clear()
        rag._INDEXED_FILES.clear()
        rag.index_document(self.din_txt_path)
        rag.index_document(self.astm_pdf_path)
        
        specs = rag.query_standards(requested_grade)
        self.assertTrue(len(specs) > 0)
        self.assertIn("ASTM_A615.pdf", specs[0]["source"])
        
        # 2. Query scraper to see current market price index for Grade 60
        scraped = scraper.scrape_channels(["https://t.me/s/steel_export_news"])
        grade_60_price_post = [s for s in scraped if "Grade 60" in s["text"]]
        self.assertTrue(len(grade_60_price_post) > 0)
        current_market_price = grade_60_price_post[0]["price"] # 550.0
        self.assertEqual(current_market_price, 550.0)

        # 3. Retrieve historical pricing for this grade using BI engine
        kpis = bi.calculate_kpis(self.csv_path)
        self.assertTrue(kpis["avg_price"] > 0)


if __name__ == "__main__":
    unittest.main()
