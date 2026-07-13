import sys
import unittest
from pathlib import Path


SIDECAR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(SIDECAR))

from jobs.extract_cpw_prices import (  # noqa: E402
    _clean_brand,
    _clean_identifier,
    _parse_count_size,
)
from jobs.extract_receipts import _parse_receipt_html  # noqa: E402


class EastsideReceiptParserTests(unittest.TestCase):
    def test_retains_upc_quantity_unit_price_and_discount(self):
        html = """
        <table>
          <tr><td style="font-weight: bold;">Produce</td></tr>
          <tr><td>001234567890 APPLES HONEYCRISP  $8.00 S</td></tr>
          <tr><td>2 lb @ $4.00/lb</td></tr>
          <tr><td>20% Member Discount $-1.60</td></tr>
        </table>
        """

        items = _parse_receipt_html(html)

        self.assertEqual(len(items), 1)
        self.assertEqual(items[0]['upc'], '001234567890')
        self.assertEqual(items[0]['quantity'], 2.0)
        self.assertEqual(items[0]['unit'], 'lb')
        self.assertEqual(items[0]['unitPrice'], 4.0)
        self.assertEqual(items[0]['linePrice'], 8.0)
        self.assertEqual(items[0]['discountAmount'], 1.6)


class CpwParserTests(unittest.TestCase):
    def test_preserves_catalog_identifiers_and_brand(self):
        self.assertEqual(_clean_identifier('001234567890'), '001234567890')
        self.assertEqual(_clean_identifier('4321.0'), '4321')
        self.assertEqual(_clean_brand('  HOPE   CREAMERY '), 'Hope Creamery')

    def test_parses_case_quantity_and_unit(self):
        self.assertEqual(_parse_count_size('12/6 OZ'), (12, '6.0 OZ'))
        self.assertEqual(_parse_count_size('40 LB'), (40.0, 'LB'))


if __name__ == '__main__':
    unittest.main()
