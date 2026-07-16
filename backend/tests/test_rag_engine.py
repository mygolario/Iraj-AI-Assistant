import tempfile
import unittest
from pathlib import Path

from api.routes.rag import _strength_value
from core import rag_engine


class StandardsLibraryTest(unittest.TestCase):
    def setUp(self) -> None:
        self.temporary_directory = tempfile.TemporaryDirectory()
        cache_directory = Path(self.temporary_directory.name)
        rag_engine.STANDARDS_LIBRARY_FILE = cache_directory / "library.json"
        rag_engine.STANDARDS_INDEX_FILE = cache_directory / "index.json"
        rag_engine.STANDARDS_FILE_DIR = cache_directory / "files"
        rag_engine.STANDARDS_FILE_DIR.mkdir()
        rag_engine._DOCUMENTS = []
        rag_engine._DOCUMENT_INDEX = []

    def tearDown(self) -> None:
        self.temporary_directory.cleanup()

    def create_standard(self) -> Path:
        path = Path(self.temporary_directory.name) / "source.txt"
        path.write_text(
            "ASTM A615 Grade 60\n"
            "Minimum yield strength is 420 MPa.\n"
            "Minimum tensile strength is 620 MPa.\n"
            "Available diameters range 10-40 mm.\n",
            encoding="utf-8",
        )
        return path

    def test_ingest_search_persist_and_delete(self) -> None:
        source = self.create_standard()

        document = rag_engine.ingest_document(
            str(source),
            "ASTM_A615_2024.txt",
        )

        self.assertEqual(document["processing_status"], "ready")
        self.assertEqual(document["standard"], "ASTM")
        self.assertEqual(document["edition"], "2024")
        results = rag_engine.query_standards("Grade 60 yield strength")
        self.assertTrue(results)
        self.assertEqual(results[0]["document_id"], document["id"])
        self.assertEqual(results[0]["metadata"]["standard_code"], "ASTM A615")

        rag_engine._DOCUMENTS = []
        rag_engine._DOCUMENT_INDEX = []
        rag_engine._load_library()
        self.assertEqual(rag_engine.list_documents()[0]["id"], document["id"])

        self.assertTrue(rag_engine.delete_document(document["id"]))
        self.assertEqual(rag_engine.list_documents(), [])
        self.assertEqual(rag_engine.query_standards("yield strength"), [])

    def test_duplicate_upload_reuses_document(self) -> None:
        source = self.create_standard()

        first = rag_engine.ingest_document(str(source), "first.txt")
        duplicate = rag_engine.ingest_document(str(source), "duplicate.txt")

        self.assertEqual(first["id"], duplicate["id"])
        self.assertTrue(duplicate["duplicate"])
        self.assertEqual(len(rag_engine.list_documents()), 1)

    def test_long_lines_are_split_into_bounded_chunks(self) -> None:
        chunks = rag_engine._chunk_page("value " * 1000)

        self.assertGreater(len(chunks), 1)
        self.assertTrue(all(len(chunk) <= 1200 for chunk in chunks))

    def test_strength_extraction_requires_units(self) -> None:
        text = (
            "Yield strength according to ISO 6892-1 is 500 MPa "
            "for the selected product."
        )

        self.assertEqual(
            _strength_value(text, r"yield\s+(?:strength|point)"),
            "500 MPa",
        )


if __name__ == "__main__":
    unittest.main()
