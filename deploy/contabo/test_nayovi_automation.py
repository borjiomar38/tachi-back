from __future__ import annotations

import json
import pathlib
import sys
import tempfile
import unittest
from email import policy
from email.parser import BytesParser
from types import SimpleNamespace
from unittest import mock


sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))

import nayovi_automation as automation  # noqa: E402


class InstallerPolicyTest(unittest.TestCase):
  def test_installer_persists_skill_evening_schedule_and_safe_refresh(self) -> None:
    installer = pathlib.Path(__file__).with_name(
      'install-nayovi-automation.sh'
    ).read_text(encoding='utf-8')

    self.assertIn('.codex/skills/nayovi-seo-growth', installer)
    self.assertIn('audience-copy-and-conversion.md', installer)
    self.assertIn('OnCalendar=*-*-* 17:00:00 UTC', installer)
    self.assertIn('--on-active=15m', installer)


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
      owner_smtp_url='smtps://contact:secret@mail.example.test:465',
      owner_email_from='Nayovi Analytics <contact@nayovi.com>',
      fallback_smtp_url='',
      fallback_email_from='',
      smtp_url='',
      email_from='Nayovi <noreply@nayovi.com>',
      imap_user='contact@nayovi.com',
      owner_email='borjiomar38@gmail.com',
    )

    with mock.patch.object(
      automation,
      'send_smtp_message',
      return_value={'dsnRequested': True},
    ) as send_message:
      automation.send_owner_email(config, subject='Test', body='Hello')

    message = send_message.call_args.args[1]
    self.assertEqual(message['From'], 'Nayovi Analytics <contact@nayovi.com>')
    self.assertEqual(message['To'], 'borjiomar38@gmail.com')
    self.assertEqual(message['Reply-To'], 'contact@nayovi.com')
    self.assertTrue(send_message.call_args.kwargs['request_dsn'])

  def test_proposal_email_is_concise_and_excludes_agent_internals(self) -> None:
    body = automation.proposal_email_body(
      {
        'proposalId': 'analytics-1',
        'previewUrl': 'https://preview.example/download',
        'prUrl': 'https://github.example/pull/1',
        'ownerChangeSummary': (
          'Le texte de téléchargement répond plus clairement au besoin du visiteur.'
        ),
        'ownerBenefitSummary': (
          'Cela devrait attirer des visiteurs plus qualifiés vers le téléchargement.'
        ),
        'analyticsSummary': 'sensitive analytics detail',
        'agentReport': 'large internal agent report',
      }
    )

    self.assertIn('https://preview.example/download', body)
    self.assertIn('Ce qui change', body)
    self.assertIn('répond plus clairement', body)
    self.assertIn('visiteurs plus qualifiés', body)
    self.assertNotIn('sensitive analytics detail', body)
    self.assertNotIn('large internal agent report', body)

  def test_relayed_dsn_stays_unconfirmed(self) -> None:
    raw = b'''From: MAILER-DAEMON@example.test
Message-ID: <dsn-1@example.test>
Content-Type: multipart/report; report-type=delivery-status; boundary="dsn"

--dsn
Content-Type: text/plain

Relayed.
--dsn
Content-Type: message/delivery-status

Reporting-MTA: dns; relay.example.test
Original-Envelope-ID: analytics-20260926T123843Z-abc

Final-Recipient: rfc822; borjiomar38@gmail.com
Action: relayed
Status: 2.0.0
Diagnostic-Code: smtp; delivered via antispam service

--dsn--
'''
    message = BytesParser(policy=policy.default).parsebytes(raw)
    reports = automation.delivery_status_reports(message)
    self.assertEqual(reports[0]['action'], 'relayed')

    with tempfile.TemporaryDirectory() as temporary_directory:
      state_dir = pathlib.Path(temporary_directory)
      config = SimpleNamespace(state_dir=state_dir)
      state = {
        'proposalId': 'analytics-20260926T123843Z',
        'status': 'email_submitted',
        'outboundMessageIds': ['<proposal-1@nayovi.com>'],
        'deliveryAttempts': [
          {
            'messageId': '<proposal-1@nayovi.com>',
            'envelopeId': 'analytics-20260926T123843Z-abc',
            'status': 'submitted',
          }
        ],
      }
      self.assertTrue(
        automation.delivery_report_matches_state(
          message.as_string(policy=policy.default), reports[0], state
        )
      )

      automation.apply_delivery_report(
        config,
        state,
        reports[0],
        report_message_id='<dsn-1@example.test>',
        message_text=message.as_string(policy=policy.default),
      )

      self.assertEqual(state['status'], 'waiting_owner_unconfirmed')
      self.assertNotIn('emailDeliveredAt', state)
      self.assertEqual(state['deliveryAttempts'][0]['status'], 'relayed')

  def test_unconfirmed_delivery_keeps_the_proposal_active_without_resending(self) -> None:
    with tempfile.TemporaryDirectory() as temporary_directory:
      state_dir = pathlib.Path(temporary_directory)
      proposal_dir = state_dir / 'proposals'
      proposal_dir.mkdir()
      state = {
        'proposalId': 'analytics-20260926T123843Z',
        'status': 'email_submitted',
        'deliveryAttempts': [
          {'sender': 'contact@nayovi.com', 'submittedAt': '2026-09-26T12:00:00Z'},
          {'sender': 'contact@dev-ring.com', 'submittedAt': '2026-09-26T12:15:00Z'},
        ],
      }
      automation.atomic_write_json(
        proposal_dir / 'analytics-20260926T123843Z.json', state
      )
      config = SimpleNamespace(
        state_dir=state_dir,
        owner_smtp_url='smtps://contact:secret@mail.example.test:465',
        owner_email_from='Nayovi Analytics <contact@nayovi.com>',
        fallback_smtp_url='smtps://fallback:secret@mail2.example.test:465',
        fallback_email_from='Nayovi Analytics <contact@dev-ring.com>',
        smtp_url='',
        email_from='',
        delivery_max_attempts=2,
        delivery_retry_seconds=60,
      )

      with mock.patch.object(automation, 'send_owner_email') as send_owner_email:
        self.assertEqual(automation.retry_pending_owner_emails(config), 0)

      send_owner_email.assert_not_called()
      saved = automation.read_json(
        proposal_dir / 'analytics-20260926T123843Z.json'
      )
      self.assertEqual(saved['status'], 'waiting_owner_unconfirmed')
      self.assertEqual(
        automation.active_proposal(config)['proposalId'],
        'analytics-20260926T123843Z',
      )


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

  def test_extracts_non_technical_owner_summary(self) -> None:
    report = '\n'.join(
      [
        'Evidence and validation passed.',
        'OWNER_CHANGE: La page explique plus clairement comment essayer Nayovi.',
        'OWNER_BENEFIT: Cela devrait aider les bons visiteurs à passer au téléchargement.',
        'PREVIEW_PATH: /download',
      ]
    )
    state: dict[str, object] = {}

    automation.update_proposal_report(state, report)

    self.assertEqual(state['previewPath'], '/download')
    self.assertIn('explique plus clairement', state['ownerChangeSummary'])
    self.assertIn('passer au téléchargement', state['ownerBenefitSummary'])

  def test_rejects_internal_details_in_owner_summary(self) -> None:
    report = '\n'.join(
      [
        'OWNER_CHANGE: Le fichier src/features/public/page-download.tsx change.',
        'OWNER_BENEFIT: La page devrait être plus utile.',
        'PREVIEW_PATH: /download',
      ]
    )

    with self.assertRaises(automation.AutomationError):
      automation.update_proposal_report({}, report)


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

  def test_analytics_agent_can_add_public_english_and_french_copy(self) -> None:
    automation.validate_analytics_paths(
      [
        'src/locales/en/public.json',
        'src/locales/en/index.ts',
        'src/locales/fr/public.json',
        'src/locales/fr/index.ts',
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
    self.assertIn('--exclude', automation.FULL_SITE_TEST_COMMAND)
    self.assertIn(
      'src/components/form/field-checkbox-group/field-checkbox-group.browser.spec.tsx',
      automation.FULL_SITE_TEST_COMMAND,
    )

  def test_build_environment_is_removed_even_when_validation_fails(self) -> None:
    with tempfile.TemporaryDirectory() as temporary_directory:
      root = pathlib.Path(temporary_directory)
      repo = root / 'repo'
      repo.mkdir()
      source = root / '.env.production'
      source.write_text('OPENAI_API_KEY=stale-test-key\n', encoding='utf-8')
      config = SimpleNamespace(site_build_env_file=source)

      with self.assertRaisesRegex(RuntimeError, 'validation failed'):
        with automation.temporary_site_build_environment(config, repo):
          self.assertEqual(
            (repo / '.env').read_text(encoding='utf-8'),
            'OPENAI_API_KEY=stale-test-key\n',
          )
          raise RuntimeError('validation failed')

      self.assertFalse((repo / '.env').exists())

  def test_codex_environment_uses_stored_login_not_stale_api_key(self) -> None:
    with mock.patch.dict(
      automation.os.environ,
      {
        'OPENAI_API_KEY': 'stale-test-key',
        'CODEX_ACCESS_TOKEN': 'preserved-access-token',
        'PRESERVED_VALUE': 'yes',
      },
      clear=True,
    ):
      environment = automation.codex_environment()

    self.assertNotIn('OPENAI_API_KEY', environment)
    self.assertEqual(environment['CODEX_ACCESS_TOKEN'], 'preserved-access-token')
    self.assertEqual(environment['PRESERVED_VALUE'], 'yes')

  def test_validation_environment_always_uses_ci_mode(self) -> None:
    with mock.patch.dict(
      automation.os.environ,
      {'CI': 'false', 'PRESERVED_VALUE': 'yes'},
      clear=True,
    ):
      environment = automation.site_validation_environment()

    self.assertEqual(environment['CI'], 'true')
    self.assertEqual(environment['SKIP_ENV_VALIDATION'], 'true')
    self.assertEqual(environment['NODE_OPTIONS'], '--max-old-space-size=4096')
    self.assertEqual(environment['PRESERVED_VALUE'], 'yes')
    self.assertEqual(environment['VITE_BASE_URL'], 'http://localhost:3000')


class AnalyticsAutonomyPolicyTest(unittest.TestCase):
  def test_prompt_requires_the_nayovi_seo_skill_and_evidence_boundaries(self) -> None:
    prompt = automation.build_analytics_prompt(
      pathlib.Path('/tmp/analytics-snapshot.json')
    )

    self.assertIn('Use $nayovi-seo-growth', prompt)
    self.assertIn('ordinary, non-technical readers', prompt)
    self.assertIn('only the\n  Search Console section', prompt)
    self.assertIn('OWNER_CHANGE:', prompt)
    self.assertIn('OWNER_BENEFIT:', prompt)

  def test_google_token_requests_both_readonly_scopes(self) -> None:
    with mock.patch.object(
      automation,
      'run',
      return_value=SimpleNamespace(stdout='token-value\n'),
    ) as run_command:
      self.assertEqual(automation.gcloud_access_token(), 'token-value')

    scopes = next(
      argument
      for argument in run_command.call_args.args[0]
      if argument.startswith('--scopes=')
    )
    self.assertIn('analytics.readonly', scopes)
    self.assertIn('webmasters.readonly', scopes)

  def test_summary_does_not_infer_rankings_when_search_console_is_unavailable(self) -> None:
    current = {
      'activeUsers': 10,
      'sessions': 12,
      'engagedSessions': 8,
      'keyEvents': 2,
    }
    previous = {
      'activeUsers': 8,
      'sessions': 10,
      'engagedSessions': 6,
      'keyEvents': 1,
    }
    summary = automation.analytics_summary(
      {
        'periods': {'last28Days': current, 'previous28Days': previous},
        'searchConsole': {'status': 'unavailable'},
      }
    )

    self.assertIn('ranking baseline: unavailable', summary)
    self.assertIn('do not infer rankings from GA4', summary)

  def test_merge_is_idempotent_and_returns_the_existing_merge_sha(self) -> None:
    merge_sha = 'a' * 40
    with (
      mock.patch.object(automation, 'wait_for_pr_checks'),
      mock.patch.object(
        automation,
        'run',
        return_value=SimpleNamespace(
          stdout=json.dumps(
            {'state': 'MERGED', 'mergeCommit': {'oid': merge_sha}}
          )
        ),
      ) as run_command,
    ):
      result = automation.merge_pr(
        pathlib.Path('/tmp/repo'),
        'https://github.com/borjiomar38/tachi-back/pull/99',
      )

    self.assertEqual(result, merge_sha)
    self.assertEqual(run_command.call_count, 1)

  def test_wait_for_production_deploy_checks_workflow_and_public_health(self) -> None:
    run_url = 'https://github.com/borjiomar38/tachi-back/actions/runs/123'
    results = [
      SimpleNamespace(
        returncode=0,
        stdout=json.dumps(
          [
            {
              'databaseId': 123,
              'name': automation.PRODUCTION_DEPLOY_WORKFLOW,
              'workflowName': automation.PRODUCTION_DEPLOY_WORKFLOW,
              'status': 'completed',
              'conclusion': 'success',
              'url': run_url,
            }
          ]
        ),
        stderr='',
      ),
      SimpleNamespace(returncode=0, stdout='success', stderr=''),
      SimpleNamespace(returncode=0, stdout='healthy', stderr=''),
    ]
    with mock.patch.object(automation, 'run', side_effect=results) as run_command:
      result = automation.wait_for_production_deploy(
        pathlib.Path('/tmp/repo'), 'b' * 40, timeout=120
      )

    self.assertEqual(result, run_url)
    self.assertEqual(
      run_command.call_args_list[-1].args[0],
      ['curl', '-fsSL', '--max-time', '30', automation.PRODUCTION_HEALTH_URL],
    )

  def test_legacy_github_cli_checks_are_parsed(self) -> None:
    output = '\n'.join(
      [
        'TypeScript\tpass\t51s\thttps://example.test/typescript',
        'E2E\tpending\t0\thttps://example.test/e2e',
      ]
    )

    self.assertEqual(
      automation.parse_legacy_pr_checks(output),
      [
        {
          'name': 'TypeScript',
          'bucket': 'pass',
          'link': 'https://example.test/typescript',
        },
        {
          'name': 'E2E',
          'bucket': 'pending',
          'link': 'https://example.test/e2e',
        },
      ],
    )

  def test_pr_checks_fall_back_for_github_cli_without_json_support(self) -> None:
    modern_result = SimpleNamespace(
      returncode=1,
      stdout='',
      stderr='unknown flag: --json',
    )
    legacy_result = SimpleNamespace(
      returncode=0,
      stdout='Linter\tpass\t28s\thttps://example.test/linter\n',
      stderr='',
    )

    with mock.patch.object(
      automation,
      'run',
      side_effect=[modern_result, legacy_result],
    ) as run_command:
      checks = automation.read_pr_checks(
        pathlib.Path('/tmp/repo'),
        'https://github.com/borjiomar38/tachi-back/pull/16',
      )

    self.assertEqual(checks[0]['bucket'], 'pass')
    self.assertEqual(run_command.call_count, 2)
    self.assertNotIn('--json', run_command.call_args_list[1].args[0])

  def test_pr_checks_gate_records_the_exact_validated_head(self) -> None:
    with tempfile.TemporaryDirectory() as temporary_directory:
      state_dir = pathlib.Path(temporary_directory)
      config = SimpleNamespace(state_dir=state_dir)
      state = {
        'proposalId': 'analytics-20260926T113000Z',
        'prUrl': 'https://github.com/borjiomar38/tachi-back/pull/99',
      }
      head_sha = 'a' * 40

      with mock.patch.object(automation, 'wait_for_pr_checks') as wait_for_checks:
        resolved_sha = automation.validate_pr_checks_with_codex_repair(
          config,
          state,
          pathlib.Path(temporary_directory) / 'workspace',
          head_sha,
          phase='initial',
        )

      self.assertEqual(resolved_sha, head_sha)
      wait_for_checks.assert_called_once_with(
        pathlib.Path(temporary_directory) / 'workspace',
        state['prUrl'],
        expected_sha=head_sha,
      )
      self.assertEqual(state['prChecks']['status'], 'passed')
      self.assertEqual(state['prChecks']['headSha'], head_sha)

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
      repaired_report = '\n'.join(
        [
          'Validation repaired.',
          'OWNER_CHANGE: La page explique plus clairement la valeur de Nayovi.',
          'OWNER_BENEFIT: Cela devrait aider les bons visiteurs à télécharger l’application.',
          'PREVIEW_PATH: /download',
        ]
      )

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
