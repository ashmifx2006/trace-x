import sys, unittest, pathlib
import pandas as pd
ROOT = pathlib.Path(__file__).resolve().parents[2]; sys.path.insert(0, str(ROOT / "backend"))
from intelligence.engine import Engine, validate
class EngineTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.e = Engine(); cls.e.load(pd.read_csv(ROOT / "sample_data/transactions.csv"), pd.read_csv(ROOT / "sample_data/accounts.csv"))
    def test_finds_injected_networks(self): self.assertGreaterEqual(len(self.e.networks), 14)
    def test_low_false_positive_rate(self): self.assertLess(len(self.e.tx_net) / len(self.e.df), 0.06)
    def test_circular_is_top(self): self.assertEqual(list(self.e.networks.values())[0]["dna"]["flow_structure"], "Circular")
    def test_score_is_explainable(self):
        for n in self.e.networks.values():
            self.assertTrue(0 <= n["risk"] <= 100); self.assertEqual(n["risk"], min(100, sum(r["points"] for r in n["reasons"])))
    def test_validation(self): self.assertTrue(validate(pd.DataFrame({"a": [1]})))
if __name__ == "__main__": unittest.main()
