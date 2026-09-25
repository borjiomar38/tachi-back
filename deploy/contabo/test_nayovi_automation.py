from __future__ import annotations

import json
import pathlib
import sys
import unittest


sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))

import nayovi_automation as automation  # noqa: E402


class WebhookPolicyTest(unittest.TestCase):
  def test_signature_requires_current_timestamp_and_exact_body(self) -> None:
    body = b'{"hello":"nayovi"}'
    signature = automation.signed_payload('s' * 32, '1000', body)
    self.assertTrue(
      automation.verify_webhook_signature(
        's' * 32, '1000', body, signature, now=1000
      )
    )
    self.assertFalse(
      automation.verify_webhook_signature(
        's' * 32, '1000', body + b' ', signature, now=1000
      )
    )
    self.assertFalse(
      automation.verify_webhook_signature(
        's' * 32, '1000', body, signature, now=1301
      )
    )

  def test_payload_is_restricted_to_mobile_main(self) -> None:
    valid = {
      'repository': 'borjiomar38/tachi-mobile',
      'ref': 'refs/heads/main',
      'before': 'a' * 40,
      'after': 'b' * 40,
      'runId': '42',
    }
    self.assertEqual(automation.validate_webhook_payload(valid)['after'], 'b' * 40)
    with self.assertRaises(automation.AutomationError):
      automation.validate_webhook_payload(
        {**valid, 'repository': 'someone/another-repo'}
      )


class PublicReleasePolicyTest(unittest.TestCase):
  def setUp(self) -> None:
    self.valid = {
      'schemaVersion': 1,
      'version': '0.17.46',
      'publishedDate': '2026-09-23',
      'title': 'Reliable reading position',
      'summary': 'Chapters now reopen at the correct reading position.',
      'highlights': ['Keeps your place when reopening a chapter'],
    }

  def test_accepts_public_copy(self) -> None:
    self.assertEqual(automation.validate_public_update(self.valid), self.valid)

  def test_rejects_internal_metadata_and_text(self) -> None:
    for summary in (
      'Changed app/src/main/ReaderViewModel.kt',
      'See commit abc on the release branch',
      'Fixed a private server vulnerability',
      'Calls https://internal.example.test/api',
    ):
      with self.subTest(summary=summary):
        with self.assertRaises(automation.AutomationError):
          automation.validate_public_update({**self.valid, 'summary': summary})
    with self.assertRaises(automation.AutomationError):
      automation.validate_public_update({**self.valid, 'commitSha': 'a' * 40})

  def test_mobile_path_policy_ignores_ci_and_tests(self) -> None:
    self.assertFalse(
      automation.is_user_facing_mobile_change(
        ['.github/workflows/build_push.yml', 'app/src/test/java/Test.kt']
      )
    )
    self.assertTrue(
      automation.is_user_facing_mobile_change(
        ['app/src/main/java/eu/kanade/presentation/Reader.kt']
      )
    )


class OwnerReplyPolicyTest(unittest.TestCase):
  def test_rejection_has_priority(self) -> None:
    self.assertEqual(automation.classify_owner_reply('Non, supprime la PR'), 'reject')

  def test_short_affirmative_approves(self) -> None:
    self.assertEqual(automation.classify_owner_reply('Oui, go'), 'approve')

  def test_free_text_and_attachments_are_feedback(self) -> None:
    self.assertEqual(
      automation.classify_owner_reply('Rends le titre plus clair'), 'feedback'
    )
    self.assertEqual(
      automation.classify_owner_reply('OK', has_attachments=True), 'feedback'
    )

  def test_extracts_persistent_codex_session(self) -> None:
    events = '\n'.join(
      [
        json.dumps({'type': 'thread.started', 'thread_id': 'session-123'}),
        json.dumps({'type': 'item.completed'}),
      ]
    )
    self.assertEqual(automation.extract_codex_session_id(events), 'session-123')


class PreviewPolicyTest(unittest.TestCase):
  def test_extracts_public_route_from_agent_report(self) -> None:
    report = 'Evidence and validation passed.\n\nPREVIEW_PATH: /download\n'
    self.assertEqual(automation.public_preview_path(report), '/download')

  def test_rejects_missing_or_unsafe_preview_route(self) -> None:
    for report in (
      'No preview marker',
      'PREVIEW_PATH: https://example.com/download',
      'PREVIEW_PATH: /../manager/settings',
      'PREVIEW_PATH: //attacker.example/path',
    ):
      with self.subTest(report=report):
        with self.assertRaises(automation.AutomationError):
          automation.public_preview_path(report)


if __name__ == '__main__':
  unittest.main()
