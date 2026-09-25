from __future__ import annotations

import json
import pathlib
import sys
import unittest
from types import SimpleNamespace
from unittest import mock


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

  def test_owner_email_replies_to_the_monitored_mailbox(self) -> None:
    config = SimpleNamespace(
      email_from='Nayovi <noreply@nayovi.com>',
      imap_user='contact@nayovi.com',
      owner_email='borjiomar38@gmail.com',
    )

    with mock.patch.object(automation, 'send_smtp_message') as send_message:
      automation.send_owner_email(config, subject='Test', body='Hello')

    message = send_message.call_args.args[1]
    self.assertEqual(message['From'], 'Nayovi <noreply@nayovi.com>')
    self.assertEqual(message['To'], 'borjiomar38@gmail.com')
    self.assertEqual(message['Reply-To'], 'contact@nayovi.com')


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


class SiteValidationPolicyTest(unittest.TestCase):
  def test_analytics_agent_can_change_public_measurement_code(self) -> None:
    automation.validate_analytics_paths(
      [
        'src/features/analytics/analytics-consent.tsx',
        'src/features/analytics/google-analytics.ts',
        'src/features/analytics/apk-download-tracking.unit.spec.ts',
      ]
    )

  def test_analytics_agent_cannot_change_internal_or_unknown_code(self) -> None:
    for path in (
      'deploy/contabo/nayovi_automation.py',
      'src/server/auth/session.ts',
      'src/components/admin-dashboard.tsx',
    ):
      with self.subTest(path=path):
        with self.assertRaises(automation.AutomationError):
          automation.validate_analytics_paths([path])

  def test_full_suite_runs_headlessly_with_one_flake_retry(self) -> None:
    self.assertIn('--browser.headless', automation.FULL_SITE_TEST_COMMAND)
    self.assertIn('--retry=1', automation.FULL_SITE_TEST_COMMAND)

  def test_validation_environment_always_uses_ci_mode(self) -> None:
    with mock.patch.dict(
      automation.os.environ,
      {'CI': 'false', 'PRESERVED_VALUE': 'yes'},
      clear=True,
    ):
      environment = automation.site_validation_environment()

    self.assertEqual(environment['CI'], 'true')
    self.assertEqual(environment['SKIP_ENV_VALIDATION'], 'true')
    self.assertEqual(environment['PRESERVED_VALUE'], 'yes')
    self.assertEqual(environment['VITE_BASE_URL'], 'http://localhost:3000')


if __name__ == '__main__':
  unittest.main()
