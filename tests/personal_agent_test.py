import copy
import importlib.util
import json
import pathlib
import unittest

spec = importlib.util.spec_from_file_location("personal_agent", pathlib.Path(__file__).parents[1] / "databricks/personal_agent.py")
agent = importlib.util.module_from_spec(spec)
spec.loader.exec_module(agent)
PROFILE = {"skills": ["SQL"], "evidence": [{"id": "p1", "text": "Built a SQL report on sample data."}]}
BRIEF = {"description": "Practice SQL reporting"}
DRAFT = {"action": "finish", "decision": "explore", "reason": "Relevant practice evidence", "gaps": [], "questions": ["Which KPIs?"], "evidence_ids": ["p1"], "practice_draft": "I built a SQL report on sample data."}


class AgentTests(unittest.TestCase):
    def complete(self, replies):
        answers = iter(replies)
        return lambda _: json.dumps(next(answers))

    def test_search_draft_review(self):
        result = agent.analyse(BRIEF, PROFILE, self.complete([
            {"action": "search_evidence", "query": "SQL"}, DRAFT,
            {"passed": True, "issues": []}]))
        self.assertEqual(result["calls"], 3)
        self.assertEqual(result["status"], "reviewed_needs_human_approval")
        self.assertEqual(result["trace"][0]["tool_result"][0]["id"], "p1")

    def test_maximum_path_and_revision_not_marked_approved(self):
        result = agent.analyse(BRIEF, PROFILE, self.complete([
            {"action": "search_evidence", "query": "SQL"},
            {"action": "search_evidence", "query": "report"}, DRAFT,
            {"passed": False, "issues": ["Clarify scope"]}, DRAFT]))
        self.assertEqual(result["calls"], 5)
        self.assertEqual(result["status"], "revised_needs_human_review")

    def test_unknown_and_unretrieved_evidence_rejected(self):
        with self.assertRaises(ValueError):
            agent.analyse(BRIEF, PROFILE, self.complete([DRAFT]))
        bad = copy.deepcopy(DRAFT)
        bad["evidence_ids"] = ["invented"]
        with self.assertRaises(ValueError):
            agent.analyse(BRIEF, PROFILE, self.complete([
                {"action": "search_evidence", "query": "SQL"}, bad]))

    def test_outreach_action_and_infinite_tool_loop_blocked(self):
        with self.assertRaises(ValueError):
            agent.analyse(BRIEF, PROFILE, self.complete([{"action": "send_email"}]))
        with self.assertRaises(ValueError):
            agent.analyse(BRIEF, PROFILE, self.complete([
                {"action": "search_evidence", "query": "SQL"}] * 3))

    def test_quota_failure_no_retry(self):
        calls = []
        def fail(_):
            calls.append(1)
            raise RuntimeError("quota")
        with self.assertRaises(RuntimeError):
            agent.analyse(BRIEF, PROFILE, fail)
        self.assertEqual(len(calls), 1)

    def test_fingerprint_changes_with_inputs_or_model(self):
        original = agent.fingerprint(BRIEF, PROFILE, "m1")
        self.assertEqual(original, agent.fingerprint(BRIEF, PROFILE, "m1"))
        self.assertNotEqual(original, agent.fingerprint(BRIEF, PROFILE, "m2"))
        self.assertNotEqual(original, agent.fingerprint({"description": "changed"}, PROFILE, "m1"))

    def test_bad_data_and_contradictory_review(self):
        with self.assertRaises(ValueError):
            agent.validate_inputs({"description": "x" * 6001}, PROFILE)
        with self.assertRaises(ValueError):
            agent.analyse(BRIEF, PROFILE, self.complete([
                {"action": "search_evidence", "query": "SQL"}, DRAFT,
                {"passed": True, "issues": ["Unsupported claim"]}]))


if __name__ == "__main__":
    unittest.main()
