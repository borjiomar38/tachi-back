from __future__ import annotations

import json
import pathlib
import sys
import tempfile
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
  def test_changed_paths_include_untracked_files_and_deletions(self) -> None:
    with tempfile.TemporaryDirectory() as temporary_directory:
      repo = pathlib.Path(temporary_directory)
      automation.run(['git', 'init'], cwd=repo)
      automation.run(['git', 'config', 'user.email', 'test@nayovi.com'], cwd=repo)
      automation.run(['git', 'config', 'user.name', 'Nayovi Test'], cwd=repo)
      removed = repo / 'removed.ts'
      removed.write_text('export const removed = true;\n', encoding='utf-8')
      automation.run(['git', 'add', 'removed.ts'], cwd=repo)
      automation.run(['git', 'commit', '-m', 'initial'], cwd=repo)

      removed.unlink()
      (repo / 'new-file.ts').write_text(
        'export const added = true;\n', encoding='utf-8'
      )

      self.assertEqual(
        automation.changed_paths(repo, 'HEAD'),
        ['new-file.ts', 'removed.ts'],
      )

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


class AnalyticsAutonomyPolicyTest(unittest.TestCase):
  def test_validation_failure_is_given_back_to_the_same_codex_session(self) -> None:
    with tempfile.TemporaryDirectory() as temporary_directory:
      state_dir = pathlib.Path(temporary_directory)
      config = SimpleNamespace(state_dir=state_dir)
      state = {
        'proposalId': 'analytics-20260925T221738Z',
        'status': 'creating',
        'codexSessionId': 'session-123',
      }
      changed = ['src/features/public/page-download.tsx']
      repaired_report = 'Validation repaired.\nPREVIEW_PATH: /download\n'

      with (
        mock.patch.object(automation, 'changed_paths', return_value=changed),
        mock.patch.object(
          automation,
          'validate_site',
          side_effect=[automation.AutomationError('build failed'), ['passed']],
        ) as validate_site,
        mock.patch.object(
          automation,
          'run_codex',
          return_value=('session-123', repaired_report),
        ) as run_codex,
      ):
        automation.validate_site_with_codex_repair(
          config,
          state,
          pathlib.Path(temporary_directory) / 'workspace',
          phase='initial',
        )

      self.assertEqual(validate_site.call_count, 2)
      run_codex.assert_called_once()
      self.assertEqual(state['validation'], ['passed'])
      self.assertEqual(state['previewPath'], '/download')
      self.assertEqual(len(state['validationRepairs']), 1)

  def test_initial_failure_is_logged_without_sending_owner_email(self) -> None:
    with tempfile.TemporaryDirectory() as temporary_directory:
      root = pathlib.Path(temporary_directory)
      config = SimpleNamespace(
        state_dir=root / 'state',
        log_dir=root / 'log',
        mobile_source_repo=root / 'mobile' / 'repo',
        proposal_workspaces=root / 'proposals',
        codex_model='gpt-5.6-sol',
        codex_effort='xhigh',
      )

      with (
        mock.patch.object(
          automation,
          'analytics_snapshot',
          side_effect=automation.AutomationError('GA4 unavailable'),
        ),
        mock.patch.object(automation, 'send_owner_email') as send_owner_email,
      ):
        with self.assertRaises(automation.AutomationError):
          automation.start_analytics_proposal(config)

      send_owner_email.assert_not_called()
      states = automation.list_proposal_states(config)
      self.assertEqual(len(states), 1)
      self.assertEqual(states[0]['status'], 'failed')


if __name__ == '__main__':
  unittest.main()
